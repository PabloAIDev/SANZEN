import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  leafOutline,
  restaurantOutline,
  timeOutline,
  cardOutline,
  personOutline,
  repeatOutline,
  logOutOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';
import { SubscriptionService } from '../../services/subscription.service';
import { CarritoService } from '../../services/carrito.service';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';

interface ValorDiferencial {
  icono: string;
  tituloKey: string;
  textoKey: string;
}

interface PasoFuncionamiento {
  numero: string;
  tituloKey: string;
  textoKey: string;
}

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    TranslateModule,
    LanguageSwitcherComponent
  ]
})
export class InicioPage {
  readonly imagenHero = 'assets/img/bibimbap.jpg';

  readonly valores: ValorDiferencial[] = [
    {
      icono: 'person-outline',
      tituloKey: 'HOME.VALUES.personalized.TITLE',
      textoKey: 'HOME.VALUES.personalized.TEXT'
    },
    {
      icono: 'restaurant-outline',
      tituloKey: 'HOME.VALUES.balanced.TITLE',
      textoKey: 'HOME.VALUES.balanced.TEXT'
    },
    {
      icono: 'time-outline',
      tituloKey: 'HOME.VALUES.delivery.TITLE',
      textoKey: 'HOME.VALUES.delivery.TEXT'
    },
    {
      icono: 'card-outline',
      tituloKey: 'HOME.VALUES.payment.TITLE',
      textoKey: 'HOME.VALUES.payment.TEXT'
    },
    {
      icono: 'leaf-outline',
      tituloKey: 'HOME.VALUES.sustainability.TITLE',
      textoKey: 'HOME.VALUES.sustainability.TEXT'
    }
  ];

  readonly pasos: PasoFuncionamiento[] = [
    {
      numero: '01',
      tituloKey: 'HOME.STEPS.one.TITLE',
      textoKey: 'HOME.STEPS.one.TEXT'
    },
    {
      numero: '02',
      tituloKey: 'HOME.STEPS.two.TITLE',
      textoKey: 'HOME.STEPS.two.TEXT'
    },
    {
      numero: '03',
      tituloKey: 'HOME.STEPS.three.TITLE',
      textoKey: 'HOME.STEPS.three.TEXT'
    }
  ];

  menuLateralAbierto = false;

  constructor(
    private router: Router,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService,
    private subscriptionService: SubscriptionService,
    private carritoService: CarritoService
  ) {
    addIcons({
      menuOutline,
      leafOutline,
      restaurantOutline,
      timeOutline,
      cardOutline,
      personOutline,
      repeatOutline,
      logOutOutline,
      informationCircleOutline
    });
  }

  async irAMenu(): Promise<void> {
    if (this.userSessionService.haySesionActiva()) {
      this.firstOrderService.finalizarProceso();
      await this.router.navigateByUrl('/menu');
      return;
    }

    this.firstOrderService.iniciarProceso('individual');
    this.subscriptionService.restablecerSuscripcionLocal();
    await this.router.navigateByUrl('/menu');
  }

  abrirMenuLateral(): void {
    this.menuLateralAbierto = true;
  }

  cerrarMenuLateral(): void {
    this.menuLateralAbierto = false;
  }

  async irASuscripcion(): Promise<void> {
    if (this.userSessionService.haySesionActiva()) {
      this.firstOrderService.finalizarProceso();
      await this.router.navigateByUrl('/suscripcion');
      return;
    }

    const suscripcionTemporal = this.subscriptionService.previsualizarSuscripcion({
      activa: true,
      diaEntrega: 'lunes',
      platosSeleccionadosIds: []
    });

    this.firstOrderService.iniciarProceso('suscripcion', suscripcionTemporal);
    this.subscriptionService.establecerSuscripcionTemporal(suscripcionTemporal);
    await this.router.navigate(['/menu'], {
      queryParams: { subscriptionSelection: '1' }
    });
  }

  irASuscripcionDesdeMenu(): void {
    this.cerrarMenuLateral();
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/suscripcion' }
      });
      return;
    }

    this.router.navigateByUrl('/suscripcion');
  }

  cambiarUsuarioDesdeMenu(): void {
    this.cerrarMenuLateral();
    this.firstOrderService.finalizarProceso();
    this.carritoService.reiniciarCarrito();
    this.userSessionService.cerrarSesion();
    this.subscriptionService.restablecerSuscripcionLocal();
    this.router.navigateByUrl('/inicio');
  }

  haySesionActiva(): boolean {
    return this.userSessionService.haySesionActiva();
  }

  irAPerfil(): void {
    this.cerrarMenuLateral();
    if (this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/perfil');
      return;
    }

    this.router.navigateByUrl('/login');
  }

  async irAComoFunciona(): Promise<void> {
    this.cerrarMenuLateral();
    await this.router.navigateByUrl('/como-funciona');
  }
}
