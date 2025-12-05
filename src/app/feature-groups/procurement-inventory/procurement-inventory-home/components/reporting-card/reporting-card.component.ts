import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  Input,
  signal
} from '@angular/core';
import { Router } from '@angular/router';

import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';

import { GenericDownloadMenuComponent } from '../../../../../shared/components/generic-download-menu/generic-download-menu.component';
import { ExcelExportService, PdfExportService, ExportColumn } from '../../../../../shared/services/export';


/**
 * Interface for reporting card data
 */
export interface ReportingCardData {
  title: string;
  icon: string;
  description: string;
  helpText: string;
  chartType: 'bar' | 'horizontalBar' | 'pie' | 'line' | 'table';
  tableColumns: string[];
  tableData: any[];
  chartData?: any[];
  chartColors?: string[];
  chartLabelKey?: string;
  chartValueKey?: string;
  showOnlyTable?: boolean;
}

/**
 * Component for displaying a reporting card with table and expandable chart.
 */
@Component({
  selector: 'app-reporting-card',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule,
    CommonModule,
    DialogModule,
    UIChart,
    ToastModule,
    GenericDownloadMenuComponent
  ],
  providers: [MessageService],
  templateUrl: './reporting-card.component.html'
})
export class ReportingCardComponent implements OnInit, AfterViewInit, OnChanges {
  /** Reporting card data */
  @Input() reportingData!: ReportingCardData;

  /** Controls help modal visibility */
  showHelpModal = signal(false);

  /** Chart data for Chart.js */
  chartData!: ChartData;

  /** Chart options */
  chartOptions!: ChartOptions;

  @ViewChild(UIChart) chartComponent?: UIChart;

  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly excelExportService: ExcelExportService = inject(ExcelExportService);
  private readonly pdfExportService: PdfExportService = inject(PdfExportService);
  private readonly messageService = inject(MessageService);

  private static chartJsRegistered = false;
  private static barValueLabelsRegistered = false;
  private static lineValueLabelsRegistered = false;

