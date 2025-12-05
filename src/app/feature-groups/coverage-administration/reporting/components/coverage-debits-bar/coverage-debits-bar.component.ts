import { Component, Input, OnChanges } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

/** Small bar chart component to display debit percentages per insurer. */
@Component({
  selector: 'app-coverage-debits-bar',
  imports: [UIChart],
  template: '<p-chart type="bar" [data]="data" [options]="options"></p-chart>',
  styles: [':host ::ng-deep canvas{min-height:260px;}']
})
export class CoverageDebitsBarComponent implements OnChanges {
  @Input() items: { insurer: string; debitPct: number }[] = [];

  data: ChartData<'bar'> = { labels: [], datasets: [] };
  options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v}%` } } },
    plugins: { tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}%` } } }
  };

  /** Rebuilds Chart.js dataset when @Input items change. */
  ngOnChanges(): void {
    this.data = {
      labels: this.items.map(i => i.insurer),
      datasets: [{ label: '% Débitos', data: this.items.map(i => i.debitPct), backgroundColor: '#EF5350', borderRadius: 8 }]
    } as ChartData<'bar'>;
  }
}
