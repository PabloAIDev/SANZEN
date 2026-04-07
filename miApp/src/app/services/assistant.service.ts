import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AssistantAction,
  AssistantHistoryEntry,
  AssistantResponse,
  AssistantResponseSource
} from '../models/assistant.model';
import { ProfileService } from './profile.service';
import { SubscriptionService } from './subscription.service';
import { CarritoService } from './carrito.service';
import { OrderService } from './order.service';
import { FirstOrderService } from './first-order.service';
import { UserSessionService } from './user-session.service';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private readonly apiUrl = 'http://localhost:3000/api/assistant/chat';
  private readonly allowedTargets = new Set([
    '/inicio',
    '/menu',
    '/resumen',
    '/pago',
    '/perfil',
    '/suscripcion',
    '/mis-pedidos',
    '/como-funciona',
    '/login'
  ]);

  constructor(
    private http: HttpClient,
    private profileService: ProfileService,
    private subscriptionService: SubscriptionService,
    private carritoService: CarritoService,
    private orderService: OrderService,
    private firstOrderService: FirstOrderService,
    private userSessionService: UserSessionService
  ) {}

  async sendMessage(
    message: string,
    screen: string,
    history: AssistantHistoryEntry[]
  ): Promise<AssistantResponse> {
    const response = await firstValueFrom(
      this.http.post<AssistantResponse>(this.apiUrl, {
        message,
        screen,
        history,
        context: this.buildClientContext()
      })
    );

    return this.normalizarRespuesta(response);
  }

  private buildClientContext(): object {
    const perfil = this.profileService.obtenerPerfil();
    const suscripcion = this.subscriptionService.obtenerSuscripcion();
    const carritoItems = this.carritoService.obtenerItems();
    const ultimoPedido = this.orderService.obtenerPedidos()[0] ?? null;
    const esPedidoSuscripcion =
      this.subscriptionService.suscripcionActiva() &&
      !(this.firstOrderService.estaActivo() && this.firstOrderService.esModoIndividual());

    return {
      profile: {
        name: perfil.nombre,
        allergies: [...perfil.alergenos],
        objective: perfil.objetivoNutricional,
        compositionPreferences: [...perfil.preferenciasComposicion],
        profileCompleteForPayment:
          this.userSessionService.haySesionActiva() && this.profileService.tienePerfilCompletoParaPago()
      },
      cart: {
        mode: esPedidoSuscripcion ? 'suscripcion' : 'individual',
        itemCount: this.carritoService.obtenerCantidadTotalItems(),
        total: this.carritoService.obtenerTotal(),
        meetsMinimum: esPedidoSuscripcion
          ? this.subscriptionService.suscripcionCompleta()
          : this.carritoService.obtenerTotal() >= 20,
        hasItems: carritoItems.length > 0,
        items: carritoItems.map((item) => ({
          id: item.plato.id,
          name: item.plato.name,
          category: item.plato.category,
          quantity: item.cantidad,
          price: item.plato.price,
          subtotal: item.plato.price * item.cantidad,
          healthScore: item.plato.healthScore,
          allergens: [...item.plato.allergens]
        }))
      },
      subscription: {
        active: suscripcion.activa,
        day: suscripcion.diaEntrega,
        minimumItems: this.subscriptionService.obtenerMinimoPlatosSuscripcion(),
        selectedItemCount: suscripcion.platosSeleccionadosIds.length,
        complete: this.subscriptionService.suscripcionCompleta(),
        nextDelivery: suscripcion.proximaEntregaIso,
        items: this.buildSubscriptionItems()
      },
      firstOrder: {
        active: this.firstOrderService.estaActivo(),
        mode: this.firstOrderService.esModoSuscripcion()
          ? 'suscripcion'
          : this.firstOrderService.esModoIndividual()
            ? 'individual'
            : null
      },
      lastOrder: ultimoPedido
        ? {
            number: ultimoPedido.numeroPedido,
            deliveryDate: ultimoPedido.fechaEntregaProgramada,
            total: ultimoPedido.total,
            subscription: ultimoPedido.esSuscripcion
          }
        : null
    };
  }

  private buildSubscriptionItems(): { id: number; name: string; quantity: number }[] {
    const subscriptionIds = this.subscriptionService.obtenerSuscripcion().platosSeleccionadosIds;
    const items = new Map<number, { id: number; name: string; quantity: number }>();

    for (const item of this.carritoService.obtenerItems()) {
      const cantidadSuscripcion = subscriptionIds.filter((id) => id === item.plato.id).length;

      if (cantidadSuscripcion <= 0) {
        continue;
      }

      items.set(item.plato.id, {
        id: item.plato.id,
        name: item.plato.name,
        quantity: cantidadSuscripcion
      });
    }

    return Array.from(items.values());
  }

  private normalizarRespuesta(response: Partial<AssistantResponse> | null | undefined): AssistantResponse {
    const message = typeof response?.message === 'string' && response.message.trim() !== ''
      ? response.message.trim()
      : 'No he podido responder ahora mismo. Intentalo de nuevo en unos segundos.';

    const actions = Array.isArray(response?.actions)
      ? response.actions
          .filter((action): action is AssistantAction => Boolean(action && action.type === 'navigate'))
          .map((action) => {
            const target = this.sanitizarTarget(action.target);

            if (!target) {
              return null;
            }

            return {
              type: 'navigate' as const,
              target,
              label: this.sanitizarEtiqueta(action.label, target)
            };
          })
          .filter((action): action is AssistantAction => action !== null)
          .slice(0, 2)
      : [];

    return {
      message,
      actions,
      source: this.normalizarSource(response?.source)
    };
  }

  private sanitizarTarget(target: unknown): string | null {
    if (typeof target !== 'string') {
      return null;
    }

    const normalized = target.trim();

    if (this.allowedTargets.has(normalized)) {
      return normalized;
    }

    if (normalized.startsWith('/menu?subscriptionSelection=1')) {
      return '/menu?subscriptionSelection=1';
    }

    return null;
  }

  private sanitizarEtiqueta(label: unknown, target: string): string {
    if (typeof label === 'string' && label.trim() !== '') {
      return label.trim().replace(/\s+/g, ' ').slice(0, 40);
    }

    switch (target) {
      case '/menu':
        return 'Ver menu';
      case '/menu?subscriptionSelection=1':
        return 'Modificar seleccion';
      case '/suscripcion':
        return 'Gestionar suscripcion';
      case '/perfil':
        return 'Completar perfil';
      case '/pago':
        return 'Ir al pago';
      case '/mis-pedidos':
        return 'Ver mis pedidos';
      case '/resumen':
        return 'Ver carrito';
      case '/como-funciona':
        return 'Como funciona';
      case '/login':
        return 'Iniciar sesion';
      case '/inicio':
        return 'Ir a inicio';
      default:
        return 'Abrir';
    }
  }

  private normalizarSource(source: unknown): AssistantResponseSource | undefined {
    return source === 'openai' || source === 'fallback' || source === 'rules'
      ? source
      : undefined;
  }
}
