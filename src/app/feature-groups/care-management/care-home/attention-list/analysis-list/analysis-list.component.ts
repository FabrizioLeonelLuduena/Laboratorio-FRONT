import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize, firstValueFrom } from 'rxjs';
import { AnalysisWithAuth } from 'src/app/feature-groups/care-management/models/analysis.models';
import { AnalysisService } from 'src/app/feature-groups/care-management/services/analysis.service'; // Commented out - using mock data
import { AttentionService } from 'src/app/feature-groups/care-management/services/attention.service';
import {
  AdvancedTableComponent,
  AdvancedTableConfig,
  GenericColumn,
  TableAction
} from 'src/app/shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

import { AddAnalysisListRequest } from '../../../models/attention.models';

/** Component for managing a temporary list of analyses */
@Component({
  selector: 'app-analysis-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    ProgressSpinnerModule,
    CheckboxModule,
    GenericButtonComponent,
    GenericAlertComponent,
    AdvancedTableComponent,
    GenericModalComponent,
    GenericBadgeComponent,
    SpinnerComponent
  ],
  templateUrl: './analysis-list.component.html',
  styleUrls: ['./analysis-list.component.css']
})
export class AnalysisListComponent implements AfterViewInit, OnChanges {
  private readonly analysisService = inject(AnalysisService); // Commented out - using mock data
  private readonly attentionService = inject(AttentionService);

  /** Attention ID to which analyses will be added */
  @Input() attentionId?: number;

  /** Existing analysis IDs from attention (to load when returning to this step) */
  @Input() existingAnalysisIds?: number[];

  /** Event emitted when analyses are saved successfully and should proceed to next step */
  @Output() analysesSaved = new EventEmitter<void>();

  /** Event emitted when user clicks back button */
  @Output() goBack = new EventEmitter<void>();

  /** Event emitted when user clicks cancel attention button */
  @Output() cancelAttention = new EventEmitter<void>();

  /** Input control for short_code */
  shortCodeCtrl = new FormControl<number | null>(null, {
    nonNullable: false,
    validators: [Validators.required]
  });

  /** Input control for authorization number */
  authorizationCtrl = new FormControl<string>('', {
    nonNullable: true
  });

  /** Control for urgent attention checkbox */
  isUrgentCtrl = new FormControl<boolean>(false, {
    nonNullable: true
  });

  /** Local list of analyses with authorization status */
  analyses = signal<AnalysisWithAuth[]>([]);

  /** UI state signals */
  loading = signal(false);
  isLoading = signal(false);
  alert = signal<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  /** Modal state */
  showDetailsModal = signal(false);
  selectedAnalysis = signal<AnalysisWithAuth | null>(null);

  /** Focus ref to keep fast UX */
  @ViewChild('shortCodeInput') shortCodeInputRef!: ElementRef<HTMLInputElement>;

  /** Template for authorized checkbox */
  @ViewChild('authorizedCheckbox', { static: false })
    authorizedCheckboxTemplate?: TemplateRef<any>;

  hasItems = computed(() => this.analyses().length > 0);
  analysisCount = computed(() => this.analyses().length);

  /** Table columns - will be updated in ngAfterViewInit with template */
  columns: GenericColumn[] = [];

  /** Table actions */
  actions: TableAction[] = [
    { type: 'details', label: 'Detalle', icon: 'pi pi-eye' },
    { type: 'delete', label: 'Eliminar', icon: 'pi pi-trash' }
  ];

  /** Table configuration */
  tableConfig: AdvancedTableConfig = {
    showActions: true,
    paginator: false,
    showGlobalFilter: false,
    scrollable: true,
    scrollHeight: '400px'
  };

  /** Initialize columns with template after view is ready */
  ngOnChanges(changes: SimpleChanges): void {
    // Load existing analyses when existingAnalysisIds changes
    if (changes['existingAnalysisIds']) {
      if (this.existingAnalysisIds && this.existingAnalysisIds.length > 0) {
        this.loadExistingAnalyses();
      } else {
        // Clear analyses if existingAnalysisIds becomes empty
        this.analyses.set([]);
      }
    }
  }

