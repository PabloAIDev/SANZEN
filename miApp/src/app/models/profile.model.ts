export type ObjetivoNutricional = 'perder-peso' | 'masa-muscular' | null;

export type PreferenciaComposicion =
  | 'ricos-proteina'
  | 'bajos-grasas'
  | 'bajos-carbohidratos';

export interface DireccionPrincipal {
  nombre: string;
  calleNumero: string;
  ciudad: string;
  codigoPostal: string;
  provincia: string;
  telefono: string;
  instrucciones: string;
}

export interface TarjetaPrincipal {
  nombreTitular: string;
  numeroTarjeta: string;
  fechaCaducidad: string;
  cvv: string;
}

export interface UserProfile {
  nombre: string;
  email: string;
  password: string;
  alergenos: string[];
  objetivoNutricional: ObjetivoNutricional;
  preferenciasComposicion: PreferenciaComposicion[];
  direccionPrincipal: DireccionPrincipal | null;
  tarjetaPrincipal: TarjetaPrincipal | null;
}
