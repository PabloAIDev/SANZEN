import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  DireccionPrincipal,
  ObjetivoNutricional,
  PreferenciaComposicion,
  TarjetaPrincipal,
  UserProfile
} from '../models/profile.model';
import { UserSessionService } from './user-session.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly storageKeyBase = 'sanzen-user-profile';
  private readonly apiUrl = 'http://localhost:3000/api/perfil';
  private perfilCache: UserProfile = this.obtenerPerfilVacio();
  private cacheUsuarioId: number | null = null;
  private readonly passwordSentinel = '********';
  private readonly soloLetrasRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/;
  private readonly calleNumeroRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s,./ºª#-]+$/;

  constructor(
    private http: HttpClient,
    private userSessionService: UserSessionService
  ) {}

  async cargarInicial(): Promise<void> {
    await this.refrescarDesdeApi();
  }

  prepararCambioDeUsuario(): void {
    this.cacheUsuarioId = this.userSessionService.obtenerUsuarioIdActual();
    this.perfilCache = this.obtenerPerfilVacio();
  }

  obtenerPerfil(): UserProfile {
    this.sincronizarCacheConUsuarioActual();
    return this.normalizarPerfil(this.perfilCache);
  }

  guardarPerfil(perfil: UserProfile): void {
    this.sincronizarCacheConUsuarioActual();
    const perfilNormalizado = this.normalizarPerfil(perfil);
    this.perfilCache = this.sanitizarPerfilPersistible(perfilNormalizado);
    this.persistirPerfilLocal();
    void this.guardarPerfilEnApi(perfilNormalizado);
  }

  async guardarPerfilPersistido(perfil: UserProfile): Promise<UserProfile> {
    this.sincronizarCacheConUsuarioActual();
    const perfilNormalizado = this.normalizarPerfil(perfil);
    this.perfilCache = this.sanitizarPerfilPersistible(perfilNormalizado);
    this.persistirPerfilLocal();
    await this.guardarPerfilEnApi(perfilNormalizado);
    return this.obtenerPerfil();
  }

  guardarPreferenciasNutricionales(preferencias: {
    alergenos: string[];
    objetivoNutricional: ObjetivoNutricional;
    preferenciasComposicion: PreferenciaComposicion[];
  }): void {
    const perfilActual = this.obtenerPerfil();

    this.guardarPerfil({
      ...perfilActual,
      alergenos: [...preferencias.alergenos],
      objetivoNutricional: preferencias.objetivoNutricional,
      preferenciasComposicion: [...preferencias.preferenciasComposicion]
    });
  }

  tienePerfilCompleto(): boolean {
    const perfil = this.obtenerPerfil();

    return (
      this.textoConMinimoValido(perfil.nombre, 2) &&
      this.emailEsValido(perfil.email) &&
      this.passwordEsValida(perfil.password) &&
      this.direccionPrincipalEsCompleta(perfil.direccionPrincipal)
    );
  }

  tienePerfilCompletoParaPago(): boolean {
    const perfil = this.obtenerPerfil();
    return this.tienePerfilCompleto() && this.tarjetaPrincipalEsCompleta(perfil.tarjetaPrincipal);
  }

  textoConMinimoValido(valor: string, minimo: number): boolean {
    return this.textoValido(valor, minimo);
  }

  textoSoloLetrasEsValido(valor: string, minimo: number): boolean {
    return this.textoSoloLetrasValido(valor, minimo);
  }

  emailEsValido(valor: string): boolean {
    return this.emailValido(valor);
  }

  passwordEsValida(valor: string): boolean {
    return this.passwordValida(valor);
  }

  codigoPostalEsValido(valor: string): boolean {
    return this.codigoPostalValido(valor);
  }

  telefonoEsValido(valor: string): boolean {
    return this.telefonoValido(valor);
  }

  direccionPrincipalEsCompleta(direccion: DireccionPrincipal | null): boolean {
    return this.tieneDireccionPrincipalCompleta(direccion);
  }

  nombreTitularTarjetaEsValido(valor: string): boolean {
    return this.textoSoloLetrasValido(valor, 3);
  }

  calleNumeroEsValido(valor: string): boolean {
    return this.calleNumeroValido(valor);
  }

  numeroTarjetaEsValido(valor: string): boolean {
    const digitos = valor.replace(/\D/g, '');
    return /^\d{16}$/.test(digitos);
  }

  fechaCaducidadTarjetaEsValida(valor: string): boolean {
    const coincidencia = valor.trim().match(/^(\d{2})\/(\d{2}|\d{4})$/);

    if (!coincidencia) {
      return false;
    }

    const mes = Number(coincidencia[1]);
    const anioTexto = coincidencia[2];

    if (mes < 1 || mes > 12) {
      return false;
    }

    const anio = anioTexto.length === 2 ? 2000 + Number(anioTexto) : Number(anioTexto);
    const fechaExpiracion = new Date(anio, mes, 0, 23, 59, 59, 999);
    return fechaExpiracion >= new Date();
  }

  cvvEsValido(valor: string): boolean {
    return /^\d{3}$/.test(valor.trim());
  }

  tarjetaPrincipalEsCompleta(tarjeta: TarjetaPrincipal | null): boolean {
    return this.tieneTarjetaCompleta(tarjeta) || this.tieneTarjetaGuardadaUsable(tarjeta);
  }

  tarjetaPrincipalEditableEsCompleta(tarjeta: TarjetaPrincipal | null): boolean {
    return this.tieneTarjetaCompleta(tarjeta);
  }

  tarjetaPrincipalGuardadaEsUsable(tarjeta: TarjetaPrincipal | null): boolean {
    return this.tieneTarjetaGuardadaUsable(tarjeta);
  }

  tarjetaPrincipalTieneDatos(tarjeta: TarjetaPrincipal | null): boolean {
    return this.tieneDatosTarjeta(tarjeta);
  }

  restablecerPerfil(): UserProfile {
    this.sincronizarCacheConUsuarioActual();
    this.perfilCache = this.obtenerPerfilVacio();
    localStorage.removeItem(this.obtenerStorageKey());
    return this.obtenerPerfilVacio();
  }

  restablecerPreferenciasNutricionales(): UserProfile {
    this.sincronizarCacheConUsuarioActual();
    const perfilActual = this.obtenerPerfil();
    const perfilActualizado: UserProfile = {
      ...perfilActual,
      alergenos: [],
      objetivoNutricional: null,
      preferenciasComposicion: []
    };

    this.guardarPerfil(perfilActualizado);
    return perfilActualizado;
  }

  async refrescarDesdeApi(): Promise<void> {
    this.sincronizarCacheConUsuarioActual();
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      this.perfilCache = this.obtenerPerfilVacio();
      return;
    }

    try {
      const perfilLocal = this.cargarPerfilLocal();
      const perfilApi = await firstValueFrom(this.http.get<UserProfile>(`${this.apiUrl}?userId=${userId}`));
      this.perfilCache = this.sanitizarPerfilPersistible(
        this.combinarDatosSensibles(this.normalizarPerfil(perfilApi), perfilLocal)
      );
      this.persistirPerfilLocal();
    } catch (error) {
      console.warn('No se ha podido cargar el perfil desde la API. Se usa localStorage.', error);
    }
  }

  private async guardarPerfilEnApi(perfil: UserProfile): Promise<UserProfile | null> {
    const userId = this.userSessionService.obtenerUsuarioIdActual();

    if (!userId) {
      return null;
    }

    try {
      const perfilApi = await firstValueFrom(
        this.http.put<UserProfile>(this.apiUrl, {
          ...perfil,
          userId
        })
      );

      this.perfilCache = this.sanitizarPerfilPersistible(this.normalizarPerfil(perfilApi));
      this.persistirPerfilLocal();
      return this.perfilCache;
    } catch (error) {
      console.warn('No se ha podido guardar el perfil en la API. Se conserva localmente.', error);
      return null;
    }
  }

  private persistirPerfilLocal(): void {
    localStorage.setItem(
      this.obtenerStorageKey(),
      JSON.stringify(this.sanitizarPerfilPersistible(this.perfilCache))
    );
  }

  private cargarPerfilLocal(): UserProfile {
    const perfilGuardado = localStorage.getItem(this.obtenerStorageKey());

    if (!perfilGuardado) {
      return this.obtenerPerfilVacio();
    }

    try {
      const perfil = JSON.parse(perfilGuardado) as Partial<UserProfile>;
      return this.sanitizarPerfilPersistible(this.normalizarPerfil(perfil));
    } catch {
      return this.obtenerPerfilVacio();
    }
  }

  private obtenerPerfilVacio(): UserProfile {
    return {
      nombre: '',
      email: '',
      password: '',
      alergenos: [],
      objetivoNutricional: null,
      preferenciasComposicion: [],
      direccionPrincipal: null,
      tarjetaPrincipal: null
    };
  }

  private normalizarPerfil(perfil: Partial<UserProfile>): UserProfile {
    return {
      nombre: typeof perfil.nombre === 'string' ? perfil.nombre : '',
      email: typeof perfil.email === 'string' ? perfil.email : '',
      password: typeof perfil.password === 'string' ? perfil.password : '',
      alergenos: this.normalizarAlergenos(perfil.alergenos),
      objetivoNutricional: this.normalizarObjetivo(perfil.objetivoNutricional),
      preferenciasComposicion: this.normalizarPreferencias(perfil.preferenciasComposicion),
      direccionPrincipal: this.normalizarDireccionPrincipal(perfil.direccionPrincipal),
      tarjetaPrincipal: this.normalizarTarjetaPrincipal(perfil.tarjetaPrincipal)
    };
  }

  private normalizarAlergenos(valor: unknown): string[] {
    if (!Array.isArray(valor)) {
      return [];
    }

    return valor.filter((item): item is string => typeof item === 'string');
  }

  private normalizarObjetivo(valor: unknown): ObjetivoNutricional {
    if (valor === 'perder-peso' || valor === 'masa-muscular') {
      return valor;
    }

    return null;
  }

  private normalizarPreferencias(valor: unknown): PreferenciaComposicion[] {
    if (!Array.isArray(valor)) {
      return [];
    }

    return valor.filter(
      (item): item is PreferenciaComposicion =>
        item === 'ricos-proteina' ||
        item === 'bajos-grasas' ||
        item === 'bajos-carbohidratos'
    );
  }

  private normalizarDireccionPrincipal(valor: unknown): DireccionPrincipal | null {
    if (!valor || typeof valor !== 'object') {
      return null;
    }

    const direccion = valor as Partial<DireccionPrincipal>;
    const direccionNormalizada: DireccionPrincipal = {
      nombre: typeof direccion.nombre === 'string' ? direccion.nombre : '',
      calleNumero: typeof direccion.calleNumero === 'string' ? direccion.calleNumero : '',
      ciudad: typeof direccion.ciudad === 'string' ? direccion.ciudad : '',
      codigoPostal: typeof direccion.codigoPostal === 'string' ? direccion.codigoPostal : '',
      provincia: typeof direccion.provincia === 'string' ? direccion.provincia : '',
      telefono: typeof direccion.telefono === 'string' ? direccion.telefono : '',
      instrucciones: typeof direccion.instrucciones === 'string' ? direccion.instrucciones : ''
    };

    return this.tieneDireccionPrincipalCompleta(direccionNormalizada)
      ? direccionNormalizada
      : null;
  }

  private normalizarTarjetaPrincipal(valor: unknown): TarjetaPrincipal | null {
    if (!valor || typeof valor !== 'object') {
      return null;
    }

    const tarjeta = valor as Partial<TarjetaPrincipal>;
    const tarjetaNormalizada: TarjetaPrincipal = {
      nombreTitular: typeof tarjeta.nombreTitular === 'string' ? tarjeta.nombreTitular : '',
      numeroTarjeta: typeof tarjeta.numeroTarjeta === 'string' ? tarjeta.numeroTarjeta : '',
      fechaCaducidad: typeof tarjeta.fechaCaducidad === 'string' ? tarjeta.fechaCaducidad : '',
      cvv: typeof tarjeta.cvv === 'string' ? tarjeta.cvv : ''
    };

    return this.tieneDatosTarjeta(tarjetaNormalizada) ? tarjetaNormalizada : null;
  }

  private combinarDatosSensibles(perfilApi: UserProfile, perfilLocal: UserProfile): UserProfile {
    const tarjetaPrincipal = this.tarjetaRemotaAprovechable(perfilApi.tarjetaPrincipal)
      ? perfilApi.tarjetaPrincipal
      : this.tarjetaRemotaAprovechable(perfilLocal.tarjetaPrincipal)
        ? perfilLocal.tarjetaPrincipal
        : null;

    return {
      ...perfilApi,
      password: perfilApi.password,
      tarjetaPrincipal
    };
  }

  private tarjetaRemotaAprovechable(tarjeta: TarjetaPrincipal | null): boolean {
    if (!tarjeta) {
      return false;
    }

    return tarjeta.nombreTitular.trim() !== '' && tarjeta.numeroTarjeta.trim() !== '' && tarjeta.fechaCaducidad.trim() !== '';
  }

  private tieneDireccionPrincipalCompleta(direccion: DireccionPrincipal | null): boolean {
    if (!direccion) {
      return false;
    }

    return (
      this.textoValido(direccion.nombre, 2) &&
      this.textoValido(direccion.calleNumero, 5) &&
      this.textoValido(direccion.ciudad, 2) &&
      this.codigoPostalEsValido(direccion.codigoPostal) &&
      this.textoValido(direccion.provincia, 2) &&
      this.telefonoEsValido(direccion.telefono)
    );
  }

  private textoValido(valor: string, minimo: number): boolean {
    return valor.trim().length >= minimo;
  }

  private textoSoloLetrasValido(valor: string, minimo: number): boolean {
    const texto = valor.trim();
    return texto.length >= minimo && this.soloLetrasRegex.test(texto);
  }

  private emailValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
  }

  private passwordValida(valor: string): boolean {
    return valor.trim().length >= 6;
  }

  private codigoPostalValido(valor: string): boolean {
    return /^\d{5}$/.test(valor.trim());
  }

  private telefonoValido(valor: string): boolean {
    return /^\d{9}$/.test(valor.replace(/\s/g, ''));
  }

  private calleNumeroValido(valor: string): boolean {
    const texto = valor.trim();
    return texto.length >= 5 && this.calleNumeroRegex.test(texto);
  }

  private tieneTarjetaCompleta(tarjeta: TarjetaPrincipal | null): boolean {
    if (!tarjeta) {
      return false;
    }

    return (
      this.nombreTitularTarjetaEsValido(tarjeta.nombreTitular) &&
      this.numeroTarjetaEsValido(tarjeta.numeroTarjeta) &&
      this.fechaCaducidadTarjetaEsValida(tarjeta.fechaCaducidad) &&
      this.cvvEsValido(tarjeta.cvv)
    );
  }

  private tieneTarjetaGuardadaUsable(tarjeta: TarjetaPrincipal | null): boolean {
    if (!tarjeta) {
      return false;
    }

    return (
      this.nombreTitularTarjetaEsValido(tarjeta.nombreTitular) &&
      this.numeroTarjetaEnmascaradoEsValido(tarjeta.numeroTarjeta) &&
      this.fechaCaducidadTarjetaEsValida(tarjeta.fechaCaducidad)
    );
  }

  private numeroTarjetaEnmascaradoEsValido(valor: string): boolean {
    return /^\*{4}\s\*{4}\s\*{4}\s\d{4}$/.test(valor.trim());
  }

  private enmascararNumeroTarjeta(valor: string): string {
    const digitos = valor.replace(/\D/g, '');

    if (digitos.length < 4) {
      return '';
    }

    return `**** **** **** ${digitos.slice(-4)}`;
  }

  private tieneDatosTarjeta(tarjeta: TarjetaPrincipal | null): boolean {
    if (!tarjeta) {
      return false;
    }

    return (
      tarjeta.nombreTitular.trim() !== '' ||
      tarjeta.numeroTarjeta.trim() !== '' ||
      tarjeta.fechaCaducidad.trim() !== '' ||
      tarjeta.cvv.trim() !== ''
    );
  }

  private sanitizarPerfilPersistible(perfil: UserProfile): UserProfile {
    return {
      ...perfil,
      password: perfil.password.trim() !== '' ? this.passwordSentinel : '',
      tarjetaPrincipal: this.sanitizarTarjetaPersistible(perfil.tarjetaPrincipal)
    };
  }

  private sanitizarTarjetaPersistible(tarjeta: TarjetaPrincipal | null): TarjetaPrincipal | null {
    if (!tarjeta) {
      return null;
    }

    const numeroTarjeta = this.numeroTarjetaEsValido(tarjeta.numeroTarjeta)
      ? this.enmascararNumeroTarjeta(tarjeta.numeroTarjeta)
      : this.numeroTarjetaEnmascaradoEsValido(tarjeta.numeroTarjeta)
        ? tarjeta.numeroTarjeta.trim()
        : '';

    const tarjetaSanitizada: TarjetaPrincipal = {
      nombreTitular: tarjeta.nombreTitular.trim(),
      numeroTarjeta,
      fechaCaducidad: tarjeta.fechaCaducidad.trim(),
      cvv: ''
    };

    return this.tarjetaRemotaAprovechable(tarjetaSanitizada) ? tarjetaSanitizada : null;
  }

  private sincronizarCacheConUsuarioActual(): void {
    const usuarioIdActual = this.userSessionService.obtenerUsuarioIdActual();

    if (this.cacheUsuarioId === usuarioIdActual) {
      return;
    }

    this.cacheUsuarioId = usuarioIdActual;
    this.perfilCache = usuarioIdActual ? this.cargarPerfilLocal() : this.obtenerPerfilVacio();
  }

  private obtenerStorageKey(): string {
    return `${this.storageKeyBase}-${this.userSessionService.obtenerUsuarioIdActual() ?? 'guest'}`;
  }
}
