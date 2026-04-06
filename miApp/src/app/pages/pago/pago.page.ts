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
  IonCardTitle,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { CarritoItem } from '../../models/carrito-item.model';
import { CarritoService } from '../../services/carrito.service';
import { OrderService } from '../../services/order.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { DireccionPrincipal, TarjetaPrincipal } from '../../models/profile.model';
import { MetodoPagoPedido, Pedido } from '../../models/order.model';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';
import { DiaEntregaSemanal } from '../../models/subscription.model';

interface DireccionEntrega {
  id: number;
  nombre: string;
  linea: string;
  instrucciones: string;
}

@Component({
  selector: 'app-pago',
  templateUrl: './pago.page.html',
  styleUrls: ['./pago.page.scss'],
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
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonRadioGroup,
    IonRadio,
    IonInput,
    IonButton,
    IonFooter
  ]
})
export class PagoPage implements OnInit {
  items: CarritoItem[] = [];
  procesandoPago = false;
  intentoConfirmarPedido = false;

  direcciones: DireccionEntrega[] = [];
  direccionSeleccionadaId: number | null = null;
  franjaSeleccionada = '13:00-16:00';
  metodoPagoSeleccionado = 'tarjeta';
  diaEntregaSuscripcion: DiaEntregaSemanal = 'lunes';

  nombreTitular = '';
  numeroTarjeta = '';
  fechaCaducidad = '';
  cvv = '';

  readonly diasEntregaSuscripcion: { valor: DiaEntregaSemanal; etiqueta: string }[] = [
    { valor: 'lunes', etiqueta: 'Lunes' },
    { valor: 'martes', etiqueta: 'Martes' },
    { valor: 'miercoles', etiqueta: 'Miércoles' },
    { valor: 'jueves', etiqueta: 'Jueves' },
    { valor: 'viernes', etiqueta: 'Viernes' },
    { valor: 'sabado', etiqueta: 'Sábado' },
    { valor: 'domingo', etiqueta: 'Domingo' }
  ];

  constructor(
    private carritoService: CarritoService,
    private router: Router,
    private profileService: ProfileService,
    private subscriptionService: SubscriptionService,
    private orderService: OrderService,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService
  ) {}

  ngOnInit(): void {
    this.cargarPedido();
  }

  ionViewWillEnter(): void {
    this.cargarPedido();
  }

