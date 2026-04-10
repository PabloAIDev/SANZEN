import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionUser } from '../models/session-user.model';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private readonly storageKey = 'sanzen-session-user';
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;
  private usuarioActual: SessionUser | null = null;
  private readonly usuarioActualSubject = new BehaviorSubject<SessionUser | null>(null);
  readonly usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  async cargarInicial(): Promise<void> {
    const usuarioPersistido = this.cargarUsuarioPersistido();
    this.usuarioActual = usuarioPersistido;
    this.usuarioActualSubject.next(this.usuarioActual);
    return Promise.resolve();
  }

  async iniciarSesion(email: string, password: string): Promise<SessionUser> {
    const usuario = await firstValueFrom(
      this.http.post<SessionUser>(`${this.apiUrl}/login`, {
        email,
        password
      })
    );

    this.usuarioActual = usuario;
    this.usuarioActualSubject.next(this.usuarioActual);
    this.persistirUsuarioLocal();
    return usuario;
  }

  async registrarUsuario(nombre: string, email: string, password: string): Promise<SessionUser> {
    return firstValueFrom(
      this.http.post<SessionUser>(`${this.apiUrl}/register`, {
        nombre,
        email,
        password
      })
    );
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.usuarioActualSubject.next(this.usuarioActual);
    localStorage.removeItem(this.storageKey);
  }

  obtenerUsuarioActual(): SessionUser | null {
    this.asegurarSesionVigente();
    return this.usuarioActual;
  }

  obtenerUsuarioIdActual(): number | null {
    this.asegurarSesionVigente();
    return this.usuarioActual?.id ?? null;
  }

  obtenerTokenActual(): string | null {
    this.asegurarSesionVigente();
    return this.usuarioActual?.token ?? null;
  }

  haySesionActiva(): boolean {
    this.asegurarSesionVigente();
    return this.usuarioActual !== null;
  }

  private persistirUsuarioLocal(): void {
    if (!this.usuarioActual) {
      localStorage.removeItem(this.storageKey);
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.usuarioActual));
  }

  private cargarUsuarioPersistido(): SessionUser | null {
    const rawValue = localStorage.getItem(this.storageKey);

    if (!rawValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as Partial<SessionUser> | null;

      if (!this.esSesionPersistidaValida(parsedValue)) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      const token = typeof parsedValue.token === 'string' ? parsedValue.token.trim() : '';

      return {
        id: parsedValue.id,
        nombre: parsedValue.nombre.trim(),
        email: parsedValue.email.trim(),
        token
      };
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private esSesionPersistidaValida(value: Partial<SessionUser> | null): value is SessionUser {
    return Boolean(
      value &&
      Number.isInteger(value.id) &&
      Number(value.id) > 0 &&
      typeof value.nombre === 'string' &&
      value.nombre.trim().length >= 2 &&
      typeof value.email === 'string' &&
      value.email.trim().length >= 5 &&
      typeof value.token === 'string' &&
      value.token.trim().length > 0 &&
      this.tokenEsValido(value.token, Number(value.id))
    );
  }

  private asegurarSesionVigente(): void {
    if (!this.usuarioActual) {
      return;
    }

    if (!this.tokenEsValido(this.usuarioActual.token, this.usuarioActual.id)) {
      this.cerrarSesion();
    }
  }

  private tokenEsValido(token: string | undefined, userIdEsperado: number): boolean {
    if (typeof token !== 'string' || token.trim() === '') {
      return false;
    }

    try {
      const [encodedPayload] = token.trim().split('.');

      if (!encodedPayload) {
        return false;
      }

      const payloadText = this.decodificarBase64Url(encodedPayload);
      const payload = JSON.parse(payloadText) as { userId?: unknown; exp?: unknown };
      const userId = Number(payload.userId);
      const exp = Number(payload.exp);

      return Number.isInteger(userId) && userId === userIdEsperado && Number.isFinite(exp) && exp > Date.now();
    } catch {
      return false;
    }
  }

  private decodificarBase64Url(value: string): string {
    const normalized = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    return atob(normalized);
  }
}
