import { Injectable } from '@angular/core';
import {
  ObjetivoNutricional,
  PreferenciaComposicion
} from '../models/profile.model';
import { UserSubscription } from '../models/subscription.model';

export type FirstOrderMode = 'individual' | 'suscripcion';

interface FirstOrderFilters {
  alergenos: string[];
  objetivoNutricional: ObjetivoNutricional;
  preferenciasComposicion: PreferenciaComposicion[];
}

interface FirstOrderState {
  activo: boolean;
  modo: FirstOrderMode | null;
  filtros: FirstOrderFilters;
  suscripcionTemporal: UserSubscription | null;
  usuarioRecienCreadoEmail: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FirstOrderService {
  private readonly storageKey = 'sanzen-first-order-state';
  private estadoCache: FirstOrderState = this.obtenerEstadoPorDefecto();

  iniciarProceso(
    modo: FirstOrderMode,
    suscripcionTemporal: UserSubscription | null = null
  ): void {
    const estadoActual = this.obtenerEstado();

    this.estadoCache = {
      activo: true,
      modo,
      filtros: { ...estadoActual.filtros },
      suscripcionTemporal: modo === 'suscripcion' ? suscripcionTemporal ?? estadoActual.suscripcionTemporal : null,
      usuarioRecienCreadoEmail: estadoActual.usuarioRecienCreadoEmail
    };

    this.persistir();
  }

  finalizarProceso(): void {
    this.estadoCache = this.obtenerEstadoPorDefecto();
    localStorage.removeItem(this.storageKey);
  }

  estaActivo(): boolean {
    return this.obtenerEstado().activo;
  }

  esModoSuscripcion(): boolean {
    const estado = this.obtenerEstado();
    return estado.activo && estado.modo === 'suscripcion';
  }

  esModoIndividual(): boolean {
    const estado = this.obtenerEstado();
    return estado.activo && estado.modo === 'individual';
  }

  guardarFiltrosNutricionales(filtros: FirstOrderFilters): void {
    const estado = this.obtenerEstado();
    this.estadoCache = {
      ...estado,
      filtros: {
        alergenos: [...filtros.alergenos],
        objetivoNutricional: filtros.objetivoNutricional,
        preferenciasComposicion: [...filtros.preferenciasComposicion]
      }
    };
    this.persistir();
  }

  obtenerFiltrosNutricionales(): FirstOrderFilters {
    const estado = this.obtenerEstado();
    return {
      alergenos: [...estado.filtros.alergenos],
      objetivoNutricional: estado.filtros.objetivoNutricional,
      preferenciasComposicion: [...estado.filtros.preferenciasComposicion]
    };
  }

  guardarSuscripcionTemporal(suscripcion: UserSubscription | null): void {
    const estado = this.obtenerEstado();
    this.estadoCache = {
      ...estado,
      suscripcionTemporal: suscripcion ? { ...suscripcion, platosSeleccionadosIds: [...suscripcion.platosSeleccionadosIds] } : null
    };
    this.persistir();
  }

  obtenerSuscripcionTemporal(): UserSubscription | null {
    const suscripcion = this.obtenerEstado().suscripcionTemporal;
    return suscripcion
      ? {
          ...suscripcion,
          platosSeleccionadosIds: [...suscripcion.platosSeleccionadosIds]
        }
      : null;
  }

  marcarUsuarioRecienCreado(email: string): void {
    const estado = this.obtenerEstado();
    this.estadoCache = {
      ...estado,
      usuarioRecienCreadoEmail: email.trim().toLowerCase()
    };
    this.persistir();
  }

  esUsuarioRecienCreado(email: string): boolean {
    const emailNormalizado = email.trim().toLowerCase();
    return this.obtenerEstado().usuarioRecienCreadoEmail === emailNormalizado;
  }

  limpiarUsuarioRecienCreado(): void {
    const estado = this.obtenerEstado();
    this.estadoCache = {
      ...estado,
      usuarioRecienCreadoEmail: null
    };
    this.persistir();
  }

  private obtenerEstado(): FirstOrderState {
    const estadoGuardado = localStorage.getItem(this.storageKey);

    if (!estadoGuardado) {
      return this.estadoCache;
    }

    try {
      const estado = JSON.parse(estadoGuardado) as Partial<FirstOrderState>;
      this.estadoCache = this.normalizarEstado(estado);
      return this.estadoCache;
    } catch {
      this.estadoCache = this.obtenerEstadoPorDefecto();
      return this.estadoCache;
    }
  }

  private persistir(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.estadoCache));
  }

  private normalizarEstado(estado: Partial<FirstOrderState>): FirstOrderState {
    const filtros = (estado.filtros ?? {}) as Partial<FirstOrderFilters>;
    const suscripcion = estado.suscripcionTemporal;

    return {
      activo: Boolean(estado.activo),
      modo: estado.modo === 'individual' || estado.modo === 'suscripcion' ? estado.modo : null,
      filtros: {
        alergenos: Array.isArray(filtros.alergenos)
          ? filtros.alergenos.filter((item): item is string => typeof item === 'string')
          : [],
        objetivoNutricional:
          filtros.objetivoNutricional === 'perder-peso' || filtros.objetivoNutricional === 'masa-muscular'
            ? filtros.objetivoNutricional
            : null,
        preferenciasComposicion: Array.isArray(filtros.preferenciasComposicion)
          ? filtros.preferenciasComposicion.filter(
              (item): item is PreferenciaComposicion =>
                item === 'ricos-proteina' ||
                item === 'bajos-grasas' ||
                item === 'bajos-carbohidratos'
            )
          : []
      },
      suscripcionTemporal:
        suscripcion && typeof suscripcion === 'object'
          ? {
              ...suscripcion,
              platosSeleccionadosIds: Array.isArray(suscripcion.platosSeleccionadosIds)
                ? suscripcion.platosSeleccionadosIds.filter(
                    (item): item is number => typeof item === 'number'
                  )
                : []
            }
          : null,
      usuarioRecienCreadoEmail:
        typeof estado.usuarioRecienCreadoEmail === 'string' && estado.usuarioRecienCreadoEmail.trim() !== ''
          ? estado.usuarioRecienCreadoEmail.trim().toLowerCase()
          : null
    };
  }

  private obtenerEstadoPorDefecto(): FirstOrderState {
    return {
      activo: false,
      modo: null,
      filtros: {
        alergenos: [],
        objetivoNutricional: null,
        preferenciasComposicion: []
      },
      suscripcionTemporal: null,
      usuarioRecienCreadoEmail: null
    };
  }
}
