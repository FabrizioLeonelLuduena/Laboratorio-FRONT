import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { interval, of, Subscription } from 'rxjs';

import { catchError, tap } from 'rxjs/operators';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import type { AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { GenericColumn } from '../../../../shared/models/generic-table.models';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { PollingService } from '../../../../shared/services/PollingService';
import { PollingInstance } from '../../../../shared/utils/PollingInstance';
import { AttentionResponse } from '../../models/attention.models';
import { AttentionService } from '../../services/attention.service';

import { ATTENTION_EXPORT_COLUMNS, ATTENTION_PDF_COLUMNS } from './attention-export-config';

/**
 * Display model for attention list table rows.
 * Extends AttentionResponse with computed display fields.
 */
interface AttentionDisplay extends Omit<AttentionResponse, 'isUrgent'> {
  admissionDateRaw: any;
  admissionTime: string;
  waitingTime: string;
  attentionStateLabel: string;
  isUrgent: string; // Overridden from boolean to string for display
}

/**
 * Component for displaying the list of active (non-terminal) attentions.
 * Shows all attentions that are not in FINISHED, CANCELED, or FAILED states.
 */
@Component({
  selector: 'app-attention-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericAlertComponent,
    SpinnerComponent
  ],
  providers: [DatePipe],
  templateUrl: './attention-list.component.html',
  styleUrl: './attention-list.component.css'
})
export class AttentionListComponent implements OnInit, OnDestroy {
  /** Table data (formatted for display) */
  polling!: PollingInstance<AttentionResponse[]>;
  attentions: AttentionDisplay[] = [];
  loading = signal<boolean>(false);
  totalRecords = 0;

  /** Filter properties */
  dateFrom!: string;
  dateTo!: string;

  /** Alert state */
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /** Terminal states to filter out */
  private readonly EXCLUDED_STATES = ['FINISHED', 'CANCELED', 'FAILED', 'AWAITING_EXTRACTION', 'IN_EXTRACTION'];

  /** Timer subscription for updating elapsed time */
  private timerSubscription?: Subscription;

  /** State translations to Spanish */
  private readonly STATE_LABELS: Record<string, string> = {
    'REGISTERING_GENERAL_DATA': 'Registrando datos generales',
    'REGISTERING_ANALYSES': 'Registrando análisis',
    'ON_COLLECTION_PROCESS': 'En proceso de cobro',
    'ON_BILLING_PROCESS': 'En proceso de facturación',
    'AWAITING_CONFIRMATION': 'Esperando confirmación',
    'AWAITING_EXTRACTION': 'Esperando Extracción',
    'IN_EXTRACTION': 'En extracción',
    'FINISHED': 'Finalizada',
    'CANCELED': 'Cancelada',
    'FAILED': 'Fallida'
  };

  /** Columns for GenericTable */
  columns: GenericColumn[] = [
    { field: 'attentionNumber', header: 'Nro. atención', sortable: true },
    { field: 'attentionStateLabel', header: 'Estado', sortable: true },
    { field: 'waitingTime', header: 'Tiempo espera', sortable: true },
    { field: 'admissionTime', header: 'Hora ingreso', sortable: true },
    { field: 'isUrgent', header: 'Urgente', sortable: true }
  ];

  /** Get row actions function for GenericTable */
  getRowActions = (row: AttentionDisplay) => [
    { label: 'Ver Detalle', icon: 'pi pi-eye', command: () => this.onViewAttention(row) }
  ];

  /**
   * Creates an instance of AttentionListComponent.
   * @param attentionService API service
   * @param cdr Change detector
   * @param router Router for navigation
   * @param datePipe DatePipe for formatting dates
   * @param pollingService Polling service
   * @param excelExportService Excel export service
   * @param pdfExportService PDF export service
   */
  constructor(
    private attentionService: AttentionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private datePipe: DatePipe,
    private pollingService: PollingService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService
  ) {}

  /** Init */
  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.dateFrom = today;
    this.dateTo = today;

    this.polling = this.pollingService.createPolling({
      intervalStart: 30000, // initial interval 30seg
      intervalMin: 20000, // when high traffic is detected the polling is set to 20 secs
      intervalMax: 60000, // when there is low traffic the polling goes to 1min
      activityThreshold: 10, // the threshold to determine if there is high traffic
      quietThreshold: 3,  // the threshold to determine if there is low traffic
      request: () => this.loadAttentionsForPolling(),
      detectChanges: (prev, next) => {
        if (!prev) return next.length;
        return next.length - prev.length;
      }
    });

    this.polling.data$.subscribe();

