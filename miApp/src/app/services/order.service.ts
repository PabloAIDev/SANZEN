import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pedido } from '../models/order.model';
import { UserSessionService } from './user-session.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly storageKeyBase = 'sanzen-orders';
  private readonly ultimoPedidoKeyBase = 'sanzen-last-order-id';
  private readonly apiUrl = `${environment.apiBaseUrl}/pedidos`;
  private pedidosCache: Pedido[] = [];
  private cacheUsuarioId: number | null = null;

  constructor(
    private http: HttpClient,
    private userSessionService: UserSessionService
  ) {}

  async cargarInicial(): Promise<void> {
    await this.refrescarDesdeApi();
  }

  obtenerPedidos(): Pedido[] {
    this.sincronizarCacheConUsuarioActual();
    return this.pedidosCache.map(pedido => this.normalizarPedido(pedido));
  }

  async guardarPedido(pedido: Pedido): Promise<Pedido> {
    this.sincronizarCacheConUsuarioActual();
    const pedidoNormalizado = this.normalizarPedido(pedido);
    this.actualizarCacheConPedido(pedidoNormalizado);
    localStorage.setItem(this.obtenerUltimoPedidoKey(), pedidoNormalizado.id);

    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      return pedidoNormalizado;
    }

    try {
      const pedidoApi = await firstValueFrom(
        this.http.post<Pedido>(this.apiUrl, {
          ...pedidoNormalizado,
          userId
        })
      );

      const pedidoPersistido = this.normalizarPedido(pedidoApi);
      this.actualizarCacheConPedido(pedidoPersistido);
      localStorage.setItem(this.obtenerUltimoPedidoKey(), pedidoPersistido.id);
      return pedidoPersistido;
    } catch (error) {
      console.warn('No se ha podido guardar el pedido en la API. Se conserva en localStorage.', error);
      return pedidoNormalizado;
    }
  }

  async guardarPedidoPersistido(pedido: Pedido): Promise<Pedido> {
    this.sincronizarCacheConUsuarioActual();
    const pedidoNormalizado = this.normalizarPedido(pedido);
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      throw new Error('No hay usuario activo para guardar el pedido.');
    }

    const pedidoApi = await firstValueFrom(
      this.http.post<Pedido>(this.apiUrl, {
        ...pedidoNormalizado,
        userId
      })
    );

    const pedidoPersistido = this.normalizarPedido(pedidoApi);
    this.actualizarCacheConPedido(pedidoPersistido);
    localStorage.setItem(this.obtenerUltimoPedidoKey(), pedidoPersistido.id);
    return pedidoPersistido;
  }

  obtenerUltimoPedido(): Pedido | null {
    this.sincronizarCacheConUsuarioActual();
    const ultimoPedidoId = localStorage.getItem(this.obtenerUltimoPedidoKey());

    if (!ultimoPedidoId) {
      return null;
    }

    return this.obtenerPedidos().find(pedido => pedido.id === ultimoPedidoId) ?? null;
  }

  generarNumeroPedido(): string {
    const fecha = new Date();
    const marca = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(
      fecha.getDate()
    ).padStart(2, '0')}`;
    const sufijo = Math.floor(1000 + Math.random() * 9000);

    return `SZ-${marca}-${sufijo}`;
  }

  async refrescarDesdeApi(): Promise<void> {
    this.sincronizarCacheConUsuarioActual();
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      this.pedidosCache = [];
      return;
    }

    try {
      const pedidosApi = await firstValueFrom(this.http.get<Pedido[]>(`${this.apiUrl}?userId=${userId}`));

      if (Array.isArray(pedidosApi)) {
        this.pedidosCache = pedidosApi.map(pedido => this.normalizarPedido(pedido));
        this.persistirCache();
      }
    } catch (error) {
      console.warn('No se han podido cargar los pedidos desde la API. Se usan los datos locales.', error);
    }
  }

  private actualizarCacheConPedido(pedido: Pedido): void {
    const pedidosSinDuplicado = this.pedidosCache.filter(item => item.id !== pedido.id);
    this.pedidosCache = [pedido, ...pedidosSinDuplicado];
    this.persistirCache();
  }

  private persistirCache(): void {
    localStorage.setItem(this.obtenerStorageKey(), JSON.stringify(this.pedidosCache));
  }

  private cargarPedidosLocales(): Pedido[] {
    const pedidosGuardados = localStorage.getItem(this.obtenerStorageKey());

    if (!pedidosGuardados) {
      return [];
    }

    try {
      const pedidos = JSON.parse(pedidosGuardados) as Pedido[];
      return Array.isArray(pedidos) ? pedidos.map(pedido => this.normalizarPedido(pedido)) : [];
    } catch {
      return [];
    }
  }

  private normalizarPedido(pedido: Pedido): Pedido {
    const fechaEntregaProgramada =
      typeof pedido.fechaEntregaProgramada === 'string' && pedido.fechaEntregaProgramada.trim() !== ''
        ? pedido.fechaEntregaProgramada
        : this.calcularFechaEntregaDesdePedido(pedido.fechaCreacion, pedido.franjaEntrega);

    return {
      ...pedido,
      fechaEntregaProgramada,
      estado: this.calcularEstado(fechaEntregaProgramada)
    };
  }

  private calcularEstado(fechaEntregaProgramada: string): 'confirmado' | 'entregado' {
    const fechaEntrega = new Date(fechaEntregaProgramada);

    if (Number.isNaN(fechaEntrega.getTime())) {
      return 'confirmado';
    }

    return fechaEntrega.getTime() <= Date.now() ? 'entregado' : 'confirmado';
  }

  private calcularFechaEntregaDesdePedido(fechaCreacion: string, franjaEntrega: string): string {
    const base = new Date(fechaCreacion);

    if (Number.isNaN(base.getTime())) {
      return new Date().toISOString();
    }

    const coincidencia = franjaEntrega.match(/^(\d{1,2})/);
    const horaInicio = coincidencia ? Number(coincidencia[1]) : 13;

    base.setHours(horaInicio, 0, 0, 0);

    if (base.getTime() <= new Date(fechaCreacion).getTime()) {
      base.setDate(base.getDate() + 1);
    }

    return base.toISOString();
  }

  private sincronizarCacheConUsuarioActual(): void {
    const usuarioIdActual = this.userSessionService.obtenerUsuarioIdActual();

    if (this.cacheUsuarioId === usuarioIdActual) {
      return;
    }

    this.cacheUsuarioId = usuarioIdActual;
    this.pedidosCache = usuarioIdActual ? this.cargarPedidosLocales() : [];
  }

  private obtenerStorageKey(): string {
    return `${this.storageKeyBase}-${this.userSessionService.obtenerUsuarioIdActual() ?? 'guest'}`;
  }

  private obtenerUltimoPedidoKey(): string {
    return `${this.ultimoPedidoKeyBase}-${this.userSessionService.obtenerUsuarioIdActual() ?? 'guest'}`;
  }
}
