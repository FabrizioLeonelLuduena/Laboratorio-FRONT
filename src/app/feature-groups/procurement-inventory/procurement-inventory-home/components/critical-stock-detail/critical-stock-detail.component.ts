import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';

import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { AlertSeverity, CriticalStockAlertDTO } from '../../../models/alerts/alerts.model';
import { AlertsService } from '../../../services/alerts.service';

/**
 * Grouped critical stock alerts by location.
 */
interface LocationAlerts {
  locationId: number;
  locationName: string;
  alerts: CriticalStockAlertDTO[];
  criticalCount: number;
  warningCount: number;
}

/**
 * Full-page detail view for critical stock alerts.
 * Shows all alerts grouped by location with complete information.
 */
@Component({
  selector: 'app-critical-stock-detail',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, AccordionModule, PaginatorModule],
  templateUrl: './critical-stock-detail.component.html'
})
export class CriticalStockDetailComponent implements OnInit {
  private readonly alertsService = inject(AlertsService);
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly pageTitleService = inject(PageTitleService);

  readonly locationAlerts = signal<LocationAlerts[]>([]);
  readonly totalCritical = signal(0);
  readonly isLoading = signal(false);

  // Pagination
  readonly currentPage = signal(0);
  readonly pageSize = signal(5);
  readonly paginatedLocations = computed(() => {
    const locations = this.locationAlerts();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return locations.slice(start, end);
  });

  /**
   * Loads critical stock alerts on initialization.
   */
  ngOnInit(): void {
    // Set breadcrumb and page title
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Adquisiciones e inventario', route: '/procurement-inventory' },
      { label: 'Dashboard', route: '/procurement-inventory' },
      { label: 'Stock Crítico' }
    ]);
    this.pageTitleService.setTitle('Stock Crítico');

    this.loadCriticalStock();
  }

  /**
   * Handles page change event from paginator
   */
  onPageChange(event: { first?: number; rows?: number }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize();
    this.currentPage.set(first / rows);
  }

  /**
   * Loads critical stock alerts from backend and groups by location.
   */
  loadCriticalStock(): void {
    this.isLoading.set(true);

    this.alertsService.getCriticalStock().subscribe({
      next: (alerts) => {
        const normalizedAlerts = alerts.map((alert) => this.normalizeAlert(alert));
        const grouped = this.groupAlertsByLocation(normalizedAlerts);
        this.locationAlerts.set(grouped);
        this.totalCritical.set(normalizedAlerts.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.locationAlerts.set([]);
        this.totalCritical.set(0);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Groups alerts by location and sorts by criticality.
   *
   * @param alerts array of critical stock alerts
   * @returns grouped alerts by location
   */
  private groupAlertsByLocation(alerts: CriticalStockAlertDTO[]): LocationAlerts[] {
    const grouped = new Map<number, LocationAlerts>();

    for (const alert of alerts) {
      if (!grouped.has(alert.locationId)) {
        grouped.set(alert.locationId, {
          locationId: alert.locationId,
          locationName: alert.locationName,
          alerts: [],
          criticalCount: 0,
          warningCount: 0
        });
      }

      const locationGroup = grouped.get(alert.locationId)!;
      locationGroup.alerts.push(alert);

      if (alert.severity === AlertSeverity.CRITICAL) {
        locationGroup.criticalCount++;
      } else {
        locationGroup.warningCount++;
      }
    }

    // Sort locations by critical count (descending)
    return Array.from(grouped.values()).sort((a, b) => b.criticalCount - a.criticalCount);
  }

  /**
   * Calculates deficit percentage for display.
   *
   * @param currentStock current stock quantity
   * @param minimumStock minimum stock threshold
   * @returns deficit percentage as string
   */
  getDeficitPercentage(currentStock: number, minimumStock: number): string {
    if (minimumStock === 0) {
      return '0%';
    }
    const deficit = ((currentStock - minimumStock) / minimumStock) * 100;
    return `${Math.round(deficit)}%`;
  }

  /**
   * Gets severity color class for alert.
   *
   * @param severity alert severity level
   * @returns color class
   */
  getSeverityColor(severity: AlertSeverity): string {
    return severity === AlertSeverity.CRITICAL ? 'text-red-600' : 'text-yellow-600';
  }

  /**
   * Ensures strings with accent marks are displayed correctly
   * when backend responses arrive double-encoded.
   */
  private normalizeAlert(alert: CriticalStockAlertDTO): CriticalStockAlertDTO {
    return {
      ...alert,
      supplyName: this.decodeUtf8(alert.supplyName),
      locationName: this.decodeUtf8(alert.locationName)
    };
  }

  /**
   * Decodes the UTF-8 encoded string
   * @param value - The value to decode
   * @returns The decoded string
   */
  private decodeUtf8(value: string): string {
    if (!value) {
      return value;
    }

    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  }

  /**
   * Returns background color class for severity bullet.
   *
   * @param severity alert severity level
   */
  getSeverityDotClass(severity: AlertSeverity): string {
    return severity === AlertSeverity.CRITICAL ? 'bg-red-500' : 'bg-yellow-400';
  }

  /**
   * Navigates back to the procurement inventory home.
   */
  goBack(): void {
    this.router.navigate(['/procurement-inventory']);
  }
}
