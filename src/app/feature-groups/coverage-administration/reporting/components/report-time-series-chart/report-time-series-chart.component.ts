import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { UIChart } from 'primeng/chart';
import { Ripple } from 'primeng/ripple';

/**
 * Dictionary for time series breakdown by insurer.
 * Key: insurer name, Value: array of numbers for each label.
 */
type SerieDict = Record<string, number[]>;

/**
 * Granularity type for time series chart.
 * Can be 'month', 'week', or 'year'.
 */
export type Granularity = 'month' | 'week' | 'year';

/**
 * Component for rendering time series charts for reporting.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-report-time-series-chart',
  standalone: true,
  imports: [UIChart, Ripple],
  template: `
  <div class="flex items-center gap-3 mb-2">
    <div class="text-sm opacity-70">{{ title }}</div>
    <div class="ml-auto flex gap-2">
      <button pRipple class="px-2 py-1 rounded border" [class.bg-gray-200]="granularity==='month'" (click)="setGranularity('month')">Mensual</button>
      <button pRipple class="px-2 py-1 rounded border" [class.bg-gray-200]="granularity==='week'"  (click)="setGranularity('week')">Semanal</button>
      <button pRipple class="px-2 py-1 rounded border" [class.bg-gray-200]="granularity==='year'"  (click)="setGranularity('year')">Anual</button>
    </div>
  </div>

  <p-chart
    [type]="chartType"
    [data]="chartData"
    [options]="chartOptions"
    (onDataSelect)="handleBarClick($event)">
  </p-chart>

  <div class="text-xs mt-2 opacity-70" *ngIf="hint">
    {{ hint }}
  </div>
  `,
  styles: [':host ::ng-deep canvas{min-height:280px;}'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportTimeSeriesChartComponent implements OnInit {
  /** Title displayed at the top left */
  @Input() title = 'Benefits over time';
  /** Labels (X axis) of the aggregated series (e.g. Months/Weeks/Years) */
  @Input() labels: string[] = [];
  /** Aggregated series (totals) */
  @Input() totals: number[] = [];
  /**
   * Breakdown by insurer (same labels) for drill-down.
   * E.g.: { "OSDE":[10,20,30], "Swiss Medical":[5,7,9], ... }
   */
  @Input() byInsurer: SerieDict = {};
  /** Base chart type */
  @Input() chartType: ChartType = 'bar';
  /** Initial granularity */
  @Input() granularity: Granularity = 'month';

  /** When the user changes granularity */
  @Output() granularityChange = new EventEmitter<Granularity>();
  /** When a bar is clicked */
  @Output() barClick = new EventEmitter<{ index: number; label: string }>();

  chartData!: ChartData;
  chartOptions!: ChartOptions;
  stacked = false;
  hint = 'Sugerencia: hacé clic en una barra para ver el desglose por aseguradora (apilado). Clic afuera para volver.';

  /**
   * ngOnInit
   */
  ngOnInit(): void {
    this.buildAggregate();
  }

  private palette = ['#42A5F5','#66BB6A','#FFA726','#AB47BC','#26A69A','#EF5350','#5C6BC0','#BDBDBD'];

  /** Aggregated mode (1 dataset) */
  private buildAggregate() {
    this.stacked = false;
    this.chartData = {
      labels: this.labels,
      datasets: [{
        type: this.chartType,
        label: 'Prestaciones',
        data: this.totals,
        backgroundColor: '#42A5F5',
        borderColor: '#42A5F5',
        fill: this.chartType !== 'line',
        tension: 0.3
      }]
    };
    this.chartOptions = this.baseOptions(false);
  }

  /** Stacked by insurer mode (all datasets) */
  private buildStacked() {
    this.stacked = true;
    const names = Object.keys(this.byInsurer);
    this.chartData = {
      labels: this.labels,
      datasets: names.map((name, i) => ({
        type: 'bar' as const,
        label: name,
        data: this.byInsurer[name] ?? [],
        backgroundColor: this.palette[i % this.palette.length],
        borderWidth: 0
      }))
    };
    this.chartOptions = this.baseOptions(true);
  }

  /**
   * baseOptions
   */
  private baseOptions(stacked: boolean): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked, ticks: { color: '#333' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { stacked, ticks: { color: '#333', precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } }
      },
      plugins: {
        legend: { labels: { color: '#333' } },
        tooltip: {
          callbacks: stacked ? {
            footer: (items) => {
              // percentage within the bar
              const i = items[0].dataIndex;
              const total = (this.totals[i] ?? 0) || items.reduce((s, it) => s + Number(it.parsed.y), 0);
              const val = Number(items[0].parsed.y);
              const pct = total ? ((val / total) * 100).toFixed(1) : '0';
              return `Participación: ${pct}%`;
            }
          } : undefined
        }
      },
      onClick: (evt, elements, _chart) => {
        // empty click => return to aggregate
        if (!elements?.length) {
          this.buildAggregate();
          return;
        }
      }
    };
  }

  /** Click on the bar => stacked mode */
  handleBarClick(ev: { element: any; dataset: any; originalEvent: MouseEvent }) {
    if (!this.stacked) {
      this.buildStacked();
    }
    const idx = ev.element?.index ?? 0;
    const lbl = this.labels[idx];
    this.barClick.emit({ index: idx, label: lbl });
  }

  /**
   * setGranularity
   */
  setGranularity(g: Granularity) {
    if (g !== this.granularity) {
      this.granularity = g;
      this.granularityChange.emit(g);
    }
  }
}
