import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  sendOutline,
  refreshOutline
} from 'ionicons/icons';
import {
  AssistantAction,
  AssistantHistoryEntry,
  AssistantMessage,
  AssistantResponseSource
} from '../../models/assistant.model';
import { AssistantService } from '../../services/assistant.service';
import { UserSessionService } from '../../services/user-session.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-assistant',
  standalone: true,
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonTextarea,
    IonIcon,
    IonChip,
    IonLabel,
    IonSpinner
  ]
})
export class AssistantComponent implements OnInit, OnDestroy {
  abierto = false;
  enviando = false;
  mensajeActual = '';
  pantallaActual = 'inicio';
  mensajes: AssistantMessage[] = [];
  ultimoOrigenRespuesta: AssistantResponseSource | null = null;

  private routerSubscription?: Subscription;
  private sessionSubscription?: Subscription;
  private languageSubscription?: Subscription;
  private ultimoUsuarioId: number | null = null;

  constructor(
    private router: Router,
    private assistantService: AssistantService,
    private userSessionService: UserSessionService,
    private languageService: LanguageService,
    private translateService: TranslateService
  ) {
    addIcons({
      closeOutline,
      sendOutline,
      refreshOutline
    });
  }

  ngOnInit(): void {
    this.actualizarPantallaActual(this.router.url);
    this.ultimoUsuarioId = this.userSessionService.obtenerUsuarioIdActual();

    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.actualizarPantallaActual(event.urlAfterRedirects);
      });

    this.sessionSubscription = this.userSessionService.usuarioActual$.subscribe((usuario) => {
      const usuarioId = usuario?.id ?? null;

      if (usuarioId === this.ultimoUsuarioId) {
        return;
      }

      this.ultimoUsuarioId = usuarioId;
      this.mensajeActual = '';
      this.abierto = false;
      this.limpiarConversacion();
    });

    this.languageSubscription = this.languageService.currentLanguage$.subscribe(() => {
      this.actualizarMensajeInicialSiProcede();
    });

    this.sembrarMensajeInicial();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.sessionSubscription?.unsubscribe();
    this.languageSubscription?.unsubscribe();
  }

  abrirAsistente(): void {
    this.abierto = true;
  }

  cerrarAsistente(): void {
    this.abierto = false;
  }

  async enviarMensaje(texto = this.mensajeActual): Promise<void> {
    const contenido = texto.trim();

    if (contenido === '' || this.enviando) {
      return;
    }

    const history = this.buildConversationHistory();

    this.mensajes.push({
      id: crypto.randomUUID(),
      role: 'user',
      text: contenido
    });

    this.mensajeActual = '';
    this.enviando = true;

    try {
      const respuesta = await this.assistantService.sendMessage(
        contenido,
        this.pantallaActual,
        history
      );
      this.mensajes.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: respuesta.message,
        actions: respuesta.actions
      });
      this.ultimoOrigenRespuesta = respuesta.source ?? null;
    } catch {
      this.mensajes.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: this.translateService.instant('ASSISTANT.ERROR_FALLBACK')
      });
      this.ultimoOrigenRespuesta = null;
    } finally {
      this.enviando = false;
    }
  }

  async enviarSugerencia(sugerencia: string): Promise<void> {
    await this.enviarMensaje(sugerencia);
  }

  async ejecutarAccion(action: AssistantAction): Promise<void> {
    if (!this.esAccionNavegacionValida(action)) {
      return;
    }

    this.abierto = false;
    await this.router.navigateByUrl(action.target);
  }

  limpiarConversacion(): void {
    this.mensajes = [];
    this.ultimoOrigenRespuesta = null;
    this.sembrarMensajeInicial();
  }

  obtenerEtiquetaOrigen(): string {
    if (this.ultimoOrigenRespuesta === 'openai') {
      return this.translateService.instant('ASSISTANT.SOURCE.OPENAI');
    }

    if (this.ultimoOrigenRespuesta === 'rules') {
      return this.translateService.instant('ASSISTANT.SOURCE.RULES');
    }

    if (this.ultimoOrigenRespuesta === 'fallback') {
      return this.translateService.instant('ASSISTANT.SOURCE.FALLBACK');
    }

    return '';
  }

  obtenerSugerenciasRapidas(): string[] {
    return this.obtenerClavesSugerencias().map((key) => this.translateService.instant(key));
  }

  obtenerAriaAbrir(): string {
    return this.translateService.instant('ASSISTANT.OPEN_ARIA');
  }

  obtenerTitulo(): string {
    return this.translateService.instant('ASSISTANT.TITLE');
  }

  obtenerAriaReiniciar(): string {
    return this.translateService.instant('ASSISTANT.RESET_ARIA');
  }

  obtenerAriaCerrar(): string {
    return this.translateService.instant('ASSISTANT.CLOSE_ARIA');
  }

  obtenerEtiquetaPantallaActual(): string {
    return this.translateService.instant('ASSISTANT.CURRENT_SCREEN', { screen: this.pantallaActual });
  }

  obtenerTextoPensando(): string {
    return this.translateService.instant('ASSISTANT.THINKING');
  }

  obtenerPlaceholder(): string {
    return this.translateService.instant('ASSISTANT.PLACEHOLDER');
  }

  private obtenerClavesSugerencias(): string[] {
    switch (this.pantallaActual) {
      case 'menu':
        return ['ASSISTANT.QUICK.MENU.RECOMMEND', 'ASSISTANT.QUICK.MENU.COMPARE', 'ASSISTANT.QUICK.MENU.BLOCKING'];
      case 'resumen':
        return ['ASSISTANT.QUICK.SUMMARY.BLOCKING', 'ASSISTANT.QUICK.SUMMARY.CART', 'ASSISTANT.QUICK.SUMMARY.SUBSCRIPTION'];
      case 'pago':
        return ['ASSISTANT.QUICK.PAYMENT.BLOCKING', 'ASSISTANT.QUICK.PAYMENT.MISSING', 'ASSISTANT.QUICK.PAYMENT.ORDER'];
      case 'suscripcion':
        return ['ASSISTANT.QUICK.SUBSCRIPTION.CONTENT', 'ASSISTANT.QUICK.SUBSCRIPTION.RENEW', 'ASSISTANT.QUICK.SUBSCRIPTION.LAST_ORDER'];
      case 'mis-pedidos':
        return ['ASSISTANT.QUICK.ORDERS.LAST_ORDER', 'ASSISTANT.QUICK.ORDERS.SUMMARY', 'ASSISTANT.QUICK.ORDERS.RENEWAL'];
      default:
        return ['ASSISTANT.QUICK.DEFAULT.HOW', 'ASSISTANT.QUICK.DEFAULT.RECOMMEND', 'ASSISTANT.QUICK.DEFAULT.COMPARE'];
    }
  }

  trackByMessageId(_index: number, message: AssistantMessage): string {
    return message.id;
  }

  private buildConversationHistory(): AssistantHistoryEntry[] {
    return this.mensajes
      .filter((_, index) => index > 0)
      .slice(-6)
      .map((message) => ({
        role: message.role,
        text: message.text
      }));
  }

  private actualizarPantallaActual(url: string): void {
    const path = url.split('?')[0].replace(/^\/+/, '');

    if (path.startsWith('detalle-plato')) {
      this.pantallaActual = 'detalle-plato';
      return;
    }

    this.pantallaActual = path || 'inicio';
  }

  private esAccionNavegacionValida(action: AssistantAction): boolean {
    if (!action || action.type !== 'navigate' || typeof action.target !== 'string') {
      return false;
    }

    const target = action.target.trim();
    return [
      '/inicio',
      '/menu',
      '/resumen',
      '/pago',
      '/perfil',
      '/suscripcion',
      '/mis-pedidos',
      '/como-funciona',
      '/login',
      '/menu?subscriptionSelection=1'
    ].includes(target);
  }

  private sembrarMensajeInicial(): void {
    this.mensajes.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      text: this.translateService.instant('ASSISTANT.SEED_MESSAGE')
    });
  }

  private actualizarMensajeInicialSiProcede(): void {
    if (this.mensajes.length !== 1 || this.mensajes[0]?.role !== 'assistant') {
      return;
    }

    this.mensajes = [{
      ...this.mensajes[0],
      text: this.translateService.instant('ASSISTANT.SEED_MESSAGE')
    }];
  }
}