    // Update waiting time every minute
    this.timerSubscription = interval(30000).subscribe(() => {
      this.updateWaitingTimes();
    });
  }

  /** Destroy */
  ngOnDestroy(): void {
    if (this.polling) {
      this.polling.stop();
    }
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  /**
   * Apply the selected filters and reload the data.
   */
  applyFilters(): void {
    this.loadAttentionsForPolling().subscribe();
  }

  /** Applies the response to the table (already filtered and with patient data). */
  private applyResponseToTable(response: AttentionResponse[]) {
    // Sort by admission date (oldest first - those waiting the longest)
    const sortedAttentions = response.sort((a, b) => {
      const dateA = this.parseDate(a.admissionDate);
      const dateB = this.parseDate(b.admissionDate);
      return dateA.getTime() - dateB.getTime(); // Ascending order (oldest first)
    });

    this.attentions = sortedAttentions.map((attention: any) => {
      const displayAttention: AttentionDisplay = {
        ...attention,
        admissionDateRaw: attention.admissionDate,
        admissionTime: this.formatTime(attention.admissionDate),
        waitingTime: this.calculateWaitingTime(attention.admissionDate),
        attentionStateLabel: this.translateState(attention.attentionState),
        isUrgent: attention.isUrgent ? 'Sí' : 'No'
      };
      return displayAttention;
    });

    this.totalRecords = this.attentions.length;
    this.cdr.markForCheck();
  }

  /** Update waiting times for all attentions */
  private updateWaitingTimes(): void {
    this.attentions = this.attentions.map(attention => ({
      ...attention,
      waitingTime: this.calculateWaitingTime(attention.admissionDateRaw)
    }));
    this.cdr.markForCheck();
  }

  /**
   * Load attentions with Polling implementation.
   * The main filtering is now done by the backend.
   * Patient data is included directly in the AttentionResponse.
   */
  private loadAttentionsForPolling() {
    this.loading.set(true);

    // 1. Define the filters to be sent to the backend.
    const filters = {
      excludeStates: this.EXCLUDED_STATES,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
    };

    // 2. Call the service with the filters.
    return this.attentionService.getAllAttentions(filters).pipe(
      tap((attentions: AttentionResponse[]) => {
        this.applyResponseToTable(attentions);
        this.loading.set(false);
      }),
      catchError(_err => {
        this.showAlert('error', 'Error', 'No se pudieron cargar las atenciones.');
        this.attentions = [];
        this.totalRecords = 0;
        this.loading.set(false);
        this.cdr.markForCheck();
        return of([]);
      })
    );
  }

  /** Parse date from backend format to Date object */
  private parseDate(date: any): Date {
    if (!date) return new Date();

    // Handle array format from Java LocalDateTime [year, month, day, hour, minute, second, nano]
    if (Array.isArray(date)) {
      const [year, month, day, hour, minute, second] = date;
      // JavaScript months are 0-indexed, so subtract 1
      return new Date(year, month - 1, day, hour, minute, second || 0);
    }

    // Handle ISO string format or Date object
    return new Date(date);
  }

  /** Translate attention state to Spanish */
  private translateState(state: string): string {
    return this.STATE_LABELS[state] || state;
  }

  /** Format time only (HH:mm) for display */
  private formatTime(date: any): string {
    if (!date) return '-';

    const jsDate = this.parseDate(date);
    return this.datePipe.transform(jsDate, 'HH:mm') || '-';
  }

  /** Calculate waiting time from admission date to now */
  private calculateWaitingTime(admissionDate: any): string {
    if (!admissionDate) return '-';

    const admissionTime = this.parseDate(admissionDate);
    const now = new Date();
    const diffMs = now.getTime() - admissionTime.getTime();

    // Handle negative values (future dates or timezone issues)
    if (diffMs < 0) {
      return '0m';
    }

    // Convert to hours and minutes
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Handle times over 24 hours
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`;
      } else {
        return `${days}d`;
      }
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /** Navigate to attention detail/workflow */
  onViewAttention(attention: AttentionDisplay): void {
    this.router.navigate(['/care-management/attentions', attention.attentionId]);
  }

  /** Show alert helper */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }

  /**
   * Export the attention list to Excel or PDF
   * @param filteredData - Filtered attention data from the table
   * @param event - Export event specifying `type` as 'excel' or 'pdf'
   */
  async handleExportAction(filteredData: AttentionDisplay[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: filteredData,
          columns: ATTENTION_EXPORT_COLUMNS,
          fileName: 'atenciones_activas',
          sheetName: 'Atenciones',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: filteredData,
          columns: ATTENTION_PDF_COLUMNS,
          fileName: 'atenciones_activas',
          title: 'Atenciones Activas',
          orientation: 'landscape',
          includeDate: true,
          includeTimestamp: true,
          logo: {
            path: '/lcc_negativo.png',
            width: 48,
            height: 14.4,
            x: 230,
            y: 8
          }
        });
      }

      if (result?.success) {
        this.showAlert('success', 'Exportación exitosa', 'Las atenciones se exportaron correctamente.');
      } else {
        this.showAlert('error', 'Error al exportar', result?.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'Error al exportar', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
