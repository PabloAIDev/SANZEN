import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SessionUser } from '../models/session-user.model';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private readonly storageKey = 'sanzen-session-user';
  private readonly apiUrl = 'http://localhost:3000/api/auth';
  private usuarioActual: SessionUser | null = null;
  private readonly usuarioActualSubject = new BehaviorSubject<SessionUser | null>(null);
  readonly usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  async cargarInicial(): Promise<void> {
    this.cerrarSesion();
    return Promise.resolve();
  }

  async obtenerUsuarios(): Promise<SessionUser[]> {
    return firstValueFrom(this.http.get<SessionUser[]>(`${this.apiUrl}/users`));
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
    return this.usuarioActual;
  }

  obtenerUsuarioIdActual(): number | null {
    return this.usuarioActual?.id ?? null;
  }

  obtenerTokenActual(): string | null {
    return this.usuarioActual?.token ?? null;
  }

  haySesionActiva(): boolean {
    return this.usuarioActual !== null;
  }

  private persistirUsuarioLocal(): void {
    if (!this.usuarioActual) {
      localStorage.removeItem(this.storageKey);
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.usuarioActual));
  }
}
