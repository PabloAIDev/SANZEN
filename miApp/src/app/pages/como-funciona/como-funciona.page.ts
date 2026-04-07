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
import { TranslateModule } from '@ngx-translate/core';
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
  tituloKey: string;
  textoKey: string;
}

interface BloqueVisual {
  imagen: string;
  tituloKey: string;
  textoKey: string;
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
    IonIcon,
    TranslateModule
  ]
})
export class ComoFuncionaPage {
  readonly pasos: PasoFuncionamiento[] = [
    {
      icono: 'basket-outline',
      tituloKey: 'HOW.STEPS.one.TITLE',
      textoKey: 'HOW.STEPS.one.TEXT'
    },
    {
      icono: 'restaurant-outline',
      tituloKey: 'HOW.STEPS.two.TITLE',
      textoKey: 'HOW.STEPS.two.TEXT'
    },
    {
      icono: 'person-circle-outline',
      tituloKey: 'HOW.STEPS.three.TITLE',
      textoKey: 'HOW.STEPS.three.TEXT'
    },
    {
      icono: 'card-outline',
      tituloKey: 'HOW.STEPS.four.TITLE',
      textoKey: 'HOW.STEPS.four.TEXT'
    },
    {
      icono: 'calendar-clear-outline',
      tituloKey: 'HOW.STEPS.five.TITLE',
      textoKey: 'HOW.STEPS.five.TEXT'
    },
    {
      icono: 'checkmark-circle-outline',
      tituloKey: 'HOW.STEPS.six.TITLE',
      textoKey: 'HOW.STEPS.six.TEXT'
    },
    {
      icono: 'repeat-outline',
      tituloKey: 'HOW.STEPS.seven.TITLE',
      textoKey: 'HOW.STEPS.seven.TEXT'
    }
  ];

  readonly bloquesVisuales: BloqueVisual[] = [
    {
      imagen: 'assets/img/bibimbap.jpg',
      tituloKey: 'HOW.VISUALS.one.TITLE',
      textoKey: 'HOW.VISUALS.one.TEXT'
    },
    {
      imagen: 'assets/img/ramen.jpg',
      tituloKey: 'HOW.VISUALS.two.TITLE',
      textoKey: 'HOW.VISUALS.two.TEXT'
    },
    {
      imagen: 'assets/img/arroz.jpg',
      tituloKey: 'HOW.VISUALS.three.TITLE',
      textoKey: 'HOW.VISUALS.three.TEXT'
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
