import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';

/**
 * Data required to render a chart card in the dashboard
 */
export interface ReferenceValue {
  label: string;
  value: number | string;
  percentage: string;
  color?: string;
}

/**
 * Data required to render a chart card in the dashboard
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
  referenceValues?: ReferenceValue[];
}

/**
 * Card component that encapsulates a chart visualization and its supporting information.
 * Generic component shared across multiple dashboard implementations.
 * Reuses PrimeNG Chart to render different chart types.
 */
@Component({
  selector: 'app-dashboard-chart-card',
  standalone: true,
  imports: [CommonModule, CardModule, UIChart, ButtonModule, GenericModalComponent],
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
      :host ::ng-deep canvas {
        height: 100% !important;
        width: 100% !important;
      }
    `
  ]
})
export class DashboardChartCardComponent {
  /**
   * Title to display in the card header
   */
  @Input({ required: true }) title!: string;
  
  /**
   * Optional descriptive text below the title
   */
  @Input() description?: string;
  
  /**
   * Icon to display in the card header
   */
  @Input() icon = 'pi pi-chart-bar';
  
  /**
   * Optional help text to display in modal
   */
  @Input() helpText?: string;
  
  /**
   * Type of chart to render (bar, line, pie, etc.)
   */
  @Input({ required: true }) chartType!: ChartType;
  
  /**
   * Chart data to display
   */
  @Input({ required: true }) data!: ChartData;
  
  /**
   * Optional custom chart options
   */
  @Input() options?: ChartOptions<any>;
  
  /**
   * Optional footer text
   */
  @Input() footer?: string;

  /**
   * Optional reference values to display next to pie/doughnut charts
   */
  @Input() referenceValues?: ReferenceValue[];

  /**
   * Returns Chart.js options with sensible defaults per chart type
   * @returns Resolved chart options
   */
  protected get resolvedOptions(): ChartOptions<any> {
    const isPie = this.chartType === 'pie' || this.chartType === 'doughnut';
    const hasReferenceValues = this.referenceValues && this.referenceValues.length > 0;

    // If user provided custom options, merge with our defaults
    if (this.options) {
      const mergedOptions = { ...this.options };
      
      // When referenceValues are provided for pie/doughnut charts, override to hide legend and tooltip
      if (hasReferenceValues && isPie) {
        mergedOptions.plugins = {
          ...mergedOptions.plugins,
          legend: { display: false },
          tooltip: { enabled: false }
        };
      }
      
      return mergedOptions;
    }

    // Default options when user doesn't provide custom options
    return {
      responsive: true,
      maintainAspectRatio: isPie ? true : false,
      layout: isPie ? { padding: 0 } : undefined,
      plugins: {
        legend: hasReferenceValues && isPie
          ? { display: false }
          : {
            position: 'top',
            labels: {
              color: 'var(--text-secondary)',
              font: { size: isPie ? 10 : 12 },
              boxWidth: isPie ? 10 : undefined,
              padding: isPie ? 8 : undefined
            }
          },
        tooltip: hasReferenceValues && isPie
          ? { enabled: false }
          : {
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

  /**
   * Controls visibility of help modal
   */
  infoVisible = false;

  /**
   * Opens help modal with additional information
   */
  openInfo(): void {
    this.infoVisible = true;
  }

  /**
   * Closes help modal
   */
  closeInfo(): void {
    this.infoVisible = false;
  }
}