  /**
   * After view init lifecycle hook.
   * Initializes table columns.
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'shortCode', header: 'Código', align: 'left' },
      { field: 'name', header: 'Práctica', align: 'left' },
      {
        field: 'authorized',
        header: 'Autorizado',
        template: this.authorizedCheckboxTemplate,
        align: 'left'
      }
    ];

    // Note: Existing analyses are loaded via ngOnChanges when existingAnalysisIds input changes
  }

  /**
   * Load existing analyses from the backend using the analysisIds
   */
  private loadExistingAnalyses(): void {
    if (!this.existingAnalysisIds || this.existingAnalysisIds.length === 0) {
      return;
    }

    this.loading.set(true);

    // WORKAROUND: Remove duplicate analysis IDs before loading
    // Backend's createAuthorizations doesn't delete old records, so we filter duplicates here
    const uniqueAnalysisIds = [...new Set(this.existingAnalysisIds)];

    // Fetch each analysis by ID and add to the list
    const analysisPromises = uniqueAnalysisIds.map((id) =>
      firstValueFrom(this.analysisService.getAnalysisById(id))
    );

    Promise.all(analysisPromises)
      .then((analysesData) => {
        const loadedAnalyses: AnalysisWithAuth[] = analysesData
          .filter((analysis) => analysis !== undefined && analysis !== null)
          .map((analysis) => ({
            id: Number(analysis!.id),
            shortCode: Number(analysis!.shortCode),
            name: analysis!.name || '',
            description: analysis!.description || null,
            familyName: null,
            nbuCode: null,
            determinations: [],
            authorized: true // Assume already authorized if saved
          }));

        this.analyses.set(loadedAnalyses);
        this.loading.set(false);
      })
      .catch(() => {
        this.setAlert('error', 'Error al cargar los análisis existentes');
        this.loading.set(false);
      });
  }

