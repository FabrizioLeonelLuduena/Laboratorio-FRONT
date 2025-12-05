import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  signal
} from '@angular/core';

import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';

/** Typed data record for table/chart entries (string or number). */
export type DataRecord = Record<string, string | number>;

/** Reporting card input data shape (table + optional chart). */
export interface CareReportingCardData {
  title: string;
  icon: string;
  description: string;
  helpText?: string;
  chartType?: 'bar' | 'pie' | 'line';
  tableColumns: string[];
  tableData: DataRecord[];
  chartData?: DataRecord[];
  chartColors?: string[];
  chartLabelKey?: string;
  chartValueKey?: string;
}

/** Standalone reporting card with table and modal chart. */
@Component({
  selector: 'app-care-reporting-card',
  imports: [ButtonModule, CardModule, CommonModule, UIChart, DialogModule],
  templateUrl: './care-reporting-card.component.html'
})
export class CareReportingCardComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() reportingData!: CareReportingCardData;

  chartData!: ChartData<'bar' | 'pie' | 'line'>;
  chartOptions!: ChartOptions<'bar' | 'pie' | 'line'>;

  chartVisible = signal(false);
  descriptionVisible = signal(false);

  @ViewChild(UIChart) chartComponent?: UIChart;

  private readonly cd = inject(ChangeDetectorRef);
  private static chartJsRegistered = false;

  /** Ensures Chart.js registration at construction time. */
  constructor() {
    this.ensureChartJsRegistered();
  }

  /** Initializes chart when component is created. */
  ngOnInit(): void {
    const hasData = Array.isArray(this.reportingData?.chartData) && this.reportingData.chartData.length > 0;
    if (hasData && this.reportingData.chartType) this.initChart();
  }

  /** Rebuilds the chart when input data changes (no artificial delays). */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['reportingData'] || !this.reportingData) return;
    const hasData = Array.isArray(this.reportingData.chartData) && this.reportingData.chartData.length > 0;
    if (hasData && this.reportingData.chartType) {
      this.initChart();
    } else {
      this.chartData = { labels: [], datasets: [] } as ChartData<'bar' | 'pie' | 'line'>;
    }
    // If the chart is already created, refresh without timeouts
    this.chartComponent?.refresh();
  }

  /** Finalizes initialization once view is ready (no artificial delays). */
  ngAfterViewInit(): void {
    const hasData = Array.isArray(this.reportingData?.chartData) && this.reportingData.chartData.length > 0;
    if (hasData && this.reportingData.chartType) {
      this.initChart();
      this.chartComponent?.refresh();
      this.cd.detectChanges();
    }
  }

  /** Opens chart modal. */
  openChart(): void { this.chartVisible.set(true); }
  /** Closes chart modal. */
  closeChart(): void { this.chartVisible.set(false); }

  /** Toggles description modal. */
  toggleDescription(): void { this.descriptionVisible.update(v => !v); }

  /** Indicates whether there is chart data to render. */
  hasChartData(): boolean {
    return Array.isArray(this.reportingData?.chartData) && this.reportingData.chartData.length > 0;
  }

  /** Retrieves a normalized table cell value for a given column using an optional key map. */
  getTableValue(row: DataRecord, column: string): string | number {
    const key = this.normalizeKey(column);
    const map = (this.reportingData as any).tableKeyMap as Record<string, string> | undefined;
    const dataKey = map?.[key] ?? key;
    const value = row[dataKey];
    return (value as string | number) ?? '-';
  }

  /** Normalizes a human label to a key (lowercase, without accents/spaces). */
  private normalizeKey(column: string): string {
    return column
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  /** Registers required Chart.js elements once (idempotent). */
  private ensureChartJsRegistered(): void {
    if (!CareReportingCardComponent.chartJsRegistered) {
      Chart.register(...registerables);
      CareReportingCardComponent.chartJsRegistered = true;
    }
  }

  /** Dispatches initialization for the selected chart type. */
  private initChart(): void {
    if (!this.reportingData.chartData || !this.reportingData.chartType) return;
    const colors = this.reportingData.chartColors || ['#008c8a', '#00a3a1', '#00bab8', '#35cdcb', '#6fdfdd'];

    switch (this.reportingData.chartType) {
    case 'bar':
      this.initBarChart(colors);
      break;
    case 'pie':
      this.initPieChart(colors);
      break;
    case 'line':
      this.initLineChart(colors);
      break;
    }
  }

  /** Chooses a preferred key or the first numeric property in an item. */
  private resolveDataKey(item: DataRecord, preferred: string[], fallback?: string): string {
    for (const key of preferred) {
      if (item[key] !== undefined) return key;
    }
    if (fallback && item[fallback] !== undefined) return fallback;
    // first numeric key
    const numericKey = Object.keys(item).find(k => typeof item[k] === 'number');
    return numericKey || Object.keys(item)[0];
  }

  /** Configures bar chart data and default options. */
  private initBarChart(colors: string[]): void {
    const data = this.reportingData.chartData! as DataRecord[];
    const valueKey = this.reportingData.chartValueKey || this.resolveDataKey(data[0], ['value', 'count', 'avg', 'max']);
    const labelKey = this.reportingData.chartLabelKey || this.resolveDataKey(data[0], ['label', 'state', 'reason', 'stage', 'date', 'day', 'name']);

    this.chartData = {
      labels: data.map((d) => d[labelKey] as string),
      datasets: [
        { label: this.reportingData.title, data: data.map((d) => d[valueKey] as number), backgroundColor: colors[0], borderRadius: 8 }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#333', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { beginAtZero: true, ticks: { color: '#333', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      },
      plugins: { legend: { display: false } }
    };
  }

  /** Configures pie chart data and compact visual options. */
  private initPieChart(colors: string[]): void {
    const data = this.reportingData.chartData! as DataRecord[];
    const valueKey = this.reportingData.chartValueKey || this.resolveDataKey(data[0], ['value', 'count']);
    const labelKey = this.reportingData.chartLabelKey || this.resolveDataKey(data[0], ['label', 'state', 'reason', 'stage']);

    this.chartData = {
      labels: data.map((d) => d[labelKey] as string),
      datasets: [
        { data: data.map((d) => d[valueKey] as number), backgroundColor: colors }
      ]
    } as ChartData<'pie'>;

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: 0 },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 10 }, boxWidth: 10, padding: 8 }
        },
        tooltip: { bodyFont: { size: 10 }, titleFont: { weight: 600 } }
      },
      elements: { arc: { borderWidth: 0 } }
    };
  }

  /** Configures line chart data and default options. */
  private initLineChart(colors: string[]): void {
    const data = this.reportingData.chartData! as DataRecord[];
    const valueKey = this.reportingData.chartValueKey || this.resolveDataKey(data[0], ['value', 'count']);
    const labelKey = this.reportingData.chartLabelKey || this.resolveDataKey(data[0], ['date', 'day', 'label']);

    this.chartData = {
      labels: data.map((d) => d[labelKey] as string),
      datasets: [
        { label: this.reportingData.title, data: data.map((d) => d[valueKey] as number), borderColor: colors[0], backgroundColor: colors[0], fill: false, tension: 0.2 }
      ]
    } as ChartData<'line'>;

    this.chartOptions = { responsive: true, maintainAspectRatio: false };
  }
}
