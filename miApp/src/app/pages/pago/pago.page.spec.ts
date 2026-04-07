import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PagoPage } from './pago.page';
import { CarritoService } from '../../services/carrito.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { OrderService } from '../../services/order.service';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';

describe('PagoPage', () => {
  let component: PagoPage;
  let fixture: ComponentFixture<PagoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoPage, TranslateModule.forRoot()],
      providers: [
        {
          provide: Router,
          useValue: {
            events: of({}),
            navigate: jasmine.createSpy('navigate'),
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        },
        {
          provide: CarritoService,
          useValue: {
            obtenerTotal: jasmine.createSpy('obtenerTotal').and.returnValue(10),
            obtenerItems: jasmine.createSpy('obtenerItems').and.returnValue([
              {
                plato: {
                  id: 1,
                  name: 'Plato test',
                  price: 10,
                  image: '',
                  description: '',
                  category: 'Principal',
                  calories: 400,
                  allergens: [],
                  healthScore: 80
                },
                cantidad: 1
              }
            ])
          }
        },
        {
          provide: ProfileService,
          useValue: {
            obtenerPerfil: jasmine.createSpy('obtenerPerfil').and.returnValue({
              nombre: 'Test',
              email: 'test@test.com',
              password: '123456',
              alergenos: [],
              objetivoNutricional: null,
              preferenciasComposicion: [],
              direccionPrincipal: {
                nombre: 'Casa',
                calleNumero: 'Calle 1',
                ciudad: 'Madrid',
                codigoPostal: '28001',
                provincia: 'Madrid',
                telefono: '600000000',
                instrucciones: ''
              },
              tarjetaPrincipal: {
                nombreTitular: 'Test User',
                numeroTarjeta: '1234567812345678',
                fechaCaducidad: '12/99',
                cvv: '123'
              }
            }),
            tarjetaPrincipalTieneDatos: jasmine.createSpy('tarjetaPrincipalTieneDatos').and.returnValue(true),
            tarjetaPrincipalGuardadaEsUsable: jasmine.createSpy('tarjetaPrincipalGuardadaEsUsable').and.returnValue(false),
            tarjetaPrincipalEditableEsCompleta: jasmine.createSpy('tarjetaPrincipalEditableEsCompleta').and.returnValue(true),
            tienePerfilCompletoParaPago: jasmine.createSpy('tienePerfilCompletoParaPago').and.returnValue(true),
            nombreTitularTarjetaEsValido: jasmine.createSpy('nombreTitularTarjetaEsValido').and.returnValue(true),
            numeroTarjetaEsValido: jasmine.createSpy('numeroTarjetaEsValido').and.returnValue(true),
            fechaCaducidadTarjetaEsValida: jasmine.createSpy('fechaCaducidadTarjetaEsValida').and.returnValue(true),
            cvvEsValido: jasmine.createSpy('cvvEsValido').and.returnValue(true),
            guardarPerfil: jasmine.createSpy('guardarPerfil'),
            guardarPerfilPersistido: jasmine.createSpy('guardarPerfilPersistido').and.resolveTo()
          }
        },
        {
          provide: SubscriptionService,
          useValue: {
            suscripcionActiva: jasmine.createSpy('suscripcionActiva').and.returnValue(false),
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
            })
          }
        },
        {
          provide: OrderService,
          useValue: {
            generarNumeroPedido: jasmine.createSpy('generarNumeroPedido').and.returnValue('SZ-TEST-0001'),
            obtenerPedidos: jasmine.createSpy('obtenerPedidos').and.returnValue([]),
            guardarPedido: jasmine.createSpy('guardarPedido').and.resolveTo()
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            haySesionActiva: jasmine.createSpy('haySesionActiva').and.returnValue(true)
          }
        },
        {
          provide: FirstOrderService,
          useValue: {
            estaActivo: jasmine.createSpy('estaActivo').and.returnValue(false),
            esModoIndividual: jasmine.createSpy('esModoIndividual').and.returnValue(false),
            esModoSuscripcion: jasmine.createSpy('esModoSuscripcion').and.returnValue(false),
            guardarSuscripcionTemporal: jasmine.createSpy('guardarSuscripcionTemporal'),
            finalizarProceso: jasmine.createSpy('finalizarProceso')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
