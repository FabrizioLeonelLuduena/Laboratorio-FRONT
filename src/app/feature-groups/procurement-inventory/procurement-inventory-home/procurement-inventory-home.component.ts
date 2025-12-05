import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { catchError, forkJoin, of } from 'rxjs';



import { DashboardMetric, DashboardMetricCardComponent } from '../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { TutorialOverlayComponent } from '../../../shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig } from '../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../shared/services/page-title.service';
import { TutorialService } from '../../../shared/services/tutorial.service';
import { KpiDataPoint, KpiResponseDTO } from '../models/kpi/kpi.model';
import { DashboardKpiService } from '../services/dashboard-kpi.service';


import { DashboardCriticalStockComponent } from './components/dashboard-critical-stock.component';
import { DashboardExcessStockComponent } from './components/dashboard-excess-stock.component';
import { ReportingCardComponent, ReportingCardData } from './components/reporting-card/reporting-card.component';
import { ReportingFiltersComponent } from './components/reporting-filters/reporting-filters.component';
import { ReportingFilters } from './models/reporting-metrics.model';
import { DashboardFilterService } from './services/dashboard-filter.service';

/**
 * Dashboard data with historical KPIs
 */
type DashboardData = {
  // Purchase Orders KPIs (RF-01 to RF-08)
  totalVolume: KpiResponseDTO;
  avgDeliveryTime: KpiResponseDTO;
  createdOrders: KpiResponseDTO;
  returnRate: KpiResponseDTO;
  volumeBySupplier: KpiResponseDTO;
  deliveryTimeBySupplier: KpiResponseDTO;
  ordersByMonth: KpiResponseDTO;
  returnRateBySupplier: KpiResponseDTO;
  // Stock Movement KPIs
  transfersByLocation: KpiResponseDTO;
  outputsByLocation: KpiResponseDTO;
  avgTransferTime: KpiResponseDTO;
  topSupplies: KpiResponseDTO;
};

/**
 * Main dashboard component for Procurement & Inventory.
 * Displays real-time KPIs and visualizations from backend endpoints.
 */