  cargarPedido(): void {
    this.items = this.carritoService.obtenerItems();

    if (this.items.length === 0) {
      this.router.navigateByUrl('/resumen');
      return;
    }

    if (this.esPedidoSuscripcion() && !this.subscriptionService.suscripcionCompleta()) {
      this.router.navigateByUrl('/resumen');
      return;
    }

    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/pago' }
      });
      return;
    }

    if (!this.profileService.tienePerfilCompletoParaPago()) {
      this.router.navigate(['/perfil'], {
        queryParams: { redirect: '/pago' }
      });
      return;
    }

    this.cargarEstadoPerfil();
  }

  obtenerSubtotal(item: CarritoItem): number {
    return item.plato.price * item.cantidad;
  }

  obtenerTotal(): number {
    return this.carritoService.obtenerTotal();
  }

  obtenerFechaEntregaResumen(): string {
    const fechaEntrega = new Date(this.calcularFechaEntregaProgramada());

    if (Number.isNaN(fechaEntrega.getTime())) {
      return '';
    }

    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Madrid'
    }).format(fechaEntrega);

    return `${fechaFormateada} · ${this.franjaSeleccionada}`;
  }

  obtenerDireccionSeleccionada(): DireccionEntrega | undefined {
    return this.direcciones.find(direccion => direccion.id === this.direccionSeleccionadaId);
  }

  obtenerDireccionesDisponibles(): DireccionEntrega[] {
    return this.direcciones;
  }

  esPedidoSuscripcion(): boolean {
    return (
      this.subscriptionService.suscripcionActiva() &&
      !(this.firstOrderService.estaActivo() && this.firstOrderService.esModoIndividual())
    );
  }

  mostrarSelectorDiaSuscripcion(): boolean {
    return this.firstOrderService.estaActivo() && this.firstOrderService.esModoSuscripcion();
  }

  tarjetaGuardadaEnmascaradaVisible(): boolean {
    return this.profileService.tarjetaPrincipalGuardadaEsUsable(this.obtenerTarjetaActualFormulario());
  }

  formularioTarjetaValido(): boolean {
    const tarjetaActual = this.obtenerTarjetaActualFormulario();

    if (this.profileService.tarjetaPrincipalGuardadaEsUsable(tarjetaActual)) {
      return true;
    }

    return (
      this.nombreTitularValido() &&
      this.numeroTarjetaValido() &&
      this.fechaCaducidadValida() &&
      this.cvvValido()
    );
  }

  nombreTitularValido(): boolean {
    return this.profileService.nombreTitularTarjetaEsValido(this.nombreTitular);
  }

  numeroTarjetaValido(): boolean {
    return this.profileService.numeroTarjetaEsValido(this.numeroTarjeta);
  }

  fechaCaducidadValida(): boolean {
    return this.profileService.fechaCaducidadTarjetaEsValida(this.fechaCaducidad);
  }

  cvvValido(): boolean {
    return this.profileService.cvvEsValido(this.cvv);
  }

  mostrarErrorTarjeta(campo: 'titular' | 'numero' | 'fecha' | 'cvv'): boolean {
    if (this.metodoPagoSeleccionado !== 'tarjeta') {
      return false;
    }

    if (this.profileService.tarjetaPrincipalGuardadaEsUsable(this.obtenerTarjetaActualFormulario())) {
      return false;
    }

    if (campo === 'titular') {
      return (this.intentoConfirmarPedido || this.nombreTitular.trim() !== '') && !this.nombreTitularValido();
    }

    if (campo === 'numero') {
      return (this.intentoConfirmarPedido || this.numeroTarjeta.trim() !== '') && !this.numeroTarjetaValido();
    }

    if (campo === 'fecha') {
      return (this.intentoConfirmarPedido || this.fechaCaducidad.trim() !== '') && !this.fechaCaducidadValida();
    }

    return (this.intentoConfirmarPedido || this.cvv.trim() !== '') && !this.cvvValido();
  }

  actualizarNumeroTarjeta(event: CustomEvent): void {
    const valor = String(event.detail.value ?? '');
    const digitos = valor.replace(/\D/g, '').slice(0, 16);
    this.numeroTarjeta = digitos.replace(/(.{4})/g, '$1 ').trim();
  }

  actualizarNombreTitular(event: CustomEvent): void {
    this.nombreTitular = String(event.detail.value ?? '')
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s+/, '');
  }

  actualizarFechaCaducidad(event: CustomEvent): void {
    const valor = String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 4);

    if (valor.length <= 2) {
      this.fechaCaducidad = valor;
      return;
    }

    this.fechaCaducidad = `${valor.slice(0, 2)}/${valor.slice(2)}`;
  }

  actualizarCvv(event: CustomEvent): void {
    this.cvv = String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 3);
  }

  actualizarDiaEntregaSuscripcion(event: CustomEvent): void {
    const diaEntrega = event.detail.value as DiaEntregaSemanal;
    this.diaEntregaSuscripcion = diaEntrega;

    const suscripcionActualizada = this.subscriptionService.previsualizarSuscripcion({
      ...this.subscriptionService.obtenerSuscripcion(),
      activa: true,
      diaEntrega
    });

    this.subscriptionService.establecerSuscripcionTemporal(suscripcionActualizada);
    this.firstOrderService.guardarSuscripcionTemporal(suscripcionActualizada);
  }

  puedeConfirmarPedido(): boolean {
    if (
      !this.direccionSeleccionadaId ||
      !this.franjaSeleccionada ||
      !this.metodoPagoSeleccionado ||
      this.items.length === 0 ||
      this.obtenerDireccionesDisponibles().length === 0
    ) {
      return false;
    }

    if (this.metodoPagoSeleccionado === 'tarjeta') {
      return this.formularioTarjetaValido();
    }

    return true;
  }

  async confirmarPedido(): Promise<void> {
    this.intentoConfirmarPedido = true;

    if (!this.puedeConfirmarPedido() || this.procesandoPago) {
      return;
    }

    this.procesandoPago = true;

    const pedidoEsSuscripcion = this.esPedidoSuscripcion();

    if (this.firstOrderService.estaActivo() && this.firstOrderService.esModoSuscripcion()) {
      await this.subscriptionService.persistirSuscripcionActual();
    }

    await this.guardarTarjetaEnPerfil();
    await this.guardarPedidoConfirmado();

    await this.orderService.refrescarDesdeApi();
    if (pedidoEsSuscripcion) {
      await this.subscriptionService.refrescarDesdeApi();
    }

    this.firstOrderService.finalizarProceso();

    setTimeout(() => {
      if (pedidoEsSuscripcion) {
        this.carritoService.reiniciarCarrito();
      } else {
        this.carritoService.vaciarCarrito();
      }
      this.router.navigateByUrl('/confirmacion');
    }, 1000);
  }

  private cargarEstadoPerfil(): void {
    const perfil = this.profileService.obtenerPerfil();
    this.cargarTarjetaDesdePerfil(perfil.tarjetaPrincipal);
    this.cargarDireccionesDesdePerfil();
    this.diaEntregaSuscripcion = this.subscriptionService.obtenerSuscripcion().diaEntrega;
  }

  private cargarDireccionesDesdePerfil(): void {
    const direccion = this.profileService.obtenerPerfil().direccionPrincipal;

    if (!direccion) {
      this.direcciones = [];
      this.direccionSeleccionadaId = null;
      return;
    }

    this.direcciones = [
      {
        id: 1,
        nombre: direccion.nombre,
        linea: this.construirLineaDireccion(direccion),
        instrucciones: direccion.instrucciones
      }
    ];
    this.direccionSeleccionadaId = 1;
  }

  private construirLineaDireccion(direccion: DireccionPrincipal): string {
    const ciudadProvincia = [direccion.codigoPostal, direccion.ciudad, direccion.provincia]
      .filter(Boolean)
      .join(' ');

    return [direccion.calleNumero, ciudadProvincia, direccion.telefono]
      .filter(Boolean)
      .join(' · ');
  }

  private obtenerNumeroTarjetaSoloDigitos(): string {
    return this.numeroTarjeta.replace(/\D/g, '');
  }

  private cargarTarjetaDesdePerfil(tarjeta: TarjetaPrincipal | null): void {
    this.nombreTitular = tarjeta?.nombreTitular ?? '';
    this.numeroTarjeta = tarjeta?.numeroTarjeta ?? '';
    this.fechaCaducidad = tarjeta?.fechaCaducidad ?? '';
    this.cvv = tarjeta?.cvv ?? '';
  }

  private async guardarTarjetaEnPerfil(): Promise<void> {
    const tarjetaActual = this.obtenerTarjetaActualFormulario();

    if (!this.formularioTarjetaValido()) {
      return;
    }

    if (this.profileService.tarjetaPrincipalGuardadaEsUsable(tarjetaActual)) {
      return;
    }

    const perfilActual = this.profileService.obtenerPerfil();

    await this.profileService.guardarPerfilPersistido({
      ...perfilActual,
      tarjetaPrincipal: {
        nombreTitular: tarjetaActual.nombreTitular,
        numeroTarjeta: tarjetaActual.numeroTarjeta,
        fechaCaducidad: tarjetaActual.fechaCaducidad,
        cvv: tarjetaActual.cvv
      }
    });
  }

  private obtenerTarjetaActualFormulario(): TarjetaPrincipal {
    return {
      nombreTitular: this.nombreTitular.trim(),
      numeroTarjeta: this.numeroTarjeta.trim(),
      fechaCaducidad: this.fechaCaducidad.trim(),
      cvv: this.cvv.trim()
    };
  }

  private async guardarPedidoConfirmado(): Promise<void> {
    const direccionEntrega = this.obtenerDireccionSeleccionada();
    const pedidoEsSuscripcion = this.esPedidoSuscripcion();

    if (!direccionEntrega) {
      return;
    }

    const pedido: Pedido = {
      id: crypto.randomUUID(),
      numeroPedido: this.orderService.generarNumeroPedido(),
      fechaCreacion: new Date().toISOString(),
      fechaEntregaProgramada: this.calcularFechaEntregaProgramada(),
      estado: 'confirmado',
      items: this.items.map(item => ({
        platoId: item.plato.id,
        nombre: item.plato.name,
        cantidad: item.cantidad,
        precioUnitario: item.plato.price,
        subtotal: item.plato.price * item.cantidad,
        imagen: item.plato.image,
        tipoLinea: pedidoEsSuscripcion && this.subscriptionService.tienePlatoSeleccionado(item.plato.id)
          ? 'suscripcion'
          : 'extra'
      })),
      total: this.obtenerTotal(),
      franjaEntrega: this.franjaSeleccionada,
      direccionEntrega: {
        nombre: direccionEntrega.nombre,
        linea: direccionEntrega.linea,
        instrucciones: direccionEntrega.instrucciones
      },
      metodoPago: this.metodoPagoSeleccionado as MetodoPagoPedido,
      esSuscripcion: pedidoEsSuscripcion
    };

    await this.orderService.guardarPedido(pedido);
  }

  private calcularFechaEntregaProgramada(): string {
    const horaInicioFranja = this.obtenerHoraInicioFranja();

    if (this.esPedidoSuscripcion()) {
      const fechaEntrega = new Date(this.subscriptionService.obtenerSuscripcion().proximaEntregaIso);
      fechaEntrega.setHours(horaInicioFranja, 0, 0, 0);

      const ultimaEntregaCliente = this.obtenerUltimaEntregaCliente();
      if (ultimaEntregaCliente) {
        this.avanzarHastaSemanaPosterior(fechaEntrega, ultimaEntregaCliente, horaInicioFranja);
      }

      return fechaEntrega.toISOString();
    }

    const ahora = new Date();
    const fechaEntrega = new Date(ahora);
    fechaEntrega.setHours(horaInicioFranja, 0, 0, 0);

    if (fechaEntrega.getTime() <= ahora.getTime()) {
      fechaEntrega.setDate(fechaEntrega.getDate() + 1);
    }

    return fechaEntrega.toISOString();
  }

  private obtenerHoraInicioFranja(): number {
    const coincidencia = this.franjaSeleccionada.match(/^(\d{1,2})/);
    return coincidencia ? Number(coincidencia[1]) : 13;
  }

  private obtenerUltimaEntregaCliente(): Date | null {
    const fechas = this.orderService
      .obtenerPedidos()
      .map(pedido => new Date(pedido.fechaEntregaProgramada))
      .filter(fecha => !Number.isNaN(fecha.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return fechas[0] ?? null;
  }

  private esMismoDiaOPosteriorAnterior(fechaCandidata: Date, ultimaEntrega: Date): boolean {
    const candidata = new Date(fechaCandidata);
    const ultima = new Date(ultimaEntrega);

    candidata.setHours(0, 0, 0, 0);
    ultima.setHours(0, 0, 0, 0);

    return candidata.getTime() <= ultima.getTime();
  }

  private avanzarHastaSemanaPosterior(
    fechaCandidata: Date,
    ultimaEntrega: Date,
    horaInicioFranja: number
  ): void {
    while (this.esMismaSemanaOAnterior(fechaCandidata, ultimaEntrega)) {
      fechaCandidata.setDate(fechaCandidata.getDate() + 7);
      fechaCandidata.setHours(horaInicioFranja, 0, 0, 0);
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
}
