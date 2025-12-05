import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Interface for post-analytical reporting metrics.
 */
export interface PostAnalyticalMetric {
  id: string; // Unique identifier to know which report was clicked
  label: string;
  value: string;
  subtext: string;
  icon: string;
  description: string;
}

/**
 * Component to display a post-analytical report metric card.
 * Includes icon, value, subtext and help button with tooltip.
 */
@Component({
  selector: 'app-reporting-metric-card',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TooltipModule],
  templateUrl: './reporting-metric-card.component.html',
  styleUrl: './reporting-metric-card.component.css'
})
export class ReportingMetricCardComponent {
  /** Metric to display */
  @Input() metric!: PostAnalyticalMetric;

  /** Event emitted when View Details is clicked */
  @Output() viewDetails = new EventEmitter<string>();

  /**
   * Handles View Details click.
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.metric.id);
  }
}

