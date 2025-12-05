import { CommonModule } from '@angular/common';
import { Component, Inject, LOCALE_ID } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { SkeletonModule } from 'primeng/skeleton';
import { forkJoin } from 'rxjs';

import {
  DashboardChartCard,
  DashboardChartCardComponent
} from '../../../shared/components/dashboard-chart-card/dashboard-chart-card.component';
import {
  DashboardMetric,
  DashboardMetricCardComponent
} from '../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import {
  BillingDateFilters,
  BillingDateFiltersComponent
} from '../components/billing-date-filters/billing-date-filters.component';
import { BillingReportService } from '../services/billing-report.service';

/**
 * Billing dashboard component that displays KPIs and charts for billing analysis.
 */
@Component({
  selector: 'app-billing-dashboard',
  templateUrl: './billing-dashboard.component.html',
  imports: [
    CommonModule,
    SkeletonModule,
    DashboardChartCardComponent,
    BillingDateFiltersComponent,
    DashboardMetricCardComponent
  ],
  styleUrl: './billing-dashboard.component.css'
})
export class BillingDashboardComponent {
  metrics: DashboardMetric[] = [];
  private readonly emptyChartData: ChartData = { labels: [], datasets: [] };

  chartCards: DashboardChartCard[] = [
    { title: 'Top 5 Aseguradoras', description: 'Ranking de las 5 aseguradoras que generan mayor facturación. Identifica los principales socios comerciales.', icon: 'pi pi-sort-amount-down', chartType: 'bar', data: this.emptyChartData },
    { title: 'Facturación por tipo de aseguradora', description: 'Distribución de la facturación según tipo de aseguradora (Privada, Pública, etc). Muestra la composición del negocio.', icon: 'pi pi-chart-pie', chartType: 'pie', data: this.emptyChartData },
    { title: 'Facturación por sucursal', description: 'Compara el desempeño de facturación entre las distintas sucursales. Útil para análisis de gestión regional.', icon: 'pi pi-chart-bar', chartType: 'bar', data: this.emptyChartData },
    { title: 'Facturado vs Pendiente', description: 'Contrasta el monto ya facturado con el monto pendiente de facturar. Indicador clave de eficiencia en facturación.', icon: 'pi pi-chart-bar', chartType: 'bar', data: this.emptyChartData },
    { title: 'Facturado vs Costos', description: 'Análisis de rentabilidad: compara ingresos facturados con costos operativos. Fundamental para gestión financiera.', icon: 'pi pi-chart-bar', chartType: 'bar', data: this.emptyChartData },
    { title: 'Comparativa período anterior', description: 'Compara la facturación del período actual con el período anterior (consecutivo). Muestra tendencia de crecimiento.', icon: 'pi pi-chart-line', chartType: 'bar', data: this.emptyChartData }
  ];

  private periodSubtext = 'Período actual';

  /**
   * Constructor
   */
  constructor(
    private readonly billingService: BillingReportService,
    @Inject(LOCALE_ID) private readonly locale: string
  ) {}

  /**
   * Handles filter application event and loads dashboard data.
   */
  onFiltersChanged(filters: BillingDateFilters): void {
    this.loadData(filters);
  }

