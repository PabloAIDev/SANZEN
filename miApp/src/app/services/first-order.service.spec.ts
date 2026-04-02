import { TestBed } from '@angular/core/testing';
import { FirstOrderService } from './first-order.service';
import { UserSubscription } from '../models/subscription.model';

describe('FirstOrderService', () => {
  let service: FirstOrderService;

  const suscripcionTemporal: UserSubscription = {
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

  beforeEach(() => {
    localStorage.removeItem('sanzen-first-order-state');

    TestBed.configureTestingModule({});
    service = TestBed.inject(FirstOrderService);
  });

  afterEach(() => {
    localStorage.removeItem('sanzen-first-order-state');
  });

  it('debe iniciar un primer pedido individual activo', () => {
    service.iniciarProceso('individual');

    expect(service.estaActivo()).toBeTrue();
    expect(service.esModoIndividual()).toBeTrue();
    expect(service.esModoSuscripcion()).toBeFalse();
  });

  it('debe guardar filtros nutricionales y devolver copias defensivas', () => {
    service.iniciarProceso('individual');
    service.guardarFiltrosNutricionales({
      alergenos: ['gluten', 'soja'],
      objetivoNutricional: 'perder-peso',
      preferenciasComposicion: ['ricos-proteina']
    });

    const filtros = service.obtenerFiltrosNutricionales();
    filtros.alergenos.push('lactosa');
    filtros.preferenciasComposicion.push('bajos-grasas');

    const filtrosPersistidos = service.obtenerFiltrosNutricionales();

    expect(filtrosPersistidos.alergenos).toEqual(['gluten', 'soja']);
    expect(filtrosPersistidos.objetivoNutricional).toBe('perder-peso');
    expect(filtrosPersistidos.preferenciasComposicion).toEqual(['ricos-proteina']);
  });

  it('debe conservar una suscripcion temporal durante el flujo de primer pedido semanal', () => {
    service.iniciarProceso('suscripcion', suscripcionTemporal);

    const suscripcion = service.obtenerSuscripcionTemporal();

    expect(service.esModoSuscripcion()).toBeTrue();
    expect(suscripcion).toEqual(suscripcionTemporal);
    expect(suscripcion).not.toBe(suscripcionTemporal);
  });

  it('debe marcar y reconocer al usuario recien creado', () => {
    service.iniciarProceso('individual');
    service.marcarUsuarioRecienCreado('NUEVO@correo.com');

    expect(service.esUsuarioRecienCreado('nuevo@correo.com')).toBeTrue();

    service.limpiarUsuarioRecienCreado();

    expect(service.esUsuarioRecienCreado('nuevo@correo.com')).toBeFalse();
  });

  it('debe limpiar el estado al finalizar el proceso', () => {
    service.iniciarProceso('suscripcion', suscripcionTemporal);
    service.guardarFiltrosNutricionales({
      alergenos: ['huevo'],
      objetivoNutricional: 'masa-muscular',
      preferenciasComposicion: ['bajos-carbohidratos']
    });

    service.finalizarProceso();

    expect(service.estaActivo()).toBeFalse();
    expect(service.esModoIndividual()).toBeFalse();
    expect(service.esModoSuscripcion()).toBeFalse();
    expect(service.obtenerSuscripcionTemporal()).toBeNull();
    expect(service.obtenerFiltrosNutricionales()).toEqual({
      alergenos: [],
      objetivoNutricional: null,
      preferenciasComposicion: []
    });
  });
});
