import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio.page').then( m => m.InicioPage)
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu.page').then( m => m.MenuPage)
  },
  {
    path: 'pago',
    loadComponent: () => import('./pages/pago/pago.page').then( m => m.PagoPage)
  },
  {
    path: 'confirmacion',
    loadComponent: () => import('./pages/confirmacion/confirmacion.page').then( m => m.ConfirmacionPage)
  },
  {
    path: 'mis-pedidos',
    loadComponent: () => import('./pages/mis-pedidos/mis-pedidos.page').then( m => m.MisPedidosPage)
  },
  {
    path: 'como-funciona',
    loadComponent: () => import('./pages/como-funciona/como-funciona.page').then( m => m.ComoFuncionaPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then( m => m.PerfilPage)
  },
  {
    path: 'suscripcion',
    loadComponent: () => import('./pages/suscripcion/suscripcion.page').then( m => m.SuscripcionPage)
  },
  {
    path: 'detalle-plato/:id',
    loadComponent: () => import('./pages/detalle-page/detalle-page.page').then( m => m.DetallePagePage)
  },
  {
    path: 'resumen',
    loadComponent: () => import('./pages/resumen/resumen.page').then( m => m.ResumenPage)
  }
];
