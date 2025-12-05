import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';

/**
 * Available accent palette for dashboard KPIs
 */
export type DashboardAccent = 'primary' | 'success' | 'warning' | 'danger';

/**
 * Individual metric displayed in the dashboard
 */
export interface DashboardMetric {
  label: string;
  value: string;
  subtext: string;
  icon: string;
  helpText: string;
  accent: DashboardAccent;
}

/**
 * Compact KPI card that displays a highlighted value and its contextual information.
 * Generic component shared across multiple dashboard implementations.
 */
@Component({
  selector: 'app-dashboard-metric-card',
  standalone: true,
  imports: [CommonModule, CardModule, DialogModule, ButtonModule],
  templateUrl: './dashboard-metric-card.component.html'
})
export class DashboardMetricCardComponent {
  /**
   * Metric data to display in the card
   */
  @Input({ required: true }) metric!: DashboardMetric;
  
  /**
   * Controls modal visibility
   */
  showHelpModal = signal(false);

  /**
   * Opens the help information modal
   */
  openHelpModal(): void {
    this.showHelpModal.set(true);
  }

  /**
   * Closes the help information modal
   */
  closeHelpModal(): void {
    this.showHelpModal.set(false);
  }

  /**
   * Returns the CSS class to color the icon according to the specified accent
   * @param accent - Accent declared in the metric
   * @returns Class with the corresponding CSS variable
   */
  protected iconAccent(accent: DashboardAccent): string {
    switch (accent) {
    case 'primary':
      return 'text-[var(--brand-primary)]';
    case 'success':
      return 'text-[var(--brand-success)]';
    case 'warning':
      return 'text-[var(--brand-secondary)]';
    case 'danger':
      return 'text-[var(--brand-warn)]';
    default:
      return 'text-[var(--on-surface-muted)]';
    }
  }

  /**
   * Controls visibility of additional information modal
   */
  infoVisible = false;

  /**
   * Opens additional information modal
   */
  openInfo(): void {
    this.infoVisible = true;
  }

  /**
   * Closes additional information modal
   */
  closeInfo(): void {
    this.infoVisible = false;
  }
}
