import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ChartData, ChartOptions } from 'chart.js';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { GenericDownloadMenuComponent } from '../../../../../shared/components/generic-download-menu/generic-download-menu.component';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { ExportColumn } from '../../../../../shared/services/export';
import { ExcelExportService } from '../../../../../shared/services/export/excel-export.service';
import { PdfExportService } from '../../../../../shared/services/export/pdf-export.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { KpiResponseDTO } from '../../../models/kpi/kpi.model';
import { DashboardKpiService } from '../../../services/dashboard-kpi.service';
import { ReportingFilters } from '../../models/reporting-metrics.model';
import { DashboardFilterService } from '../../services/dashboard-filter.service';
import { ReportingFiltersComponent } from '../reporting-filters/reporting-filters.component';

/**
 * Dashboard detail page component.
 * Shows expanded chart view with advanced filtering capabilities as a full page.
 */
@Component({
  selector: 'app-dashboard-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    UIChart,
    TableModule,
    ReportingFiltersComponent,
    GenericDownloadMenuComponent,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard-detail.component.html'
})
export class DashboardDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly filterService = inject(DashboardFilterService);
  private readonly kpiService = inject(DashboardKpiService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly messageService = inject(MessageService);

  // Page data from route state
  readonly pageTitle = signal<string>('Análisis Detallado');
  readonly pageDescription = signal<string>('');
  readonly pageIcon = signal<string>('pi pi-chart-bar');
  readonly chartType = signal<'bar' | 'line' | 'doughnut' | 'pie'>('bar');
  readonly metricType = signal<string>('');

  readonly isLoading = signal(false);
  readonly currentChartData = signal<ChartData>({ datasets: [] });
  readonly currentChartOptions = signal<ChartOptions>({});
  readonly tableData = signal<Array<{ label: string; value: number; unit: string }>>([]);
  readonly tableCategoryLabel = signal<string>('Categoría');
  readonly tableValueLabel = signal<string>('Valor');

  chartMinHeight = '300px';
  chartMaxHeight = '500px';

  /**
   * Initializes the component and loads chart data
   */
  ngOnInit(): void {
    // Get metric type from route parameter
    const type = this.route.snapshot.paramMap.get('type');

    if (type) {
      this.metricType.set(type);
      this.configurePageByType(type);
    }

    // Set breadcrumb and page title with interactive navigation
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Adquisiciones e inventario', route: '/procurement-inventory' },
      { label: 'Dashboard', route: '/procurement-inventory' },
      { label: this.pageTitle() }
    ]);
    this.pageTitleService.setTitle(this.pageTitle());

    // Load all historical data by default
    this.loadChartData();
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    // Reset breadcrumb
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Adquisiciones e inventario', route: '/procurement-inventory' }
    ]);
  }

  /**
   * Computed signal to check if chart has data
   */
  readonly hasData = computed(() => {
    const data = this.currentChartData();
    return data.datasets && data.datasets.length > 0 &&
           data.datasets.some(ds => ds.data && ds.data.length > 0);
  });

  /**
   * Handles filter changes from reporting-filters component
   */
  onFiltersApplied(filters: ReportingFilters): void {
    this.filterService.setFilters(filters);
    this.loadChartData();
  }

  /**
   * Configures page title, description, icon and chart type based on metric type
   */
  private configurePageByType(type: string): void {
    const config = this.getMetricConfig(type);
    this.pageTitle.set(config.title);
    this.pageDescription.set(config.description);
    this.pageIcon.set(config.icon);
    this.chartType.set(config.chartType);
    this.tableCategoryLabel.set(config.categoryLabel || 'Categoría');
    this.tableValueLabel.set(config.valueLabel || 'Valor');
  }

  /**
   * Returns configuration for each metric type
   */
  private getMetricConfig(type: string): {
    title: string;
    description: string;
    icon: string;
    chartType: 'bar' | 'line' | 'doughnut' | 'pie';
    categoryLabel?: string;
    valueLabel?: string;
  } {
    const configs: Record<string, any> = {
      // 1. Volumen de compras por proveedor - Barras vertical, período, filtro proveedor
      'purchase-volume': {
        title: 'Volumen de Compras por Proveedor',
        description: 'Volumen de compras por proveedor en el período seleccionado',
        icon: 'pi pi-shopping-bag',
        chartType: 'bar',
        categoryLabel: 'Proveedor',
        valueLabel: 'Órdenes'
      },
      // 2. Tiempo promedio de entrega - Barras vertical, período, filtro proveedor
      'delivery-time': {
        title: 'Tiempo Promedio de Entrega por Proveedor',
        description: 'Tiempo promedio de entrega por proveedor en el período seleccionado',
        icon: 'pi pi-clock',
        chartType: 'bar',
        categoryLabel: 'Proveedor',
        valueLabel: 'Días'
      },
      // 3. Órdenes confeccionadas por mes - Área/línea, período, filtro proveedor
      'created-orders': {
        title: 'Órdenes de Compra Confeccionadas por Mes',
        description: 'Órdenes de compra creadas mensualmente en el período seleccionado',
        icon: 'pi pi-plus-circle',
        chartType: 'line',
        categoryLabel: 'Mes',
        valueLabel: 'Órdenes'
      },
      // 4. Tasa de devoluciones - Barras vertical, período, filtro proveedor
      'return-rate': {
        title: 'Tasa de Devoluciones por Proveedor',
        description: 'Porcentaje de devoluciones por proveedor en el período seleccionado',
        icon: 'pi pi-replay',
        chartType: 'bar',
        categoryLabel: 'Proveedor',
        valueLabel: 'Porcentaje'
      },
      // 5. Transferencias confirmadas - Barras horizontal, período, filtro ubicación
      'transfers': {
        title: 'Transferencias Confirmadas',
        description: 'Distribución de transferencias internas por ubicación en el período seleccionado',
        icon: 'pi pi-arrow-right-arrow-left',
        chartType: 'bar',
        categoryLabel: 'Ubicación',
        valueLabel: 'Transferencias'
      },
      // 6. Egresos totales - Torta, período, filtro ubicación
      'outputs': {
        title: 'Egresos Totales',
        description: 'Volumen de salidas de insumos por ubicación en el período seleccionado',
        icon: 'pi pi-sign-out',
        chartType: 'pie',
        categoryLabel: 'Ubicación',
        valueLabel: 'Unidades'
      },
      // 7. Tiempo medio de traslado - Área/línea, período
      'transfer-time': {
        title: 'Tiempo Medio de Traslado',
        description: 'Evolución del tiempo promedio de transferencias internas en el período seleccionado',
        icon: 'pi pi-stopwatch',
        chartType: 'line',
        categoryLabel: 'Período',
        valueLabel: 'Días'
      },
      // 8. Insumo más demandado - Tabla (pero usamos doughnut por ahora)
      'top-supplies': {
        title: 'Insumos Más Demandados',
        description: 'Top insumos con mayor demanda en el período seleccionado',
        icon: 'pi pi-chart-line',
        chartType: 'doughnut',
        categoryLabel: 'Insumo',
        valueLabel: 'Unidades'
      },
      // Otros KPIs existentes
      'critical-stock': {
        title: 'Stock Crítico',
        description: 'Insumos por debajo del stock mínimo por ubicación',
        icon: 'pi pi-exclamation-triangle',
        chartType: 'bar',
        categoryLabel: 'Ubicación',
        valueLabel: 'Insumos'
      },
      'inventory-value': {
        title: 'Valor de Inventario',
        description: 'Valor total del inventario por ubicación',
        icon: 'pi pi-dollar',
        chartType: 'bar',
        categoryLabel: 'Ubicación',
        valueLabel: 'Valor'
      },
      'pending-orders': {
        title: 'Órdenes Pendientes',
        description: 'Órdenes de compra pendientes por proveedor',
        icon: 'pi pi-shopping-cart',
        chartType: 'bar',
        categoryLabel: 'Proveedor',
        valueLabel: 'Órdenes'
      },
      'on-time-delivery': {
        title: 'Entregas a Tiempo',
        description: 'Porcentaje de entregas completadas dentro del plazo por proveedor',
        icon: 'pi pi-check-circle',
        chartType: 'bar',
        categoryLabel: 'Proveedor',
        valueLabel: 'Porcentaje'
      }
    };

    return configs[type] || {
      title: 'Análisis Detallado',
      description: 'Visualización de datos',
      icon: 'pi pi-chart-bar',
      chartType: 'bar',
      categoryLabel: 'Categoría',
      valueLabel: 'Valor'
    };
  }

  /**
   * Loads chart data based on current filters
   */
  private loadChartData(): void {
    this.isLoading.set(true);

    const userFilters = this.filterService.getFiltersSnapshot();

    // Use empty strings if no filters are set to get all historical data
    const startDate = userFilters.dateFrom ? this.formatDate(userFilters.dateFrom) : '';
    const endDate = userFilters.dateTo ? this.formatDate(userFilters.dateTo) : '';

    const metricType = this.metricType();
    const apiCall$ = this.getApiCallForMetricType(metricType, startDate, endDate, userFilters);

    if (!apiCall$) {
      this.isLoading.set(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Tipo de métrica no soportado'
      });
      return;
    }

    apiCall$.subscribe({
      next: (response: KpiResponseDTO) => {
        const chartData = this.buildChartDataFromKpi(response, metricType);
        this.currentChartData.set(chartData.chartData);
        this.currentChartOptions.set(chartData.chartOptions);

        // Build table data with units
        const unit = this.getUnitForMetricType(metricType);
        const tableItems = response.data.map(item => ({
          label: item.label || 'Sin etiqueta',
          value: Number(item.value || 0),
          unit
        }));
        this.tableData.set(tableItems);

        this.isLoading.set(false);
      },
      error: () => {
        this.currentChartData.set({ datasets: [] });
        this.currentChartOptions.set({});
        this.tableData.set([]);
        this.isLoading.set(false);

        this.messageService.add({
          severity: 'error',
          summary: 'Error al cargar datos',
          detail: 'No se pudieron cargar los datos del backend'
        });
      }
    });
  }

  /**
   * Formats a Date object to "yyyy-MM-dd" string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns the unit suffix for each metric type
   */
  private getUnitForMetricType(type: string): string {
    switch (type) {
    case 'delivery-time':
    case 'transfer-time':
      return 'días';
    case 'return-rate':
      return '%';
    case 'outputs':
    case 'top-supplies':
      return 'uds';
    case 'transfers':
      return 'transferencias';
    case 'purchase-volume':
    case 'created-orders':
      return 'órdenes';
    default:
      return '';
    }
  }

  /**
   * Returns the appropriate API call observable based on metric type
   */
  private getApiCallForMetricType(type: string, startDate: string, endDate: string, filters: any) {
    const params = { startDate, endDate };

    switch (type) {
    case 'purchase-volume':
      return this.kpiService.getVolumeBySupplier(params, 10);
    case 'delivery-time':
      return this.kpiService.getDeliveryTimeBySupplier({
        ...params,
        supplierId: filters.provider ? Number(filters.provider) : undefined
      });
    case 'created-orders':
      return this.kpiService.getOrdersByMonth(params);
    case 'return-rate':
      return this.kpiService.getReturnRateBySupplier(params, 10);
    case 'transfers':
      return this.kpiService.getTransfersByLocation({
        ...params,
        locationId: filters.location ? Number(filters.location) : undefined,
        supplierId: filters.provider ? Number(filters.provider) : undefined,
        supplyId: filters.supply ? Number(filters.supply) : undefined
      });
    case 'outputs':
      return this.kpiService.getOutputsByLocation({
        ...params,
        locationId: filters.location ? Number(filters.location) : undefined,
        supplierId: filters.provider ? Number(filters.provider) : undefined,
        supplyId: filters.supply ? Number(filters.supply) : undefined
      });
    case 'transfer-time':
      return this.kpiService.getAverageTransferTime(params);
    case 'top-supplies':
      return this.kpiService.getMostDemandedSupplies({
        ...params,
        locationId: filters.location ? Number(filters.location) : undefined,
        supplierId: filters.provider ? Number(filters.provider) : undefined
      });
    default:
      return null;
    }
  }

  /**
   * Builds chart data from KPI response
   */
  private buildChartDataFromKpi(response: KpiResponseDTO, type: string): { chartData: ChartData; chartOptions: ChartOptions } {
    const labels = response.data.map(item => String(item.label || 'Sin etiqueta'));
    const values = response.data.map(item => Number(item.value || 0));

    return this.buildChartData(type, labels, values);
  }

  /**
   * Builds chart data structure from labels and values
   */
  private buildChartData(type: string, labels: string[], values: number[]): { chartData: ChartData; chartOptions: ChartOptions } {
    const chartType = this.chartType();
    let xAxisLabel = 'Categorías';
    let yAxisLabel = 'Cantidad';
    let valuePrefix = '';
    let valueSuffix = '';

    // Configurar etiquetas según el tipo
    if (type === 'purchase-volume' || type === 'delivery-time' || type === 'return-rate') {
      xAxisLabel = 'Proveedores';
    } else if (type === 'transfers' || type === 'outputs') {
      xAxisLabel = 'Ubicaciones';
    } else if (type === 'top-supplies') {
      xAxisLabel = 'Insumos';
    } else if (type === 'created-orders' || type === 'transfer-time') {
      xAxisLabel = 'Período';
    }

    if (type === 'delivery-time' || type === 'transfer-time') {
      yAxisLabel = 'Días';
      valueSuffix = ' días';
    } else if (type === 'return-rate') {
      yAxisLabel = 'Porcentaje (%)';
      valueSuffix = '%';
    } else if (type === 'transfers') {
      yAxisLabel = 'Transferencias';
    } else if (type === 'outputs' || type === 'top-supplies') {
      yAxisLabel = 'Unidades';
      valueSuffix = ' uds';
    } else if (type === 'purchase-volume' || type === 'created-orders') {
      yAxisLabel = 'Órdenes';
    }

    // Para transfers usamos barras horizontales (indexAxis: 'y')
    const isHorizontalBar = type === 'transfers';

    const baseOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontalBar ? 'y' : 'x',
      layout: {
        padding: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        }
      },
      scales: chartType !== 'pie' && chartType !== 'doughnut' ? {
        x: {
          beginAtZero: isHorizontalBar,
          title: {
            display: true,
            text: isHorizontalBar ? yAxisLabel : xAxisLabel,
            color: '#333',
            font: { size: 14, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 },
            // Callback para mostrar los labels correctos
            callback: !isHorizontalBar ? (value: any, index: number) => {
              // Barras verticales: retornar el label de texto desde el array de labels
              return labels[index] || value;
            } : undefined,
            // Configuración para labels de texto sin rotación (derechos)
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            display: isHorizontalBar
          }
        },
        y: {
          beginAtZero: !isHorizontalBar,
          title: {
            display: true,
            text: isHorizontalBar ? xAxisLabel : yAxisLabel,
            color: '#333',
            font: { size: 14, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 },
            callback: isHorizontalBar ? (value: any, index: number) => {
              // Barras horizontales: retornar el label de texto desde el array de labels
              return labels[index] || value;
            } : (value: any) => {
              // Barras verticales: formatear números
              if (valuePrefix) {
                return valuePrefix + this.formatNumber(Number(value));
              }
              return this.formatNumber(Number(value));
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
            display: !isHorizontalBar
          }
        }
      } : undefined,
      plugins: {
        legend: {
          display: chartType === 'pie' || chartType === 'doughnut',
          position: 'right',
          labels: {
            font: { size: 13 },
            padding: 15
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y || context.parsed;
              let formattedValue = this.formatNumber(Number(value));
              if (valuePrefix) formattedValue = valuePrefix + formattedValue;
              if (valueSuffix) formattedValue = formattedValue + valueSuffix;
              return formattedValue;
            }
          }
        }
      }
    };

    const chartData: ChartData = chartType === 'line' ? {
      labels,
      datasets: [{
        label: this.pageTitle(),
        data: values,
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        tension: 0.4,
        fill: true
      }]
    } : chartType === 'doughnut' || chartType === 'pie' ? {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a']
      }]
    } : {
      labels,
      datasets: [{
        label: this.pageTitle(),
        data: values,
        backgroundColor: '#14b8a6',
        borderColor: '#0d9488',
        borderWidth: 1
      }]
    };

    return {
      chartData,
      chartOptions: baseOptions
    };
  }

  /**
   * Formats numbers with thousand separators
   */
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }



  /**
   * Exports current chart data to Excel
   */
  async exportToExcel(): Promise<void> {
    const data = this.currentChartData();
    if (!data.datasets || data.datasets.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    try {
      // Extract data from chart
      const labels = (data.labels as string[]) || [];
      const dataset = data.datasets[0];
      const values = (dataset.data as number[]) || [];

      // Build table data
      const tableData = labels.map((label, index) => ({
        label,
        value: values[index] || 0
      }));

      // Define columns
      const columns: ExportColumn<any>[] = [
        {
          header: this.getExportColumnName(),
          getValue: (row: any) => row.label || '-',
          width: 30
        },
        {
          header: this.getExportValueName(),
          getValue: (row: any) => row.value?.toString() || '0',
          width: 20
        }
      ];

      const result = await this.excelExportService.exportToExcel({
        data: tableData,
        columns,
        fileName: this.sanitizeFileName(this.pageTitle()),
        sheetName: 'Datos',
        includeTimestamp: true
      });

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Datos exportados correctamente a Excel'
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'No se pudo exportar a Excel'
        });
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al exportar a Excel'
      });
    }
  }

  /**
   * Exports current chart data to PDF with improved formatting
   */
  async exportToPdf(): Promise<void> {
    const data = this.currentChartData();
    if (!data.datasets || data.datasets.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    try {
      // Extract data from chart
      const labels = (data.labels as string[]) || [];
      const dataset = data.datasets[0];
      const values = (dataset.data as number[]) || [];

      // Build table data
      const tableData = labels.map((label, index) => ({
        label,
        value: values[index] || 0
      }));

      // Get column names
      const columnName = this.getExportColumnName();
      const valueName = this.getExportValueName();

      // Define columns with better formatting
      const columns: ExportColumn<any>[] = [
        {
          header: columnName,
          getValue: (row: any) => row.label || '-',
          width: 100 // Más ancho para nombres largos
        },
        {
          header: valueName,
          getValue: (row: any) => {
            const value = row.value || 0;
            // Formatear según el tipo de dato
            if (this.metricType().includes('rate')) {
              return `${value.toFixed(1)}%`;
            }
            if (this.metricType().includes('time') && value < 100) {
              return `${Math.round(value)} min`;
            }
            return value.toLocaleString('es-AR');
          },
          width: 60
        }
      ];

      const result = await this.pdfExportService.exportToPdf({
        data: tableData,
        columns,
        fileName: this.sanitizeFileName(this.pageTitle()),
        title: this.pageTitle(),
        orientation: 'portrait',
        includeDate: true,
        includeTimestamp: true,
        headerStyle: {
          backgroundColor: [0, 140, 138], // Brand color
          textColor: [255, 255, 255],
          fontSize: 10,
          bold: true,
          horizontalAlign: 'center'
        },
        bodyStyle: {
          fontSize: 9,
          cellPadding: 4,
          horizontalAlign: 'left',
          alternateRowColor: [245, 248, 250]
        },
        marginLeft: 20,
        marginRight: 20,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 230,
          y: 8
        }
      });

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Exportación exitosa',
          detail: `Archivo ${result.fileName} descargado correctamente`
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'No se pudo exportar a PDF'
        });
      }
    } catch (_error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al exportar a PDF'
      });
    }
  }

  /**
   * Gets appropriate column name for export - uses the same as table display
   */
  private getExportColumnName(): string {
    return this.tableCategoryLabel();
  }

  /**
   * Gets appropriate value name for export - uses the same as table display
   */
  private getExportValueName(): string {
    return this.tableValueLabel();
  }

  /**
   * Sanitizes filename by removing special characters
   */
  private sanitizeFileName(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens
      .trim();
  }

}