  /**
   * Loads dashboard data including KPIs and charts based on applied filters.
   */
  private loadData(filters: BillingDateFilters): void {
    const from = filters.dateFrom;
    const to = filters.dateTo;

    // Load all KPIs in parallel
    forkJoin({
      currentMonth: this.billingService.getCurrentMonthTotal(),
      ytd: this.billingService.getYTDTotal(),
      momGrowth: this.billingService.getMonthOverMonthGrowth(),
      pendingRatio: this.billingService.getInvoicedPendingRatio(),
      costsRatio: this.billingService.getInvoicedCostsRatio(),
      invoicedTotal: this.billingService.getInvoicedTotal(from, to)
    }).subscribe({
      next: (kpis) => {
        const sub = `${this.formatDate(from)} - ${this.formatDate(to)}`;
        this.periodSubtext = sub;

        this.metrics = [
          {
            label: 'Facturado (período)',
            value: this.formatCurrency(kpis.invoicedTotal.totalInvoiced),
            subtext: sub,
            icon: 'pi pi-money-bill',
            helpText: 'Total facturado en el período seleccionado',
            accent: 'primary'
          },
          {
            label: 'Facturado (mes actual)',
            value: this.formatCurrency(kpis.currentMonth.totalInvoiced),
            subtext: `${this.getMonthName(kpis.currentMonth.month)} ${kpis.currentMonth.year}`,
            icon: 'pi pi-calendar',
            helpText: 'Total facturado en el mes actual',
            accent: 'success'
          },
          {
            label: 'Facturado (YTD)',
            value: this.formatCurrency(kpis.ytd.totalInvoicedYtd),
            subtext: `Año ${kpis.ytd.year}`,
            icon: 'pi pi-chart-line',
            helpText: 'Total facturado desde inicio del año',
            accent: 'primary'
          },
          {
            label: 'Crecimiento mensual',
            value: `${kpis.momGrowth.percentageChange.toFixed(1)}%`,
            subtext: 'vs. mes anterior',
            icon: kpis.momGrowth.percentageChange >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down',
            helpText: 'Variación respecto al mes anterior',
            accent: kpis.momGrowth.percentageChange >= 0 ? 'success' : 'danger'
          },
          {
            label: 'Ratio Facturado/Costos',
            value: kpis.costsRatio.invoicedOverCostsRatio.toFixed(2),
            subtext: 'Indicador de rentabilidad',
            icon: 'pi pi-percentage',
            helpText: 'Relación entre facturado y costos operativos',
            accent: kpis.costsRatio.invoicedOverCostsRatio > 1 ? 'success' : 'warning'
          },
          {
            label: 'Ratio Pendiente/Facturado',
            value: kpis.pendingRatio.pendingOverInvoicedRatio.toFixed(2),
            subtext: 'Eficiencia de facturación',
            icon: 'pi pi-clock',
            helpText: 'Relación entre pendiente de facturar y facturado',
            accent: kpis.pendingRatio.pendingOverInvoicedRatio < 0.2 ? 'success' : 'warning'
          }
        ];
      }
    });

    // Load charts data
    this.loadTopInsurers(from, to);
    this.loadInsurerTypeDistribution(from, to);
    this.loadBranchDistribution(from, to);
    this.loadInvoicedVsPending(from, to);
    this.loadInvoicedVsCosts(from, to);
    this.loadComparative(from, to);
  }