  /**
   * Registers required Chart.js modules on component creation.
   */
  constructor() {
    this.ensureChartJsRegistered();
  }

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    if (this.reportingData.chartData && this.reportingData.chartData.length > 0) {
      this.initChart();
    }
  }

  /**
   * Updates chart when input data changes.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['reportingData'] || !this.reportingData) return;

    const chartItems = this.reportingData.chartData ?? [];

    if (chartItems.length > 0) {
      this.initChart();
      setTimeout(() => {
        this.chartComponent?.reinit();
      });
    } else {
      this.chartData = { labels: [], datasets: [] };
      setTimeout(() => {
        this.chartComponent?.reinit();
      });
    }
  }

  /**
   * Runs after view initialization to force rendering
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.reportingData.chartData && this.reportingData.chartData.length > 0) {
        this.initChart();
        this.cd.detectChanges();
      }
    }, 100);
  }

  /**
   * Returns true when the current card has chart data available.
   */
  hasChartData(): boolean {
    return Array.isArray(this.reportingData.chartData) && this.reportingData.chartData.length > 0;
  }

  /**
   * Gets the chart type compatible with PrimeNG chart component
   */
  getChartType(): 'bar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'doughnut' | 'polarArea' | 'radar' {
    if (this.reportingData.chartType === 'horizontalBar') {
      return 'bar';
    }
    // Si es 'table', devolver 'bar' por defecto (aunque no debería llegar aquí por la condición del template)
    if (this.reportingData.chartType === 'table') {
      return 'bar';
    }
    return this.reportingData.chartType as 'bar' | 'line' | 'pie';
  }

  /**
   * Gets the value for a table cell
   */
  getTableValue(row: any, column: string): any {
    const columnMap: Record<string, string> = {
      'Ubicación': 'ubicacion',
      'Transferencias': 'transferencias',
      'Egresos': 'egresos',
      'Unidades': 'egresos',
      'Día': 'dia',
      'Minutos': 'minutos',
      'Insumo': 'insumo',
      'Cantidad': 'cantidad',
      'Insumos': 'insumos',
      'Insumos críticos': 'insumos',
      'Valor': 'valor',
      'Proveedor': 'proveedor',
      'Órdenes': 'ordenes',
      'Porcentaje': 'porcentaje',
      'Período': 'dia',
      'Movimientos': 'cantidad'
    };

    const key = columnMap[column] || column.toLowerCase();
    let value = row[key];

    // Si no encuentra el valor, buscar por el nombre de columna directamente
    if (value === undefined) {
      value = row[column] || row[column.toLowerCase()];
    }

    // Formatear valores numéricos grandes
    if (typeof value === 'number' && value >= 1000) {
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }

    return value !== undefined && value !== null ? value : '-';
  }

  /**
   * Initializes the chart configuration
   */
  private initChart(): void {
    if (!this.reportingData.chartData || this.reportingData.chartData.length === 0) return;

    const colors = this.reportingData.chartColors || ['#008c8a', '#00a3a1', '#00bab8', '#35cdcb', '#6fdfdd'];

    if (this.reportingData.chartType === 'bar') {
      this.initBarChart(colors);
    } else if (this.reportingData.chartType === 'horizontalBar') {
      this.initHorizontalBarChart(colors);
    } else if (this.reportingData.chartType === 'pie') {
      this.initPieChart(colors);
    } else if (this.reportingData.chartType === 'line') {
      this.initLineChart(colors);
    } else if (this.reportingData.chartType === 'table') {
      // Table-only mode, no chart initialization needed
    }
  }

  /**
   * Initializes bar chart
   */
  private initBarChart(colors: string[]): void {
    const data = this.reportingData.chartData!;

    // Safety check: if no data, don't try to initialize
    if (!data || data.length === 0) {
      this.chartData = { labels: ['Sin datos'], datasets: [{ label: this.reportingData.title, data: [0], backgroundColor: colors[0] }] };
      return;
    }

    const dataKey =
      this.reportingData.chartValueKey ||
      this.resolveDataKey(data[0], ['orders', 'time', 'hours', 'movements', 'transfers', 'rate', 'supplies', 'value']);
    const xDataKey =
      this.reportingData.chartLabelKey ||
      this.resolveDataKey(data[0], ['provider', 'month', 'supply', 'location', 'name']);

    const titleLower = this.reportingData.title.toLowerCase();
    const chartValues = data.map((d: any) => {
      const value = d[dataKey];
      const numeric = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : value;
      return Number.isFinite(numeric) ? Number(numeric) : 0;
    });

    this.chartData = {
      labels: data.map((d: any) => d[xDataKey] || d.name || d.proveedor || d.mes || d.insumo || d.locacion),
      datasets: [
        {
          label: this.reportingData.title,
          data: chartValues,
          backgroundColor: colors[0],
          borderRadius: 8
        }
      ]
    };

    // Determinar etiqueta del eje Y según el tipo de métrica
    let yAxisLabel = 'Cantidad';
    let valuePrefix = '';
    let valueSuffix = '';

    if (titleLower.includes('tiempo')) {
      yAxisLabel = 'Minutos';
      valueSuffix = ' min';
    } else if (titleLower.includes('valor') || titleLower.includes('inventario')) {
      yAxisLabel = 'Valor ($)';
      valuePrefix = '$';
    } else if (titleLower.includes('porcentaje') || titleLower.includes('entregas a tiempo')) {
      yAxisLabel = 'Porcentaje (%)';
      valueSuffix = '%';
    } else if (titleLower.includes('egresos') || titleLower.includes('transferencias')) {
      yAxisLabel = 'Unidades';
      valueSuffix = ' uds';
    } else if (titleLower.includes('órdenes') || titleLower.includes('ordenes')) {
      yAxisLabel = 'Órdenes';
    } else if (titleLower.includes('stock') || titleLower.includes('insumos')) {
      yAxisLabel = 'Insumos';
    }

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.getXAxisLabel(),
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            display: false
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 },
            callback: (value: any) => {
              if (valuePrefix === '$') {
                return '$' + this.formatNumber(Number(value));
              }
              return this.formatNumber(Number(value));
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              let formattedValue = this.formatNumber(value);

              if (valuePrefix) formattedValue = valuePrefix + formattedValue;
              if (valueSuffix) formattedValue = formattedValue + valueSuffix;

              return formattedValue;
            }
          }
        }
      }
    };

    // Registrar plugin usando Chart.register solo una vez por componente
    if (!ReportingCardComponent.barValueLabelsRegistered) {
      Chart.register({
        id: 'barValueLabelsPlugin',
        afterDatasetsDraw: (chart: any) => {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden && chart.config.type === 'bar') {
              meta.data.forEach((bar: any, index: number) => {
                const value = dataset.data[index];

                // Obtener prefijo/sufijo del canvas data attribute
                const canvas = chart.canvas;
                const vPrefix = canvas.dataset.valuePrefix || '';
                const vSuffix = canvas.dataset.valueSuffix || '';

                let formattedValue = '';
                if (vSuffix === ' min') {
                  formattedValue = value + ' min';
                } else if (vPrefix === '$') {
                  formattedValue = '$' + new Intl.NumberFormat('es-AR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value);
                } else if (vSuffix === '%') {
                  formattedValue = value + '%';
                } else if (vSuffix === ' uds') {
                  formattedValue = new Intl.NumberFormat('es-AR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value) + ' uds';
                } else {
                  formattedValue = new Intl.NumberFormat('es-AR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value);
                }

                ctx.save();
                ctx.font = 'bold 11px sans-serif';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(formattedValue, bar.x, bar.y - 5);
                ctx.restore();
              });
            }
          });
        }
      });
      ReportingCardComponent.barValueLabelsRegistered = true;
    }

    // Guardar prefijo/sufijo para el plugin
    setTimeout(() => {
      if (this.chartComponent?.chart?.canvas) {
        this.chartComponent.chart.canvas.dataset.valuePrefix = valuePrefix;
        this.chartComponent.chart.canvas.dataset.valueSuffix = valueSuffix;
        this.chartComponent.reinit();
      }
    }, 100);
  }

  /**
   * Initializes horizontal bar chart
   */
  private initHorizontalBarChart(colors: string[]): void {
    const data = this.reportingData.chartData!;

    // Safety check: if no data, don't try to initialize
    if (!data || data.length === 0) {
      this.chartData = { labels: ['Sin datos'], datasets: [{ label: this.reportingData.title, data: [0], backgroundColor: colors[0] }] };
      return;
    }

    const dataKey =
      this.reportingData.chartValueKey ||
      this.resolveDataKey(data[0], ['transfers', 'cantidad', 'value']);
    const xDataKey =
      this.reportingData.chartLabelKey ||
      this.resolveDataKey(data[0], ['location', 'ubicacion', 'name']);

    const chartValues = data.map((d: any) => {
      const value = d[dataKey];
      const numeric = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : value;
      return Number.isFinite(numeric) ? Number(numeric) : 0;
    });

    this.chartData = {
      labels: data.map((d: any) => d[xDataKey] || d.ubicacion || d.location || d.name),
      datasets: [
        {
          label: this.reportingData.title,
          data: chartValues,
          backgroundColor: colors,
          borderRadius: 8
        }
      ]
    };

    this.chartOptions = {
      indexAxis: 'y', // This makes it horizontal
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          right: 40
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad',
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Ubicaciones',
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context: any) => {
              return this.formatNumber(context.parsed.x);
            }
          }
        }
      }
    };
  }

  /**
   * Gets appropriate X-axis label based on chart data
   */
  private getXAxisLabel(): string {
    const titleLower = this.reportingData.title.toLowerCase();
    if (titleLower.includes('proveedor')) return 'Proveedores';
    if (titleLower.includes('ubicación') || titleLower.includes('ubicacion')) return 'Ubicaciones';
    if (titleLower.includes('insumo')) return 'Insumos';
    if (titleLower.includes('tiempo')) return 'Período';
    return 'Categorías';
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
   * Picks the first existing property from a list of preferred keys, falling back to the first key found.
   */
  private resolveDataKey(item: any, preferredKeys: string[]): string {
    for (const key of preferredKeys) {
      if (item[key] !== undefined) {
        return key;
      }
    }
    const fallbackKey = Object.keys(item)[0];
    return fallbackKey ?? 'value';
  }

  /**
   * Initializes pie chart
   */
  private initPieChart(colors: string[]): void {
    const data = this.reportingData.chartData!;
    const dataKey =
      this.reportingData.chartValueKey ||
      this.resolveDataKey(data[0], ['transfers', 'value', 'movements']);
    const labelKey =
      this.reportingData.chartLabelKey ||
      this.resolveDataKey(data[0], ['location', 'name', 'label']);

    const chartValues = data.map((d: any) => d[dataKey] || d.value || 0);
    const total = chartValues.reduce((a: number, b: number) => a + b, 0);

    this.chartData = {
      labels: data.map((d: any) => d[labelKey] || d.name || d.locacion || d.label),
      datasets: [
        {
          data: chartValues,
          backgroundColor: colors.slice(0, data.length),
          hoverOffset: 4,
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            color: '#333',
            font: { size: 12, weight: 'bold' as const },
            padding: 10,
            boxWidth: 14,
            boxHeight: 14,
            generateLabels: (chart: any) => {
              const datasets = chart.data.datasets;
              const labels = chart.data.labels || [];

              return labels.map((label: any, i: number) => {
                const value = datasets[0].data[i] as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

                return {
                  text: `${label}: ${this.formatNumber(value)} (${percentage}%)`,
                  fillStyle: (datasets[0].backgroundColor as string[])[i],
                  hidden: false,
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12,
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed as number;
              const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${this.formatNumber(value)} (${pct}%)`;
            }
          }
        }
      }
    };
  }

  /**
   * Initializes line chart
   */
  private initLineChart(colors: string[]): void {
    const data = this.reportingData.chartData!;

    // Safety check: if no data, don't try to initialize
    if (!data || data.length === 0) {
      this.chartData = { labels: ['Sin datos'], datasets: [{ label: this.reportingData.title, data: [0], borderColor: colors[0], backgroundColor: colors[0] + '20' }] };
      return;
    }

    const dataKey =
      this.reportingData.chartValueKey ||
      this.resolveDataKey(data[0], ['hours', 'time', 'value']);
    const labelKey =
      this.reportingData.chartLabelKey ||
      this.resolveDataKey(data[0], ['month', 'mes', 'name', 'label']);

    const titleLower = this.reportingData.title.toLowerCase();
    const chartValues = data.map((d: any) => d[dataKey] || d.hours || d.tiempo || d.value || 0);

    let yAxisLabel = 'Valor';
    let valueSuffix = '';

    if (titleLower.includes('tiempo')) {
      yAxisLabel = 'Minutos';
      valueSuffix = ' min';
    } else if (titleLower.includes('hora')) {
      yAxisLabel = 'Horas';
      valueSuffix = ' hs';
    }

    this.chartData = {
      labels: data.map((d: any) => d[labelKey] || d.month || d.mes || d.name || d.label),
      datasets: [
        {
          label: this.reportingData.title,
          data: chartValues,
          borderColor: colors[0],
          backgroundColor: colors[0] + '20',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors[0],
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.getXAxisLabel(),
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            display: false
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
            color: '#333',
            font: { size: 13, weight: 'bold' }
          },
          ticks: {
            color: '#333',
            font: { size: 11 },
            callback: (value: any) => {
              return this.formatNumber(Number(value));
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              let formattedValue = this.formatNumber(value);
              if (valueSuffix) formattedValue = formattedValue + valueSuffix;
              return formattedValue;
            }
          }
        }
      }
    };

    // Registrar plugin usando Chart.register solo una vez por componente
    if (!ReportingCardComponent.lineValueLabelsRegistered) {
      Chart.register({
        id: 'lineValueLabelsPlugin',
        afterDatasetsDraw: (chart: any) => {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden && chart.config.type === 'line') {
              meta.data.forEach((point: any, index: number) => {
                const value = dataset.data[index];

                // Obtener sufijo del canvas data attribute
                const canvas = chart.canvas;
                const vSuffix = canvas.dataset.valueSuffix || '';

                let formattedValue = '';
                if (vSuffix === ' min') {
                  formattedValue = value + ' min';
                } else {
                  formattedValue = new Intl.NumberFormat('es-AR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value);
                }

                ctx.save();
                ctx.font = 'bold 11px sans-serif';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(formattedValue, point.x, point.y - 10);
                ctx.restore();
              });
            }
          });
        }
      });
      ReportingCardComponent.lineValueLabelsRegistered = true;
    }

    // Guardar sufijo para el plugin
    setTimeout(() => {
      if (this.chartComponent?.chart?.canvas) {
        this.chartComponent.chart.canvas.dataset.valueSuffix = valueSuffix;
        this.chartComponent.reinit();
      }
    }, 100);
  }

  /**
   * Ensures required Chart.js elements are registered once.
   */
  private ensureChartJsRegistered(): void {
    if (!ReportingCardComponent.chartJsRegistered) {
      Chart.register(...registerables);
      ReportingCardComponent.chartJsRegistered = true;
    }
  }

  /**
   * Opens help modal
   */
  openHelpModal(): void {
    this.showHelpModal.set(true);
  }

  /**
   * Closes help modal
   */
  closeHelpModal(): void {
    this.showHelpModal.set(false);
  }

  /**
   * Navigates to detail page with expanded chart view
   */
  openDetailModal(): void {
    const metricType = this.inferMetricType();
    this.router.navigate(['/procurement-inventory/detail', metricType]);
  }

  /**
   * Infers the metric type from the card title for routing to detail pages
   */
  private inferMetricType(): string {
    const title = this.reportingData.title.toLowerCase();

    // Nuevos KPIs históricos - orden importa: más específicos primero
    if (title.includes('volumen de compras')) return 'purchase-volume';
    if (title.includes('tiempo promedio de entrega') || title.includes('tiempo promedio entrega')) return 'delivery-time';
    if (title.includes('órdenes de compra confeccionadas') || title.includes('ordenes de compra confeccionadas')) return 'created-orders';
    if (title.includes('tasa de devoluciones')) return 'return-rate';
    if (title.includes('transferencias confirmadas')) return 'transfers';
    if (title.includes('egresos totales')) return 'outputs';
    if (title.includes('tiempo medio de traslado') || title.includes('tiempo medio traslado')) return 'transfer-time';
    if (title.includes('insumos más demandados') || title.includes('insumo más demandado')) return 'top-supplies';

    // Fallback
    return 'transfers';
  }

  /**
   * Exports data to Excel format
   */
  async onExportExcel(): Promise<void> {
    if (!this.reportingData.tableData || this.reportingData.tableData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos disponibles para exportar'
      });
      return;
    }

    try {
      const columns = this.buildExportColumns();
      const fileName = this.sanitizeFileName(this.reportingData.title);

      const result = await this.excelExportService.exportToExcel({
        data: this.reportingData.tableData,
        columns,
        fileName,
        sheetName: this.reportingData.title.substring(0, 31), // Excel limit
        includeTimestamp: true,
        headerStyle: {
          backgroundColor: 'FF008C8A',
          textColor: 'FFFFFFFF',
          bold: true,
          horizontalAlign: 'center',
          verticalAlign: 'center'
        }
      });

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Exportación exitosa',
          detail: `Archivo ${result.fileName} descargado`
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (_error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al exportar a Excel'
      });
    }
  }

  /**
   * Exports data to PDF format
   */
  async onExportPdf(): Promise<void> {
    if (!this.reportingData.tableData || this.reportingData.tableData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos disponibles para exportar'
      });
      return;
    }

    try {
      const columns = this.buildExportColumns();
      const fileName = this.sanitizeFileName(this.reportingData.title);

      const result = await this.pdfExportService.exportToPdf({
        data: this.reportingData.tableData,
        columns,
        fileName,
        title: this.reportingData.title,
        orientation: 'landscape',
        includeDate: true,
        includeTimestamp: true,
        headerStyle: {
          backgroundColor: [0, 140, 138],
          textColor: [255, 255, 255],
          fontSize: 8,
          bold: true,
          horizontalAlign: 'center'
        },
        bodyStyle: {
          fontSize: 7,
          cellPadding: 2,
          horizontalAlign: 'left',
          alternateRowColor: [240, 240, 240]
        },
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
          detail: `Archivo ${result.fileName} descargado`
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (_error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al exportar a PDF'
      });
    }
  }

  /**
   * Builds export columns configuration based on table columns
   */
  private buildExportColumns(): ExportColumn[] {
    return this.reportingData.tableColumns.map(column => ({
      header: column,
      getValue: (row: any) => {
        const value = this.getTableValue(row, column);
        return value !== null && value !== undefined ? value.toString() : '-';
      },
      width: this.getColumnWidth(column)
    }));
  }

  /**
   * Determines appropriate column width based on column name
   */
  private getColumnWidth(column: string): number {
    const columnLower = column.toLowerCase();

    // Columnas anchas
    if (columnLower.includes('proveedor') || columnLower.includes('insumo') ||
      columnLower.includes('ubicación') || columnLower.includes('ubicacion')) {
      return 30;
    }

    // Columnas medianas
    if (columnLower.includes('día') || columnLower.includes('dia') ||
      columnLower.includes('período') || columnLower.includes('periodo') ||
      columnLower.includes('mes') || columnLower.includes('month')) {
      return 20;
    }

    // Columnas numéricas pequeñas
    if (columnLower.includes('cantidad') || columnLower.includes('valor') ||
      columnLower.includes('órdenes') || columnLower.includes('ordenes') ||
      columnLower.includes('minutos') || columnLower.includes('porcentaje') ||
      columnLower.includes('transferencias') || columnLower.includes('egresos') ||
      columnLower.includes('unidades') || columnLower.includes('movimientos')) {
      return 15;
    }

    // Por defecto
    return 20;
  }

  /**
   * Sanitizes filename by removing special characters
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }


}
