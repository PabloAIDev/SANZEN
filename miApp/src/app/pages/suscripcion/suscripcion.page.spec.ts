import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SuscripcionPage } from './suscripcion.page';
import { SubscriptionService } from '../../services/subscription.service';
import { CarritoService } from '../../services/carrito.service';
import { UserSessionService } from '../../services/user-session.service';
import { PlatoService } from '../../services/plato.service';
import { ProfileService } from '../../services/profile.service';
import { OrderService } from '../../services/order.service';
import { UserSubscription } from '../../models/subscription.model';

describe('SuscripcionPage', () => {
  let component: SuscripcionPage;
  let fixture: ComponentFixture<SuscripcionPage>;

  const suscripcionBase: UserSubscription = {
    activa: true,
    planSemanal: 5,
    diaEntrega: 'jueves',
    platosPorSemana: 5,
    platosSeleccionadosIds: [1, 2, 3, 4, 5],
    precioOriginal: 50,
    descuentoAplicado: 10,
    precioEstimado: 40,
    proximaEntrega: 'jueves 10 abril',
    proximaEntregaIso: '2026-04-10T11:00:00.000Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuscripcionPage, TranslateModule.forRoot()],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            obtenerSuscripcion: jasmine.createSpy('obtenerSuscripcion').and.returnValue({ ...suscripcionBase }),
            obtenerMinimoPlatosSuscripcion: jasmine.createSpy('obtenerMinimoPlatosSuscripcion').and.returnValue(5),
            obtenerDescuentoPorPlan: jasmine.createSpy('obtenerDescuentoPorPlan').and.returnValue(0.2),
            suscripcionCompleta: jasmine.createSpy('suscripcionCompleta').and.returnValue(true),
            previsualizarSuscripcion: jasmine.createSpy('previsualizarSuscripcion').and.callFake((suscripcion: UserSubscription) => suscripcion),
            establecerSuscripcionTemporal: jasmine.createSpy('establecerSuscripcionTemporal'),
            guardarPlan: jasmine.createSpy('guardarPlan').and.callFake((_plan: number, activa: boolean) => ({
              ...suscripcionBase,
              activa
            })),
            actualizarSeleccionPlatos: jasmine.createSpy('actualizarSeleccionPlatos').and.returnValue({ ...suscripcionBase }),
            refrescarDesdeApi: jasmine.createSpy('refrescarDesdeApi').and.resolveTo(),
            simularRenovacionSemanal: jasmine.createSpy('simularRenovacionSemanal').and.resolveTo({
              pedidoId: 'pedido-1',
              numeroPedido: 'SZ-TEST-0001',
              fechaEntregaProgramada: '2026-04-17T11:00:00.000Z',
              proximaEntrega: 'jueves 17 abril',
              proximaEntregaIso: '2026-04-17T11:00:00.000Z'
            })
          }
        },
        {
          provide: CarritoService,
          useValue: {
            obtenerCantidadTotalItems: jasmine.createSpy('obtenerCantidadTotalItems').and.returnValue(0),
            cargarDesdeSuscripcion: jasmine.createSpy('cargarDesdeSuscripcion'),
            obtenerIdsPlatosSuscripcion: jasmine.createSpy('obtenerIdsPlatosSuscripcion').and.returnValue([]),
            reiniciarCarrito: jasmine.createSpy('reiniciarCarrito')
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            haySesionActiva: jasmine.createSpy('haySesionActiva').and.returnValue(true)
          }
        },
        {
          provide: PlatoService,
          useValue: {
            obtenerPlatos: jasmine.createSpy('obtenerPlatos').and.returnValue([
              { id: 1, name: 'Plato 1', price: 10, image: '1.jpg', category: 'Principal' },
              { id: 2, name: 'Plato 2', price: 10, image: '2.jpg', category: 'Principal' },
              { id: 3, name: 'Plato 3', price: 10, image: '3.jpg', category: 'Principal' },
              { id: 4, name: 'Plato 4', price: 10, image: '4.jpg', category: 'Entrante' },
              { id: 5, name: 'Plato 5', price: 10, image: '5.jpg', category: 'Entrante' }
            ])
          }
        },
        {
          provide: ProfileService,
          useValue: {
            tienePerfilCompletoParaPago: jasmine.createSpy('tienePerfilCompletoParaPago').and.returnValue(true)
          }
        },
        {
          provide: OrderService,
          useValue: {
            refrescarDesdeApi: jasmine.createSpy('refrescarDesdeApi').and.resolveTo(),
            obtenerPedidos: jasmine.createSpy('obtenerPedidos').and.returnValue([
              {
                fechaEntregaProgramada: '2026-04-08T11:00:00.000Z'
              }
            ])
          }
        },
        {
          provide: Router,
          useValue: {
            events: of({}),
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true)
          }
        },
        {
          provide: ToastController,
          useValue: {
            create: jasmine.createSpy('create').and.resolveTo({
              present: jasmine.createSpy('present').and.resolveTo()
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuscripcionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe permitir la renovacion si la suscripcion esta activa y completa', () => {
    expect(component.puedeSimularRenovacion()).toBeTrue();
  });

  it('debe vaciar el carrito al pausar la suscripcion y volver al menu individual', async () => {
    component.suscripcion = { ...suscripcionBase, activa: false };

    await component.guardarSuscripcion();

    const carritoService = TestBed.inject(CarritoService) as jasmine.SpyObj<CarritoService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    expect(carritoService.reiniciarCarrito).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/menu'], {
      queryParams: { subscriptionSelection: '0' }
    });
  });

  it('debe llevar al menu en modo suscripcion si la seleccion activa tiene menos de 5 platos', async () => {
    component.suscripcion = {
      ...suscripcionBase,
      activa: true,
      platosSeleccionadosIds: [1, 2, 3, 4]
    };

    const subscriptionService = TestBed.inject(SubscriptionService) as jasmine.SpyObj<SubscriptionService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    const toastController = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;

    await component.guardarSuscripcion();

    expect(subscriptionService.guardarPlan).not.toHaveBeenCalled();
    expect(subscriptionService.establecerSuscripcionTemporal).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/menu'], {
      queryParams: { subscriptionSelection: '1' }
    });
    expect(toastController.create).toHaveBeenCalled();
  });

  it('debe permitir empezar la seleccion desde suscripcion aunque todavia no haya platos guardados', async () => {
    component.suscripcion = {
      ...suscripcionBase,
      activa: false,
      platosSeleccionadosIds: []
    };

    const subscriptionService = TestBed.inject(SubscriptionService) as jasmine.SpyObj<SubscriptionService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    await component.irAModificarSeleccion();

    expect(subscriptionService.previsualizarSuscripcion).toHaveBeenCalled();
    expect(subscriptionService.establecerSuscripcionTemporal).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/menu'], {
      queryParams: { subscriptionSelection: '1' }
    });
  });
});
