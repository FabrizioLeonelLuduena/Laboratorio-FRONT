import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';

import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { ExcessStockAlertDTO } from '../../../models/alerts/excess-stock-alerts.model';
import { AlertsService } from '../../../services/alerts.service';

/**
 * Grouped excess stock alerts by location.
 */
interface LocationExcessAlerts {
  locationId: number;
  locationName: string;
  alerts: ExcessStockAlertDTO[];
  criticalCount: number;
  warningCount: number;
}

/**
 * Full-page detail view for excess stock alerts.
 * Shows all alerts grouped by location with complete information.
 */
@Component({
  selector: 'app-excess-stock-detail',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, AccordionModule, PaginatorModule],
  templateUrl: './excess-stock-detail.component.html'
})
export class ExcessStockDetailComponent implements OnInit {
  private readonly alertsService = inject(AlertsService);
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly pageTitleService = inject(PageTitleService);

  readonly locationAlerts = signal<LocationExcessAlerts[]>([]);
  readonly totalExcess = signal(0);
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
   * Loads excess stock alerts on initialization.
   */
  ngOnInit(): void {
    // Set breadcrumb and page title
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Adquisiciones e inventario', route: '/procurement-inventory' },
      { label: 'Dashboard', route: '/procurement-inventory' },
      { label: 'Exceso de Stock' }
    ]);
    this.pageTitleService.setTitle('Exceso de Stock');

    this.loadExcessStock();
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
   * Loads excess stock alerts from backend and groups by location.
   */
  loadExcessStock(): void {
    this.isLoading.set(true);

    this.alertsService.getExcessStock().subscribe({
      next: (alerts) => {
        const normalizedAlerts = alerts.map((alert) => this.normalizeAlert(alert));
        const grouped = this.groupAlertsByLocation(normalizedAlerts);
        this.locationAlerts.set(grouped);
        this.totalExcess.set(normalizedAlerts.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.locationAlerts.set([]);
        this.totalExcess.set(0);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Groups alerts by location and sorts by criticality.
   *
   * @param alerts array of excess stock alerts
   * @returns grouped alerts by location
   */
  private groupAlertsByLocation(alerts: ExcessStockAlertDTO[]): LocationExcessAlerts[] {
    const grouped = new Map<number, LocationExcessAlerts>();

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

      if (alert.severity === 'CRITICAL') {
        locationGroup.criticalCount++;
      } else {
        locationGroup.warningCount++;
      }
    }

    // Sort locations by critical count (descending)
    return Array.from(grouped.values()).sort((a, b) => b.criticalCount - a.criticalCount);
  }

  /**
   * Calculates excess percentage for display.
   *
   * @param currentStock current stock quantity
   * @param maximumStock maximum stock threshold
   * @returns excess percentage as string
   */
  getExcessPercentage(currentStock: number, maximumStock: number): string {
    if (maximumStock === 0) {
      return '0%';
    }
    const excess = ((currentStock - maximumStock) / maximumStock) * 100;
    return `+${Math.round(excess)}%`;
  }

  /**
   * Gets severity color class for alert.
   *
   * @param severity alert severity level
   * @returns color class
   */
  getSeverityColor(severity: 'WARNING' | 'CRITICAL'): string {
    return severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600';
  }

  /**
   * Ensures strings with accent marks are displayed correctly
   * when backend responses arrive double-encoded.
   */
  private normalizeAlert(alert: ExcessStockAlertDTO): ExcessStockAlertDTO {
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
  getSeverityDotClass(severity: 'WARNING' | 'CRITICAL'): string {
    return severity === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-400';
  }

  /**
   * Navigates back to the procurement inventory home.
   */
  goBack(): void {
    this.router.navigate(['/procurement-inventory']);
  }
}
