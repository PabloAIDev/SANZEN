import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { MenuPage } from './menu.page';
import { PlatoService } from '../../services/plato.service';
import { CarritoService } from '../../services/carrito.service';
import { OrderService } from '../../services/order.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';

describe('MenuPage', () => {
  let component: MenuPage;
  let fixture: ComponentFixture<MenuPage>;
  let carritoService: jasmine.SpyObj<CarritoService>;
  let subscriptionService: jasmine.SpyObj<SubscriptionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPage, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({}))
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
          provide: PlatoService,
          useValue: {
            obtenerPlatos: jasmine.createSpy('obtenerPlatos').and.returnValue([]),
            obtenerPlatoPorId: jasmine.createSpy('obtenerPlatoPorId').and.returnValue(undefined)
          }
        },
        {
          provide: CarritoService,
          useValue: {
            obtenerItems: jasmine.createSpy('obtenerItems').and.returnValue([]),
            obtenerCantidadTotal: jasmine.createSpy('obtenerCantidadTotal').and.returnValue(0),
            obtenerCantidadTotalItems: jasmine.createSpy('obtenerCantidadTotalItems').and.returnValue(0),
            obtenerTotal: jasmine.createSpy('obtenerTotal').and.returnValue(0),
            anadirPlato: jasmine.createSpy('anadirPlato'),
            eliminarPlato: jasmine.createSpy('eliminarPlato'),
            disminuirCantidad: jasmine.createSpy('disminuirCantidad'),
            vaciarCarrito: jasmine.createSpy('vaciarCarrito')
          }
        },
        {
          provide: OrderService,
          useValue: {
            obtenerPedidos: jasmine.createSpy('obtenerPedidos').and.returnValue([])
          }
        },
        {
          provide: ProfileService,
          useValue: {
            obtenerPerfil: jasmine.createSpy('obtenerPerfil').and.returnValue({
              nombre: '',
              email: '',
              password: '',
              alergenos: [],
              objetivoNutricional: null,
              preferenciasComposicion: [],
              direccionPrincipal: null,
              tarjetaPrincipal: null
            })
          }
        },
        {
          provide: SubscriptionService,
          useValue: {
            obtenerSuscripcion: jasmine.createSpy('obtenerSuscripcion').and.returnValue({
              activa: false,
              planSemanal: 5,
              diaEntrega: 'lunes',
              platosPorSemana: 5,
              platosSeleccionadosIds: [],
              precioOriginal: 0,
              descuentoAplicado: 0,
              precioEstimado: 0,
              proximaEntrega: 'lunes',
              proximaEntregaIso: null
            }),
            suscripcionActiva: jasmine.createSpy('suscripcionActiva').and.returnValue(false),
            obtenerMinimoPlatosSuscripcion: jasmine.createSpy('obtenerMinimoPlatosSuscripcion').and.returnValue(5),
            obtenerCantidadSeleccionada: jasmine.createSpy('obtenerCantidadSeleccionada').and.returnValue(0),
            actualizarSeleccionPlatos: jasmine.createSpy('actualizarSeleccionPlatos'),
            guardarSuscripcion: jasmine.createSpy('guardarSuscripcion')
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
            obtenerFiltrosNutricionales: jasmine.createSpy('obtenerFiltrosNutricionales').and.returnValue({
              alergenos: [],
              objetivoNutricional: null,
              preferenciasComposicion: []
            }),
            estaActivo: jasmine.createSpy('estaActivo').and.returnValue(false),
            esModoSuscripcion: jasmine.createSpy('esModoSuscripcion').and.returnValue(false),
            esModoIndividual: jasmine.createSpy('esModoIndividual').and.returnValue(false),
            obtenerSuscripcionTemporal: jasmine.createSpy('obtenerSuscripcionTemporal').and.returnValue(null),
            guardarSuscripcionTemporal: jasmine.createSpy('guardarSuscripcionTemporal'),
            guardarFiltrosNutricionales: jasmine.createSpy('guardarFiltrosNutricionales'),
            finalizarProceso: jasmine.createSpy('finalizarProceso')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuPage);
    component = fixture.componentInstance;
    carritoService = TestBed.inject(CarritoService) as jasmine.SpyObj<CarritoService>;
    subscriptionService = TestBed.inject(SubscriptionService) as jasmine.SpyObj<SubscriptionService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra la cantidad real de platos de suscripcion aunque haya extras en carrito', () => {
    component.suscripcionActiva = true;
    component.platosSuscripcionSeleccionadosIds = [1, 2, 3, 4];
    carritoService.obtenerCantidadTotalItems.and.returnValue(5);

    expect(component.obtenerCantidadResumenSeleccion()).toBe(4);
    expect(component.obtenerCantidadExtrasCarrito()).toBe(1);
  });

  it('usa el total del carrito cuando no hay suscripcion activa', () => {
    component.suscripcionActiva = false;
    component.platosSuscripcionSeleccionadosIds = [1, 2, 3, 4];
    carritoService.obtenerCantidadTotalItems.and.returnValue(5);

    expect(component.obtenerCantidadResumenSeleccion()).toBe(5);
    expect(component.obtenerCantidadExtrasCarrito()).toBe(0);
  });
});
