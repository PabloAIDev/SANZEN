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
import { addIcons } from 'ionicons';
import {
  closeOutline,
  sendOutline,
  refreshOutline
} from 'ionicons/icons';
import {
  AssistantAction,
  AssistantHistoryEntry,
  AssistantMessage
} from '../../models/assistant.model';
import { AssistantService } from '../../services/assistant.service';
import { UserSessionService } from '../../services/user-session.service';

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
  ultimoOrigenRespuesta: 'openai' | 'fallback' | null = null;

  private routerSubscription?: Subscription;
  private sessionSubscription?: Subscription;
  private ultimoUsuarioId: number | null = null;

  constructor(
    private router: Router,
    private assistantService: AssistantService,
    private userSessionService: UserSessionService
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

    this.sembrarMensajeInicial();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.sessionSubscription?.unsubscribe();
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
        text: 'No he podido responder ahora mismo. Inténtalo de nuevo en unos segundos.'
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
      return 'Motor: OpenAI';
    }

    if (this.ultimoOrigenRespuesta === 'fallback') {
      return 'Motor: local';
    }

    return '';
  }

  obtenerSugerenciasRapidas(): string[] {
    switch (this.pantallaActual) {
      case 'menu':
        return ['¿Qué me recomiendas?', '¿Me conviene suscripción o pedido individual?', '¿Por qué no puedo continuar?'];
      case 'resumen':
        return ['¿Por qué no puedo continuar?', 'Resume mi carrito', '¿Me conviene suscripción?'];
      case 'pago':
        return ['¿Por qué no puedo continuar?', '¿Qué datos me faltan?', 'Resume mi pedido'];
      case 'suscripcion':
        return ['¿Qué contiene mi suscripción actual?', '¿Cómo renuevo o modifico mi suscripción?', '¿Cuál es mi último pedido?'];
      case 'mis-pedidos':
        return ['¿Cuál fue mi último pedido?', 'Resume mis pedidos', '¿Cómo funciona la renovación semanal?'];
      default:
        return ['¿Cómo funciona SANZEN?', '¿Qué me recomiendas?', '¿Suscripción o pedido individual?'];
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

  private sembrarMensajeInicial(): void {
    this.mensajes.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'Soy el asistente de SANZEN. Puedo ayudarte a elegir platos, entender tu suscripción o explicarte por qué no puedes continuar.'
    });
  }
}
