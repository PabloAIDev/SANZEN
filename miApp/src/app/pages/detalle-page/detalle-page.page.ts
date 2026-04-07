import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonLabel,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Plato } from '../../models/plato.model';
import { PlatoService } from '../../services/plato.service';

@Component({
  selector: 'app-detalle-page',
  templateUrl: './detalle-page.page.html',
  styleUrls: ['./detalle-page.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonBackButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonChip,
    IonLabel,
    TranslateModule
  ]
})
export class DetallePagePage implements OnInit {
  id = input.required<string>();
  plato?: Plato;

  constructor(
    private router: Router,
    private platoService: PlatoService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    const platoId = Number(this.id());
    const platoEncontrado = this.platoService.obtenerPlatoPorId(platoId);

    if (!platoEncontrado) {
      this.router.navigateByUrl('/menu');
      return;
    }

    this.plato = platoEncontrado;
  }

  obtenerIconoAlergeno(alergeno: string): string {
    const mapa: Record<string, string> = {
      Gluten: 'assets/icons/alergenos/gluten.png',
      Huevo: 'assets/icons/alergenos/huevo.png',
      Soja: 'assets/icons/alergenos/soja.png',
      Pescado: 'assets/icons/alergenos/pescado.png',
      'Crustáceos': 'assets/icons/alergenos/crustaceos.png',
      'Lácteos': 'assets/icons/alergenos/lacteos.png',
      'Frutos secos': 'assets/icons/alergenos/frutos-secos.png',
      Sésamo: 'assets/icons/alergenos/sesamo.png',
      Legumbres: 'assets/icons/alergenos/legumbres.png'
    };

    return mapa[alergeno] || '';
  }

  obtenerEtiquetaAlergeno(alergeno: string): string {
    return this.translateService.instant(`COMMON.ALLERGENS.${alergeno}`);
  }

  obtenerEtiquetaCategoria(categoria: string): string {
    return this.translateService.instant(`COMMON.CATEGORIES.${categoria}`);
  }
}
