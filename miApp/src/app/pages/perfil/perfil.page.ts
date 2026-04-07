import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DireccionPrincipal,
  ObjetivoNutricional,
  PreferenciaComposicion,
  TarjetaPrincipal,
  UserProfile
} from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';
import { CarritoService } from '../../services/carrito.service';
import { UserSessionService } from '../../services/user-session.service';
import { SessionUser } from '../../models/session-user.model';
import { FirstOrderService } from '../../services/first-order.service';

interface AlergenoOption {
  valor: string;
  icono: string;
}

interface PreferenciaOption {
  valor: PreferenciaComposicion;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonButtons,
    IonBackButton,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonButton,
    IonNote,
    TranslateModule
  ]
})
export class PerfilPage implements OnInit {
  perfil: UserProfile = this.profileService.obtenerPerfil();
  usuarioActual: SessionUser | null = null;
  intentoGuardar = false;

  readonly alergenosDisponibles: AlergenoOption[] = [
    { valor: 'Crustáceos', icono: 'assets/icons/alergenos/crustaceos.png' },
    { valor: 'Frutos secos', icono: 'assets/icons/alergenos/frutos-secos.png' },
    { valor: 'Gluten', icono: 'assets/icons/alergenos/gluten.png' },
    { valor: 'Huevo', icono: 'assets/icons/alergenos/huevo.png' },
    { valor: 'Lácteos', icono: 'assets/icons/alergenos/lacteos.png' },
    { valor: 'Legumbres', icono: 'assets/icons/alergenos/legumbres.png' },
    { valor: 'Pescado', icono: 'assets/icons/alergenos/pescado.png' },
    { valor: 'Sésamo', icono: 'assets/icons/alergenos/sesamo.png' },
    { valor: 'Soja', icono: 'assets/icons/alergenos/soja.png' }
  ];

  readonly objetivosNutricionales: { valor: Exclude<ObjetivoNutricional, null> }[] = [
    { valor: 'perder-peso' },
    { valor: 'masa-muscular' }
  ];

  readonly preferenciasDisponibles: PreferenciaOption[] = [
    { valor: 'ricos-proteina' },
    { valor: 'bajos-grasas' },
    { valor: 'bajos-carbohidratos' }
  ];