  /**
   * Load top insurers chart.
   */
  private loadTopInsurers(from: Date, to: Date): void {
    this.billingService.getTopInsurers(from, to, 5).subscribe({
      next: (data) => {
        const chartData: ChartData<'bar'> = {
          labels: data.topInsurers.map(i => i.insurerName),
          datasets: [{
            label: 'Facturado',
            data: data.topInsurers.map(i => i.totalInvoiced),
            borderRadius: 8
          }]
        };
        const options: ChartOptions<'bar'> = {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Monto Facturado' } },
            y: { title: { display: true, text: 'Aseguradora' } }
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'end',
              color: '#555',
              font: { weight: 'bold' },
              formatter: (v: number) => this.formatCurrency(v)
            }
          } as any
        };
        this.setCardData(0, chartData, options);
      }
    });
  }

  /**
   * Load insurer type distribution chart.
   */
  private loadInsurerTypeDistribution(from: Date, to: Date): void {
    this.billingService.getInvoicedByInsurerType(from, to).subscribe({
      next: (data) => {
        const chartData: ChartData<'pie'> = {
          labels: data.byInsurerType.map(t => t.insurerType),
          datasets: [{
            data: data.byInsurerType.map(t => t.totalInvoiced)
          }]
        };
        this.setCardData(1, chartData);
      }
    });
  }

  /**
   * Load branch distribution chart.
   */
  private loadBranchDistribution(from: Date, to: Date): void {
    this.billingService.getTotalByBranch(from, to).subscribe({
      next: (data) => {
        const chartData: ChartData<'bar'> = {
          labels: data.byBranch.map(b => `Sucursal ${b.branchId}`),
          datasets: [{
            label: 'Facturado',
            data: data.byBranch.map(b => b.totalInvoiced),
            borderRadius: 8
          }]
        };
        const options: ChartOptions<'bar'> = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Sucursal' } },
            y: { title: { display: true, text: 'Monto Facturado' } }
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'end',
              color: '#555',
              font: { weight: 'bold' },
              formatter: (v: number) => this.formatCurrency(v)
            }
          } as any
        };
        this.setCardData(2, chartData, options);
      }
    });
  }

  /**
   * Load invoiced vs pending chart.
   */
  private loadInvoicedVsPending(from: Date, to: Date): void {
    this.billingService.getInvoicedVsPending(from, to).subscribe({
      next: (data) => {
        const chartData: ChartData<'bar'> = {
          labels: ['Comparación'],
          datasets: [
            {
              label: 'Facturado',
              data: [data.totalInvoiced],
              borderRadius: 8
            },
            {
              label: 'Pendiente',
              data: [data.totalPending],
              borderRadius: 8
            }
          ]
        };
        this.setCardData(3, chartData);
      }
    });
  }

  /**
   * Load invoiced vs costs chart.
   */
  private loadInvoicedVsCosts(from: Date, to: Date): void {
    this.billingService.getInvoicedMinusCosts(from, to).subscribe({
      next: (data) => {
        const chartData: ChartData<'bar'> = {
          labels: ['Comparación'],
          datasets: [
            {
              label: 'Facturado',
              data: [data.totalInvoiced],
              borderRadius: 8
            },
            {
              label: 'Costos',
              data: [data.totalCosts],
              borderRadius: 8
            },
            {
              label: 'Neto',
              data: [data.netTotal],
              borderRadius: 8
            }
          ]
        };
        this.setCardData(4, chartData);
      }
    });
  }

  /**
   * Load comparative period chart.
   */
  private loadComparative(from: Date, to: Date): void {
    this.billingService.getComparativeReport(from, to, 'CONSECUTIVE').subscribe({
      next: (data) => {
        const chartData: ChartData<'bar'> = {
          labels: ['Período anterior', 'Período actual'],
          datasets: [{
            label: 'Facturado',
            data: [data.comparisonPeriodTotal, data.currentPeriodTotal],
            borderRadius: 8
          }]
        };
        const options: ChartOptions<'bar'> = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Período' } },
            y: { title: { display: true, text: 'Monto Facturado' } }
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'end',
              color: '#555',
              font: { weight: 'bold' },
              formatter: (v: number) => this.formatCurrency(v)
            },
            subtitle: {
              display: true,
              text: `Variación: ${data.percentageChange.toFixed(1)}%`,
              font: { size: 14, weight: 'bold' },
              color: data.percentageChange >= 0 ? '#66bb6a' : '#ef5350'
            }
          } as any
        };
        this.setCardData(5, chartData, options);
      }
    });
  }

  /**
   * Updates a specific chart card with new data and options.
   */
  private setCardData(index: number, data: ChartData, options?: ChartOptions<any>): void {
    const cards = [...this.chartCards];
    cards[index] = { ...cards[index], data, options };
    this.chartCards = cards;
  }

  /**
   * Formats a number as currency using the current locale.
   */
  private formatCurrency(n: number): string {
    try {
      return new Intl.NumberFormat(this.locale || 'es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      }).format(n);
    } catch {
      return String(n);
    }
  }

  /**
   * Formats a date as DD/MM/YYYY.
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Gets month name in Spanish.
   */
  private getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || '';
  }
}
