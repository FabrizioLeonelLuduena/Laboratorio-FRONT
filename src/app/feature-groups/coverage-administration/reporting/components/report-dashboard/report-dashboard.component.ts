import { Component, OnInit } from '@angular/core';

import { FilterChangeEvent, Filter } from 'src/app/shared/models/filter.model';

import {
  DashboardMetric,
  DashboardMetricCardComponent
} from '../../../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { CareReportingCardComponent, CareReportingCardData } from '../../../../care-management/reporting/components/care-reporting-card/care-reporting-card.component';
import {
  CoverageDateFilters,
  CoverageDateFiltersComponent
} from '../../../components/coverage-date-filters/coverage-date-filters.component';
import { CoverageRankingDTO } from '../../../models/report.model';
import { CoverageDashboardService, CoverageFilters, CompositionByType, HeatmapData, DebitsByInsurer } from '../../../services/coverage-dashboard.service';
import { InsurerService } from '../../../services/insurer.service';
import {
  ReportService,
  ReportSummary,
  InsuranceReport
} from '../../../services/report.service';

/**
 *
 */
@Component({
  selector: 'app-report-dashboard',
  templateUrl: './report-dashboard.component.html',
  imports: [
    CoverageDateFiltersComponent,
    CareReportingCardComponent,
    DashboardMetricCardComponent
  ],
  styleUrls: ['./report-dashboard.component.css']
})
export class ReportDashboardComponent implements OnInit {

  summary: ReportSummary | null = null;
  insuranceReports: InsuranceReport[] = [];
  kpis: DashboardMetric[] = [];

  timeLabels: string[] = [];
  timeValues: number[] = [];

  private granularity: 'month' | 'week' | 'year' = 'month';

  insurerOptions: { label: string; value: number }[] = [];
  minSettlementDate?: Date;
  maxDate = new Date();

  isLoading = false;
  showLoader = false;
  private pendingRequests = 0;
  private loaderTimeout?: ReturnType<typeof setTimeout>;

  mlLabels: string[] = [];
  mlSeries: { label: string; data: number[] }[] = [];
  stackedLabels: string[] = [];
  stackedSeries: { label: string; data: number[] }[] = [];
  compositionLabels: string[] = [];
  compositionValues: number[] = [];
  rankingRows: CoverageRankingDTO[] = [];
  heatmapData: HeatmapData | null = null;
  debitsItems: DebitsByInsurer[] = [];
  alerts: string[] = [];
  cards: CareReportingCardData[] = [];

  /**
   * Component constructor that injects required services.
   */
  constructor(
    private insurerService: InsurerService,
    private reportService: ReportService,
    private coverageDashboard: CoverageDashboardService
  ) {}

  /**
   * Initializes the component and loads initial data.
   */
  ngOnInit(): void {
    this.loadInsurers();
    this.loadReports();
  }

