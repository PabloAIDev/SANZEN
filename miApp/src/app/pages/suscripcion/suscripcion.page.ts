import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonText,
  IonThumbnail,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  DiaEntregaSemanal,
  PlanSemanal,
  UserSubscription
} from '../../models/subscription.model';
import { SubscriptionService } from '../../services/subscription.service';
import { CarritoService } from '../../services/carrito.service';
import { UserSessionService } from '../../services/user-session.service';
import { PlatoService } from '../../services/plato.service';
import { ProfileService } from '../../services/profile.service';
import { OrderService } from '../../services/order.service';
import { CarritoItem } from '../../models/carrito-item.model';

interface DiaEntregaOption {
  valor: DiaEntregaSemanal;
  etiqueta: string;
}

@Component({
  selector: 'app-suscripcion',
  templateUrl: './suscripcion.page.html',
  styleUrls: ['./suscripcion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonText,
    IonThumbnail
  ]
})
export class SuscripcionPage implements OnInit {
  suscripcion: UserSubscription = this.subscriptionService.obtenerSuscripcion();
  seleccionActual: CarritoItem[] = [];
  readonly minimoPlatosSuscripcion: PlanSemanal =
    this.subscriptionService.obtenerMinimoPlatosSuscripcion() as PlanSemanal;

  readonly diasEntrega: DiaEntregaOption[] = [
    { valor: 'lunes', etiqueta: 'Lunes' },
    { valor: 'martes', etiqueta: 'Martes' },
    { valor: 'miercoles', etiqueta: 'Miércoles' },
    { valor: 'jueves', etiqueta: 'Jueves' },
    { valor: 'viernes', etiqueta: 'Viernes' },
    { valor: 'sabado', etiqueta: 'Sábado' },
    { valor: 'domingo', etiqueta: 'Domingo' }
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

  constructor(
    private subscriptionService: SubscriptionService,
    private carritoService: CarritoService,
    private platoService: PlatoService,
    private profileService: ProfileService,
    private orderService: OrderService,
    private userSessionService: UserSessionService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cargarSuscripcion();
  }

  ionViewWillEnter(): void {
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cargarSuscripcion();
  }

  cargarSuscripcion(): void {
    this.suscripcion = this.subscriptionService.obtenerSuscripcion();

    if (
      this.suscripcion.activa &&
      this.suscripcion.platosSeleccionadosIds.length > 0 &&
      this.carritoService.obtenerCantidadTotalItems() === 0
    ) {
      this.carritoService.cargarDesdeSuscripcion(
        this.suscripcion.platosSeleccionadosIds,
        this.platoService.obtenerPlatos()
      );
    }

    this.actualizarSeleccionActual();
  }

  onToggleActiva(event: CustomEvent): void {
    this.suscripcion.activa = Boolean(event.detail.checked);
  }

  onDiaEntregaChange(diaEntrega: DiaEntregaSemanal): void {
    this.suscripcion.diaEntrega = diaEntrega;
    this.cargarSuscripcionActualizada();
  }

  obtenerDescuentoPlan(): number {
    return this.subscriptionService.obtenerDescuentoPorPlan(this.suscripcion.planSemanal) * 100;
  }

  obtenerProximaEntregaResumen(): string {
    const proximaEntregaBase = this.suscripcion.proximaEntregaIso
      ? new Date(this.suscripcion.proximaEntregaIso)
      : this.calcularProximaEntregaDesdeHoy(this.suscripcion.diaEntrega);

    const ultimaEntregaCliente = this.obtenerUltimaEntregaCliente();

    if (ultimaEntregaCliente) {
      this.avanzarHastaSemanaPosterior(proximaEntregaBase, ultimaEntregaCliente);
    }

    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long'
    }).format(proximaEntregaBase);

