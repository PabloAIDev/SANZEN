export type PlanSemanal = 5;
export type DiaEntregaSemanal =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface UserSubscription {
  activa: boolean;
  planSemanal: PlanSemanal;
  diaEntrega: DiaEntregaSemanal;
  platosPorSemana: number;
  platosSeleccionadosIds: number[];
  precioOriginal: number;
  descuentoAplicado: number;
  precioEstimado: number;
  proximaEntrega: string;
  proximaEntregaIso: string;
}