@Component({
  selector: 'app-procurement-inventory',
  standalone: true,
  imports: [
    CommonModule,
    DashboardMetricCardComponent,
    DashboardCriticalStockComponent,
    DashboardExcessStockComponent,
    ReportingFiltersComponent,
    ReportingCardComponent,
    GenericAlertComponent,
    TutorialOverlayComponent,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './procurement-inventory-home.component.html'
})
export class ProcurementInventoryHomeComponent implements OnInit, OnDestroy {
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly kpiService = inject(DashboardKpiService);
  private readonly tutorialService = inject(TutorialService);
  private readonly messageService = inject(MessageService);
  private readonly filterService = inject(DashboardFilterService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  private tutorialSub?: any;

  // Alert system
  showAlert = signal(false);
  alertMessage = signal('');
  alertType = signal<'success' | 'error'>('success');

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-reporting-filters > div.flex',
        title: 'Filtros del dashboard',
        message: 'Usa estos filtros para personalizar el rango de fechas y ver datos históricos específicos. Los filtros se aplican a todos los KPIs del dashboard.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'section.grid.grid-cols-1.gap-3.mb-6',
        title: 'Indicadores KPI principales',
        message: 'Estas tarjetas muestran los KPIs clave para tener una vista rapida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-dashboard-critical-stock',
        title: 'Insumos críticos',
        message: 'Visualiza insumos que están por debajo del stock mínimo y requieren atención inmediata. Haz clic en "Ver más" para ver el detalle completo.',
        position: 'right',
        highlightPadding: 8
      },
      {
        target: 'app-dashboard-excess-stock',
        title: 'Insumos en exceso',
        message: 'Identifica insumos que están por encima del stock máximo. Haz clic en "Ver más" para gestionar el excedente.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(1)',
        title: 'Volumen de compras por proveedor',
        message: 'Este gráfico muestra la cantidad de órdenes procesadas agrupadas por proveedor. Haz clic en "Ver más" para análisis detallado.',
        position: 'right',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(2)',
        title: 'Tiempo promedio de entrega',
        message: 'Visualiza los días promedio de demora desde emisión hasta recepción por proveedor.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(3)',
        title: 'Órdenes de compra confeccionadas',
        message: 'Evolución mensual de la creación de órdenes de compra en el tiempo.',
        position: 'right',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(4)',
        title: 'Tasa de devoluciones',
        message: 'Porcentaje de devoluciones sobre entregas totales por proveedor.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(5)',
        title: 'Transferencias confirmadas',
        message: 'Cantidad de transferencias internas confirmadas por depósito o ubicación.',
        position: 'right',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(6)',
        title: 'Egresos totales',
        message: 'Distribución porcentual de egresos entre las diferentes ubicaciones.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(7)',
        title: 'Tiempo medio de traslado',
        message: 'Evolución del tiempo promedio de transferencias internas expresado en minutos.',
        position: 'right',
        highlightPadding: 8
      },
      {
        target: 'app-reporting-card:nth-child(8)',
        title: 'Insumos más demandados',
        message: 'Clasificación de insumos por demanda en el período seleccionado. Haz clic en "Ver más" para ver el listado completo.',
        position: 'left',
        highlightPadding: 8
      }
    ],
    onComplete: () => {
      this.showSuccess('Tutorial completado! Ya conoces todas las funcionalidades del dashboard de stock.');
    },
    onSkip: () => {
      // User skipped tutorial
    }
  });  readonly lastUpdated = signal(new Date());
  readonly metrics = signal<DashboardMetric[]>([]);
  readonly graphCards = signal<ReportingCardData[]>([]);
  readonly isLoading = signal(false);

  /**
   * Configures the module title and breadcrumb on initialization.
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario', '/procurement-inventory');
    this.pageTitleService.setTitle('Dashboard de stock');
    this.filterService.resetFilters(); // Initialize filters with no default values
    this.loadDashboardData(); // Load all historical data by default

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('procurement-inventory') || route.includes('purchase-orders') || route.includes('goods-receipts') || route.includes('stock-movements')) {
        return;
      }

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Refreshes dashboard data from backend endpoints.
   */
  refreshDashboard(): void {
    this.loadDashboardData();
  }

  /**
   * Handles filter changes from reporting-filters component
   */
  onFiltersApplied(filters: ReportingFilters): void {
    this.filterService.setFilters(filters);
    this.loadDashboardData();
  }

  /**
   * Loads all dashboard data from backend in parallel.
   */
  private loadDashboardData(): void {
    this.isLoading.set(true);

    const userFilters = this.filterService.getFiltersSnapshot();

    // Use empty strings if no filters are set to get all historical data
    const startDate = userFilters.dateFrom ? this.formatDate(userFilters.dateFrom) : '';
    const endDate = userFilters.dateTo ? this.formatDate(userFilters.dateTo) : '';

    // Purchase Orders KPIs (RF-01 to RF-08)
    const totalVolume$ = this.kpiService.getTotalPurchaseVolume({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getTotalPurchaseVolume failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const avgDeliveryTime$ = this.kpiService.getAverageDeliveryTime({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getAverageDeliveryTime failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const createdOrders$ = this.kpiService.getCreatedOrdersCount({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getCreatedOrdersCount failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const returnRate$ = this.kpiService.getReturnRate({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getReturnRate failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const volumeBySupplier$ = this.kpiService.getVolumeBySupplier({ startDate, endDate }, 5)
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getVolumeBySupplier failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const deliveryTimeBySupplier$ = this.kpiService.getDeliveryTimeBySupplier({
      startDate,
      endDate,
      supplierId: userFilters.provider ? Number(userFilters.provider) : undefined
    }).pipe(catchError((error) => {
      // eslint-disable-next-line no-console
      console.warn('⚠️ KPI getDeliveryTimeBySupplier failed:', error.status, error.url);
      return of(this.buildEmptyResponse());
    }));

    const ordersByMonth$ = this.kpiService.getOrdersByMonth({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getOrdersByMonth failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const returnRateBySupplier$ = this.kpiService.getReturnRateBySupplier({ startDate, endDate }, 5)
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getReturnRateBySupplier failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    // Stock Movement KPIs
    const transfersByLocation$ = this.kpiService.getTransfersByLocation({
      startDate,
      endDate,
      locationId: userFilters.location ? Number(userFilters.location) : undefined,
      supplierId: userFilters.provider ? Number(userFilters.provider) : undefined,
      supplyId: userFilters.supply ? Number(userFilters.supply) : undefined
    }).pipe(catchError((error) => {
      // eslint-disable-next-line no-console
      console.warn('⚠️ KPI getTransfersByLocation failed:', error.status, error.url);
      return of(this.buildEmptyResponse());
    }));

    const outputsByLocation$ = this.kpiService.getOutputsByLocation({
      startDate,
      endDate,
      locationId: userFilters.location ? Number(userFilters.location) : undefined,
      supplierId: userFilters.provider ? Number(userFilters.provider) : undefined,
      supplyId: userFilters.supply ? Number(userFilters.supply) : undefined
    }).pipe(catchError((error) => {
      // eslint-disable-next-line no-console
      console.warn('⚠️ KPI getOutputsByLocation failed:', error.status, error.url);
      return of(this.buildEmptyResponse());
    }));

    const avgTransferTime$ = this.kpiService.getAverageTransferTime({ startDate, endDate })
      .pipe(catchError((error) => {
        // eslint-disable-next-line no-console
        console.warn('⚠️ KPI getAverageTransferTime failed:', error.status, error.url);
        return of(this.buildEmptyResponse());
      }));

    const topSupplies$ = this.kpiService.getMostDemandedSupplies({
      startDate,
      endDate,
      locationId: userFilters.location ? Number(userFilters.location) : undefined,
      supplierId: userFilters.provider ? Number(userFilters.provider) : undefined
    }).pipe(catchError((error) => {
      // eslint-disable-next-line no-console
      console.warn('⚠️ KPI getMostDemandedSupplies failed:', error.status, error.url);
      return of(this.buildEmptyResponse());
    }));

    forkJoin({
      // Purchase Orders
      totalVolume: totalVolume$,
      avgDeliveryTime: avgDeliveryTime$,
      createdOrders: createdOrders$,
      returnRate: returnRate$,
      volumeBySupplier: volumeBySupplier$,
      deliveryTimeBySupplier: deliveryTimeBySupplier$,
      ordersByMonth: ordersByMonth$,
      returnRateBySupplier: returnRateBySupplier$,
      // Stock Movements
      transfersByLocation: transfersByLocation$,
      outputsByLocation: outputsByLocation$,
      avgTransferTime: avgTransferTime$,
      topSupplies: topSupplies$
    }).subscribe({
      next: (data: DashboardData) => {
        this.metrics.set(this.buildMetricsFromData(data));
        this.graphCards.set(this.buildGraphCardsFromData(data));
        this.lastUpdated.set(new Date());
        this.isLoading.set(false);
      },
      error: (error) => {
        // eslint-disable-next-line no-console
        console.error('❌ Error crítico cargando dashboard:', error);

        const fallback = this.buildFallbackData();
        this.metrics.set(this.buildMetricsFromData(fallback));
        this.graphCards.set(this.buildGraphCardsFromData(fallback));
        this.lastUpdated.set(new Date());
        this.isLoading.set(false);

        // Show error toast
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin datos disponibles',
          detail: 'Los endpoints de KPI no están devolviendo datos. Verifica la consola del navegador para más detalles.',
          life: 8000
        });
      }
    });
  }



  /**
   * Formats a Date object to "yyyy-MM-dd" string.
   *
   * @param date date to format
   * @returns formatted date string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Builds metric cards from backend data (8 historical KPIs).
   */
  private buildMetricsFromData(data: DashboardData): DashboardMetric[] {
    // Extract values from KPIs
    const totalVolume = this.sumValues(data.totalVolume.data);
    const avgDeliveryDays = this.averageValues(data.avgDeliveryTime.data);
    const createdOrdersCount = this.sumValues(data.createdOrders.data);
    const returnRatePercent = this.averageValues(data.returnRate.data);

    const totalTransfers = this.sumValues(data.transfersByLocation.data);
    const totalOutputs = this.sumValues(data.outputsByLocation.data);
    const avgTransferMinutes = this.averageValues(data.avgTransferTime.data);
    const topSupply = this.extractTopSupply(data.topSupplies);

    // Get date range label from filters
    const filters = this.filterService.getFiltersSnapshot();
    const dateRange = this.getDateRangeLabel(filters.dateFrom, filters.dateTo);

    return [
      // 1. Volumen de compras por proveedor
      {
        label: 'Volumen de compras',
        value: `${totalVolume}`,
        subtext: dateRange,
        icon: 'pi pi-shopping-cart',
        helpText: 'Total de órdenes de compra procesadas en el período seleccionado.',
        accent: 'primary'
      },
      // 2. Tiempo promedio de entrega
      {
        label: 'Tiempo promedio entrega',
        value: avgDeliveryDays > 0 ? `${avgDeliveryDays.toFixed(1)} días` : 'Sin datos',
        subtext: dateRange,
        icon: 'pi pi-clock',
        helpText: 'Tiempo promedio que demoran los proveedores desde la emisión hasta la recepción.',
        accent: avgDeliveryDays <= 3 ? 'success' : avgDeliveryDays <= 7 ? 'warning' : 'danger'
      },
      // 3. Órdenes confeccionadas
      {
        label: 'Órdenes confeccionadas',
        value: `${createdOrdersCount}`,
        subtext: dateRange,
        icon: 'pi pi-file',
        helpText: 'Cantidad de órdenes de compra creadas en el período seleccionado.',
        accent: 'primary'
      },
      // 4. Tasa de devoluciones
      {
        label: 'Tasa de devoluciones',
        value: `${returnRatePercent.toFixed(1)}%`,
        subtext: dateRange,
        icon: 'pi pi-arrow-left',
        helpText: 'Porcentaje de devoluciones sobre el total de órdenes entregadas.',
        accent: returnRatePercent <= 2 ? 'success' : returnRatePercent <= 5 ? 'warning' : 'danger'
      },
      // 5. Transferencias confirmadas
      {
        label: 'Transferencias confirmadas',
        value: `${totalTransfers}`,
        subtext: dateRange,
        icon: 'pi pi-sync',
        helpText: 'Cantidad de transferencias internas confirmadas en el período seleccionado.',
        accent: 'primary'
      },
      // 6. Egresos totales
      {
        label: 'Egresos totales',
        value: `${Math.round(totalOutputs)} uds.`,
        subtext: dateRange,
        icon: 'pi pi-arrow-circle-right',
        helpText: 'Volumen total de unidades egresadas en el período seleccionado.',
        accent: 'warning'
      },
      // 7. Tiempo medio de traslado
      {
        label: 'Tiempo medio traslado',
        value: avgTransferMinutes > 0 ? `${Math.round(avgTransferMinutes)} min` : 'Sin datos',
        subtext: dateRange,
        icon: 'pi pi-stopwatch',
        helpText: 'Tiempo promedio de transferencias internas completadas en el período seleccionado.',
        accent: avgTransferMinutes <= 30 ? 'success' : avgTransferMinutes <= 60 ? 'warning' : 'danger'
      },
      // 8. Insumo más demandado
      {
        label: 'Insumo más demandado',
        value: topSupply?.label ?? '—',
        subtext: topSupply ? `${topSupply.value} uds. en ${dateRange.toLowerCase()}` : 'Sin datos',
        icon: 'pi pi-chart-line',
        helpText: 'Insumo con mayor demanda acumulada en el período seleccionado.',
        accent: 'danger'
      }
    ];
  }

  /**
   * Generates friendly date range label
   */
  private getDateRangeLabel(dateFrom: Date | null | undefined, dateTo: Date | null | undefined): string {
    if (!dateFrom || !dateTo) {
      return 'Histórico completo';
    }

    const fromStr = dateFrom.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    const toStr = dateTo.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

    if (dateFrom.getFullYear() === dateTo.getFullYear()) {
      return `${fromStr} - ${toStr}`;
    }

    return `${fromStr} ${dateFrom.getFullYear()} - ${toStr} ${dateTo.getFullYear()}`;
  }

  /**
   * trackBy function used in KPI iteration to optimize view changes.
   */
  protected readonly trackByMetric = (_: number, metric: DashboardMetric) => metric.label;

  /**
   * Builds a fallback dashboard data object with empty KPI responses.
   */
  private buildFallbackData(): DashboardData {
    const empty = this.buildEmptyResponse();
    return {
      totalVolume: empty,
      avgDeliveryTime: empty,
      createdOrders: empty,
      returnRate: empty,
      volumeBySupplier: empty,
      deliveryTimeBySupplier: empty,
      ordersByMonth: empty,
      returnRateBySupplier: empty,
      transfersByLocation: empty,
      outputsByLocation: empty,
      avgTransferTime: empty,
      topSupplies: empty
    };
  }

  /**
   * Returns an empty KPI response when the backend request fails.
   */
  private buildEmptyResponse(): KpiResponseDTO {
    return {
      data: [],
      appliedFilters: {
        startDate: null,
        endDate: null,
        supplierId: null,
        locationId: null,
        supplyId: null
      }
    };
  }

  /**
   * Computes the sum of values from KPI data points.
   */
  private sumValues(points: KpiDataPoint[] = []): number {
    return points.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  }

  /**
   * Computes the average of values from KPI data points.
   */
  private averageValues(points: KpiDataPoint[] = []): number {
    if (!points.length) {
      return 0;
    }
    return this.sumValues(points) / points.length;
  }

  /**
   * Extracts the top supply information from KPI data points.
   */
  private extractTopSupply(response: KpiResponseDTO): { label: string; value: number } | null {
    const [first] = response.data ?? [];
    if (!first) {
      return null;
    }

    return {
      label: this.cleanSupplyLabel(first.label),
      value: Number(first.value ?? 0)
    };
  }

  /**
   * Ensures datasets have at least one placeholder entry to keep charts visible.
   */
  private withFallbackDataset(labels: string[], values: number[]): { labels: string[]; values: number[] } {
    if (labels.length === 0) {
      return {
        labels: ['Sin datos'],
        values: [0]
      };
    }

    return { labels, values };
  }

  /**
   * Returns subtext indicating whether average data is available.
   */
  private getAverageSubtext(value: number, baseText: string): string {
    return value > 0 ? baseText : 'Sin datos disponibles';
  }

  /**
   * Cleans supply labels coming from backend responses.
   */
  private cleanSupplyLabel(label?: string): string {
    if (!label) {
      return 'Sin datos';
    }
    const [name] = label.split(' - ');
    return name || label;
  }

  /**
   * Formats currency values with thousand separators
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Displays success alert message
   * Auto-hides after 5 seconds
   */
  private showSuccess(message: string): void {
    this.alertMessage.set(message);
    this.alertType.set('success');
    this.showAlert.set(true);
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert.set(false);
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Builds graph cards data from backend responses for the 8 KPIs
   */
  private buildGraphCardsFromData(data: DashboardData): ReportingCardData[] {
    const filters = this.filterService.getFiltersSnapshot();
    const dateRange = this.getDateRangeLabel(filters.dateFrom, filters.dateTo);

    return [
      // 1. Volumen de compras por proveedor (bar vertical)
      {
        title: 'Volumen de compras por proveedor',
        icon: 'pi-shopping-cart',
        description: dateRange,
        helpText: 'Cantidad de órdenes procesadas agrupadas por proveedor',
        chartType: 'bar',
        tableColumns: ['Proveedor', 'Órdenes'],
        tableData: (data.volumeBySupplier.data || []).map(item => ({
          'Proveedor': item.label,
          'Órdenes': item.value
        })),
        chartData: data.volumeBySupplier.data || [],
        chartColors: ['#00a3a1', '#008c8a', '#00bab8', '#35cdcb', '#6fdfdd'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 2. Tiempo promedio de entrega por proveedor (bar vertical)
      {
        title: 'Tiempo promedio de entrega por proveedor',
        icon: 'pi-clock',
        description: dateRange,
        helpText: 'Días promedio de demora desde emisión hasta recepción',
        chartType: 'bar',
        tableColumns: ['Proveedor', 'Días'],
        tableData: (data.deliveryTimeBySupplier.data || []).map(item => ({
          'Proveedor': item.label,
          'Días': `${item.value.toFixed(1)} días`
        })),
        chartData: data.deliveryTimeBySupplier.data || [],
        chartColors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 3. Órdenes de compra confeccionadas por mes (line/area)
      {
        title: 'Órdenes de compra confeccionadas por mes',
        icon: 'pi-file',
        description: dateRange,
        helpText: 'Evolución mensual de la creación de órdenes de compra',
        chartType: 'line',
        tableColumns: ['Mes', 'Órdenes'],
        tableData: (data.ordersByMonth.data || []).map(item => ({
          'Mes': item.label,
          'Órdenes': item.value
        })),
        chartData: data.ordersByMonth.data || [],
        chartColors: ['#8b5cf6'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 4. Tasa de devoluciones por proveedor (bar vertical)
      {
        title: 'Tasa de devoluciones por proveedor',
        icon: 'pi-arrow-left',
        description: dateRange,
        helpText: 'Porcentaje de devoluciones sobre entregas por proveedor',
        chartType: 'bar',
        tableColumns: ['Proveedor', 'Tasa (%)'],
        tableData: (data.returnRateBySupplier.data || []).map(item => ({
          'Proveedor': item.label,
          'Tasa (%)': `${item.value.toFixed(1)}%`
        })),
        chartData: data.returnRateBySupplier.data || [],
        chartColors: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 5. Transferencias confirmadas por ubicación (bar horizontal)
      {
        title: 'Transferencias confirmadas por ubicación',
        icon: 'pi-sync',
        description: dateRange,
        helpText: 'Cantidad de transferencias internas confirmadas por depósito',
        chartType: 'horizontalBar',
        tableColumns: ['Ubicación', 'Cantidad'],
        tableData: (data.transfersByLocation.data || []).map(item => ({
          'Ubicación': item.label,
          'Cantidad': item.value
        })),
        chartData: data.transfersByLocation.data || [],
        chartColors: ['#008c8a', '#00a3a1', '#00bab8', '#35cdcb', '#6fdfdd'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 6. Egresos totales por ubicación (pie chart)
      {
        title: 'Egresos totales por ubicación',
        icon: 'pi-arrow-circle-right',
        description: dateRange,
        helpText: 'Distribución porcentual de egresos entre ubicaciones',
        chartType: 'pie',
        tableColumns: ['Ubicación', 'Unidades'],
        tableData: (data.outputsByLocation.data || []).map(item => ({
          'Ubicación': item.label,
          'Unidades': item.value
        })),
        chartData: data.outputsByLocation.data || [],
        chartColors: ['#00435d', '#008c8a', '#00a3a1', '#00bab8', '#35cdcb', '#6fdfdd'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 7. Tiempo medio de traslado (line/area)
      {
        title: 'Tiempo medio de traslado',
        icon: 'pi-stopwatch',
        description: dateRange,
        helpText: 'Evolución del tiempo promedio de transferencias internas (minutos)',
        chartType: 'line',
        tableColumns: ['Período', 'Minutos'],
        tableData: (data.avgTransferTime.data || []).map(item => ({
          'Período': item.label,
          'Minutos': `${Math.round(item.value)} min`
        })),
        chartData: data.avgTransferTime.data || [],
        chartColors: ['#10b981'],
        chartLabelKey: 'label',
        chartValueKey: 'value'
      },
      // 8. Insumos más demandados (table only)
      {
        title: 'Insumos más demandados',
        icon: 'pi-chart-line',
        description: dateRange,
        helpText: 'Clasificación de insumos por demanda en el período seleccionado',
        chartType: 'table',
        tableColumns: ['Insumo', 'Unidades demandadas'],
        tableData: (data.topSupplies.data || []).map(item => ({
          'Insumo': this.cleanSupplyLabel(item.label),
          'Unidades demandadas': item.value
        })),
        chartData: data.topSupplies.data || [],
        chartColors: [],
        chartLabelKey: 'label',
        chartValueKey: 'value',
        showOnlyTable: true
      }
    ];
  }
}
