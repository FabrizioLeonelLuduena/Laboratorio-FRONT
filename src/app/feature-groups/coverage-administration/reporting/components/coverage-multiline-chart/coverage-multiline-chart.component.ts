import { Component, Input, OnChanges } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

/**
 *
 */
/** Multi-line chart (labels + multiple datasets) for coverage trends. */
@Component({
  selector: 'app-coverage-multiline-chart',
  standalone: true,
  imports: [UIChart],
  template: '<p-chart type="line" [data]="data" [options]="options"></p-chart>',
  styles: [':host ::ng-deep canvas{min-height:300px;}']
})
export class CoverageMultilineChartComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: { label: string; data: number[] }[] = [];

  data: ChartData<'line'> = { labels: [], datasets: [] };
  options: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false };

  /**
   *
   */
  /** Rebuilds Chart.js data structure with input labels/series. */
  ngOnChanges(): void {
    const palette = ['#008c8a','#00a3a1','#35cdcb','#6fdfdd'];
    this.data = {
      labels: this.labels,
      datasets: this.series.map((s, i) => ({
        label: s.label,
        data: s.data,
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length],
        fill: false,
        tension: 0.25
      }))
    } as ChartData<'line'>;
  }
}
