import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { PerfilPage } from './perfil.page';
import { ProfileService } from '../../services/profile.service';
import { CarritoService } from '../../services/carrito.service';
import { UserSessionService } from '../../services/user-session.service';

describe('PerfilPage', () => {
  let component: PerfilPage;
  let fixture: ComponentFixture<PerfilPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPage],
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
            }),
            guardarPerfil: jasmine.createSpy('guardarPerfil'),
            tarjetaPrincipalTieneDatos: jasmine.createSpy('tarjetaPrincipalTieneDatos').and.returnValue(false),
            restablecerPreferenciasNutricionales: jasmine.createSpy('restablecerPreferenciasNutricionales').and.returnValue({
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
          provide: CarritoService,
          useValue: {
            obtenerItems: jasmine.createSpy('obtenerItems').and.returnValue([]),
            vaciarCarrito: jasmine.createSpy('vaciarCarrito')
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            haySesionActiva: jasmine.createSpy('haySesionActiva').and.returnValue(true),
            obtenerUsuarioActual: jasmine.createSpy('obtenerUsuarioActual').and.returnValue({ id: 1, nombre: 'Test', email: 'test@test.com' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
