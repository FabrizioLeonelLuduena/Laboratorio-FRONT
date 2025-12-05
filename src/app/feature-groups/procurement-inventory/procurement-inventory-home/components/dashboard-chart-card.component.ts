import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';

/**
 * Data required to render a chart card in the dashboard.
 */
export interface DashboardChartCard {
  title: string;
  description?: string;
  icon?: string;
  chartType: ChartType;
  data: ChartData;
  options?: ChartOptions<any>;
  footer?: string;
  helpText?: string;
}

/**
 * Card component that encapsulates a chart visualization and its supporting information.
 * Reuses PrimeNG Chart to render different chart types.
 */
@Component({
  selector: 'app-dashboard-chart-card',
  standalone: true,
  imports: [CommonModule, CardModule, UIChart, ButtonModule, DialogModule],
  templateUrl: './dashboard-chart-card.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      :host ::ng-deep .p-card {
        height: 100%;
      }
      :host ::ng-deep .p-card-body {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .p-card-content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep p-chart,
      :host ::ng-deep .p-chart {
        display: block;
        height: 100%;
      }
      /* Consider removing !important. It's likely overriding inline styles from chart.js, but it's a brittle solution. */
      :host ::ng-deep canvas {
        height: 100% !important;
        width: 100% !important;
      }
    `
  ]
})
export class DashboardChartCardComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() icon = 'pi pi-chart-bar';
  @Input() helpText?: string;
  @Input({ required: true }) chartType!: ChartType;
  @Input({ required: true }) data!: ChartData;
  @Input() options?: ChartOptions<any>;
  @Input() footer?: string;

  infoVisible = signal(false);

  /**
   * Toggles the visibility of the information panel.
   */
  toggleInfo(): void {
    this.infoVisible.update(v => !v);
  }

  /**
   * Returns the resolved chart options, using custom options if provided or default options based on chart type.
   */
  protected get resolvedOptions(): ChartOptions<any> {
    if (this.options) {
      return this.options;
    }

    const isPie = this.chartType === 'pie' || this.chartType === 'doughnut';

    return {
      responsive: true,
      maintainAspectRatio: isPie ? true : false,
      layout: isPie ? { padding: 0 } : undefined,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'var(--text-secondary)',
            font: { size: isPie ? 10 : 12 },
            boxWidth: isPie ? 10 : undefined,
            padding: isPie ? 8 : undefined
          }
        },
        tooltip: {
          bodyFont: {
            size: isPie ? 10 : 12
          },
          titleFont: {
            weight: 600
          }
        }
      },
      elements: isPie ? { arc: { borderWidth: 0 } } : undefined,
      scales: isPie
        ? {}
        : {
          x: {
            ticks: {
              color: 'var(--text-secondary)',
              font: { size: 12 }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: 'var(--text-secondary)',
              font: { size: 12 }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
    };
  }
}
