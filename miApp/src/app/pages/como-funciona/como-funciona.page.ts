import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  basketOutline,
  personCircleOutline,
  calendarClearOutline,
  cardOutline,
  checkmarkCircleOutline,
  leafOutline,
  restaurantOutline,
  repeatOutline
} from 'ionicons/icons';

interface PasoFuncionamiento {
  icono: string;
  titulo: string;
  texto: string;
}

interface BloqueVisual {
  imagen: string;
  titulo: string;
  texto: string;
}

@Component({
  selector: 'app-como-funciona',
  templateUrl: './como-funciona.page.html',
  styleUrls: ['./como-funciona.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon
  ]
})
export class ComoFuncionaPage {
  readonly pasos: PasoFuncionamiento[] = [
    {
      icono: 'basket-outline',
      titulo: 'Haz tu primer pedido',
      texto:
        'Desde Inicio puedes pulsar Haz tu primer pedido y elegir si quieres empezar con un pedido individual o con una suscripción semanal.'
    },
    {
      icono: 'restaurant-outline',
      titulo: 'Filtra y selecciona platos',
      texto:
        'En el menú puedes aplicar filtros por alérgenos, objetivo nutricional y preferencias de composición, ver recomendaciones y añadir platos al carrito.'
    },
    {
      icono: 'person-circle-outline',
      titulo: 'Accede o crea tu usuario',
      texto:
        'Puedes comenzar el proceso como invitado. Al ir al pago, SANZEN te pedirá iniciar sesión o crear un usuario para guardar el pedido.'
    },
    {
      icono: 'card-outline',
      titulo: 'Completa tu perfil si hace falta',
      texto:
        'Si eres nuevo, o si te faltan datos, completarás tus preferencias alimentarias, dirección y tarjeta. Si ya tienes el perfil completo, pasarás directamente al último paso del pedido.'
    },
    {
      icono: 'calendar-clear-outline',
      titulo: 'Confirma la entrega',
      texto:
        'El pedido individual exige un mínimo de 20 €. La suscripción semanal exige al menos 5 platos. La fecha de entrega se calcula teniendo en cuenta si ya existían pedidos anteriores.'
    },
    {
      icono: 'checkmark-circle-outline',
      titulo: 'Haz pedidos posteriores más rápido',
      texto:
        'Si ya tienes cuenta y perfil completo, en los siguientes pedidos sólo tendrás que iniciar sesión, revisar el carrito y confirmar el pago.'
    },
    {
      icono: 'repeat-outline',
      titulo: 'Gestiona y renueva tu suscripción',
      texto:
        'Si tienes suscripción activa, SANZEN conserva tu última selección semanal. Desde Gestionar suscripción puedes revisarla, modificarla en el menú o lanzar la renovación semanal manual.'
    }
  ];

  readonly bloquesVisuales: BloqueVisual[] = [
    {
      imagen: 'assets/img/bibimbap.jpg',
      titulo: 'Empieza desde Inicio',
      texto:
        'La portada te guía con dos accesos claros dentro de Haz tu primer pedido: Suscripción semanal o Pedido individual.'
    },
    {
      imagen: 'assets/img/ramen.jpg',
      titulo: 'Usuario nuevo y usuario existente',
      texto:
        'Si ya tienes cuenta, el proceso es más corto. Si eres nuevo, SANZEN aprovecha tu primer pedido para crear usuario y completar el perfil con tus datos alimentarios y de pago.'
    },
    {
      imagen: 'assets/img/arroz.jpg',
      titulo: 'Pedidos posteriores y renovación',
      texto:
        'Los pedidos posteriores reutilizan tu perfil guardado. Si tienes suscripción activa, puedes revisar tu selección actual, modificarla o renovarla manualmente desde Gestionar suscripción.'
    }
  ];

  constructor() {
    addIcons({
      basketOutline,
      personCircleOutline,
      calendarClearOutline,
      cardOutline,
      checkmarkCircleOutline,
      leafOutline,
      restaurantOutline,
      repeatOutline
    });
  }
}
