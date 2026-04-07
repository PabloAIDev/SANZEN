import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonCol,
  IonContent,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonRow,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Plato } from '../../models/plato.model';
import { PlatoService } from '../../services/plato.service';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  homeOutline,
  optionsOutline,
  fitnessOutline,
  closeCircleOutline,
  cartOutline,
  personOutline,
  receiptOutline,
  repeatOutline,
  logOutOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { CarritoService } from '../../services/carrito.service';
import { OrderService } from '../../services/order.service';
import { ProfileService } from '../../services/profile.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserSessionService } from '../../services/user-session.service';
import { FirstOrderService } from '../../services/first-order.service';
import {
  ObjetivoNutricional,
  PreferenciaComposicion
} from '../../models/profile.model';
import { CarritoItem } from '../../models/carrito-item.model';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonBadge,
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonSearchbar,
    IonChip,
    IonLabel,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonFabButton,
    IonIcon,
    IonCheckbox,
    IonList,
    IonRadioGroup,
    IonRadio,
    IonModal,
    IonNote,
    TranslateModule,
    LanguageSwitcherComponent
  ]
})
export class MenuPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  platos: Plato[] = [];
  platosRecomendados: Plato[] = [];
  topHealthyFiltradosIds: number[] = [];
  terminoBusqueda = '';
  categoriaSeleccionada = 'Todas';
  alergenosDisponibles: string[] = [
    'Gluten',
    'Huevo',
    'Soja',
    'Lácteos',
    'Crustáceos',
    'Frutos secos',
    'Sésamo',
    'Legumbres'
  ];
  alergenosSeleccionados: string[] = [];
  platosFiltrados: Plato[] = [];
  modalFiltrosAbierto = false;
  ordenHealthyActivo = false;
  objetivoNutricionalSeleccionado: ObjetivoNutricional = null;
  preferenciasComposicionSeleccionadas: PreferenciaComposicion[] = [];
  suscripcionActiva = false;
  platosSuscripcionSeleccionadosIds: number[] = [];
  minimoPlatosSuscripcion = 0;
  mensajeSuscripcion = '';
  mensajeRecomendacion = '';
  modalSeleccionAbierto = false;
  menuLateralAbierto = false;

  constructor(
    private platoService: PlatoService,
    private router: Router,
    private carritoService: CarritoService,
    private orderService: OrderService,
    private profileService: ProfileService,
    private subscriptionService: SubscriptionService,
    private userSessionService: UserSessionService,
    private firstOrderService: FirstOrderService,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private languageService: LanguageService
  ) {
    addIcons({
      menuOutline,
      homeOutline,
      optionsOutline,
      fitnessOutline,
      closeCircleOutline,
      cartOutline,
      personOutline,
      receiptOutline,
      repeatOutline,
      logOutOutline,
      informationCircleOutline
    });

    this.languageService.currentLanguage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.actualizarMensajeSuscripcion();
        this.actualizarRecomendaciones();
      });
  }

  ngOnInit(): void {
    this.platos = this.platoService.obtenerPlatos();
    this.sincronizarPrimerPedidoTemporal();
    this.sincronizarSuscripcion();
    this.route.queryParamMap.subscribe(params => {
      if (params.get('subscriptionSelection') === '1' && this.suscripcionActiva) {
        this.prepararMenuParaSuscripcion();
        this.actualizarMensajeSuscripcion();
      }
    });
    this.cargarFiltrosDesdePerfil();
  }

  ionViewWillEnter(): void {
    this.sincronizarPrimerPedidoTemporal();
    this.sincronizarSuscripcion();
    this.cargarFiltrosDesdePerfil();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/detalle-plato', id]);
  }

  abrirMenuLateral(): void {
    this.menuLateralAbierto = true;
  }

  cerrarMenuLateral(): void {
    this.menuLateralAbierto = false;
  }

  irAResumen(): void {
    if (!this.puedeContinuarPedido()) {
      return;
    }

    this.router.navigateByUrl('/resumen');
  }

  irAPedidosDesdeMenu(): void {
    this.cerrarMenuLateral();
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/mis-pedidos' }
      });
      return;
    }

    this.router.navigateByUrl('/mis-pedidos');
  }

  irAInicioDesdeMenu(): void {
    this.cerrarMenuLateral();
    this.router.navigateByUrl('/inicio');
  }

  irASuscripcionDesdeMenu(): void {
    this.cerrarMenuLateral();
    if (!this.userSessionService.haySesionActiva()) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/suscripcion' }
      });
      return;
    }

    this.router.navigateByUrl('/suscripcion');
  }

  irAPerfil(): void {
    this.cerrarMenuLateral();
    if (this.userSessionService.haySesionActiva()) {
      this.router.navigateByUrl('/perfil');
      return;
    }

    this.router.navigateByUrl('/login');
  }

  cambiarUsuarioDesdeMenu(): void {
    this.cerrarMenuLateral();
    this.firstOrderService.finalizarProceso();
    this.carritoService.reiniciarCarrito();
    this.userSessionService.cerrarSesion();
    this.subscriptionService.restablecerSuscripcionLocal();
    this.router.navigateByUrl('/inicio');
  }

  haySesionActiva(): boolean {
    return this.userSessionService.haySesionActiva();
  }

  irAComoFunciona(): void {
    this.cerrarMenuLateral();
    this.router.navigateByUrl('/como-funciona');
  }

  anadirUnidad(plato: Plato, event: Event): void {
    event.stopPropagation();

    if (this.suscripcionActiva) {
      const suscripcionActual = this.subscriptionService.obtenerSuscripcion();
      const nuevosIds = [...suscripcionActual.platosSeleccionadosIds, plato.id];
      this.subscriptionService.actualizarSeleccionPlatos(nuevosIds, this.platos);
      this.carritoService.anadirPlato(plato, 1);
      this.sincronizarSuscripcion();
      return;
    }

    this.carritoService.anadirPlato(plato, 1);
  }

  disminuirUnidad(platoId: number, event: Event): void {
    event.stopPropagation();

    if (this.suscripcionActiva && this.subscriptionService.tienePlatoSeleccionado(platoId)) {
      this.subscriptionService.eliminarUnaUnidadSeleccionada(platoId, this.platos);
    }

    this.carritoService.disminuirCantidad(platoId);
    this.sincronizarSuscripcion();
  }

  obtenerCantidadDePlato(platoId: number): number {
    return this.carritoService.obtenerCantidadDePlato(platoId);
  }

  obtenerCantidadTotalItems(): number {
    return this.carritoService.obtenerCantidadTotalItems();
  }

  obtenerItemsSeleccionados(): CarritoItem[] {
    return this.carritoService.obtenerItems();
  }

  obtenerTotalSeleccionActual(): number {
    return this.carritoService.obtenerTotal();
  }

  obtenerAhorroPotencialConSuscripcion(): number {
    if (this.suscripcionActiva) {
      return 0;
    }

    const total = this.obtenerTotalSeleccionActual();
    const descuento = this.subscriptionService.obtenerDescuentoPorPlan(
      this.subscriptionService.obtenerPlanSemanalActual()
    );

    return Number((total * descuento).toFixed(2));
  }

  puedeContinuarPedido(): boolean {
    if (this.suscripcionActiva) {
      return this.subscriptionService.suscripcionCompleta();
    }

    return this.obtenerTotalSeleccionActual() >= 20;
  }

  tieneItemsSeleccionados(): boolean {
    return this.obtenerCantidadTotalItems() > 0;
  }

  abrirModalSeleccion(): void {
    this.modalSeleccionAbierto = true;
  }

  cerrarModalSeleccion(): void {
    this.modalSeleccionAbierto = false;
  }

  async irACarritoDesdeSeleccion(): Promise<void> {
    this.cerrarModalSeleccion();
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.router.navigateByUrl('/resumen');
  }

  esPlatoBloqueadoPorSuscripcion(_platoId: number): boolean {
    return false;
  }

  obtenerIconoAlergeno(alergeno: string): string {
    const mapa: Record<string, string> = {
      Gluten: 'assets/icons/alergenos/gluten.png',
      Huevo: 'assets/icons/alergenos/huevo.png',
      Soja: 'assets/icons/alergenos/soja.png',
      Pescado: 'assets/icons/alergenos/pescado.png',
      'Crustáceos': 'assets/icons/alergenos/crustaceos.png',
      'Lácteos': 'assets/icons/alergenos/lacteos.png',
      'Frutos secos': 'assets/icons/alergenos/frutos-secos.png',
      Sésamo: 'assets/icons/alergenos/sesamo.png',
      Legumbres: 'assets/icons/alergenos/legumbres.png'
    };

    return mapa[alergeno] || '';
  }

  obtenerEtiquetaCategoria(categoria: string): string {
    return this.translateService.instant(`COMMON.CATEGORIES.${categoria}`);
  }

  obtenerEtiquetaAlergeno(alergeno: string): string {
    return this.translateService.instant(`COMMON.ALLERGENS.${alergeno}`);
  }

  obtenerEtiquetaPreferencia(preferencia: PreferenciaComposicion): string {
    return this.translateService.instant(`COMMON.COMPOSITION.${preferencia}`);
  }

  obtenerEtiquetaObjetivo(valor: Exclude<ObjetivoNutricional, null>): string {
    return this.translateService.instant(`COMMON.GOALS.${valor}`);
  }

  obtenerMensajePlatosSeleccionados(): string {
    return this.translateService.instant('MENU.SELECTED_PLATES', {
      count: this.obtenerCantidadTotalItems()
    });
  }

  obtenerMensajeTotalAcumulado(): string {
    return this.translateService.instant('MENU.TOTAL_ACCUMULATED', {
      total: this.formatearMoneda(this.obtenerTotalSeleccionActual())
    });
  }

  obtenerMensajeAhorroSuscripcion(): string {
    return this.translateService.instant('MENU.SUBSCRIPTION_SAVINGS', {
      amount: this.formatearMoneda(this.obtenerAhorroPotencialConSuscripcion())
    });
  }

  obtenerTextoAccionPrincipal(): string {
    if (!this.suscripcionActiva) {
      return this.translateService.instant('COMMON.ACTIONS.CONTINUE');
    }

    return this.tienePedidoSemanalPrevio()
      ? this.translateService.instant('COMMON.ACTIONS.MODIFY_SELECTION')
      : this.translateService.instant('COMMON.ACTIONS.CONTINUE');
  }

  mostrarAhorroSuscripcion(): boolean {
    return !this.suscripcionActiva && this.obtenerTotalSeleccionActual() > 0;
  }

  filtrarPlatos(): void {
    const terminoBusquedaNormalizado = this.terminoBusqueda.trim().toLowerCase();

    this.platosFiltrados = this.platos.filter(plato => {
      const macros = plato.nutrition.macronutrients;

      const coincideCategoria =
        this.categoriaSeleccionada === 'Todas' ||
        plato.category === this.categoriaSeleccionada;

      const categoriaPermitidaSuscripcion =
        !this.suscripcionActiva || plato.category === 'Entrante' || plato.category === 'Principal';

      const coincideAlergeno =
        this.alergenosSeleccionados.length === 0 ||
        !this.alergenosSeleccionados.some(alergeno => plato.allergens.includes(alergeno));

      const coincideBusqueda =
        terminoBusquedaNormalizado === '' ||
        plato.name.toLowerCase().includes(terminoBusquedaNormalizado);

      let coincideObjetivoNutricional = true;

      if (this.objetivoNutricionalSeleccionado === 'perder-peso') {
        coincideObjetivoNutricional =
          plato.calories <= 350 &&
          macros.fat_g <= 15 &&
          macros.fiber_g >= 3;
      }

      if (this.objetivoNutricionalSeleccionado === 'masa-muscular') {
        coincideObjetivoNutricional =
          macros.protein_g >= 20 &&
          plato.calories >= 300;
      }

      let coincidePreferenciasComposicion = true;

      if (this.preferenciasComposicionSeleccionadas.includes('ricos-proteina')) {
        coincidePreferenciasComposicion =
          coincidePreferenciasComposicion && macros.protein_g >= 20;
      }

      if (this.preferenciasComposicionSeleccionadas.includes('bajos-grasas')) {
        coincidePreferenciasComposicion =
          coincidePreferenciasComposicion && macros.fat_g <= 10;
      }

      if (this.preferenciasComposicionSeleccionadas.includes('bajos-carbohidratos')) {
        coincidePreferenciasComposicion =
          coincidePreferenciasComposicion && macros.carbohydrates_g <= 30;
      }

      return (
        coincideBusqueda &&
        coincideCategoria &&
        categoriaPermitidaSuscripcion &&
        coincideAlergeno &&
        coincideObjetivoNutricional &&
        coincidePreferenciasComposicion
      );
    });

    this.actualizarRecomendaciones();
    this.actualizarTopHealthyFiltrado();

    if (this.ordenHealthyActivo) {
      this.ordenarPorHealthScore();
    }
  }

  abrirModalFiltros(): void {
    this.modalFiltrosAbierto = true;
  }

  cerrarModalFiltros(): void {
    this.modalFiltrosAbierto = false;
  }

  toggleOrdenHealthy(): void {
    this.ordenHealthyActivo = !this.ordenHealthyActivo;

    if (this.ordenHealthyActivo) {
      this.ordenarPorHealthScore();
      return;
    }

    this.filtrarPlatos();
  }

  ordenarPorHealthScore(): void {
    this.platosFiltrados = [...this.platosFiltrados].sort(
      (a, b) => b.healthScore - a.healthScore
    );
  }

  toggleAlergeno(valor: string, event: CustomEvent): void {
    const checked = event.detail.checked;

    if (checked) {
      if (!this.alergenosSeleccionados.includes(valor)) {
        this.alergenosSeleccionados.push(valor);
      }
    } else {
      this.alergenosSeleccionados =
        this.alergenosSeleccionados.filter(alergeno => alergeno !== valor);
    }
  }

  togglePreferenciaComposicion(valor: PreferenciaComposicion, event: CustomEvent): void {
    const checked = event.detail.checked;

    if (checked) {
      if (!this.preferenciasComposicionSeleccionadas.includes(valor)) {
        this.preferenciasComposicionSeleccionadas.push(valor);
      }
    } else {
      this.preferenciasComposicionSeleccionadas =
        this.preferenciasComposicionSeleccionadas.filter(p => p !== valor);
    }
  }

  limpiarFiltrosNutricionales(): void {
    this.alergenosSeleccionados = [];
    this.objetivoNutricionalSeleccionado = null;
    this.preferenciasComposicionSeleccionadas = [];
    this.guardarFiltrosEnPerfil();
    this.filtrarPlatos();
  }

  aplicarFiltrosNutricionales(): void {
    this.guardarFiltrosEnPerfil();
    this.filtrarPlatos();
    this.cerrarModalFiltros();
  }

  obtenerFiltrosActivos(): { tipo: string; valor: string; etiqueta: string }[] {
    const filtros: { tipo: string; valor: string; etiqueta: string }[] = [];

    if (this.categoriaSeleccionada !== 'Todas') {
      filtros.push({
        tipo: 'categoria',
        valor: this.categoriaSeleccionada,
        etiqueta: this.obtenerEtiquetaCategoria(this.categoriaSeleccionada)
      });
    }

    this.alergenosSeleccionados.forEach(alergeno => {
      filtros.push({
        tipo: 'alergeno',
        valor: alergeno,
        etiqueta: this.translateService.instant('MENU.WITHOUT_ALLERGEN', {
          allergen: this.obtenerEtiquetaAlergeno(alergeno)
        })
      });
    });

    if (this.objetivoNutricionalSeleccionado === 'perder-peso') {
      filtros.push({
        tipo: 'objetivo',
        valor: 'perder-peso',
        etiqueta: this.translateService.instant('MENU.ACTIVE_FILTERS.GOAL_LOSE_WEIGHT')
      });
    }

    if (this.objetivoNutricionalSeleccionado === 'masa-muscular') {
      filtros.push({
        tipo: 'objetivo',
        valor: 'masa-muscular',
        etiqueta: this.translateService.instant('MENU.ACTIVE_FILTERS.GOAL_MUSCLE')
      });
    }

    this.preferenciasComposicionSeleccionadas.forEach(preferencia => {
      filtros.push({
        tipo: 'preferencia',
        valor: preferencia,
        etiqueta: this.obtenerEtiquetaPreferencia(preferencia)
      });
    });

    if (this.ordenHealthyActivo) {
      filtros.push({
        tipo: 'orden',
        valor: 'healthy',
        etiqueta: this.translateService.instant('MENU.ACTIVE_FILTERS.TOP_HEALTHY')
      });
    }

    return filtros;
  }

  quitarFiltroActivo(tipo: string, valor: string): void {
    if (tipo === 'categoria') {
      this.categoriaSeleccionada = 'Todas';
    }

    if (tipo === 'alergeno') {
      this.alergenosSeleccionados =
        this.alergenosSeleccionados.filter(alergeno => alergeno !== valor);
    }

    if (tipo === 'objetivo') {
      this.objetivoNutricionalSeleccionado = null;
    }

    if (tipo === 'preferencia') {
      this.preferenciasComposicionSeleccionadas =
        this.preferenciasComposicionSeleccionadas.filter(preferencia => preferencia !== valor);
    }

    if (tipo === 'orden') {
      this.ordenHealthyActivo = false;
    }

    if (tipo !== 'categoria' && tipo !== 'orden') {
      this.guardarFiltrosEnPerfil();
    }

    this.filtrarPlatos();
  }

  tieneRecomendaciones(): boolean {
    return this.platosRecomendados.length > 0;
  }

  obtenerPlatosParaListado(): Plato[] {
    const idsRecomendados = new Set(this.platosRecomendados.map(plato => plato.id));
    return this.platosFiltrados.filter(plato => !idsRecomendados.has(plato.id));
  }

  esTopHealthyFiltrado(platoId: number): boolean {
    return this.topHealthyFiltradosIds.includes(platoId);
  }

  private cargarFiltrosDesdePerfil(): void {
    const perfil = this.profileService.obtenerPerfil();
    const filtrosTemporales = this.firstOrderService.obtenerFiltrosNutricionales();
    const usarFiltrosTemporales =
      this.firstOrderService.estaActivo() &&
      !this.userSessionService.haySesionActiva() &&
      perfil.alergenos.length === 0 &&
      perfil.objetivoNutricional === null &&
      perfil.preferenciasComposicion.length === 0;

    const alergenos = usarFiltrosTemporales ? filtrosTemporales.alergenos : perfil.alergenos;
    const objetivoNutricional = usarFiltrosTemporales
      ? filtrosTemporales.objetivoNutricional
      : perfil.objetivoNutricional;
    const preferenciasComposicion = usarFiltrosTemporales
      ? filtrosTemporales.preferenciasComposicion
      : perfil.preferenciasComposicion;

    this.alergenosSeleccionados = [...alergenos];
    this.objetivoNutricionalSeleccionado = objetivoNutricional;
    this.preferenciasComposicionSeleccionadas = [...preferenciasComposicion];
    this.filtrarPlatos();
    this.actualizarRecomendaciones();
  }

  private sincronizarSuscripcion(): void {
    let suscripcion = this.subscriptionService.obtenerSuscripcion();

    if (!this.suscripcionAplicaAlPedidoActual()) {
      this.suscripcionActiva = false;
      this.platosSuscripcionSeleccionadosIds = [];
      this.minimoPlatosSuscripcion = this.subscriptionService.obtenerMinimoPlatosSuscripcion();
      this.mensajeSuscripcion = '';
      return;
    }

    if (
      suscripcion.activa &&
      suscripcion.platosSeleccionadosIds.length > 0 &&
      this.carritoService.obtenerCantidadTotalItems() === 0
    ) {
      this.carritoService.cargarDesdeSuscripcion(
        suscripcion.platosSeleccionadosIds,
        this.platos
      );
    }

    if (
      suscripcion.activa &&
      suscripcion.platosSeleccionadosIds.length === 0 &&
      this.carritoService.obtenerCantidadTotalItems() > 0
    ) {
      this.subscriptionService.actualizarSeleccionPlatos(
        this.carritoService.obtenerIdsPlatosSuscripcion(),
        this.platos
      );
      suscripcion = this.subscriptionService.obtenerSuscripcion();
    }

    this.suscripcionActiva = suscripcion.activa;
    this.platosSuscripcionSeleccionadosIds = [...suscripcion.platosSeleccionadosIds];
    this.minimoPlatosSuscripcion = this.subscriptionService.obtenerMinimoPlatosSuscripcion();

    if (
      this.firstOrderService.estaActivo() &&
      this.firstOrderService.esModoSuscripcion() &&
      !this.userSessionService.haySesionActiva()
    ) {
      this.firstOrderService.guardarSuscripcionTemporal(suscripcion);
    }

    this.actualizarMensajeSuscripcion();
  }

  private sincronizarPrimerPedidoTemporal(): void {
    if (!this.firstOrderService.estaActivo() || this.userSessionService.haySesionActiva()) {
      return;
    }

    if (this.firstOrderService.esModoSuscripcion()) {
      const suscripcionTemporal = this.firstOrderService.obtenerSuscripcionTemporal();

      if (suscripcionTemporal && !this.subscriptionService.suscripcionActiva()) {
        this.subscriptionService.establecerSuscripcionTemporal(suscripcionTemporal);
      }

      return;
    }

    this.subscriptionService.restablecerSuscripcionLocal();
  }

  private prepararMenuParaSuscripcion(): void {
    this.terminoBusqueda = '';
    this.categoriaSeleccionada = 'Todas';
    this.ordenHealthyActivo = false;
    this.filtrarPlatos();
  }

  private actualizarMensajeSuscripcion(): void {
    if (!this.suscripcionActiva) {
      this.mensajeSuscripcion = '';
      return;
    }

    const seleccionados = this.platosSuscripcionSeleccionadosIds.length;
    const tienePedidoSemanalPrevio = this.tienePedidoSemanalPrevio();

    if (tienePedidoSemanalPrevio && seleccionados >= this.minimoPlatosSuscripcion) {
      this.mensajeSuscripcion = this.translateService.instant('MENU.BANNERS.WITH_PREVIOUS', {
        count: seleccionados
      });
      return;
    }

    this.mensajeSuscripcion = this.translateService.instant('MENU.BANNERS.NEED_MORE', {
      minimum: this.minimoPlatosSuscripcion,
      count: seleccionados
    });
  }

  private tienePedidoSemanalPrevio(): boolean {
    return this.orderService.obtenerPedidos().some(pedido => pedido.esSuscripcion);
  }

  private guardarFiltrosEnPerfil(): void {
    const preferencias = {
      alergenos: this.alergenosSeleccionados,
      objetivoNutricional: this.objetivoNutricionalSeleccionado,
      preferenciasComposicion: this.preferenciasComposicionSeleccionadas
    };

    this.profileService.guardarPreferenciasNutricionales(preferencias);

    if (this.firstOrderService.estaActivo()) {
      this.firstOrderService.guardarFiltrosNutricionales(preferencias);
    }
  }

  private suscripcionAplicaAlPedidoActual(): boolean {
    return (
      this.subscriptionService.suscripcionActiva() &&
      !(this.firstOrderService.estaActivo() && this.firstOrderService.esModoIndividual())
    );
  }

  private actualizarRecomendaciones(): void {
    const perfil = this.profileService.obtenerPerfil();
    const hayPreferencias =
      perfil.alergenos.length > 0 ||
      perfil.objetivoNutricional !== null ||
      perfil.preferenciasComposicion.length > 0;

    if (!hayPreferencias) {
      this.platosRecomendados = [];
      this.mensajeRecomendacion = '';
      return;
    }

    const platosBase =
      this.platosFiltrados.length > 0
        ? this.platosFiltrados
        : this.platos.filter(plato => this.esCompatibleConAlergenos(plato));

    this.platosRecomendados = [...platosBase]
      .sort((a, b) => this.calcularPuntuacionRecomendacion(b) - this.calcularPuntuacionRecomendacion(a))
      .slice(0, 3);

    if (this.platosRecomendados.length === 0) {
      this.mensajeRecomendacion = '';
      return;
    }

    this.mensajeRecomendacion = this.construirMensajeRecomendacion();
  }

  private calcularPuntuacionRecomendacion(plato: Plato): number {
    const macros = plato.nutrition.macronutrients;
    let puntuacion = plato.healthScore * 10;

    if (this.esCompatibleConAlergenos(plato)) {
      puntuacion += 80;
    } else {
      puntuacion -= 500;
    }

    if (this.objetivoNutricionalSeleccionado === 'perder-peso') {
      if (plato.calories <= 350) {
        puntuacion += 30;
      }

      if (macros.fat_g <= 15) {
        puntuacion += 20;
      }

      if (macros.fiber_g >= 3) {
        puntuacion += 15;
      }
    }

    if (this.objetivoNutricionalSeleccionado === 'masa-muscular') {
      if (macros.protein_g >= 20) {
        puntuacion += 35;
      }

      if (plato.calories >= 300) {
        puntuacion += 15;
      }
    }

    if (this.preferenciasComposicionSeleccionadas.includes('ricos-proteina')) {
      puntuacion += macros.protein_g * 1.5;
    }

    if (this.preferenciasComposicionSeleccionadas.includes('bajos-grasas') && macros.fat_g <= 10) {
      puntuacion += 25;
    }

    if (
      this.preferenciasComposicionSeleccionadas.includes('bajos-carbohidratos') &&
      macros.carbohydrates_g <= 30
    ) {
      puntuacion += 25;
    }

    return puntuacion;
  }

  private esCompatibleConAlergenos(plato: Plato): boolean {
    return !this.alergenosSeleccionados.some(alergeno => plato.allergens.includes(alergeno));
  }

  private construirMensajeRecomendacion(): string {
    if (this.objetivoNutricionalSeleccionado === 'perder-peso') {
      return this.translateService.instant('MENU.WEIGHT_LOSS_RECOMMENDATION');
    }

    if (this.objetivoNutricionalSeleccionado === 'masa-muscular') {
      return this.translateService.instant('MENU.MUSCLE_RECOMMENDATION');
    }

    return this.translateService.instant('MENU.GENERIC_RECOMMENDATION');
  }

  private actualizarTopHealthyFiltrado(): void {
    this.topHealthyFiltradosIds = [...this.platosFiltrados]
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, 3)
      .map(plato => plato.id);
  }

  private formatearMoneda(value: number): string {
    return new Intl.NumberFormat(this.languageService.getCurrentLocale(), {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }
}
