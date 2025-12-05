import { CommonModule } from '@angular/common';
import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabview';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import {
  DashboardChartCard,
  DashboardChartCardComponent
} from '../../../shared/components/dashboard-chart-card/dashboard-chart-card.component';
import {
  DashboardMetric,
  DashboardMetricCardComponent
} from '../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { BillingDashboardComponent } from '../billing-dashboard/billing-dashboard.component';
import {
  CoverageDateFilters,
  CoverageDateFiltersComponent
} from '../components/coverage-date-filters/coverage-date-filters.component';
import { CoverageDashboardService, CoverageFilters } from '../services/coverage-dashboard.service';

/**
 *
 */
@Component({
  selector: 'app-coverage-dashboard',
  templateUrl: './coverage-dashboard.component.html',
  imports: [
    CommonModule,
    SkeletonModule,
    TabViewModule,
    DashboardChartCardComponent,
    CoverageDateFiltersComponent,
    DashboardMetricCardComponent,
    BillingDashboardComponent
  ],
  styleUrl: './coverage-dashboard.component.css'
})
export class CoverageDashboardComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  private readonly emptyChartData: ChartData = { labels: [], datasets: [] };
  chartCards: DashboardChartCard[] = [
    { title: 'Evolución mensual por tipo', description: 'Analiza la tendencia de la facturación mensual, desglosada por cada tipo de cobertura. Ideal para identificar patrones de crecimiento y estacionalidad.', icon: 'pi pi-chart-line', chartType: 'line', data: this.emptyChartData },
    { title: 'Montos por tipo y pagador', description: 'Compara la contribución a la facturación de cada pagador (Obra Social, Prepaga) dentro de su respectivo tipo de cobertura. Permite ver qué pagadores son más relevantes en cada categoría.', icon: 'pi pi-chart-bar', chartType: 'bar', data: this.emptyChartData },
    { title: 'Composición por tipo', description: 'Muestra la participación porcentual de cada tipo de cobertura sobre el total facturado. Ofrece una vista rápida de la dependencia del negocio en cada sector.', icon: 'pi pi-chart-pie', chartType: 'pie', data: this.emptyChartData },
    { title: 'Top 5 coberturas', description: 'Ranking de las 5 coberturas que generan mayor facturación. Clave para enfocar los esfuerzos de gestión y negociación.', icon: 'pi pi-sort-amount-down', chartType: 'bar', data: this.emptyChartData },
    { title: 'Mapa de Calor: Práctica vs. Cobertura', description: 'Visualiza las prácticas de mayor monto según la cobertura. El tamaño de la burbuja indica la intensidad de la facturación, permitiendo identificar patrones de consumo.', icon: 'pi pi-th-large', chartType: 'bubble', data: this.emptyChartData }
    /** { title: 'Débitos por obra social', description: 'Visualiza el porcentaje de débitos o rechazos de cada obra social. Un indicador fundamental para la salud financiera y la gestión de la calidad de la facturación.', icon: 'pi pi-percentage', chartType: 'bar', data: this.emptyChartData } */
  ];

  private periodSubtext: string = 'Período actual';

  /**
   * Constructor
   */
  constructor(
    private readonly pageTitle: PageTitleService,
    private readonly breadcrumb: BreadcrumbService,
    private readonly coverageService: CoverageDashboardService,
    @Inject(LOCALE_ID) private readonly locale: string
  ) {}

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    this.pageTitle.setTitle('Dashboard de Coberturas');
    this.breadcrumb.setBreadcrumbs([
      { label: 'Facturación y cobros' },
      { label: 'Dashboard' }
    ]);
  }

  /**
   * Handles filter changes event and loads dashboard data.
   */
  onFiltersChanged(filters: CoverageDateFilters): void {
    this.loadData(filters);
  }

  /**
   * Loads dashboard data including KPIs and charts based on applied filters.
   */
  private loadData(filters: CoverageDateFilters): void {
    const serviceFilters: CoverageFilters = {
      startDate: filters.dateFrom,
      endDate: filters.dateTo,
      insurerId: filters.insurerId ?? undefined,
      branchId: filters.branchId ?? undefined,
      insurerType: filters.insurerType as any
    };

    // Calculate period text based on filters
    const periodText = this.calculatePeriodText(filters.dateFrom, filters.dateTo);

    this.coverageService.getKpis(serviceFilters).subscribe((kpi) => {
      Math.max(0, kpi.totalBilledAmount - kpi.settledAmount);
      this.metrics = [
        {
          label: 'Facturado total',
          value: this.formatCurrency(kpi.totalBilledAmount),
          subtext: periodText,
          icon: 'pi pi-money-bill',
          helpText: 'Suma de todas las prestaciones facturadas en el período seleccionado',
          accent: 'primary'
        },
        {
          label: 'Liquidado',
          value: this.formatCurrency(kpi.settledAmount),
          subtext: periodText,
          icon: 'pi pi-wallet',
          helpText: 'Monto ya liquidado por las coberturas',
          accent: 'success'
        },
        {
          label: 'Pendiente de liquidar',
          value: this.formatCurrency(kpi.unsettledAmount),
          subtext: periodText,
          icon: 'pi pi-clock',
          helpText: 'Diferencia entre facturado y liquidado',
          accent: 'warning'
        },
        {
          label: 'Prestaciones liquidadas',
          value: String(kpi.settledServicesCount),
          subtext: periodText,
          icon: 'pi pi-check-circle',
          helpText: 'Cantidad de prestaciones liquidadas',
          accent: 'success'
        },
        {
          label: 'Prestaciones por liquidar',
          value: String(kpi.unsettledServicesCount),
          subtext: periodText,
          icon: 'pi pi-list',
          helpText: 'Cantidad de prestaciones por liquidar',
          accent: 'success'
        },
        /*{ label: '% Débitos', value: `${kpi.debitPct.toFixed(1)}%`, subtext: periodText, icon: 'pi pi-percentage', helpText: 'Porcentaje de débitos/rechazos', accent: 'danger' },*/
        {
          label: 'Promedio por prestacion',
          value: this.formatCurrency(kpi.averageAmountPerService),
          subtext: periodText,
          icon: 'pi pi-chart-line',
          helpText: 'Importe promedio facturado por cada prestación',
          accent: 'primary' }
      ];
    });


    this.coverageService.getMonthlyRevenueByType({ startDate: new Date(new Date().setDate(new Date().getDate() - 365)), endDate: new Date() }).subscribe((s) => {
      const data: ChartData<'line'> = {
        labels: s.labels,
        datasets: s.datasets.map((d) => ({ ...d, fill: false, tension: 0.25 }))
      };
      this.setCardData(0, data);
    });

    this.coverageService.getStackedRevenueByTypeAndPayer(serviceFilters).subscribe((s) => {
      const data: ChartData<'bar'> = {
        labels: s.labels,
        datasets: s.stacks
      };
      const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true, title: { display: true, text: 'Período' } }, y: { stacked: true, title: { display: true, text: 'Monto Facturado' } } },
        plugins: { datalabels: { display: false } } as any
      };
      this.setCardData(1, data, options);
    });

    this.coverageService.getCompositionByType(serviceFilters).subscribe((s) => {
      const labels = s.labels;
      const values = s.data;
      const total = values.reduce((sum, val) => sum + val, 0);

      // Chart.js default color palette (used when backgroundColor is not specified)
      const chartJsDefaultColors = [
        'rgb(54, 162, 235)',   // Blue
        'rgb(255, 99, 132)',   // Red
        'rgb(255, 205, 86)',   // Yellow
        'rgb(75, 192, 192)',   // Teal
        'rgb(153, 102, 255)',  // Purple
        'rgb(255, 159, 64)',   // Orange
        'rgb(201, 203, 207)',  // Grey
        'rgb(255, 99, 255)'    // Pink
      ];

      const data: ChartData<'pie'> = {
        labels,
        datasets: [{
          data: values
        }]
      };

      // Create values list with the same data shown in tooltip
      // Use Chart.js default colors that will match the chart
      const referenceValues = labels.map((label, index) => {
        const value = values[index];
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return {
          label,
          value: this.formatCurrency(value),  // Format as currency
          percentage: `${percentage}%`,
          color: chartJsDefaultColors[index % chartJsDefaultColors.length]
        };
      });

      this.setCardData(2, data, undefined, referenceValues);
    });

    this.coverageService.getRanking(serviceFilters).subscribe((rows) => {
      const data: ChartData<'bar'> = {
        labels: rows.map(r => r.insurerName),
        datasets: [{ label: 'Facturado', data: rows.map(r => r.totalAmount), backgroundColor: '#6fdfdd', borderRadius: 8 }]
      };
      const options: ChartOptions<'bar'> = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { title: { display: true, text: 'Monto Facturado' } }, y: { title: { display: true, text: 'Cobertura' } } },
        plugins: { datalabels: { anchor: 'end', align: 'end', color: '#555', font: { weight: 'bold' }, formatter: (v: number) => this.formatCurrency(v) } } as any
      };
      this.setCardData(3, data, options);
    });

    this.coverageService.getHeatmap(serviceFilters).subscribe(heatmap => {
      this.setCardData(4, heatmap.data, heatmap.options);
    });

    /*
    this.coverageService.getDebitsByInsurer({}).subscribe(items => {
      const data: ChartData<'bar'> = {
        labels: items.map(i => i.insurer),
        datasets: [{ label: '% Débitos', data: items.map(i => i.debitPct), borderRadius: 8 }]
      };
      const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { title: { display: true, text: 'Aseguradora' } }, y: { beginAtZero: true, title: { display: true, text: '% Débitos' }, ticks: { callback: (v) => `${v}%` } } },
        plugins: { datalabels: { anchor: 'end', align: 'end', color: '#555', font: { weight: 'bold' }, formatter: (v: number) => `${v.toFixed(1)}%` } } as any
      };
      this.setCardData(5, data, options);
    });
    */
  }

  /**
   * Calculates a human-readable period text based on date range.
   */
  private calculatePeriodText(startDate: Date, endDate: Date): string {
    if (!startDate || !endDate) {
      return 'Período seleccionado';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return 'Última semana';
    } else if (diffDays <= 31) {
      return 'Último mes';
    } else if (diffDays <= 93) {
      return 'Últimos 3 meses';
    } else if (diffDays <= 186) {
      return 'Últimos 6 meses';
    } else if (diffDays <= 366) {
      return 'Últimos 12 meses';
    } else {
      return `Período: ${start.toLocaleDateString('es-AR')} - ${end.toLocaleDateString('es-AR')}`;
    }
  }

  /**
   * Infers a human-readable period subtext based on the number of label entries.
   */
  private inferPeriodSubtext(labels: string[] | undefined): string {
    const count = labels?.length ?? 0;
    if (count >= 12) return 'Período: últimos 12 meses';
    if (count >= 6) return 'Período: últimos 6 meses';
    if (count >= 3) return 'Período: últimos 3 meses';
    if (count > 0) return 'Período: últimos meses';
    return 'Período actual';
  }

  /**
   * Updates a specific chart card with new data and options.
   */
  private setCardData(index: number, data: ChartData, options?: ChartOptions<any>, referenceValues?: DashboardChartCard['referenceValues']): void {
    const cards = [...this.chartCards];
    cards[index] = { ...cards[index], data, options, referenceValues };
    this.chartCards = cards;
  }

  /**
   * Formats a number as currency using the current locale.
   */
  formatCurrency(n: number): string {
    try {
      return new Intl.NumberFormat(this.locale || 'es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  }
}
