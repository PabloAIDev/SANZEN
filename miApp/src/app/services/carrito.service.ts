import { Injectable } from '@angular/core';
import { CarritoItem } from '../models/carrito-item.model';
import { Plato } from '../models/plato.model';
import { SubscriptionService } from './subscription.service';
import { PlatoService } from './plato.service';
import { FirstOrderService } from './first-order.service';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private items: CarritoItem[] = [];

  constructor(
    private subscriptionService: SubscriptionService,
    private platoService: PlatoService,
    private firstOrderService: FirstOrderService
  ) {}

  obtenerItems(): CarritoItem[] {
    return this.items;
  }

  cargarDesdeSuscripcion(platosSeleccionadosIds: number[], platosDisponibles: Plato[]): void {
    const cantidades = new Map<number, number>();

    for (const platoId of platosSeleccionadosIds) {
      cantidades.set(platoId, (cantidades.get(platoId) ?? 0) + 1);
    }

    this.items = Array.from(cantidades.entries()).map(([platoId, cantidad]) => {
      const plato = platosDisponibles.find(item => item.id === platoId);

      if (!plato) {
        return null;
      }

      return { plato, cantidad };
    }).filter((item): item is CarritoItem => item !== null);
  }

  obtenerIdsPlatosSuscripcion(): number[] {
    return this.items.reduce((ids: number[], item) => {
      if (item.plato.category === 'Postre') {
        return ids;
      }

      return ids.concat(Array.from({ length: item.cantidad }, () => item.plato.id));
    }, []);
  }

  anadirPlato(plato: Plato, cantidad: number): void {
    if (cantidad <= 0) {
      return;
    }

    const itemExistente = this.items.find(item => item.plato.id === plato.id);

    if (itemExistente) {
      itemExistente.cantidad += cantidad;
      return;
    }

    this.items.push({
      plato,
      cantidad
    });

    this.sincronizarSuscripcionConCarrito();
  }

  eliminarPlato(platoId: number): void {
    this.items = this.items.filter(item => item.plato.id !== platoId);
    this.sincronizarSuscripcionConCarrito();
  }

  aumentarCantidad(platoId: number): void {
    const item = this.items.find(itemCarrito => itemCarrito.plato.id === platoId);

    if (!item) {
      return;
    }

    item.cantidad++;
    this.sincronizarSuscripcionConCarrito();
  }

  disminuirCantidad(platoId: number): void {
    const item = this.items.find(itemCarrito => itemCarrito.plato.id === platoId);

    if (!item) {
      return;
    }

    item.cantidad--;

    if (item.cantidad < 1) {
      this.eliminarPlato(platoId);
      return;
    }

    this.sincronizarSuscripcionConCarrito();
  }

  obtenerCantidadDePlato(platoId: number): number {
    const item = this.items.find(itemCarrito => itemCarrito.plato.id === platoId);
    return item ? item.cantidad : 0;
  }

  obtenerCantidadTotalItems(): number {
    return this.items.reduce((total, item) => total + item.cantidad, 0);
  }

  vaciarCarrito(): void {
    this.items = [];

    if (this.suscripcionAplicaAlPedidoActual()) {
      this.subscriptionService.limpiarSeleccionPlatos(this.platoService.obtenerPlatos());
    }
  }

  reiniciarCarrito(): void {
    this.items = [];
  }

  obtenerTotal(): number {
    const subtotal = this.items.reduce((total, item) => {
      return total + item.plato.price * item.cantidad;
    }, 0);

    return Number((subtotal - this.obtenerDescuentoSuscripcion()).toFixed(2));
  }

  obtenerSubtotalSinDescuento(): number {
    return this.items.reduce((total, item) => {
      return total + item.plato.price * item.cantidad;
    }, 0);
  }

  obtenerDescuentoSuscripcion(): number {
    const suscripcion = this.subscriptionService.obtenerSuscripcion();

    if (!this.suscripcionAplicaAlPedidoActual() || suscripcion.platosSeleccionadosIds.length === 0) {
      return 0;
    }

    return Number((this.obtenerSubtotalSeleccionSuscripcion() * this.subscriptionService.obtenerDescuentoPorcentaje()).toFixed(2));
  }

  private obtenerSubtotalSeleccionSuscripcion(): number {
    const suscripcion = this.subscriptionService.obtenerSuscripcion();

    return this.items.reduce((total, item) => {
      if (!suscripcion.platosSeleccionadosIds.includes(item.plato.id)) {
        return total;
      }

      return total + item.plato.price * item.cantidad;
    }, 0);
  }

  private sincronizarSuscripcionConCarrito(): void {
    if (!this.suscripcionAplicaAlPedidoActual()) {
      return;
    }

    this.subscriptionService.actualizarSeleccionPlatos(
      this.obtenerIdsPlatosSuscripcion(),
      this.platoService.obtenerPlatos()
    );
  }

  private suscripcionAplicaAlPedidoActual(): boolean {
    return (
      this.subscriptionService.suscripcionActiva() &&
      !(this.firstOrderService.estaActivo() && this.firstOrderService.esModoIndividual())
    );
  }
}
