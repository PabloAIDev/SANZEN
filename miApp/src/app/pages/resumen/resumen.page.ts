import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBackButton,
  IonButton,
  IonButtons,
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
import { TranslateModule } from '@ngx-translate/core';
import { CarritoItem } from '../../models/carrito-item.model';
import { Plato } from '../../models/plato.model';
import { CarritoService } from '../../services/carrito.service';
import { PlatoService } from '../../services/plato.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserSessionService } from '../../services/user-session.service';
import { PreferenciaComposicion } from '../../models/profile.model';
import { FirstOrderService } from '../../services/first-order.service';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonNote,
    IonButton,
    TranslateModule
  ]
})
export class ResumenPage implements OnInit {
  items: CarritoItem[] = [];
  postresDisponibles: Plato[] = [];

  constructor(
    private carritoService: CarritoService,
    private subscriptionService: SubscriptionService,
    private platoService: PlatoService,
    private profileService: ProfileService,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarItems();
  }

  ionViewWillEnter(): void {
    this.cargarItems();
  }

  cargarItems(): void {
    this.items = this.carritoService.obtenerItems();
    this.cargarPostresDisponibles();
  }

  eliminarPlato(platoId: number): void {
    this.carritoService.eliminarPlato(platoId);
    this.cargarItems();
  }

  aumentarCantidad(platoId: number): void {
    this.carritoService.aumentarCantidad(platoId);
    this.cargarItems();
  }

  disminuirCantidad(platoId: number): void {
    this.carritoService.disminuirCantidad(platoId);
    this.cargarItems();
  }

  vaciarCarrito(): void {
    this.carritoService.vaciarCarrito();
    this.cargarItems();
  }

  obtenerSubtotal(item: CarritoItem): number {
    return item.plato.price * item.cantidad;
  }

  obtenerCantidadDePlato(platoId: number): number {
    return this.carritoService.obtenerCantidadDePlato(platoId);
  }

  obtenerTotal(): number {
    return this.carritoService.obtenerTotal();
  }

  cumplePedidoMinimoPlatosSueltos(): boolean {
    return this.suscripcionActiva() || this.obtenerTotal() >= 20;
  }

  obtenerImporteFaltantePedidoMinimo(): number {
    return Number(Math.max(20 - this.obtenerTotal(), 0).toFixed(2));
  }

  obtenerTotalPostresExtra(): number {
    return Number(
      this.items
        .filter(item => this.esPostreExtra(item))
        .reduce((total, item) => total + this.obtenerSubtotal(item), 0)
        .toFixed(2)
    );
  }

  obtenerSubtotalSuscripcionSinPostres(): number {
    return Number(
      this.items
        .filter(item => !this.esPostreExtra(item))
        .reduce((total, item) => total + this.obtenerSubtotal(item), 0)
        .toFixed(2)
    );
  }

  obtenerTotalSuscripcionConDescuento(): number {
    return Number(
      (this.obtenerSubtotalSuscripcionSinPostres() - this.obtenerDescuentoSuscripcion()).toFixed(2)
    );
  }

  obtenerSubtotalSinDescuento(): number {
    return this.carritoService.obtenerSubtotalSinDescuento();
  }

  obtenerDescuentoSuscripcion(): number {
    return this.carritoService.obtenerDescuentoSuscripcion();
  }

  suscripcionActiva(): boolean {
    return (
      this.subscriptionService.suscripcionActiva() &&
      !(this.firstOrderService.estaActivo() && this.firstOrderService.esModoIndividual())
    );
  }

  obtenerPorcentajeDescuentoSuscripcion(): number {
    return this.subscriptionService.obtenerDescuentoPorcentaje() * 100;
  }

  suscripcionCompleta(): boolean {
    return this.subscriptionService.suscripcionCompleta();
  }

  obtenerPlatosPendientesSuscripcion(): number {
    return this.subscriptionService.obtenerPlatosPendientes();
  }

  obtenerCantidadSeleccionadaSuscripcion(): number {
    return this.subscriptionService.obtenerCantidadSeleccionada();
  }

  obtenerPlanSuscripcion(): number {
    return this.subscriptionService.obtenerPlanSemanalActual();
  }

  anadirPostre(plato: Plato): void {
    this.carritoService.anadirPlato(plato, 1);
    this.cargarItems();
  }

  async continuarAlPago(): Promise<void> {
    if (this.suscripcionActiva() && !this.suscripcionCompleta()) {
      return;
    }

    if (!this.cumplePedidoMinimoPlatosSueltos()) {
      return;
    }

    if (!this.userSessionService.haySesionActiva()) {
      await this.router.navigate(['/login'], {
        queryParams: { redirect: '/pago' }
      });
      return;
    }

    if (!this.profileService.tienePerfilCompletoParaPago()) {
      await this.router.navigate(['/perfil'], {
        queryParams: { redirect: '/pago' }
      });
      return;
    }

    await this.router.navigateByUrl('/pago');
  }

  private esPostreExtra(item: CarritoItem): boolean {
    return this.suscripcionActiva() && item.plato.category === 'Postre';
  }

  private cargarPostresDisponibles(): void {
    if (!this.suscripcionActiva()) {
      this.postresDisponibles = [];
      return;
    }

    this.postresDisponibles = this.platoService.obtenerPlatos().filter(plato => {
      return plato.category === 'Postre' && this.esPlatoCompatibleConPerfil(plato);
    });
  }

  private esPlatoCompatibleConPerfil(plato: Plato): boolean {
    const perfil = this.profileService.obtenerPerfil();
    const macros = plato.nutrition.macronutrients;

    const compatibleAlergenos =
      perfil.alergenos.length === 0 ||
      !perfil.alergenos.some(alergeno => plato.allergens.includes(alergeno));

    if (!compatibleAlergenos) {
      return false;
    }

    let compatibleObjetivo = true;

    if (perfil.objetivoNutricional === 'perder-peso') {
      compatibleObjetivo =
        plato.calories <= 350 &&
        macros.fat_g <= 15 &&
        macros.fiber_g >= 3;
    }

    if (perfil.objetivoNutricional === 'masa-muscular') {
      compatibleObjetivo =
        macros.protein_g >= 20 &&
        plato.calories >= 300;
    }

    if (!compatibleObjetivo) {
      return false;
    }

    return this.cumplePreferenciasComposicion(plato, perfil.preferenciasComposicion);
  }

  private cumplePreferenciasComposicion(
    plato: Plato,
    preferencias: PreferenciaComposicion[]
  ): boolean {
    const macros = plato.nutrition.macronutrients;
    let compatible = true;

    if (preferencias.includes('ricos-proteina')) {
      compatible = compatible && macros.protein_g >= 20;
    }

    if (preferencias.includes('bajos-grasas')) {
      compatible = compatible && macros.fat_g <= 10;
    }

    if (preferencias.includes('bajos-carbohidratos')) {
      compatible = compatible && macros.carbohydrates_g <= 30;
    }

    return compatible;
  }
}
