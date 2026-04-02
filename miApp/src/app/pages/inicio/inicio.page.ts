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
import { addIcons } from 'ionicons';
import {
  menuOutline,
  leafOutline,
  restaurantOutline,
  timeOutline,
  cardOutline,
  personOutline,
  repeatOutline,
  swapHorizontalOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';
import { SubscriptionService } from '../../services/subscription.service';

interface ValorDiferencial {
  icono: string;
  titulo: string;
  texto: string;
}

interface PasoFuncionamiento {
  numero: string;
  titulo: string;
  texto: string;
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
    IonLabel
  ]
})
export class InicioPage {
  readonly imagenHero = 'assets/img/bibimbap.jpg';

  readonly valores: ValorDiferencial[] = [
    {
      icono: 'person-outline',
      titulo: 'Menús personalizados',
      texto: 'Adaptados a alergias, intolerancias y preferencias nutricionales reales, y diseñados por nuestros chefs expertos en nutrición y comida asiática.'
    },
    {
      icono: 'restaurant-outline',
      titulo: 'Platos equilibrados',
      texto: 'Comida asiática saludable con sabor y buen balance nutricional.'
    },
    {
      icono: 'time-outline',
      titulo: 'Entrega por franjas',
      texto: 'Recibe tu pedido en el tramo horario que mejor te encaje.'
    },
    {
      icono: 'card-outline',
      titulo: 'Pago rápido y sencillo',
      texto: 'Un proceso claro y ágil, pensado para repetir sin fricción.'
    },
    {
      icono: 'leaf-outline',
      titulo: 'Comprometidos con el medio ambiente',
      texto: 'Usamos tuppers reciclables y priorizamos el reparto con vehículos eléctricos para reducir el impacto ambiental.'
    }
  ];

  readonly pasos: PasoFuncionamiento[] = [
    {
      numero: '01',
      titulo: 'Haz tu primer pedido',
      texto: 'Elige si quieres empezar con un pedido individual o con una suscripción semanal.'
    },
    {
      numero: '02',
      titulo: 'Selecciona platos y accede',
      texto: 'Filtra, añade platos al carrito y, al ir al pago, inicia sesión o crea tu usuario si todavía no tienes cuenta.'
    },
    {
      numero: '03',
      titulo: 'Confirma y gestiona tus pedidos',
      texto: 'Completa tu perfil si hace falta, confirma la entrega y después podrás repetir, modificar o renovar tu suscripción más rápido.'
    }
  ];

  menuLateralAbierto = false;

  constructor(
    private router: Router,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService,
    private subscriptionService: SubscriptionService
  ) {
    addIcons({
      menuOutline,
      leafOutline,
      restaurantOutline,
      timeOutline,
      cardOutline,
      personOutline,
      repeatOutline,
      swapHorizontalOutline,
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
    this.userSessionService.cerrarSesion();
    this.router.navigateByUrl('/login');
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