  /**
   * Loads all report data based on applied filters.
   */
  private loadReports(filters?: CoverageDateFilters): void {
    this.isLoading = true;
    this.showLoader = false;
    this.pendingRequests = 6;

    this.loaderTimeout = setTimeout(() => {
      if (this.isLoading) {
        this.showLoader = true;
      }
    }, 300);

    const reportFilters = filters ? {
      insurerId: filters.insurerId ?? undefined,
      dateStart: filters.dateFrom?.toISOString(),
      dateEnd: filters.dateTo?.toISOString()
    } : undefined;

    this.reportService.getReportSummary(reportFilters).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.kpis = [
          { label: 'Liquidado', value: this.formatCurrency(summary.totalAmount), subtext: 'Período seleccionado', icon: 'pi pi-wallet', helpText: 'Monto liquidado', accent: 'success' },
          { label: 'Última liquidación', value: this.formatDate(summary.lastSettlementDate), subtext: 'Fecha', icon: 'pi pi-calendar', helpText: 'Fecha de última liquidación', accent: 'primary' },
          { label: 'Variación mensual', value: `${summary.variation.toFixed(1)}%`, subtext: 'vs. período previo', icon: 'pi pi-chart-line', helpText: 'Variación respecto al mes anterior', accent: summary.variation >= 0 ? 'success' : 'danger' }
        ];
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });

    this.reportService.getInsuranceReports(reportFilters).subscribe({
      next: (reports) => {
        this.insuranceReports = reports;
        this.insuranceLabels = reports.map(r => r.insurerName);
        this.insuranceValues = reports.map(r => r.totalPlans);
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });

    this.reportService.getTimeDistribution(this.granularity, reportFilters).subscribe({
      next: (resp) => {
        this.timeLabels = resp.labels;
        this.timeValues = resp.totals;
        this.checkLoadingComplete();
      },
      error: () => this.checkLoadingComplete()
    });

    const covFilters: CoverageFilters = {
      startDate: new Date(),
      endDate: new Date()
    };

    this.coverageDashboard.getMonthlyRevenueByType(covFilters).subscribe({
      next: (d) => { this.mlLabels = d.labels; this.mlSeries = d.datasets; this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });
    this.coverageDashboard.getStackedRevenueByTypeAndPayer(covFilters).subscribe({
      next: (d) => { this.stackedLabels = d.labels; this.stackedSeries = d.stacks; this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });
    this.coverageDashboard.getCompositionByType(covFilters).subscribe({
      next: (d: CompositionByType) => { this.compositionLabels = d.labels; this.compositionValues = d.data; this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });
    this.coverageDashboard.getRanking(covFilters).subscribe({
      next: (rows: CoverageRankingDTO[]) => { this.rankingRows = rows; this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });
    this.coverageDashboard.getHeatmap(covFilters).subscribe({
      next: (data: HeatmapData) => { this.heatmapData = data; this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });
    this.coverageDashboard.getDebitsByInsurer().subscribe({
      next: (items: DebitsByInsurer[]) => { this.debitsItems = items; this.computeAlerts(); this.buildCards(); this.checkLoadingComplete(); },
      error: () => this.checkLoadingComplete()
    });

    setTimeout(() => this.buildCards(), 0);
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
   * Loads the list of active insurers for filter dropdown.
   */
  private loadInsurers(): void {
    this.insurerService.getActiveInsurers().subscribe({
      next: (insurers) => {
        this.insurerOptions = insurers.map((i) => ({
          label: i.name,
          value: i.id
        }));
      }
    });
  }

  /**
   * Loads settlement dates for a specific insurer.
   */
  private loadSettlementDates(_insurerId: number): void {
    // TODO
  }

  insuranceLabels: string[] = [];
  insuranceValues: number[] = [];

  pie1Filters: Filter[] = [];
  bar1Filters: Filter[] = [];
  pie2Filters: Filter[] = [];
  bar2Filters: Filter[] = [];

  /**
   * Handles filter changes and reloads report data.
   */
  onFiltersChanged(filters: CoverageDateFilters): void {
    if (filters.insurerId) {
      this.loadSettlementDates(filters.insurerId);
    }
    this.loadReports(filters);
  }

  /**
   * Handles filter changes for pie chart 2.
   */
  onPie2FilterChange(_event: FilterChangeEvent): void {}
  /**
   * Handles filter changes for bar chart 2.
   */
  onBar2FilterChange(_event: FilterChangeEvent): void {}
  /**
   * Handles filter changes for pie chart 1.
   */
  onPie1FilterChange(_event: FilterChangeEvent): void {}
  /**
   * Handles filter changes for bar chart 1.
   */
  onBar1FilterChange(_event: FilterChangeEvent): void {}

  /**
   * Computes alert messages based on debits and time series data.
   */
  private computeAlerts(): void {
    const alerts: string[] = [];
    const high = this.debitsItems.filter(x => x.debitPct > 10).map(x => x.insurer);
    if (high.length) alerts.push(`Alta tasa de débitos (>10%): ${high.join(', ')}`);
    if (this.timeValues.length > 1) {
      for (let i = 1; i < this.timeValues.length; i++) {
        const prev = this.timeValues[i - 1];
        const curr = this.timeValues[i];
        if (prev > 0) {
          const change = ((curr - prev) / prev) * 100;
          if (change <= -15) alerts.push(`Caída intermensual de facturación (${Math.abs(change).toFixed(1)}%)`);
          if (change >= 20) alerts.push(`Crecimiento intermensual significativo (${change.toFixed(1)}%)`);
        }
      }
    }
    this.alerts = Array.from(new Set(alerts));
  }

  /**
   * Formats a number as currency using Argentine locale.
   */
  private formatCurrency(n: number): string {
    try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n); } catch { return String(n); }
  }

  /**
   * Formats an ISO date string to DD/MM/YYYY format.
   */
  private formatDate(d: string): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  }

  /**
   * Builds the card data array for display in the dashboard.
   */
  private buildCards(): void {
    const cards: CareReportingCardData[] = [];

    if (this.compositionLabels.length && this.compositionValues.length) {
      const tableData = this.compositionLabels.map((l, i) => ({ type: l, amount: this.compositionValues[i] }));
      cards.push({
        title: 'Composición por tipo',
        icon: 'pi-chart-pie',
        description: 'Este reporte muestra la distribución de los ingresos según el tipo de cobertura (Obra Social, Prepaga, Particular), permitiendo identificar qué sector genera mayores ingresos.',
        helpText: 'Distribución porcentual/absoluta por tipo',
        chartType: 'pie',
        tableColumns: ['Tipo', 'Monto'],
        tableData,
        chartData: this.compositionLabels.map((l, i) => ({ label: l, value: this.compositionValues[i] })),
        chartLabelKey: 'label',
        chartValueKey: 'value'
      });
    }

    if (this.rankingRows.length) {
      const top = this.rankingRows.slice(0, 8).map(r => ({ label: r.insurerName, value: r.totalAmount }));
      const tableData = this.rankingRows.map(r => ({ cobertura: r.insurerName, facturado: r.totalAmount }));
      cards.push({
        title: 'Top coberturas por facturación',
        icon: 'pi-sort-amount-down',
        description: 'Clasificación de las 8 coberturas más importantes por el monto total facturado. Esencial para entender qué socios de negocio son los más relevantes.',
        helpText: 'Ordenado por facturación',
        chartType: 'bar',
        tableColumns: ['Cobertura', 'Facturado'],
        tableData,
        chartData: top,
        chartLabelKey: 'label',
        chartValueKey: 'value'
      });
    }

    if (this.debitsItems.length) {
      const chartData = this.debitsItems.map(d => ({ label: d.insurer, value: d.debitPct }));
      cards.push({
        title: 'Débitos por obra social',
        icon: 'pi-percentage',
        description: 'Análisis del porcentaje de débitos o rechazos por cada obra social. Un indicador clave para la gestión de la calidad de la facturación y la relación con las aseguradoras.',
        helpText: 'Porcentaje sobre presentado',
        chartType: 'bar',
        tableColumns: ['Obra', '% Débitos'],
        tableData: this.debitsItems.map(d => ({ obra: d.insurer, porcentaje: `${d.debitPct.toFixed(1)}%` })),
        chartData,
        chartLabelKey: 'label',
        chartValueKey: 'value'
      });
    }

    if (this.mlLabels.length && this.mlSeries.length) {
      const totals = this.mlLabels.map((_, i) => this.mlSeries.reduce((s, ds) => s + (ds.data[i] ?? 0), 0));
      const chartData = this.mlLabels.map((l, i) => ({ label: l, value: totals[i] }));
      const tableData = this.mlLabels.map((l, i) => ({ mes: l, monto: totals[i] }));
      cards.push({
        title: 'Evolución mensual total',
        icon: 'pi-chart-line',
        description: 'Visualiza la tendencia de la facturación total a lo largo de los meses, sumando todos los tipos de cobertura. Ideal para análisis de estacionalidad y crecimiento.',
        helpText: 'Serie temporal agregada',
        chartType: 'line',
        tableColumns: ['Mes', 'Monto'],
        tableData,
        chartData,
        chartLabelKey: 'label',
        chartValueKey: 'value'
      });
    }

    this.cards = cards;
  }
}
