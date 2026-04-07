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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Pedido } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { UserSessionService } from '../../services/user-session.service';
import { LanguageService } from '../../services/language.service';
import { PlatoService } from '../../services/plato.service';

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
    IonThumbnail,
    TranslateModule
  ]
})
export class MisPedidosPage implements OnInit {
  pedidos: Pedido[] = [];

  constructor(
    private orderService: OrderService,
    private userSessionService: UserSessionService,
    private router: Router,
    private translateService: TranslateService,
    private languageService: LanguageService,
    private platoService: PlatoService
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
    return new Intl.DateTimeFormat(this.languageService.getCurrentLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid'
    }).format(new Date(fechaIso));
  }

  formatearFechaEntrega(fechaIso: string, franjaEntrega: string): string {
    const fechaLocal = new Intl.DateTimeFormat(this.languageService.getCurrentLocale(), {
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
      return this.translateService.instant('COMMON.PAYMENT_METHODS.tarjeta');
    }

    if (metodoPago === 'bizum') {
      return this.translateService.instant('COMMON.PAYMENT_METHODS.bizum');
    }

    return this.translateService.instant('COMMON.PAYMENT_METHODS.efectivo');
  }

  obtenerEtiquetaTipoPedido(esSuscripcion: boolean): string {
    return esSuscripcion
      ? this.translateService.instant('COMMON.ORDER_TYPE.SUBSCRIPTION')
      : this.translateService.instant('COMMON.ORDER_TYPE.NORMAL');
  }

  obtenerEtiquetaEstado(estado: Pedido['estado']): string {
    return estado === 'entregado'
      ? this.translateService.instant('COMMON.ORDER_STATUS.entregado')
      : this.translateService.instant('COMMON.ORDER_STATUS.confirmado');
  }

  obtenerColorEstado(estado: Pedido['estado']): string {
    return estado === 'entregado' ? 'medium' : 'success';
  }

  obtenerNombrePlato(platoId: number, fallback: string): string {
    return this.platoService.obtenerNombreTraducido(platoId, fallback);
  }

  private cargarPedidos(): void {
    this.pedidos = this.orderService.obtenerPedidos();
  }
}