  /** Adds analysis by short_code */
  addByShortCode(): void {
    // Prevent multiple simultaneous requests
    if (this.isLoading()) {
      return;
    }

    const value = this.shortCodeCtrl.value;
    if (value == null || Number.isNaN(Number(value))) {
      this.setAlert('warning', 'Ingrese un código corto válido.');
      this.focusInput();
      return;
    }

    const exists = this.analyses().some((a) => a.shortCode === value);
    if (exists) {
      this.setAlert('warning', `El código corto ${value} ya está en la lista.`);
      this.focusInput(true);
      return;
    }

    this.isLoading.set(true);
    this.analysisService
      .getByShortCode(value)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (result) => {
          if (!result) {
            this.setAlert(
              'error',
              `No se encontró análisis con código corto ${value}.`
            );
            this.focusInput(true);
            return;
          }

          // Add analysis with default authorized = true
          const analysisWithAuth: AnalysisWithAuth = {
            ...result,
            authorized: true
          };

          this.analyses.update((arr) => [...arr, analysisWithAuth]);
          this.setAlert(null);
          this.shortCodeCtrl.reset();
          this.focusInput();
        },
        error: () => {
          this.setAlert(
            'error',
            `Error al buscar el análisis con código ${value}.`
          );
          this.focusInput(true);
        }
      });
  }

  /** Handle table actions */
  onAction(event: { type: string; row: any }): void {
    const analysis = event.row as AnalysisWithAuth;

    if (event.type === 'details') {
      this.selectedAnalysis.set(analysis);
      this.showDetailsModal.set(true);
      return;
    }

    if (event.type === 'delete') {
      this.removeItem(analysis);
      return;
    }
  }

  /** Close details modal */
  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedAnalysis.set(null);
  }

  /** Get badge status for authorization */
  getAuthorizationBadgeStatus(authorized: boolean): 'activo' | 'inactivo' {
    return authorized ? 'activo' : 'inactivo';
  }

  /** Get badge text for authorization */
  getAuthorizationBadgeText(authorized: boolean): string {
    return authorized ? 'Autorizado' : 'No Autorizado';
  }

  /** Toggle authorization status */
  toggleAuthorization(row: AnalysisWithAuth): void {
    this.analyses.update((arr) =>
      arr.map((a) =>
        a.id === row.id ? { ...a, authorized: !a.authorized } : a
      )
    );
  }

  /** Removes one analysis */
  removeItem(row: AnalysisWithAuth): void {
    this.analyses.update((arr) => arr.filter((a) => a.id !== row.id));
    this.focusInput();
  }

  /**
   * Public method to get the authorization number
   */
  getAuthorizationNumber(): string {
    return this.authorizationCtrl.value || '';
  }

  /**
   * Public method to get the urgent status
   */
  getIsUrgent(): boolean {
    return this.isUrgentCtrl.value;
  }

  /**
   * Handler for "Siguiente" button - saves analyses and emits event to go to next step
   */
  /**
   * Handle back button click - emit event to parent
   */
  onGoBack(): void {
    this.goBack.emit();
  }

  /**
   * Handle cancel attention button click - emit event to parent
   */
  onCancelAttention(): void {
    this.cancelAttention.emit();
  }

  /**
   * Checks if the current analyses list has changed from the existing ones
   */
  private hasAnalysesChanged(): boolean {
    if (!this.existingAnalysisIds || this.existingAnalysisIds.length === 0) {
      // No existing analyses, so any analyses in the list are new
      return this.hasItems();
    }

    const currentAnalysisIds = this.analyses().map(a => a.id);

    // Check if the count changed
    if (currentAnalysisIds.length !== this.existingAnalysisIds.length) {
      return true;
    }

    // Check if any IDs are different
    const existingSet = new Set(this.existingAnalysisIds);
    return currentAnalysisIds.some(id => !existingSet.has(id));
  }

  /**
   * Saves the current list of analyses and advances to the next step.
   * Emits `analysesSaved` when successful.
   */
  onSaveAndNext(): void {
    if (!this.hasItems()) {
      this.setAlert(
        'warning',
        'Debe agregar al menos un análisis antes de continuar.'
      );
      return;
    }

    // Check if analyses have changed from the existing ones
    if (!this.hasAnalysesChanged()) {
      // No changes, just advance without saving
      this.analysesSaved.emit();
      return;
    }

    // Get authorization number from control, convert to number
    const authNumber = this.authorizationCtrl.value
      ? parseInt(this.authorizationCtrl.value, 10)
      : 0;

    // Save analyses using the internal method
    this.saveAnalysesInternal(this.isUrgentCtrl.value, authNumber)
      .then(() => {
        // Emit event to parent to go to next step
        this.analysesSaved.emit();
      })
      .catch(() => {
        // Error already handled in saveAnalysesInternal
      });
  }

  /**
   * Public method to save analyses - called by parent workflow component
   * Returns a Promise that resolves with the saved analysis IDs when analyses are saved successfully
   * @param isUrgent - Whether the attention is urgent (optional, defaults to control value)
   * @param authorizationNumber - Authorization number from insurance
   */
  saveAnalyses(
    isUrgent?: boolean,
    authorizationNumber: number = 0
  ): Promise<number[]> {
    // Use the parameter if provided, otherwise use the control value
    const urgent = isUrgent !== undefined ? isUrgent : this.isUrgentCtrl.value;
    return this.saveAnalysesInternal(urgent, authorizationNumber);
  }

  /**
   * Internal method to save analyses to the backend
   * @param isUrgent - Whether the attention is urgent
   * @param authorizationNumber - Authorization number from insurance
   */
  private async saveAnalysesInternal(
    isUrgent: boolean,
    authorizationNumber: number
  ): Promise<number[]> {
    if (!this.attentionId) {
      const error = 'No se ha especificado un ID de atención.';
      this.setAlert('error', error);
      throw new Error(error);
    }

    if (!this.hasItems()) {
      // No analyses to save, resolve with empty array
      return [];
    }

    // Build analyses array with authorization status
    const analyses = this.analyses().map((a) => ({
      analysisId: a.id,
      isAuthorized: a.authorized
    }));

    const requestDto: AddAnalysisListRequest = {
      analyses: analyses,
      isUrgent: isUrgent,
      authorizationNumber: authorizationNumber
    };

    try {
      const response = await firstValueFrom(
        this.attentionService.addAnalysisListToAttention(
          this.attentionId,
          requestDto
        )
      );

      this.setAlert('success', 'Lista de análisis guardada correctamente.');

      // Use the analysis_ids from the backend response
      const savedAnalysisIds =
        response.analysisIds || analyses.map((a) => a.analysisId);

      this.resetList();

      return savedAnalysisIds;
    } catch (error) {
      this.setAlert('error', 'Error al guardar la lista de análisis.');
      throw error;
    }
  }

  /**
   * Translates time unit from English to Spanish for UI display.
   * @param unit The time unit in English (e.g., 'MINUTES', 'HOURS').
   * @returns The translated time unit in Spanish.
   */
  translateTimeUnit(unit: string): string {
    if (!unit) return '';

    const mapping: Record<string, string> = {
      'MINUTES': 'minutos',
      'MINUTE': 'minuto',
      'HOURS': 'horas',
      'HOUR': 'hora',
      'DAYS': 'días',
      'DAY': 'día',
      'WEEKS': 'semanas',
      'WEEK': 'semana',
      'MONTHS': 'meses',
      'MONTH': 'mes'
    };

    return mapping[unit.toUpperCase()] || unit;
  }

  /** Resets all data */
  resetList(): void {
    this.analyses.set([]);
    this.shortCodeCtrl.reset();
    this.authorizationCtrl.reset();
    this.isUrgentCtrl.reset();
  }

  /** Helper to set alert */
  private setAlert(
    type: 'success' | 'error' | 'warning' | null,
    text: string | null = null
  ): void {
    this.alert.set(type ? { type, text: text ?? '' } : null);
  }

  /** Return focus */
  private focusInput(selectAll = false): void {
    queueMicrotask(() => {
      const el = this.shortCodeInputRef?.nativeElement;
      if (!el) return;
      el.focus();
      if (selectAll) el.select();
    });
  }
}