  constructor(
    private profileService: ProfileService,
    private carritoService: CarritoService,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  ionViewWillEnter(): void {
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cargarPerfil();
  }

  cargarPerfil(): void {
    if (!this.userSessionService.haySesionActiva()) {
      this.perfil = {
        nombre: '',
        email: '',
        password: '',
        alergenos: [],
        objetivoNutricional: null,
        preferenciasComposicion: [],
        direccionPrincipal: this.crearDireccionVacia(),
        tarjetaPrincipal: this.crearTarjetaVacia()
      };
      return;
    }

    this.usuarioActual = this.userSessionService.obtenerUsuarioActual();
    const perfilGuardado = this.profileService.obtenerPerfil();

    this.perfil = {
      ...perfilGuardado,
      alergenos: [...perfilGuardado.alergenos],
      preferenciasComposicion: [...perfilGuardado.preferenciasComposicion],
      direccionPrincipal: perfilGuardado.direccionPrincipal
        ? { ...perfilGuardado.direccionPrincipal }
        : this.crearDireccionVacia(),
      tarjetaPrincipal: perfilGuardado.tarjetaPrincipal
        ? { ...perfilGuardado.tarjetaPrincipal }
        : this.crearTarjetaVacia()
    };

    this.aplicarPrefillPrimerPedidoSiCorresponde();
  }

  async guardarPerfil(): Promise<void> {
    this.intentoGuardar = true;

    if (!this.formularioPerfilValido()) {
      return;
    }

    await this.profileService.guardarPerfilPersistido(this.perfil);

    if (
      this.usuarioActual &&
      this.firstOrderService.esUsuarioRecienCreado(this.usuarioActual.email)
    ) {
      this.firstOrderService.limpiarUsuarioRecienCreado();
    }

    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    this.router.navigateByUrl(redirect ?? '/menu');
  }

  obtenerAutocompleteBasico(campo: string): string {
    return `section-user-${this.obtenerClaveSesion()} ${campo}`;
  }

  obtenerAutocompleteDireccion(campo: string): string {
    return `section-user-${this.obtenerClaveSesion()} shipping ${campo}`;
  }

  obtenerAutocompleteTarjeta(campo: string): string {
    return `section-user-${this.obtenerClaveSesion()} ${campo}`;
  }

  obtenerAutocompleteCvv(): string {
    return 'off';
  }

  restablecerPreferencias(): void {
    const perfilRestablecido = this.profileService.restablecerPreferenciasNutricionales();

    this.perfil = {
      ...perfilRestablecido,
      alergenos: [...perfilRestablecido.alergenos],
      preferenciasComposicion: [...perfilRestablecido.preferenciasComposicion],
      direccionPrincipal: perfilRestablecido.direccionPrincipal
        ? { ...perfilRestablecido.direccionPrincipal }
        : this.crearDireccionVacia(),
      tarjetaPrincipal: perfilRestablecido.tarjetaPrincipal
        ? { ...perfilRestablecido.tarjetaPrincipal }
        : this.crearTarjetaVacia()
    };
  }

  toggleAlergeno(nombre: string, event: CustomEvent): void {
    const checked = event.detail.checked;

    if (checked) {
      if (!this.perfil.alergenos.includes(nombre)) {
        this.perfil.alergenos = [...this.perfil.alergenos, nombre];
      }

      return;
    }

    this.perfil.alergenos = this.perfil.alergenos.filter(alergeno => alergeno !== nombre);
  }

  togglePreferencia(valor: PreferenciaComposicion, event: CustomEvent): void {
    const checked = event.detail.checked;

    if (checked) {
      if (!this.perfil.preferenciasComposicion.includes(valor)) {
        this.perfil.preferenciasComposicion = [...this.perfil.preferenciasComposicion, valor];
      }

      return;
    }

    this.perfil.preferenciasComposicion = this.perfil.preferenciasComposicion.filter(
      preferencia => preferencia !== valor
    );
  }

  obtenerEtiquetaAlergeno(alergeno: string): string {
    return this.translateService.instant(`COMMON.ALLERGENS.${alergeno}`);
  }

  obtenerEtiquetaObjetivo(valor: Exclude<ObjetivoNutricional, null>): string {
    return this.translateService.instant(`COMMON.GOALS.${valor}`);
  }

  obtenerEtiquetaPreferencia(valor: PreferenciaComposicion): string {
    return this.translateService.instant(`COMMON.COMPOSITION.${valor}`);
  }

  actualizarCodigoPostal(event: CustomEvent): void {
    this.perfil.direccionPrincipal = this.obtenerDireccionEditable();
    this.perfil.direccionPrincipal.codigoPostal =
      String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 5);
  }

  actualizarNombre(event: CustomEvent): void {
    this.perfil.nombre = this.sanitizarTextoSoloLetras(event.detail.value);
  }

  actualizarCalleNumero(event: CustomEvent): void {
    this.perfil.direccionPrincipal = this.obtenerDireccionEditable();
    this.perfil.direccionPrincipal.calleNumero = this.sanitizarCalleNumero(event.detail.value);
  }

  actualizarCiudad(event: CustomEvent): void {
    this.perfil.direccionPrincipal = this.obtenerDireccionEditable();
    this.perfil.direccionPrincipal.ciudad = this.sanitizarTextoSoloLetras(event.detail.value);
  }

  actualizarProvincia(event: CustomEvent): void {
    this.perfil.direccionPrincipal = this.obtenerDireccionEditable();
    this.perfil.direccionPrincipal.provincia = this.sanitizarTextoSoloLetras(event.detail.value);
  }

