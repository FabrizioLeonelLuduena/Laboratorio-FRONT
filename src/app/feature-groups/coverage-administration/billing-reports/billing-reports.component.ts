import { Component } from '@angular/core';

import { forkJoin } from 'rxjs';

import {
  DashboardMetric,
  DashboardMetricCardComponent
} from '../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import {
  CareReportingCardComponent,
  CareReportingCardData
} from '../../care-management/reporting/components/care-reporting-card/care-reporting-card.component';
import {
  BillingDateFilters,
  BillingDateFiltersComponent
} from '../components/billing-date-filters/billing-date-filters.component';
import { BillingReportService } from '../services/billing-report.service';

/**
 * Billing reports component that displays detailed reports and tables for billing analysis.
 */
@Component({
  selector: 'app-billing-reports',
  templateUrl: './billing-reports.component.html',
  imports: [
    BillingDateFiltersComponent,
    CareReportingCardComponent,
    DashboardMetricCardComponent
  ],
  styleUrls: ['./billing-reports.component.css']
})
export class BillingReportsComponent {
  kpis: DashboardMetric[] = [];
  cards: CareReportingCardData[] = [];

  isLoading = false;
  showLoader = false;
  private pendingRequests = 0;
  private loaderTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Constructor
   */
  constructor(private billingService: BillingReportService) {}

  /**
   * Handles filter changes and reloads report data.
   */
  onFiltersChanged(filters: BillingDateFilters): void {
    this.loadReports(filters);
  }

  /**
   * Loads all report data based on applied filters.
   */
  private loadReports(filters: BillingDateFilters): void {
    this.isLoading = true;
    this.showLoader = false;
    this.pendingRequests = 7;

    // Clear previous cards
    this.cards = [];

    this.loaderTimeout = setTimeout(() => {
      if (this.isLoading) {
        this.showLoader = true;
      }
    }, 300);

    const from = filters.dateFrom;
    const to = filters.dateTo;

    // Load summary KPIs
    forkJoin({
      currentMonth: this.billingService.getCurrentMonthTotal(),
      ytd: this.billingService.getYTDTotal(),
      momGrowth: this.billingService.getMonthOverMonthGrowth()
    }).subscribe({
      next: (kpis) => {
        this.kpis = [
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
          }
        ];
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });

    // Load detailed reports
    this.loadInvoicedByInsurer(from, to);
    this.loadInvoicedByBranch(from, to);
    this.loadInvoicedVsPending(from, to);
    this.loadInvoicedMinusCosts(from, to);
    this.loadComparativeConsecutive(from, to);
    this.loadComparativeSamePeriodLastYear(from, to);
    this.loadTopInsurers(from, to);
  }

