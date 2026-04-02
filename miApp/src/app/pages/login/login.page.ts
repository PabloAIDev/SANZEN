import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionUser } from '../../models/session-user.model';
import { OrderService } from '../../services/order.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
    IonButton,
    IonList,
    IonNote
  ]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  nombreRegistro = '';
  emailRegistro = '';
  passwordRegistro = '';
  usuariosDisponibles: SessionUser[] = [];
  cargando = false;
  error = '';
  errorRegistro = '';
  intentoLogin = false;
  intentoRegistro = false;
  mostrarFormularioRegistro = true;
  private redirectTrasLogin: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private profileService: ProfileService,
    private subscriptionService: SubscriptionService,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService
  ) {}

  async ngOnInit(): Promise<void> {
    this.redirectTrasLogin = this.route.snapshot.queryParamMap.get('redirect');
    await this.cargarUsuarios();
  }

  async ionViewWillEnter(): Promise<void> {
    this.redirectTrasLogin = this.route.snapshot.queryParamMap.get('redirect');
    await this.cargarUsuarios();
  }

  async iniciarSesion(): Promise<void> {
    this.intentoLogin = true;

    if (!this.formularioLoginValido()) {
      this.error = 'Revisa los campos marcados.';
      return;
    }

    this.cargando = true;
    this.error = '';

    if (this.firstOrderService.estaActivo() && this.firstOrderService.esModoSuscripcion()) {
      this.firstOrderService.guardarSuscripcionTemporal(this.subscriptionService.obtenerSuscripcion());
    }

    try {
      await this.userSessionService.iniciarSesion(this.email.trim(), this.password.trim());
      this.profileService.prepararCambioDeUsuario();
      await this.profileService.refrescarDesdeApi();
      await this.subscriptionService.refrescarDesdeApi();
      await this.orderService.refrescarDesdeApi();

      if (this.firstOrderService.estaActivo() && this.firstOrderService.esModoSuscripcion()) {
        const suscripcionTemporal = this.firstOrderService.obtenerSuscripcionTemporal();

        if (suscripcionTemporal) {
          this.subscriptionService.establecerSuscripcionTemporal(suscripcionTemporal);
        }
      }

      const requierePerfilPago = this.redirectTrasLogin === '/pago';
      const perfilListo = requierePerfilPago
        ? this.profileService.tienePerfilCompletoParaPago()
        : this.profileService.tienePerfilCompleto();

      if (perfilListo) {
        if (!this.redirectTrasLogin) {
          if (this.firstOrderService.estaActivo()) {
            this.firstOrderService.finalizarProceso();
          }

          const queryParams = this.subscriptionService.suscripcionActiva()
            ? {}
            : { subscriptionSelection: '0' };

          await this.router.navigate(['/menu'], { queryParams });
          return;
        }

        await this.router.navigateByUrl(this.redirectTrasLogin);
      } else {
        await this.router.navigate(['/perfil'], {
          queryParams: this.redirectTrasLogin ? { redirect: this.redirectTrasLogin } : {}
        });
      }
    } catch {
      this.error = 'Credenciales incorrectas.';
    } finally {
      this.cargando = false;
    }
  }

  async registrarUsuario(): Promise<void> {
    this.intentoRegistro = true;

    if (!this.formularioRegistroValido()) {
      this.errorRegistro = 'Revisa los campos marcados.';
      return;
    }

    this.cargando = true;
    this.errorRegistro = '';

    try {
      const usuario = await this.userSessionService.registrarUsuario(
        this.nombreRegistro.trim(),
        this.emailRegistro.trim(),
        this.passwordRegistro.trim()
      );

      if (this.firstOrderService.estaActivo()) {
        this.firstOrderService.marcarUsuarioRecienCreado(usuario.email);
      }

      await this.cargarUsuarios();
      this.email = usuario.email;
      this.password = '';
      this.nombreRegistro = '';
      this.emailRegistro = '';
      this.passwordRegistro = '';
      this.intentoRegistro = false;
      this.errorRegistro = '';
      this.mostrarFormularioRegistro = false;
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
        this.errorRegistro = error.error.message;
      } else {
        this.errorRegistro = 'No se ha podido registrar el usuario. Revisa si el email ya existe.';
      }
    } finally {
      this.cargando = false;
    }
  }

  completarUsuario(usuario: SessionUser): void {
    this.email = usuario.email;
    this.password = '';
    this.error = '';
    this.intentoRegistro = false;
    this.errorRegistro = '';
  }

  private async cargarUsuarios(): Promise<void> {
    try {
      this.usuariosDisponibles = await this.userSessionService.obtenerUsuarios();
    } catch {
      this.usuariosDisponibles = [];
    }
  }

  formularioLoginValido(): boolean {
    return this.emailValido(this.email) && this.passwordValida(this.password);
  }

  formularioRegistroValido(): boolean {
    return (
      this.nombreRegistro.trim().length >= 2 &&
      this.emailValido(this.emailRegistro) &&
      this.passwordValida(this.passwordRegistro)
    );
  }

  mostrarErrorLogin(campo: 'email' | 'password'): boolean {
    if (campo === 'email') {
      return (this.intentoLogin || this.email.trim() !== '') && !this.emailValido(this.email);
    }

    return (this.intentoLogin || this.password.trim() !== '') && !this.passwordValida(this.password);
  }

  mostrarErrorRegistro(campo: 'nombre' | 'email' | 'password'): boolean {
    if (campo === 'nombre') {
      return (this.intentoRegistro || this.nombreRegistro.trim() !== '') && this.nombreRegistro.trim().length < 2;
    }

    if (campo === 'email') {
      return (this.intentoRegistro || this.emailRegistro.trim() !== '') && !this.emailValido(this.emailRegistro);
    }

    return (this.intentoRegistro || this.passwordRegistro.trim() !== '') && !this.passwordValida(this.passwordRegistro);
  }

  private emailValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
  }

  private passwordValida(valor: string): boolean {
    return valor.trim().length >= 6;
  }
}
