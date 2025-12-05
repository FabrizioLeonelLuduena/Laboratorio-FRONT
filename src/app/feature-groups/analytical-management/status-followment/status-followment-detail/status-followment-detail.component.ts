import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TranslateSampleTypePipe } from '../../../../shared/pipes/translate-sample-type.pipe';
import { TranslateStatusPipe } from '../../../../shared/pipes/translate-status.pipe';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import {
  AnalysisTracking,
  ProtocolResponse,
  SampleWithStatuses
} from '../../pre-analytical/models/protocol.interface';
import { ProtocolService } from '../services/protocol.service';

/**
 * Component that displays the full detail of a protocol
 * with cards, analysis table and filter by analysis name
 */
@Component({
  selector: 'app-status-followment-detail',
  standalone: true,
  imports: [
    CommonModule,
    BadgeModule,
    CardModule,
    CarouselModule,
    TranslateSampleTypePipe,
    TranslateStatusPipe,
    GenericButtonComponent,
    GenericBadgeComponent,
    GenericTableComponent,
    ProgressSpinnerModule
  ],
  providers: [DatePipe],
  templateUrl: './status-followment-detail.component.html',
  styleUrl: './status-followment-detail.component.css'
})
export class StatusFollowmentDetailComponent implements OnInit, AfterViewInit {

  @ViewChild('statusTpl') statusTpl?: TemplateRef<any>;
  @ViewChild('expandedRowTpl') expandedRowTpl?: TemplateRef<any>;

  /** Protocol to display */
  protocol: ProtocolResponse | null = null;

  /** Loading state */
  isLoading = false;

  /** Analysis filter term */
  analysisFilterTerm = '';

  /** Filtered analysis list */
  filteredAnalysis: AnalysisTracking[] = [];

  /** Analysis rows for the table */
  analysisRows: Array<{
    id: number;
    name: string;
    shortCode: number;
    familyName: string;
    status: string;
    statusText: string;
    originalAnalysis: AnalysisTracking;
  }> = [];

  /** Column definitions for analysis table */
  columns: Array<{ field: string; header: string; sortable?: boolean }> = [];

  /** Map of column templates */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /** Map for tracking expanded samples */
  private expandedSampleCards = new Map<string, boolean>();

  /** Carousel responsive configuration */
  carouselResponsiveOptions = [
    {
      breakpoint: '1400px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  /** Breadcrumb service */
  private readonly breadcrumbService = inject(BreadcrumbService);

  /** Activated route */
  private readonly route = inject(ActivatedRoute);

  /**
   * Constructor for StatusFollowmentDetailComponent
   *
   * @param router Router for navigation
   * @param datePipe Date pipe for formatting dates
   * @param protocolService Protocol service for fetching data
   */
  constructor(
    private router: Router,
    private datePipe: DatePipe,
    private protocolService: ProtocolService
  ) {}

  /**
   * Lifecycle hook executed on component initialization
   */
  ngOnInit(): void {
    const protocolId = this.route.snapshot.paramMap.get('id');
    if (protocolId) {
      this.loadProtocolDetail(+protocolId);
    }
  }

  /**
   * Lifecycle hook executed after view initialization
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'name', header: 'Análisis', sortable: true },
      { field: 'shortCode', header: 'Código', sortable: true },
      { field: 'familyName', header: 'Familia', sortable: true },
      { field: 'statusText', header: 'Estado', sortable: false }
    ];

    if (this.statusTpl) {
      this.columnTemplates.set('statusText', this.statusTpl);
    }
  }

  /**
   * Loads the protocol detail from the backend
   */
  private loadProtocolDetail(id: number): void {
    this.isLoading = true;
    this.protocolService.getTrackingProtocols({}).subscribe({
      next: (protocols) => {
        this.protocol = protocols.find(p => p.id === id) || null;
        if (this.protocol) {
          this.filteredAnalysis = [...this.protocol.analysis];
          this.buildAnalysisRows();
          this.updateBreadcrumb();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/analytical-management/status-followment']);
      }
    });
  }

  /**
   * Updates breadcrumb based on the selected protocol
   */
  private updateBreadcrumb(): void {
    if (this.protocol) {
      this.breadcrumbService.buildFromRoute(this.route, {
        lastLabel: `Protocolo #${this.protocol.id} - ${this.protocol.patientName}`
      });
    }
  }

  /**
   * Filters analysis by name
   */
  filterAnalysis(): void {
    if (!this.protocol) return;
    
    const term = this.analysisFilterTerm.toLowerCase().trim();
    if (!term) {
      this.filteredAnalysis = [...this.protocol.analysis];
    } else {
      this.filteredAnalysis = this.protocol.analysis.filter(analysis =>
        analysis.name.toLowerCase().includes(term) ||
        analysis.shortCode.toString().includes(term) ||
        analysis.familyName.toLowerCase().includes(term)
      );
    }
    this.buildAnalysisRows();
  }

  /**
   * Handles global filter change from the generic table
   */
  onGlobalFilterChange(term: string): void {
    this.analysisFilterTerm = term;
    this.filterAnalysis();
  }

  /**
   * Returns the samples associated with a given analysis
   */
  getSamplesForAnalysis(analysis: AnalysisTracking): SampleWithStatuses[] {
    return analysis.samples ?? [];
  }

  /**
   * Toggles the expansion state of a sample card
   */
  toggleSampleCard(analysisId: number, sampleId: number): void {
    const key = `${analysisId}-${sampleId}`;
    const currentState = this.expandedSampleCards.get(key) || false;
    this.expandedSampleCards.set(key, !currentState);
  }

  /**
   * Checks if a sample card is currently expanded
   */
  isSampleCardExpanded(analysisId: number, sampleId: number): boolean {
    const key = `${analysisId}-${sampleId}`;
    return this.expandedSampleCards.get(key) || false;
  }

  /**
   * Maps a domain status code to a badge status
   */
  mapStatusToBadge(status?: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
    if (!status) return 'pendiente';

    const s = status.toString().trim().toUpperCase();

    const pendiente = ['PENDING', 'PENDING_COLLECTION', 'IN_PREPARATION', 'READY_TO_SAMPLE_COLLECTION'];
    const activo = ['IN_PROGRESS', 'PROCESSING', 'IN_TRANSIT', 'COLLECTED', 'ANALYZED', 'REPORTED', 'DERIVED'];
    const completo = ['DONE', 'COMPLETED'];
    const verificado = ['APPROVED', 'VALIDATED', 'DELIVERED'];
    const inactivo = ['REJECTED', 'CANCELLED', 'CANCELED', 'LOST'];

    if (pendiente.includes(s)) return 'pendiente';
    if (activo.includes(s)) return 'activo';
    if (completo.includes(s)) return 'completo';
    if (verificado.includes(s)) return 'verificado';
    if (inactivo.includes(s)) return 'inactivo';

    return 'pendiente';
  }

  /**
   * Builds analysis rows for the table
   */
  private buildAnalysisRows(): void {
    this.analysisRows = this.filteredAnalysis.map(analysis => ({
      id: analysis.id,
      name: analysis.name,
      shortCode: analysis.shortCode,
      familyName: analysis.familyName,
      status: analysis.status,
      statusText: analysis.status,
      originalAnalysis: analysis
    }));
  }

  /**
   * Navigates back to the list
   */
  goBack(): void {
    this.router.navigate(['/analytical-management/status-followment']);
  }
}