    return `${this.suscripcion.diaEntrega} ${fechaFormateada}`;
  }

  puedeSimularRenovacion(): boolean {
    return this.suscripcion.activa && this.subscriptionService.suscripcionCompleta();
  }

  async simularRenovacionSemanal(): Promise<void> {
    if (!this.puedeSimularRenovacion()) {
      await this.mostrarToast(
        'Necesitas una suscripción activa con al menos 5 platos para realizar la renovación.',
        'warning'
      );
      return;
    }

    try {
      const resultado = await this.subscriptionService.simularRenovacionSemanal();
      await this.orderService.refrescarDesdeApi();
      this.suscripcion = this.subscriptionService.obtenerSuscripcion();
      await this.mostrarToast(
        `Pedido semanal ${resultado.numeroPedido} generado correctamente.`,
        'success'
      );
      await this.router.navigateByUrl('/mis-pedidos');
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as { error?: { message?: string } }).error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : error instanceof Error
            ? error.message
            : 'No se ha podido simular la renovación semanal.';
      await this.mostrarToast(message, 'danger');
    }
  }

  async guardarSuscripcion(): Promise<void> {
    this.suscripcion = this.subscriptionService.guardarPlan(
      this.minimoPlatosSuscripcion,
      this.suscripcion.activa,
      this.suscripcion.diaEntrega,
      this.platoService.obtenerPlatos()
    );

    if (this.suscripcion.activa) {
      const idsCarrito = this.carritoService.obtenerIdsPlatosSuscripcion();

      if (idsCarrito.length > 0) {
        this.suscripcion = this.subscriptionService.actualizarSeleccionPlatos(
          idsCarrito,
          this.platoService.obtenerPlatos()
        );
      } else {
        await this.subscriptionService.refrescarDesdeApi();
        this.suscripcion = this.subscriptionService.obtenerSuscripcion();

        if (this.suscripcion.platosSeleccionadosIds.length > 0) {
          this.carritoService.cargarDesdeSuscripcion(
            this.suscripcion.platosSeleccionadosIds,
            this.platoService.obtenerPlatos()
          );
        }
      }
    } else {
      this.carritoService.reiniciarCarrito();
    }

    await this.router.navigate(['/menu'], {
      queryParams: { subscriptionSelection: this.suscripcion.activa ? '1' : '0' }
    });
  }

  obtenerSubtotalSeleccionActual(): number {
    return Number(
      this.seleccionActual
        .reduce((total, item) => total + item.plato.price * item.cantidad, 0)
        .toFixed(2)
    );
  }

  obtenerDescuentoSeleccionActual(): number {
    return Number(
      (this.obtenerSubtotalSeleccionActual() * this.subscriptionService.obtenerDescuentoPorPlan(this.minimoPlatosSuscripcion))
        .toFixed(2)
    );
  }

  obtenerTotalSeleccionActual(): number {
    return Number(
      (this.obtenerSubtotalSeleccionActual() - this.obtenerDescuentoSeleccionActual()).toFixed(2)
    );
  }

  tieneSeleccionGuardada(): boolean {
    return this.seleccionActual.length > 0;
  }

  async irAModificarSeleccion(): Promise<void> {
    await this.router.navigate(['/menu'], {
      queryParams: { subscriptionSelection: '1' }
    });
  }

  private cargarSuscripcionActualizada(): void {
    this.suscripcion = this.subscriptionService.previsualizarSuscripcion({
      ...this.suscripcion
    });
  }

  private obtenerUltimaEntregaCliente(): Date | null {
    const fechas = this.orderService
      .obtenerPedidos()
      .map(pedido => new Date(pedido.fechaEntregaProgramada))
      .filter(fecha => !Number.isNaN(fecha.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return fechas[0] ?? null;
  }

  private calcularProximaEntregaDesdeHoy(diaEntrega: DiaEntregaSemanal): Date {
    const hoy = new Date();
    const proximaEntrega = new Date(hoy);
    const diaObjetivo = this.diaSemanaPorNombre[diaEntrega];
    let diasHastaEntrega = (diaObjetivo - hoy.getDay() + 7) % 7;

    if (diasHastaEntrega === 0 && hoy.getHours() >= 13) {
      diasHastaEntrega = 7;
    }

    proximaEntrega.setDate(hoy.getDate() + diasHastaEntrega);
    proximaEntrega.setHours(13, 0, 0, 0);
    return proximaEntrega;
  }

  private avanzarHastaSemanaPosterior(fechaCandidata: Date, ultimaEntrega: Date): void {
    while (this.esMismaSemanaOAnterior(fechaCandidata, ultimaEntrega)) {
      fechaCandidata.setDate(fechaCandidata.getDate() + 7);
      fechaCandidata.setHours(13, 0, 0, 0);
    }
  }

  private esMismaSemanaOAnterior(fechaCandidata: Date, ultimaEntrega: Date): boolean {
    const inicioSemanaCandidata = this.obtenerInicioSemana(fechaCandidata);
    const inicioSemanaUltima = this.obtenerInicioSemana(ultimaEntrega);

    return inicioSemanaCandidata.getTime() <= inicioSemanaUltima.getTime();
  }

  private obtenerInicioSemana(fecha: Date): Date {
    const inicioSemana = new Date(fecha);
    inicioSemana.setHours(0, 0, 0, 0);

    const diaSemana = inicioSemana.getDay();
    const desplazamientoLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioSemana.setDate(inicioSemana.getDate() + desplazamientoLunes);

    return inicioSemana;
  }

  private actualizarSeleccionActual(): void {
    const cantidades = new Map<number, number>();

    for (const platoId of this.suscripcion.platosSeleccionadosIds) {
      cantidades.set(platoId, (cantidades.get(platoId) ?? 0) + 1);
    }

    this.seleccionActual = Array.from(cantidades.entries())
      .map(([platoId, cantidad]) => {
        const plato = this.platoService.obtenerPlatos().find(item => item.id === platoId);

        if (!plato) {
          return null;
        }

        return {
          plato,
          cantidad
        };
      })
      .filter((item): item is CarritoItem => item !== null);
  }

  private async mostrarToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      color,
      position: 'middle'
    });

    await toast.present();
  }
}

