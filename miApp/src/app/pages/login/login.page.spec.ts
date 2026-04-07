import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LoginPage } from './login.page';
import { OrderService } from '../../services/order.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        },
        {
          provide: Router,
          useValue: {
            events: of({}),
            navigate: jasmine.createSpy('navigate'),
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        },
        {
          provide: OrderService,
          useValue: {
            refrescarDesdeApi: jasmine.createSpy('refrescarDesdeApi').and.resolveTo()
          }
        },
        {
          provide: ProfileService,
          useValue: {
            prepararCambioDeUsuario: jasmine.createSpy('prepararCambioDeUsuario'),
            refrescarDesdeApi: jasmine.createSpy('refrescarDesdeApi').and.resolveTo(),
            tienePerfilCompleto: jasmine.createSpy('tienePerfilCompleto').and.returnValue(false),
            tienePerfilCompletoParaPago: jasmine.createSpy('tienePerfilCompletoParaPago').and.returnValue(false)
          }
        },
        {
          provide: SubscriptionService,
          useValue: {
            refrescarDesdeApi: jasmine.createSpy('refrescarDesdeApi').and.resolveTo(),
            suscripcionActiva: jasmine.createSpy('suscripcionActiva').and.returnValue(false)
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            obtenerUsuarios: jasmine.createSpy('obtenerUsuarios').and.resolveTo([]),
            iniciarSesion: jasmine.createSpy('iniciarSesion').and.resolveTo({ id: 1, nombre: 'Test', email: 'test@test.com' }),
            registrarUsuario: jasmine.createSpy('registrarUsuario').and.resolveTo({ id: 2, nombre: 'Alta', email: 'alta@test.com' })
          }
        },
        {
          provide: FirstOrderService,
          useValue: {
            estaActivo: jasmine.createSpy('estaActivo').and.returnValue(false),
            esModoSuscripcion: jasmine.createSpy('esModoSuscripcion').and.returnValue(false),
            marcarUsuarioRecienCreado: jasmine.createSpy('marcarUsuarioRecienCreado'),
            finalizarProceso: jasmine.createSpy('finalizarProceso')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
