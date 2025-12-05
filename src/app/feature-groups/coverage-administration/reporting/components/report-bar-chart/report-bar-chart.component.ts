import { Component, Input, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

/**
 * Component for rendering bar charts.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-report-bar-chart',
  templateUrl: './report-bar-chart.component.html',
  imports: [UIChart],
  styleUrls: ['./report-bar-chart.component.css']
})
export class ReportBarChartComponent implements OnInit, AfterViewInit {
  /** Chart title */
  @Input() title: string = '';

  /** Chart labels */
  @Input() labels: string[] = [];

  /** Chart data */
  @Input() data: number[] = [];

  barData!: ChartData<'bar'>;
  chartOptions!: ChartOptions<'bar'>;

  /**
   *  constructor.
   */
  constructor(private cd: ChangeDetectorRef) {}

  /**
   * Initializes the component and configures the chart.
   */
  ngOnInit() {
    this.initChart();
  }

  /**
   * Runs after view initialization to force rendering.
   */
  ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
      this.cd.detectChanges();
    }, 100);
  }

  /**
   * Initializes the configuration of the bar chart.
   */
  private initChart() {
    if (!this.data || this.data.length === 0) return;

    this.barData = {
      labels: this.labels,
      datasets: [
        {
          label: this.title,
          data: this.data,
          backgroundColor: '#2196f3'
        }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: '#333',
            font: { size: 14, weight: 'normal' }
          }
        },
        y: {
          ticks: {
            color: '#333',
            font: { size: 14, weight: 'normal' }
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#333',
            font: { size: 14, weight: 'normal' },
            padding: 6,
            boxWidth: 14
          }
        },
        tooltip: {
          bodyFont: { size: 12 },
          titleFont: { size: 12, weight: 'bold' }
        }
      }
    };
  }
}
