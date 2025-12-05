import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TabPanel, TabView } from 'primeng/tabview';

import { GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { GenericHeaderCardComponent } from '../../../shared/components/generic-header-card/generic-header-card.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../shared/services/page-title.service';
import { InsurerCompleteResponseDTO } from '../models/insurer.model';
import { InsurerService } from '../services/insurer.service';

import { InsurerContactsComponent } from './components/insurer-contacts/insurer-contacts.component';
import { InsurerHistoryComponent } from './components/insurer-history/insurer-history.component';
import { InsurerInfoComponent } from './components/insurer-info/insurer-info.component';
import { InsurerPlansComponent } from './components/insurer-plans/insurer-plans.component';


/**
 * @component InsurerDetailComponent
 *
 * Insurer detail screen.
 * Includes tabs for plans, contacts, and settlements.
 * Manages both display and CRUD for contacts.
 */
@Component({
  selector: 'app-insurer-detail',
  standalone: true,
  templateUrl: './insurer-detail.component.html',
  imports: [
    GenericAlertComponent,
    InsurerPlansComponent,
    TabView,
    TabPanel,
    InsurerInfoComponent,
    InsurerContactsComponent,
    GenericHeaderCardComponent,
    InsurerHistoryComponent,
    GenericButtonComponent,
    SpinnerComponent
  ],
  styleUrls: ['./insurer-detail.component.css']
})
export class InsurerDetailComponent implements OnInit {
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /** General insurer data. */
  insurer!: InsurerCompleteResponseDTO;

  /** Controls loading states. */
  loading = false;

  /** Controls component alerts. */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  @ViewChild('historyRef') historyRef!: any;

  /**
   * Constructor
   */
  constructor(
    private router: Router,
    private insurerService: InsurerService
  ) {
  }

  // ===============================================================
  // Lifecycle
  // ===============================================================

  /**
   * Initializes the view by loading the insurer and its contacts.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Detalle de Aseguradora');
    // Automatic breadcrumb construction from parent + child routes
    this.breadcrumbService.buildFromRoute(this.route);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadInsurer(id);
    }
  }

  // ===============================================================
  // Navigation
  // ===============================================================

  /**
   * Returns to the main coverage list.
   */
  toReturn(): void {
    this.router.navigate(['/care-management/coverage-administration/insurers']);
  }

  // ===============================================================
  // Main loading
  // ===============================================================

  /**
   * Loads complete insurer data by ID.
   */
  loadInsurer(id: number): void {
    this.loading = true;
    this.insurerService.getCompleteById(id).subscribe({
      next: (data) => {
        this.insurer = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showAlert('error', 'Error al cargar la aseguradora.');
      }
    });
  }

  /**
   * Shows a temporary alert message.
   */
  showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  /**
   * Load the plans
   */
  onPlansChanged(): void {
    if (this.historyRef?.refreshPlans) {
      this.historyRef.refreshPlans();
    }
  }
}