  /**
   * Load invoiced by insurer report.
   */
  private loadInvoicedByInsurer(from: Date, to: Date): void {
    this.billingService.getInvoicedByInsurer(from, to).subscribe({
      next: (data) => {
        const tableData = data.insurerTotals.map(i => ({
          aseguradora: i.insurerName,
          facturado: this.formatCurrency(i.totalInvoiced)
        }));

        const chartData = data.insurerTotals.slice(0, 10).map(i => ({
          label: i.insurerName,
          value: i.totalInvoiced
        }));

        this.cards.push({
          title: 'Facturación por aseguradora',
          icon: 'pi-building',
          description: 'Detalle del monto facturado a cada aseguradora. Permite identificar los principales clientes y su contribución al ingreso total.',
          helpText: 'Ordenado por aseguradora',
          chartType: 'bar',
          tableColumns: ['Aseguradora', 'Facturado'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load invoiced by branch report.
   */
  private loadInvoicedByBranch(from: Date, to: Date): void {
    this.billingService.getInvoicedByBranch(from, to).subscribe({
      next: (data) => {
        const tableData = data.branchTotals.flatMap(b =>
          b.insurerTypeBreakdown.map(t => ({
            sucursal: `Sucursal ${b.branchId}`,
            tipo: t.insurerType,
            facturado: this.formatCurrency(t.totalInvoiced)
          }))
        );

        const chartData = data.branchTotals.map(b => ({
          label: `Sucursal ${b.branchId}`,
          value: b.totalInvoiced
        }));

        this.cards.push({
          title: 'Facturación por sucursal y tipo',
          icon: 'pi-map-marker',
          description: 'Análisis de facturación por sucursal con desglose por tipo de aseguradora. Útil para evaluar el desempeño de cada ubicación.',
          helpText: 'Desglosado por sucursal y tipo',
          chartType: 'bar',
          tableColumns: ['Sucursal', 'Tipo', 'Facturado'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load invoiced vs pending report.
   */
  private loadInvoicedVsPending(from: Date, to: Date): void {
    this.billingService.getInvoicedVsPending(from, to).subscribe({
      next: (data) => {
        const tableData = [
          { concepto: 'Facturado', monto: this.formatCurrency(data.totalInvoiced) },
          { concepto: 'Pendiente', monto: this.formatCurrency(data.totalPending) },
          { concepto: 'Ratio (Pendiente/Facturado)', monto: data.pendingOverInvoicedRatio.toFixed(2) }
        ];

        const chartData = [
          { label: 'Facturado', value: data.totalInvoiced },
          { label: 'Pendiente', value: data.totalPending }
        ];

        this.cards.push({
          title: 'Facturado vs Pendiente',
          icon: 'pi-clock',
          description: 'Comparación entre montos facturados y pendientes de facturar. Indicador clave de eficiencia del proceso de facturación.',
          helpText: 'Análisis de eficiencia',
          chartType: 'bar',
          tableColumns: ['Concepto', 'Monto'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load invoiced minus costs report.
   */
  private loadInvoicedMinusCosts(from: Date, to: Date): void {
    this.billingService.getInvoicedMinusCosts(from, to).subscribe({
      next: (data) => {
        const tableData = [
          { concepto: 'Facturado', monto: this.formatCurrency(data.totalInvoiced) },
          { concepto: 'Costos', monto: this.formatCurrency(data.totalCosts) },
          { concepto: 'Neto (Facturado - Costos)', monto: this.formatCurrency(data.netTotal) }
        ];

        const chartData = [
          { label: 'Facturado', value: data.totalInvoiced },
          { label: 'Costos', value: data.totalCosts },
          { label: 'Neto', value: data.netTotal }
        ];

        this.cards.push({
          title: 'Análisis de rentabilidad',
          icon: 'pi-dollar',
          description: 'Análisis de rentabilidad que muestra facturado, costos operativos y el margen neto. Fundamental para evaluación financiera.',
          helpText: 'Facturado - Costos',
          chartType: 'bar',
          tableColumns: ['Concepto', 'Monto'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load comparative consecutive periods report.
   */
  private loadComparativeConsecutive(from: Date, to: Date): void {
    this.billingService.getComparativeReport(from, to, 'CONSECUTIVE').subscribe({
      next: (data) => {
        const tableData = [
          { período: 'Anterior', facturado: this.formatCurrency(data.comparisonPeriodTotal) },
          { período: 'Actual', facturado: this.formatCurrency(data.currentPeriodTotal) },
          { período: 'Diferencia', facturado: this.formatCurrency(data.absoluteDifference) },
          { período: 'Variación (%)', facturado: `${data.percentageChange.toFixed(1)}%` }
        ];

        const chartData = [
          { label: 'Período anterior', value: data.comparisonPeriodTotal },
          { label: 'Período actual', value: data.currentPeriodTotal }
        ];

        this.cards.push({
          title: 'Comparativa período consecutivo',
          icon: 'pi-chart-line',
          description: 'Comparación con el período inmediatamente anterior de igual duración. Muestra la evolución secuencial del negocio.',
          helpText: 'vs. período anterior',
          chartType: 'bar',
          tableColumns: ['Período', 'Facturado'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load comparative same period last year report.
   */
  private loadComparativeSamePeriodLastYear(from: Date, to: Date): void {
    this.billingService.getComparativeReport(from, to, 'SAME_PERIOD_LAST_YEAR').subscribe({
      next: (data) => {
        const tableData = [
          { período: 'Mismo período año anterior', facturado: this.formatCurrency(data.comparisonPeriodTotal) },
          { período: 'Período actual', facturado: this.formatCurrency(data.currentPeriodTotal) },
          { período: 'Diferencia', facturado: this.formatCurrency(data.absoluteDifference) },
          { período: 'Variación (%)', facturado: `${data.percentageChange.toFixed(1)}%` }
        ];

        const chartData = [
          { label: 'Año anterior', value: data.comparisonPeriodTotal },
          { label: 'Año actual', value: data.currentPeriodTotal }
        ];

        this.cards.push({
          title: 'Comparativa interanual',
          icon: 'pi-calendar',
          description: 'Comparación con el mismo período del año anterior. Ideal para identificar crecimiento real eliminando efectos estacionales.',
          helpText: 'vs. mismo período año anterior',
          chartType: 'bar',
          tableColumns: ['Período', 'Facturado'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Load top insurers report.
   */
  private loadTopInsurers(from: Date, to: Date): void {
    this.billingService.getTopInsurers(from, to, 10).subscribe({
      next: (data) => {
        const tableData = data.topInsurers.map(i => ({
          ranking: i.rank,
          aseguradora: i.insurerName,
          facturado: this.formatCurrency(i.totalInvoiced),
          porcentaje: `${i.percentage.toFixed(1)}%`
        }));

        const chartData = data.topInsurers.map(i => ({
          label: i.insurerName,
          value: i.totalInvoiced
        }));

        this.cards.push({
          title: 'Top 10 aseguradoras',
          icon: 'pi-sort-amount-down',
          description: 'Ranking de las 10 aseguradoras principales por monto facturado, con su participación porcentual sobre el total.',
          helpText: 'Ordenado por facturación',
          chartType: 'bar',
          tableColumns: ['Ranking', 'Aseguradora', 'Facturado', 'Porcentaje'],
          tableData,
          chartData,
          chartLabelKey: 'label',
          chartValueKey: 'value'
        });
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });
  }

  /**
   * Checks if all async requests are complete and hides the loader.
   */
  private checkLoadingComplete(): void {
    this.pendingRequests--;
    if (this.pendingRequests === 0) {
      this.isLoading = false;
      this.showLoader = false;

      if (this.loaderTimeout) {
        clearTimeout(this.loaderTimeout);
        this.loaderTimeout = undefined;
      }
    }
  }

  /**
   * Formats a number as currency using Argentine locale.
   */
  private formatCurrency(n: number): string {
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      }).format(n);
    } catch {
      return String(n);
    }
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
