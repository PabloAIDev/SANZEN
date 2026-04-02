import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
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
import { RouterLink } from '@angular/router';
import { Pedido } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-confirmacion',
  templateUrl: './confirmacion.page.html',
  styleUrls: ['./confirmacion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonButton,
    IonNote,
    IonList,
    IonItem,
    IonLabel,
    IonThumbnail
  ]
})
export class ConfirmacionPage {
  ultimoPedido: Pedido | null = null;

  constructor(private orderService: OrderService) {}

  async ionViewWillEnter(): Promise<void> {
    await this.orderService.refrescarDesdeApi();
    this.ultimoPedido = this.orderService.obtenerUltimoPedido();
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
}
