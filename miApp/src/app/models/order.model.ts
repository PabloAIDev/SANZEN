export interface PedidoItem {
  platoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  imagen: string;
  tipoLinea?: 'suscripcion' | 'extra';
}

export interface PedidoDireccion {
  nombre: string;
  linea: string;
  instrucciones: string;
}

export type MetodoPagoPedido = 'tarjeta' | 'bizum' | 'efectivo';

export interface Pedido {
  id: string;
  numeroPedido: string;
  fechaCreacion: string;
  fechaEntregaProgramada: string;
  estado: 'confirmado' | 'entregado';
  items: PedidoItem[];
  total: number;
  franjaEntrega: string;
  direccionEntrega: PedidoDireccion;
  metodoPago: MetodoPagoPedido;
  esSuscripcion: boolean;
}
