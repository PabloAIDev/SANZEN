import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Pedido } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { UserSessionService } from '../../services/user-session.service';

@Component({
  selector: 'app-mis-pedidos',
  templateUrl: './mis-pedidos.page.html',
  styleUrls: ['./mis-pedidos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonChip,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonThumbnail
  ]
})
export class MisPedidosPage implements OnInit {
  pedidos: Pedido[] = [];

  constructor(
    private orderService: OrderService,
    private userSessionService: UserSessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cargarPedidos();
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.userSessionService.haySesionActiva()) {
      await this.router.navigateByUrl('/login');
      return;
    }

    await this.orderService.refrescarDesdeApi();
    this.cargarPedidos();
  }

  formatearFecha(fechaIso: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid'
    }).format(new Date(fechaIso));
  }

  formatearFechaEntrega(fechaIso: string, franjaEntrega: string): string {
    const fechaLocal = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Madrid'
    }).format(new Date(fechaIso));

    return `${fechaLocal} · ${franjaEntrega}`;
  }

  obtenerEtiquetaMetodoPago(metodoPago: string): string {
    if (metodoPago === 'tarjeta') {
      return 'Tarjeta';
    }

    if (metodoPago === 'bizum') {
      return 'Bizum';
    }

    return 'Efectivo';
  }

  obtenerEtiquetaTipoPedido(esSuscripcion: boolean): string {
    return esSuscripcion ? 'Suscripción semanal' : 'Pedido normal';
  }

  obtenerEtiquetaEstado(estado: Pedido['estado']): string {
    return estado === 'entregado' ? 'Entregado' : 'Confirmado';
  }

  obtenerColorEstado(estado: Pedido['estado']): string {
    return estado === 'entregado' ? 'medium' : 'success';
  }

  private cargarPedidos(): void {
    this.pedidos = this.orderService.obtenerPedidos();
  }
}