  actualizarTelefono(event: CustomEvent): void {
    this.perfil.direccionPrincipal = this.obtenerDireccionEditable();
    this.perfil.direccionPrincipal.telefono =
      String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 9);
  }

  actualizarNumeroTarjeta(event: CustomEvent): void {
    this.perfil.tarjetaPrincipal = this.obtenerTarjetaEditable();
    const valor = String(event.detail.value ?? '');
    const digitos = valor.replace(/\D/g, '').slice(0, 16);
    this.perfil.tarjetaPrincipal.numeroTarjeta = digitos.replace(/(.{4})/g, '$1 ').trim();
  }

  actualizarFechaCaducidad(event: CustomEvent): void {
    this.perfil.tarjetaPrincipal = this.obtenerTarjetaEditable();
    const valor = String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 4);

    if (valor.length <= 2) {
      this.perfil.tarjetaPrincipal.fechaCaducidad = valor;
      return;
    }

    this.perfil.tarjetaPrincipal.fechaCaducidad = `${valor.slice(0, 2)}/${valor.slice(2)}`;
  }

  actualizarCvv(event: CustomEvent): void {
    this.perfil.tarjetaPrincipal = this.obtenerTarjetaEditable();
    this.perfil.tarjetaPrincipal.cvv =
      String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 3);
  }

  actualizarNombreTitular(event: CustomEvent): void {
    this.perfil.tarjetaPrincipal = this.obtenerTarjetaEditable();
    this.perfil.tarjetaPrincipal.nombreTitular = this.sanitizarTextoSoloLetras(event.detail.value);
  }

  formularioPerfilValido(): boolean {
    const tarjeta = this.perfil.tarjetaPrincipal;
    const tarjetaVacia = !this.profileService.tarjetaPrincipalTieneDatos(tarjeta);

    return (
      this.nombreValido() &&
      this.emailValido() &&
      this.passwordValida() &&
      this.nombreDireccionValido() &&
      this.calleNumeroValido() &&
      this.ciudadValida() &&
      this.codigoPostalValido() &&
      this.provinciaValida() &&
      this.telefonoValido() &&
      (tarjetaVacia || this.tarjetaValida())
    );
  }

  mostrarErrorCampo(campo: string): boolean {
    if (campo === 'nombre') {
      return (this.intentoGuardar || this.perfil.nombre.trim() !== '') && !this.nombreValido();
    }

    if (campo === 'email') {
      return (this.intentoGuardar || this.perfil.email.trim() !== '') && !this.emailValido();
    }

    if (campo === 'password') {
      return (this.intentoGuardar || this.perfil.password.trim() !== '') && !this.passwordValida();
    }

    if (campo === 'direccionNombre') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.nombre ?? '').trim() !== '') &&
        !this.nombreDireccionValido();
    }

    if (campo === 'calleNumero') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.calleNumero ?? '').trim() !== '') &&
        !this.calleNumeroValido();
    }

    if (campo === 'ciudad') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.ciudad ?? '').trim() !== '') &&
        !this.ciudadValida();
    }

    if (campo === 'codigoPostal') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.codigoPostal ?? '').trim() !== '') &&
        !this.codigoPostalValido();
    }

    if (campo === 'provincia') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.provincia ?? '').trim() !== '') &&
        !this.provinciaValida();
    }

    if (campo === 'telefono') {
      return (this.intentoGuardar || (this.perfil.direccionPrincipal?.telefono ?? '').trim() !== '') &&
        !this.telefonoValido();
    }

    if (campo === 'nombreTitular') {
      return this.tarjetaConDatos() &&
        (this.intentoGuardar || (this.perfil.tarjetaPrincipal?.nombreTitular ?? '').trim() !== '') &&
        !this.nombreTitularValido();
    }

    if (campo === 'numeroTarjeta') {
      return this.tarjetaConDatos() &&
        (this.intentoGuardar || (this.perfil.tarjetaPrincipal?.numeroTarjeta ?? '').trim() !== '') &&
        !this.numeroTarjetaValido();
    }

    if (campo === 'fechaCaducidad') {
      return this.tarjetaConDatos() &&
        (this.intentoGuardar || (this.perfil.tarjetaPrincipal?.fechaCaducidad ?? '').trim() !== '') &&
        !this.fechaCaducidadValida();
    }

    if (campo === 'cvv') {
      return this.tarjetaConDatos() &&
        (this.intentoGuardar || (this.perfil.tarjetaPrincipal?.cvv ?? '').trim() !== '') &&
        !this.cvvValido();
    }

    return false;
  }

  tarjetaGuardadaEnmascaradaVisible(): boolean {
    return this.profileService.tarjetaPrincipalGuardadaEsUsable(this.perfil.tarjetaPrincipal);
  }

  private obtenerDireccionEditable(): DireccionPrincipal {
    return this.perfil.direccionPrincipal ?? this.crearDireccionVacia();
  }

  private obtenerTarjetaEditable(): TarjetaPrincipal {
    return this.perfil.tarjetaPrincipal ?? this.crearTarjetaVacia();
  }

  private crearDireccionVacia(): DireccionPrincipal {
    return {
      nombre: '',
      calleNumero: '',
      ciudad: '',
      codigoPostal: '',
      provincia: '',
      telefono: '',
      instrucciones: ''
    };
  }

  private crearTarjetaVacia(): TarjetaPrincipal {
    return {
      nombreTitular: '',
      numeroTarjeta: '',
      fechaCaducidad: '',
      cvv: ''
    };
  }

  private obtenerClaveSesion(): string {
    return String(this.usuarioActual?.id ?? 'guest');
  }

  private aplicarPrefillPrimerPedidoSiCorresponde(): void {
    if (
      !this.firstOrderService.estaActivo() ||
      !this.usuarioActual ||
      !this.firstOrderService.esUsuarioRecienCreado(this.usuarioActual.email) ||
      this.tienePreferenciasNutricionales(this.perfil)
    ) {
      return;
    }

    const filtros = this.firstOrderService.obtenerFiltrosNutricionales();
    this.perfil = {
      ...this.perfil,
      alergenos: [...filtros.alergenos],
      objetivoNutricional: filtros.objetivoNutricional,
      preferenciasComposicion: [...filtros.preferenciasComposicion]
    };
  }

  private tienePreferenciasNutricionales(perfil: UserProfile): boolean {
    return (
      perfil.alergenos.length > 0 ||
      perfil.objetivoNutricional !== null ||
      perfil.preferenciasComposicion.length > 0
    );
  }

  private nombreValido(): boolean {
    return this.profileService.textoSoloLetrasEsValido(this.perfil.nombre, 2);
  }

  private emailValido(): boolean {
    return this.profileService.emailEsValido(this.perfil.email);
  }

  private passwordValida(): boolean {
    return this.profileService.passwordEsValida(this.perfil.password);
  }

  private nombreDireccionValido(): boolean {
    return this.profileService.textoConMinimoValido(this.perfil.direccionPrincipal?.nombre ?? '', 2);
  }

  private calleNumeroValido(): boolean {
    return this.profileService.calleNumeroEsValido(this.perfil.direccionPrincipal?.calleNumero ?? '');
  }

  private ciudadValida(): boolean {
    return this.profileService.textoSoloLetrasEsValido(this.perfil.direccionPrincipal?.ciudad ?? '', 2);
  }

  private codigoPostalValido(): boolean {
    return this.profileService.codigoPostalEsValido(this.perfil.direccionPrincipal?.codigoPostal ?? '');
  }

  private provinciaValida(): boolean {
    return this.profileService.textoSoloLetrasEsValido(this.perfil.direccionPrincipal?.provincia ?? '', 2);
  }

  private telefonoValido(): boolean {
    return this.profileService.telefonoEsValido(this.perfil.direccionPrincipal?.telefono ?? '');
  }

  private tarjetaConDatos(): boolean {
    return this.profileService.tarjetaPrincipalTieneDatos(this.perfil.tarjetaPrincipal);
  }

  private tarjetaValida(): boolean {
    return this.profileService.tarjetaPrincipalEsCompleta(this.perfil.tarjetaPrincipal);
  }

  private nombreTitularValido(): boolean {
    return this.profileService.nombreTitularTarjetaEsValido(this.perfil.tarjetaPrincipal?.nombreTitular ?? '');
  }

  private numeroTarjetaValido(): boolean {
    return this.profileService.tarjetaPrincipalGuardadaEsUsable(this.perfil.tarjetaPrincipal) ||
      this.profileService.numeroTarjetaEsValido(this.perfil.tarjetaPrincipal?.numeroTarjeta ?? '');
  }

  private fechaCaducidadValida(): boolean {
    return this.profileService.fechaCaducidadTarjetaEsValida(this.perfil.tarjetaPrincipal?.fechaCaducidad ?? '');
  }

  private cvvValido(): boolean {
    return this.profileService.tarjetaPrincipalGuardadaEsUsable(this.perfil.tarjetaPrincipal) ||
      this.profileService.cvvEsValido(this.perfil.tarjetaPrincipal?.cvv ?? '');
  }

  private sanitizarTextoSoloLetras(valor: unknown): string {
    return String(valor ?? '')
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s+/, '');
  }

  private sanitizarCalleNumero(valor: unknown): string {
    return String(valor ?? '')
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s,./ºª#-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s+/, '');
  }
}
