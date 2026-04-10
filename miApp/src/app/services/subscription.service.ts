import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DiaEntregaSemanal,
  PlanSemanal,
  UserSubscription
} from '../models/subscription.model';
import { Plato } from '../models/plato.model';
import { UserSessionService } from './user-session.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly minimoPlatosSuscripcion = 5;
  private readonly storageKeyBase = 'sanzen-user-subscription';
  private readonly apiUrl = `${environment.apiBaseUrl}/suscripciones`;
  private readonly diasEntregaSemana: DiaEntregaSemanal[] = [
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo'
  ];
  private readonly diaSemanaPorNombre: Record<DiaEntregaSemanal, number> = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    domingo: 0
  };
  private readonly etiquetaDiaPorNombre: Record<DiaEntregaSemanal, string> = {
    lunes: 'lunes',
    martes: 'martes',
    miercoles: 'miercoles',
    jueves: 'jueves',
    viernes: 'viernes',
    sabado: 'sabado',
    domingo: 'domingo'
  };
  private readonly descuentosPorPlan: Record<PlanSemanal, number> = {
    5: 0.2
  };
  private suscripcionCache: UserSubscription = this.obtenerSuscripcionPorDefecto();
  private cacheUsuarioId: number | null = null;

  constructor(
    private http: HttpClient,
    private userSessionService: UserSessionService
  ) {}

  async simularRenovacionSemanal(): Promise<{
    pedidoId: string;
    numeroPedido: string;
    fechaEntregaProgramada: string;
    proximaEntrega: string;
    proximaEntregaIso: string;
  }> {
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      throw new Error('No hay un usuario activo para simular la renovación semanal.');
    }

    const respuesta = await firstValueFrom(
      this.http.post<{
        pedidoId: string;
        numeroPedido: string;
        fechaEntregaProgramada: string;
        proximaEntrega: string;
        proximaEntregaIso: string;
      }>(`${this.apiUrl}/simular-renovacion`, { userId })
    );

    await this.refrescarDesdeApi();
    return respuesta;
  }

  async cargarInicial(): Promise<void> {
    await this.refrescarDesdeApi();
  }

  establecerSuscripcionTemporal(suscripcion: UserSubscription): void {
    this.sincronizarCacheConUsuarioActual();
    this.suscripcionCache = this.normalizarSuscripcion(suscripcion);
    this.persistirLocal();
  }

  restablecerSuscripcionLocal(): void {
    this.sincronizarCacheConUsuarioActual();
    this.suscripcionCache = this.obtenerSuscripcionPorDefecto();
    this.persistirLocal();
  }

  async persistirSuscripcionActual(): Promise<UserSubscription> {
    this.sincronizarCacheConUsuarioActual();
    const suscripcionActual = this.normalizarSuscripcion(this.suscripcionCache);
    await this.guardarEnApi(suscripcionActual);
    return this.obtenerSuscripcion();
  }

  async persistirSuscripcionActualEstricto(): Promise<UserSubscription> {
    this.sincronizarCacheConUsuarioActual();
    const suscripcionActual = this.normalizarSuscripcion(this.suscripcionCache);
    await this.guardarEnApiEstricto(suscripcionActual);
    return this.obtenerSuscripcion();
  }

  obtenerSuscripcion(): UserSubscription {
    this.sincronizarCacheConUsuarioActual();
    return this.normalizarSuscripcion(this.suscripcionCache);
  }

  guardarSuscripcion(suscripcion: UserSubscription): void {
    this.sincronizarCacheConUsuarioActual();
    const suscripcionNormalizada = this.normalizarSuscripcion(suscripcion);
    this.suscripcionCache = suscripcionNormalizada;
    this.persistirLocal();
    void this.guardarEnApi(suscripcionNormalizada);
  }

  previsualizarSuscripcion(suscripcion: Partial<UserSubscription>): UserSubscription {
    return this.normalizarSuscripcion({
      ...this.obtenerSuscripcion(),
      ...suscripcion
    });
  }

  guardarPlan(
    planSemanal: PlanSemanal,
    activa: boolean,
    diaEntrega: DiaEntregaSemanal,
    platosDisponibles: Plato[] = []
  ): UserSubscription {
    const suscripcionActual = this.obtenerSuscripcion();

    const suscripcion: UserSubscription = {
      ...suscripcionActual,
      activa,
      planSemanal: this.minimoPlatosSuscripcion,
      diaEntrega,
      platosPorSemana: this.minimoPlatosSuscripcion,
      platosSeleccionadosIds: [...suscripcionActual.platosSeleccionadosIds]
    };

    return this.recalcularYGuardar(suscripcion, platosDisponibles);
  }

  actualizarSeleccionPlatos(
    platosSeleccionadosIds: number[],
    platosDisponibles: Plato[]
  ): UserSubscription {
    const suscripcionActual = this.obtenerSuscripcion();
    const suscripcionActualizada: UserSubscription = {
      ...suscripcionActual,
      platosSeleccionadosIds: this.normalizarIds(platosSeleccionadosIds)
    };

    return this.recalcularYGuardar(suscripcionActualizada, platosDisponibles);
  }

  limpiarSeleccionPlatos(platosDisponibles: Plato[]): UserSubscription {
    return this.actualizarSeleccionPlatos([], platosDisponibles);
  }

  eliminarPlatoSeleccionado(platoId: number, platosDisponibles: Plato[]): UserSubscription {
    const suscripcionActual = this.obtenerSuscripcion();
    return this.actualizarSeleccionPlatos(
      suscripcionActual.platosSeleccionadosIds.filter(id => id !== platoId),
      platosDisponibles
    );
  }

  eliminarUnaUnidadSeleccionada(platoId: number, platosDisponibles: Plato[]): UserSubscription {
    const suscripcionActual = this.obtenerSuscripcion();
    const idsActualizados = [...suscripcionActual.platosSeleccionadosIds];
    const indice = idsActualizados.lastIndexOf(platoId);

    if (indice === -1) {
      return suscripcionActual;
    }

    idsActualizados.splice(indice, 1);
    return this.actualizarSeleccionPlatos(idsActualizados, platosDisponibles);
  }

  obtenerDescuentoPorcentaje(): number {
    return this.obtenerDescuentoPorPlan(this.obtenerSuscripcion().planSemanal);
  }

  obtenerDescuentoPorPlan(planSemanal: PlanSemanal): number {
    return this.descuentosPorPlan[planSemanal] ?? 0;
  }

  suscripcionActiva(): boolean {
    return this.obtenerSuscripcion().activa;
  }

  tienePlatoSeleccionado(platoId: number): boolean {
    return this.obtenerSuscripcion().platosSeleccionadosIds.includes(platoId);
  }

  suscripcionCompleta(): boolean {
    const suscripcion = this.obtenerSuscripcion();

    if (!suscripcion.activa) {
      return true;
    }

    return suscripcion.platosSeleccionadosIds.length >= this.minimoPlatosSuscripcion;
  }

  obtenerPlatosPendientes(): number {
    const suscripcion = this.obtenerSuscripcion();

    if (!suscripcion.activa) {
      return 0;
    }

    return Math.max(this.minimoPlatosSuscripcion - suscripcion.platosSeleccionadosIds.length, 0);
  }

  obtenerCantidadSeleccionada(): number {
    return this.obtenerSuscripcion().platosSeleccionadosIds.length;
  }

  obtenerPlanSemanalActual(): PlanSemanal {
    return this.obtenerSuscripcion().planSemanal;
  }

  obtenerMinimoPlatosSuscripcion(): number {
    return this.minimoPlatosSuscripcion;
  }

  async refrescarDesdeApi(): Promise<void> {
    this.sincronizarCacheConUsuarioActual();
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      this.suscripcionCache = this.obtenerSuscripcionPorDefecto();
      return;
    }

    try {
      const suscripcionApi = await firstValueFrom(
        this.http.get<UserSubscription>(`${this.apiUrl}?userId=${userId}`)
      );

      this.suscripcionCache = this.normalizarSuscripcion(suscripcionApi);
      this.persistirLocal();
    } catch (error) {
      console.warn('No se ha podido cargar la suscripcion desde la API. Se usa localStorage.', error);
    }
  }

  private async guardarEnApi(suscripcion: UserSubscription): Promise<void> {
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      return;
    }

    try {
      const suscripcionApi = await firstValueFrom(
        this.http.put<UserSubscription>(this.apiUrl, {
          ...suscripcion,
          userId
        })
      );

      this.suscripcionCache = this.normalizarSuscripcion(suscripcionApi);
      this.persistirLocal();
    } catch (error) {
      console.warn('No se ha podido guardar la suscripcion en la API. Se conserva localmente.', error);
    }
  }

  private async guardarEnApiEstricto(suscripcion: UserSubscription): Promise<void> {
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      throw new Error('No hay usuario activo para guardar la suscripcion.');
    }

    const suscripcionApi = await firstValueFrom(
      this.http.put<UserSubscription>(this.apiUrl, {
        ...suscripcion,
        userId
      })
    );

    this.suscripcionCache = this.normalizarSuscripcion(suscripcionApi);
    this.persistirLocal();
  }

  private persistirLocal(): void {
    localStorage.setItem(this.obtenerStorageKey(), JSON.stringify(this.suscripcionCache));
  }

  private cargarSuscripcionLocal(): UserSubscription {
    const suscripcionGuardada = localStorage.getItem(this.obtenerStorageKey());

    if (!suscripcionGuardada) {
      return this.obtenerSuscripcionPorDefecto();
    }

    try {
      const suscripcion = JSON.parse(suscripcionGuardada) as Partial<UserSubscription>;
      return this.normalizarSuscripcion(suscripcion);
    } catch {
      return this.obtenerSuscripcionPorDefecto();
    }
  }

  private obtenerSuscripcionPorDefecto(): UserSubscription {
    return {
      activa: false,
      planSemanal: this.minimoPlatosSuscripcion,
      diaEntrega: 'lunes',
      platosPorSemana: this.minimoPlatosSuscripcion,
      platosSeleccionadosIds: [],
      precioOriginal: 0,
      descuentoAplicado: 0,
      precioEstimado: 0,
      proximaEntrega: this.calcularProximaEntregaTexto('lunes'),
      proximaEntregaIso: this.calcularProximaEntregaIso('lunes')
    };
  }

  private normalizarSuscripcion(suscripcion: Partial<UserSubscription>): UserSubscription {
    const planSemanal = this.normalizarPlan(suscripcion.planSemanal);
    const diaEntrega = this.normalizarDiaEntrega(suscripcion.diaEntrega);
    const proximaEntregaIso = this.calcularProximaEntregaIso(diaEntrega);
    const proximaEntrega = this.calcularProximaEntregaTexto(diaEntrega);

    return {
      activa: Boolean(suscripcion.activa),
      planSemanal,
      diaEntrega,
      platosPorSemana: this.minimoPlatosSuscripcion,
      platosSeleccionadosIds: this.normalizarIds(suscripcion.platosSeleccionadosIds),
      precioOriginal: this.normalizarNumero(suscripcion.precioOriginal),
      descuentoAplicado: this.normalizarNumero(suscripcion.descuentoAplicado),
      precioEstimado: this.normalizarNumero(suscripcion.precioEstimado),
      proximaEntrega,
      proximaEntregaIso
    };
  }

  private recalcularYGuardar(
    suscripcion: UserSubscription,
    platosDisponibles: Plato[]
  ): UserSubscription {
    const precioOriginal = this.calcularPrecioOriginal(
      suscripcion.platosSeleccionadosIds,
      platosDisponibles
    );
    const descuentoAplicado = suscripcion.activa
      ? this.calcularDescuento(precioOriginal, suscripcion.planSemanal)
      : 0;

    const suscripcionRecalculada: UserSubscription = {
      ...suscripcion,
      precioOriginal,
      descuentoAplicado,
      precioEstimado: this.calcularPrecioFinal(precioOriginal, descuentoAplicado),
      proximaEntrega: this.calcularProximaEntregaTexto(suscripcion.diaEntrega),
      proximaEntregaIso: this.calcularProximaEntregaIso(suscripcion.diaEntrega)
    };

    this.guardarSuscripcion(suscripcionRecalculada);
    return suscripcionRecalculada;
  }

  private normalizarIds(valor: unknown): number[] {
    if (!Array.isArray(valor)) {
      return [];
    }

    return valor.filter((item): item is number => typeof item === 'number');
  }

  private normalizarNumero(valor: unknown): number {
    if (typeof valor === 'number') {
      return valor;
    }

    if (typeof valor === 'string') {
      const numero = Number(valor);
      return Number.isNaN(numero) ? 0 : numero;
    }

    return 0;
  }

  private normalizarPlan(valor: unknown): PlanSemanal {
    return this.minimoPlatosSuscripcion;
  }

  private normalizarDiaEntrega(valor: unknown): DiaEntregaSemanal {
    if (
      typeof valor === 'string' &&
      this.diasEntregaSemana.includes(valor as DiaEntregaSemanal)
    ) {
      return valor as DiaEntregaSemanal;
    }

    return 'lunes';
  }

  private calcularPrecioOriginal(ids: number[], platosDisponibles: Plato[]): number {
    const total = ids.reduce((acumulado, id) => {
      const plato = platosDisponibles.find(item => item.id === id);
      return acumulado + Number(plato?.price ?? 0);
    }, 0);

    return Number(total.toFixed(2));
  }

  private calcularDescuento(precioOriginal: number, planSemanal: PlanSemanal): number {
    const descuento = this.obtenerDescuentoPorPlan(planSemanal);
    return Number((precioOriginal * descuento).toFixed(2));
  }

  private calcularPrecioFinal(precioOriginal: number, descuentoAplicado: number): number {
    return Number((precioOriginal - descuentoAplicado).toFixed(2));
  }

  private calcularProximaEntregaIso(diaEntrega: DiaEntregaSemanal): string {
    const hoy = new Date();
    const proximaEntrega = new Date(hoy);
    const diaObjetivo = this.diaSemanaPorNombre[diaEntrega];
    let diasHastaEntrega = (diaObjetivo - hoy.getDay() + 7) % 7;

    if (diasHastaEntrega === 0 && hoy.getHours() >= 13) {
      diasHastaEntrega = 7;
    }

    proximaEntrega.setDate(hoy.getDate() + diasHastaEntrega);
    proximaEntrega.setHours(13, 0, 0, 0);

    return proximaEntrega.toISOString();
  }

  private calcularProximaEntregaTexto(diaEntrega: DiaEntregaSemanal): string {
    const proximaEntrega = new Date(this.calcularProximaEntregaIso(diaEntrega));
    const diaEtiqueta = this.etiquetaDiaPorNombre[diaEntrega];
    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long'
    }).format(proximaEntrega);

    return `${diaEtiqueta} ${fechaFormateada}`;
  }

  private sincronizarCacheConUsuarioActual(): void {
    const usuarioIdActual = this.userSessionService.obtenerUsuarioIdActual();

    if (this.cacheUsuarioId === usuarioIdActual) {
      return;
    }

    this.cacheUsuarioId = usuarioIdActual;
    this.suscripcionCache = usuarioIdActual
      ? this.cargarSuscripcionLocal()
      : this.obtenerSuscripcionPorDefecto();
  }

  private obtenerStorageKey(): string {
    return `${this.storageKeyBase}-${this.userSessionService.obtenerUsuarioIdActual() ?? 'guest'}`;
  }
}
