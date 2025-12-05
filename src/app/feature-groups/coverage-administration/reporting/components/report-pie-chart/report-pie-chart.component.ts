import { Component, Input, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

/**
 * Component for rendering pie charts.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-report-pie-chart',
  templateUrl: './report-pie-chart.component.html',
  imports: [UIChart],
  styleUrls: ['./report-pie-chart.component.css']
})
export class ReportPieChartComponent implements OnInit, AfterViewInit {
  /** Chart labels */
  @Input() labels: string[] = [];

  /** Chart data */
  @Input() data: number[] = [];

  pieData!: ChartData<'pie'>;
  chartOptions!: ChartOptions<'pie'>;

  /**
   *  constructor.
   */
  constructor(private cd: ChangeDetectorRef) {}

  /**
   *  ngOnInit.
   */
  ngOnInit() {
    this.initChart();
  }

  /**
   *  ngAfterViewInit.
   */
  ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
      this.cd.detectChanges();
    }, 100);
  }

  /**
   * Initializes the pie chart configuration (includes % in tooltip)
   */
  private initChart() {
    if (!this.data || this.data.length === 0) return;

    this.pieData = {
      labels: this.labels,
      datasets: [
        {
          data: this.data,
          backgroundColor: ['#6a5acd', '#2196f3', '#26a69a', '#ab47bc', '#ffa726', '#42a5f5'],
          hoverOffset: 2
        }
      ]
    };

    this.chartOptions = {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            color: '#333',
            font: { size: 11, weight: 'normal' },
            padding: 5,
            boxWidth: 12,
            boxHeight: 12,
            textAlign: 'left'
          }
        },
        tooltip: {
          bodyFont: { size: 11 },
          titleFont: { size: 11, weight: 'bold' },
          callbacks: {
            label: (ctx) => {
              const values = ctx.dataset.data as number[];
              const total = values.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
              const val = ctx.parsed as number;
              const pct = total ? (val * 100) / total : 0;
              // "Label: value (xx.x%)"
              return `${ctx.label}: ${val} (${pct.toFixed(1)}%)`;
            }
          }
        }
      },
      layout: { padding: 0 }
    };
  }
}
