import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InicioPage } from './inicio.page';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';
import { SubscriptionService } from '../../services/subscription.service';

describe('InicioPage', () => {
  let component: InicioPage;
  let fixture: ComponentFixture<InicioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            haySesionActiva: jasmine.createSpy('haySesionActiva').and.returnValue(false)
          }
        },
        {
          provide: FirstOrderService,
          useValue: {
            iniciarProceso: jasmine.createSpy('iniciarProceso'),
            finalizarProceso: jasmine.createSpy('finalizarProceso')
          }
        },
        {
          provide: SubscriptionService,
          useValue: {
            restablecerSuscripcionLocal: jasmine.createSpy('restablecerSuscripcionLocal'),
            previsualizarSuscripcion: jasmine.createSpy('previsualizarSuscripcion').and.returnValue({
              activa: true,
              planSemanal: 5,
              diaEntrega: 'lunes',
              platosPorSemana: 5,
              platosSeleccionadosIds: [],
              precioOriginal: 0,
              descuentoAplicado: 0,
              precioEstimado: 0,
              proximaEntrega: 'lunes',
              proximaEntregaIso: new Date().toISOString()
            }),
            establecerSuscripcionTemporal: jasmine.createSpy('establecerSuscripcionTemporal')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
