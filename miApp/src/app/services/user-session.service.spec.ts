import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { UserSessionService } from './user-session.service';

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(() => {
    localStorage.removeItem('sanzen-session-user');

    TestBed.configureTestingModule({
      providers: [
        UserSessionService,
        {
          provide: HttpClient,
          useValue: {}
        }
      ]
    });

    service = TestBed.inject(UserSessionService);
  });

  afterEach(() => {
    localStorage.removeItem('sanzen-session-user');
  });

  it('no debe restaurar una sesion persistida si el token esta caducado', async () => {
    localStorage.setItem('sanzen-session-user', JSON.stringify({
      id: 7,
      nombre: 'Ana',
      email: 'ana@example.com',
      token: crearTokenPrueba({
        userId: 7,
        exp: Date.now() - 60_000
      })
    }));

    await service.cargarInicial();

    expect(service.haySesionActiva()).toBeFalse();
    expect(service.obtenerTokenActual()).toBeNull();
    expect(localStorage.getItem('sanzen-session-user')).toBeNull();
  });

  it('debe cerrar la sesion en memoria si el token actual ya no es valido', async () => {
    localStorage.setItem('sanzen-session-user', JSON.stringify({
      id: 9,
      nombre: 'Luis',
      email: 'luis@example.com',
      token: crearTokenPrueba({
        userId: 8,
        exp: Date.now() + 60_000
      })
    }));

    await service.cargarInicial();

    expect(service.obtenerUsuarioActual()).toBeNull();
    expect(service.haySesionActiva()).toBeFalse();
    expect(localStorage.getItem('sanzen-session-user')).toBeNull();
  });
});

function crearTokenPrueba(payload: { userId: number; exp: number }): string {
  const encodedPayload = codificarBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.firma-prueba`;
}

function codificarBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
