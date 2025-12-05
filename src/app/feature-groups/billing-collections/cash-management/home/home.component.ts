
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';

import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { CashSessionService } from '../application/cash-session.service';
import { CashDashboardComponent } from '../dashboard/dashboard.component';

/**
 * BillingCollectionsHomeComponent
 *
 * This component serves as the home for the Billing & Collections feature.
 * It determines whether to display the cash opening card or the dashboard
 * based on the current session state.
 */
@Component({
  selector: 'app-cash-management-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [
    CommonModule,
    CardModule,
    SkeletonModule,
    CashDashboardComponent,
    GenericButtonComponent
  ],
  styleUrl: './home.component.css'
})
export class CashManagementHomeComponent implements OnInit {
  private sessionService = inject(CashSessionService);
  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private router = inject(Router);

  // Injects the DestroyRef for subscription cleanup
  private destroyRef = inject(DestroyRef);

  /**
   * Observable indicating whether the session is open.
   * Used to conditionally render the dashboard or cash opening card.
   */
  readonly isSessionOpen = this.sessionService.isSessionOpen;

  /**
   * Observable indicating whether the session data is loading.
   * Used to display loading placeholders while data is being fetched.
   */
  readonly isLoading = this.sessionService.isLoading;

  /**
   * Observable containing the current session details.
   * Used to display session-specific information in the UI.
   */
  readonly currentSession = this.sessionService.currentSession;

  /**
   * Lifecycle hook that runs after the component is initialized.
   * Subscribes to the `loadCurrentSession` method to fetch the current session
   * and handle any errors (e.g., no session found).
   */
  ngOnInit(): void {
    this.titleService.setTitle('Apertura de caja');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros' }
    ]);
    // Load current session on module entry
    this.sessionService.loadCurrentSession().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {

      }
    });
  }

  /**
   * Navigates to the cash opening page.
   */
  navigateToOpening(): void {
    this.router.navigate(['/billing-collections/opening']);
  }
}
