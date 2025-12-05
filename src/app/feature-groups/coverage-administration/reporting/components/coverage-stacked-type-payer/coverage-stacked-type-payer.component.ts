import { Component, Input, OnChanges } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

/**
 *
 */
/** Stacked bar chart to compare amounts by type and payer. */
@Component({
  selector: 'app-coverage-stacked-type-payer',
  standalone: true,
  imports: [UIChart],
  template: '<p-chart type="bar" [data]="data" [options]="options"></p-chart>',
  styles: [':host ::ng-deep canvas{min-height:300px;}']
})
export class CoverageStackedTypePayerComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() stacks: { label: string; data: number[] }[] = [];

  data: ChartData<'bar'> = { labels: [], datasets: [] };
  options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { stacked: true }, y: { stacked: true } }
  };

  /**
   *
   */
  /** Builds stacked datasets on input change. */
  ngOnChanges(): void {
    const palette = ['#42A5F5','#66BB6A','#FFA726','#AB47BC','#26A69A','#EF5350'];
    this.data = {
      labels: this.labels,
      datasets: this.stacks.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: palette[i % palette.length] }))
    } as ChartData<'bar'>;
  }
}
