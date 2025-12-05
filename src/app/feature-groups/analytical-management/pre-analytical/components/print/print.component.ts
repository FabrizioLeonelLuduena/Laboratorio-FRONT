import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, signal, TemplateRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelect, MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin, finalize } from 'rxjs';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { GenericColumn } from '../../../../../shared/models/generic-table.models';
import { Analysis } from '../../../../care-management/models/analysis.models';
import {
  LabelConfigurationCreateDTO,
  LabelConfigurationDTO,
  LabelConfigurationRow,
  LabelConfigurationUpdateDTO
} from '../../models/label-configuration.interface';
import { LabelResponseDTO, LabelWithAnalysisInfoDTO } from '../../models/label.interface';
import { SampleInterface } from '../../models/sample.interface';
import { AnalysisService } from '../../services/analysis.service';
import { LabelConfigurationService } from '../../services/label-configuration.service';
import { LabelService } from '../../services/label.service';
import { isNumericKey, preventNonNumericInput } from '../../utils/input-validators.util';

/**
 * Component for managing label printing and reprinting
 */
@Component({
  selector: 'app-reprint',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    TooltipModule,
    GenericAlertComponent,
    GenericBadgeComponent,
    GenericButtonComponent,
    GenericModalComponent,
    GenericTableComponent,
    SpinnerComponent
  ],
  templateUrl: './print.component.html',
  styleUrl: './print.component.css'
})
export class PrintComponent implements OnInit, AfterViewInit, OnDestroy {
  private labelService = inject(LabelService);
  private labelConfigService = inject(LabelConfigurationService);
  private analysisService = inject(AnalysisService);
  private destroyRef = inject(DestroyRef);
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitle = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  protocolNumber = '';
  patientName = '';
  labels: LabelResponseDTO[] = [];
  samples: SampleInterface[] = [];
  searching = false;
  private searchTimeout?: number;
  private scannerBuffer = '';
  private scannerTimeout: ReturnType<typeof setTimeout> | undefined;

  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning'>('success');
  alertTitle = signal('');
  alertText = signal('');
  private alertTimeout: ReturnType<typeof setTimeout> | undefined;

  columns: GenericColumn[] = [
    { field: 'checkbox', header: '', sortable: false },
    { field: 'protocolNumber', header: 'Protocolo', sortable: false },
    { field: 'configurationName', header: 'Configuración', sortable: false },
    { field: 'analysisName', header: 'Análisis', sortable: false },
    { field: 'status', header: 'Estado', sortable: false },
    { field: 'quantity', header: 'Cantidad', sortable: false },
    { field: 'actions', header: 'Acción', sortable: false }
  ];

  @ViewChild('checkboxTemplate', { static: false }) checkboxTemplate!: TemplateRef<any>;
  @ViewChild('analysisTemplate', { static: false }) analysisTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate', { static: false }) statusTemplate!: TemplateRef<any>;
  @ViewChild('quantityTemplate', { static: false }) quantityTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate', { static: false }) actionsTemplate!: TemplateRef<any>;
  @ViewChild('configAnalysisTemplate', { static: false }) configAnalysisTemplate!: TemplateRef<any>;
  @ViewChild('multiselect', { static: false }) multiselect!: MultiSelect;

  columnTemplates: Map<string, TemplateRef<any>> = new Map();
  configColumnTemplates: Map<string, TemplateRef<any>> = new Map();

  labelConfigurations: LabelConfigurationRow[] = [];
  filteredConfigurations: LabelConfigurationRow[] = [];
  configSearchTerm = '';
  private rawConfigurations: LabelConfigurationDTO[] = [];
  allAnalyses: Analysis[] = [];
  analysisOptions: { id: number; name: string; fullName: string; disabled?: boolean }[] = [];
  private analysisCache = new Map<number, Analysis>();

  configColumns: GenericColumn[] = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'analysisNames', header: 'Análisis', sortable: true },
    { field: 'printCount', header: 'Cantidad', sortable: true }
  ];

  showConfigModal = false;
  isEditMode = false;
  editingConfigId: number | null = null;
  isProcessingDelete = false;
  configFormData: LabelConfigurationCreateDTO = {
    name: '',
    analysisIds: [],
    printCount: 1
  };
  selectedAnalysisIds: number[] = [];
  private multiselectCloseHandler?: (event: Event) => void;

  /**
   * Component initialization
   */
  ngOnInit(): void {
    this.pageTitle.setTitle('Impresión de rótulos');
    this.breadcrumbService.buildFromRoute(this.route);
    this.loadLabelConfigurations();
    this.loadAnalyses();
  }

  /**
   * After view initialization - sets up column templates and event listeners
   */
  ngAfterViewInit(): void {
    this.columnTemplates.set('checkbox', this.checkboxTemplate);
    this.columnTemplates.set('analysisName', this.analysisTemplate);
    this.columnTemplates.set('status', this.statusTemplate);
    this.columnTemplates.set('quantity', this.quantityTemplate);
    this.columnTemplates.set('actions', this.actionsTemplate);

    this.configColumnTemplates.set('analysisNames', this.configAnalysisTemplate);

    // Use event delegation to catch clicks on multiselect checkboxes
    this.multiselectCloseHandler = (event: Event) => {
      const target = event.target as HTMLElement;

      // Check if click is on a multiselect checkbox or its label
      if (target.closest('.p-multiselect-panel')) {
        const checkbox = target.closest('li')?.querySelector('input[type="checkbox"]');
        if (checkbox && (target === checkbox || target.closest('label') || target.closest('li'))) {
          // Item was clicked, close the dropdown after a short delay
          setTimeout(() => {
            if (this.multiselect) {
              this.onAnalysisSelectionChange();
            }
          }, 150);
        }
      }
    };

    document.addEventListener('click', this.multiselectCloseHandler, true); // Use capture phase to catch events early
  }

  /**
   * Cleanup event listeners on component destroy
   */
  ngOnDestroy(): void {
    if (this.multiselectCloseHandler) {
      document.removeEventListener('click', this.multiselectCloseHandler, true);
    }
  }

  /**
   * Loads label configurations from the service
   */
  private loadLabelConfigurations(): void {
    this.labelConfigService.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configs) => {
          this.rawConfigurations = configs.filter(c => c.isActive);
          this.updateAnalysisOptionsDisabled();
          this.preloadMissingAnalyses();
        },
        error: () => {
          this.showAlertMessage('error', 'Error', 'No se pudieron cargar las configuraciones');
        }
      });
  }

  /**
   * Preloads any missing analyses that are referenced in configurations
   */
  private preloadMissingAnalyses(): void {
    const allAnalysisIds = this.rawConfigurations
      .flatMap(config => config.analysisIds);
    const missingAnalysisIds = [...new Set(allAnalysisIds)]
      .filter(id => !this.analysisCache.has(id));

    if (missingAnalysisIds.length === 0) {
      this.transformConfigurationsToRows();
      return;
    }

    const requests = missingAnalysisIds.map(id =>
      this.analysisService.getFullAnalysisById(id)
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (analyses: (Analysis | null)[]) => {
          analyses.forEach((analysis: Analysis | null) => {
            if (analysis) {
              this.analysisCache.set(analysis.id, analysis);
            }
          });
          this.transformConfigurationsToRows();
        },
        error: () => {
          this.transformConfigurationsToRows();
        }
      });
  }

  /**
   * Transforms raw configurations to table rows
   */
  private transformConfigurationsToRows(): void {
    this.labelConfigurations = this.rawConfigurations.map(config => ({
      id: config.id,
      name: config.name,
      printCount: config.printCount,
      analysisNames: config.analysisIds.map(id => this.getAnalysisName(id)).join('\n')
    }));
    this.filterConfigurations();
  }

  /**
   * Filters configurations based on search term
   */
  filterConfigurations(): void {
    const searchLower = this.configSearchTerm.toLowerCase().trim();

    if (!searchLower) {
      this.filteredConfigurations = [...this.labelConfigurations];
      return;
    }

    this.filteredConfigurations = this.labelConfigurations.filter(config =>
      config.name.toLowerCase().includes(searchLower) ||
      config.analysisNames.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Handles configuration search term changes
   */
  onConfigSearchChange(): void {
    this.filterConfigurations();
  }

  /**
   * Loads all analyses from the service
   */
  private loadAnalyses(): void {
    this.analysisService.getAllAnalyses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (analyses) => {
          this.allAnalyses = analyses;
          analyses.forEach(analysis => {
            this.analysisCache.set(analysis.id, analysis);
          });
          // Build analysis options with abbreviated names for display, but keep fullName for search/tooltip
          this.analysisOptions = this.allAnalyses.map(a => ({
            id: a.id,
            name: this.getAbbreviatedAnalysisName(a.name),
            fullName: a.name,
            disabled: false
          }));
          this.updateAnalysisOptionsDisabled();
        },
        error: () => {
          this.showAlertMessage('error', 'Error', 'No se pudieron cargar los análisis');
        }
      });
  }

  /**
   * Ensures an analysis is loaded in the cache
   * @param analysisId - The analysis ID to load
   */
  private ensureAnalysisInCache(analysisId: number): void {
    if (this.analysisCache.has(analysisId)) {
      return;
    }

    this.analysisService.getFullAnalysisById(analysisId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (analysis) => {
          if (analysis) {
            this.analysisCache.set(analysis.id, analysis);
          }
        }
      });
  }

  /**
   * Updates analysisOptions disabled flag based on current active configurations.
   * If in edit mode, analyses assigned to the configuration being edited are not disabled.
   */
  private updateAnalysisOptionsDisabled(): void {
    if (!this.analysisOptions || this.analysisOptions.length === 0) {
      return;
    }

    const assignedIds = new Set<number>(this.rawConfigurations.flatMap(c => c.analysisIds));
    this.analysisOptions = this.analysisOptions.map(opt => ({
      ...opt,
      disabled: assignedIds.has(opt.id) && !(this.isEditMode && this.configFormData.analysisIds?.includes(opt.id))
    }));
  }

  /**
   * Gets the analysis name from cache
   * @param analysisId - The analysis ID
   * @returns The analysis name
   */
  getAnalysisName(analysisId: number): string {
    const cached = this.analysisCache.get(analysisId);
    return cached ? cached.name : 'No disponible';
  }

  /**
   * Handles analysis selection change in multiselect
   * Closes the dropdown after selection
   */
  onAnalysisSelectionChange(): void {
    // Force close the multiselect dropdown after selection using multiple methods
    if (this.multiselect) {
      // Method 1: Try hide() immediately
      try {
        this.multiselect.hide();
      } catch (e) {
        //console.warn('Error closing multiselect:', e);
      }

      // Method 2: Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        // Try hide again
        if (this.multiselect) {
          try {
            this.multiselect.hide();
          } catch (e) {
            // Ignore errors
          }
        }

        // Method 3: Force close by manipulating DOM directly
        const panel = document.querySelector('.p-multiselect-panel');
        if (panel) {
          // Remove visible classes
          panel.classList.remove('p-component-overlay-visible');
          panel.classList.remove('p-component-overlay-enter');
          panel.classList.add('p-component-overlay-leave');

          // Set display to none
          (panel as HTMLElement).style.display = 'none';

          // Also try hide one more time
          if (this.multiselect) {
            try {
              this.multiselect.hide();
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }, 100);

      // Method 4: Dispatch escape key event as last resort
      setTimeout(() => {
        const panel = document.querySelector('.p-multiselect-panel.p-component-overlay-visible');
        if (panel) {
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true
          });
          document.body.dispatchEvent(escapeEvent);

          // Final attempt to hide
          if (this.multiselect) {
            try {
              this.multiselect.hide();
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }, 200);
    }
  }

  /**
   * Handles analysis item click in multiselect dropdown
   * Closes the dropdown immediately when an item is clicked
   */
  onAnalysisItemClick(): void {
    // Close immediately when an item is clicked
    if (this.multiselect) {
      setTimeout(() => {
        if (this.multiselect) {
          this.onAnalysisSelectionChange();
        }
      }, 50);
    }
  }

  /**
   * Handles create configuration button click
   */
  onCreateConfig(): void {
    this.isEditMode = false;
    this.editingConfigId = null;
    this.configFormData = {
      name: '',
      analysisIds: [],
      printCount: 1
    };
    this.selectedAnalysisIds = [];
    this.showConfigModal = true;
    this.updateAnalysisOptionsDisabled();
  }

  /**
   * Handles edit configuration action
   * @param row - The configuration row to edit
   */
  onEditConfig(row: LabelConfigurationRow): void {
    const config = this.rawConfigurations.find(c => c.id === row.id);
    if (!config) return;

    this.isEditMode = true;
    this.editingConfigId = config.id;
    this.configFormData = {
      name: config.name,
      analysisIds: [...config.analysisIds],
      printCount: config.printCount
    };
    this.selectedAnalysisIds = [...config.analysisIds];
    this.showConfigModal = true;
    this.updateAnalysisOptionsDisabled();
  }

  /**
   * Handles delete configuration action
   * @param row - The configuration row to delete
   */
  onDeleteConfig(row: LabelConfigurationRow): void {
    // Prevent double deletion by checking if already processing
    if (this.isProcessingDelete) {
      return;
    }
    this.isProcessingDelete = true;

    this.labelConfigService.delete(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showAlertMessage('success', 'Éxito', 'Configuración eliminada correctamente');
          this.loadLabelConfigurations();
          this.isProcessingDelete = false;
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Error al eliminar configuración';
          this.showAlertMessage('error', 'Error', errorMessage);
          this.isProcessingDelete = false;
        }
      });
  }

  /**
   * Closes the configuration modal
   */
  onCloseConfigModal(): void {
    this.showConfigModal = false;
    this.isEditMode = false;
    this.editingConfigId = null;
  }

  /**
   * Validates if the configuration form is valid
   * @returns True if form is valid
   */
  isConfigFormValid(): boolean {
    const nameValid = !!(this.configFormData.name && this.configFormData.name.trim().length > 0 && this.configFormData.name.trim().length <= 21);
    const analysesValid = !!(this.configFormData.analysisIds && this.configFormData.analysisIds.length > 0);
    const countValid = !!(this.configFormData.printCount && this.configFormData.printCount >= 1);
    return nameValid && analysesValid && countValid;
  }

  /**
   * Gets the action menu items for a configuration row
   * @param row - The configuration row
   * @returns Array of menu items
   */
  getConfigActions = (row: LabelConfigurationRow): MenuItem[] => [
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.onEditConfig(row)
    },
    {
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => this.onDeleteConfig(row)
    }
  ];

  /**
   * Saves the configuration (create or update)
   */
  onSaveConfig(): void {
    if (!this.isConfigFormValid()) {
      return;
    }

    if (this.isEditMode && this.editingConfigId) {
      const updateDto: LabelConfigurationUpdateDTO = {
        name: this.configFormData.name,
        printCount: this.configFormData.printCount,
        analysisIds: this.configFormData.analysisIds
      };

      this.labelConfigService.update(this.editingConfigId, updateDto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showAlertMessage('success', 'Éxito', 'Configuración actualizada correctamente');
            if (updateDto.analysisIds && updateDto.analysisIds.length > 0) {
              updateDto.analysisIds.forEach(id => this.ensureAnalysisInCache(id));
            }
            this.loadLabelConfigurations();
            this.onCloseConfigModal();
          },
          error: (error) => {
            const errorMessage = error.error?.message || error.message || 'Error al actualizar configuración';
            this.showAlertMessage('error', 'Error', errorMessage);
          }
        });
    } else {
      // Validate and prepare data before sending
      // Filter out any invalid IDs and ensure they are positive integers
      const rawIds = this.configFormData.analysisIds || [];
      //console.log('Raw analysis IDs from form:', rawIds);
      //console.log('Raw analysis IDs types:', rawIds.map(id => ({ id, type: typeof id, isNumber: typeof id === 'number', isInteger: Number.isInteger(id) })));

      const validAnalysisIds = rawIds
        .filter(id => {
          const numId = Number(id);
          const isValid = id != null &&
                         !isNaN(numId) &&
                         Number.isInteger(numId) &&
                         numId > 0 &&
                         numId <= Number.MAX_SAFE_INTEGER;
          if (!isValid) {
            //console.warn('Filtered out invalid analysis ID:', id);
          }
          return isValid;
        })
        .map(id => {
          const numId = Number(id);
          if (!Number.isInteger(numId)) {
            //console.warn('Converting non-integer ID to integer:', id, '->', Math.floor(numId));
            return Math.floor(numId);
          }
          return numId;
        });

      //console.log('Valid analysis IDs after filtering:', validAnalysisIds);

      const createData: LabelConfigurationCreateDTO = {
        name: this.configFormData.name.trim(),
        printCount: Number(this.configFormData.printCount) || 1,
        analysisIds: validAnalysisIds
      };

      // Additional validation
      if (!createData.name || createData.name.length === 0) {
        this.showAlertMessage('error', 'Error', 'El nombre de la configuración es requerido');
        return;
      }

      if (createData.name.length > 21) {
        this.showAlertMessage('error', 'Error', 'El nombre no puede exceder los 21 caracteres');
        return;
      }

      if (!createData.analysisIds || createData.analysisIds.length === 0) {
        this.showAlertMessage('error', 'Error', 'Debe seleccionar al menos un análisis válido');
        return;
      }

      if (createData.printCount < 1 || createData.printCount > 99 || !Number.isInteger(createData.printCount)) {
        this.showAlertMessage('error', 'Error', 'La cantidad debe estar entre 1 y 99');
        return;
      }

      // Final validation: ensure all IDs are valid integers
      const finalAnalysisIds = createData.analysisIds
        .filter(id => Number.isInteger(id) && id > 0)
        .map(id => Number(id));

      if (finalAnalysisIds.length === 0) {
        this.showAlertMessage('error', 'Error', 'No se encontraron IDs de análisis válidos. Por favor, seleccione al menos un análisis.');
        //console.error('No valid analysis IDs found. Original array:', createData.analysisIds);
        return;
      }

      const finalCreateData: LabelConfigurationCreateDTO = {
        name: createData.name,
        printCount: createData.printCount,
        analysisIds: finalAnalysisIds
      };

      // Log the data being sent for debugging
      //console.log('Creating label configuration with data:', JSON.stringify(finalCreateData, null, 2));
      //console.log('Analysis IDs:', finalCreateData.analysisIds);
      //console.log('Analysis IDs type check:', finalCreateData.analysisIds.map(id => ({ id, type: typeof id, isInteger: Number.isInteger(id) })));
      //console.log('Analysis IDs JSON:', JSON.stringify(finalCreateData.analysisIds));

      // Double-check: ensure we have valid IDs before sending
      if (!finalCreateData.analysisIds || finalCreateData.analysisIds.length === 0) {
        this.showAlertMessage('error', 'Error', 'No se pueden enviar IDs de análisis vacíos o inválidos');
        //console.error('Cannot send request: analysisIds is empty or invalid');
        //console.error('Final create data:', finalCreateData);
        return;
      }

      // Verify all IDs are valid numbers
      const hasInvalidIds = finalCreateData.analysisIds.some(id =>
        !Number.isInteger(id) || id <= 0 || isNaN(id)
      );

      if (hasInvalidIds) {
        this.showAlertMessage('error', 'Error', 'Uno o más IDs de análisis son inválidos');
        //console.error('Invalid IDs found:', finalCreateData.analysisIds);
        return;
      }

      this.labelConfigService.create(finalCreateData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showAlertMessage('success', 'Éxito', 'Configuración creada correctamente');
            finalCreateData.analysisIds.forEach(id => this.ensureAnalysisInCache(id));
            this.loadLabelConfigurations();
            this.onCloseConfigModal();
          },
          error: (error) => {
            //console.error('Error creating label configuration:', error);
            //console.error('Request data sent:', finalCreateData);
            //console.error('Request data JSON:', JSON.stringify(finalCreateData));
            //console.error('Error response:', error.error);
            //console.error('Error status:', error.status);
            //console.error('Error message:', error.message);

            // Show more detailed error message
            let errorMessage = 'Error al crear configuración';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.error) {
              errorMessage = error.error.error;
            } else if (error.message) {
              errorMessage = error.message;
            }

            this.showAlertMessage('error', 'Error', errorMessage);
          }
        });
    }
  }

  /**
   * Handles protocol input with scanner and keyboard support
   * @param event - The keyboard event
   */
  onProtocolInput(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const protocol = this.scannerBuffer || this.protocolNumber;
      this.scannerBuffer = '';

      if (protocol && protocol.trim()) {
        this.protocolNumber = protocol;
        this.performSearch();
        return;
      }
      return;
    }

    if (preventNonNumericInput(event)) {
      return;
    }

    if (isNumericKey(event.key)) {
      clearTimeout(this.scannerTimeout);
      this.scannerBuffer += event.key;

      this.scannerTimeout = setTimeout(() => {
        this.scannerBuffer = '';
      }, 100);
    }

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!this.protocolNumber || this.protocolNumber.trim().length === 0) {
      this.samples = [];
      this.patientName = '';
      this.scannerBuffer = '';
      return;
    }

    this.searchTimeout = window.setTimeout(() => {
      this.performSearch();
    }, 500);
  }

  /**
   * Performs the search for labels by protocol
   */
  private performSearch(): void {
    this.searching = true;
    const protocolId = parseInt(this.protocolNumber, 10);

    if (isNaN(protocolId) || protocolId <= 0) {
      this.searching = false;
      this.showAlertMessage('error', 'Error', 'Número de protocolo inválido. Ingrese un número válido.');
      return;
    }

    this.labelService.getLabelsByProtocolAndStatus(protocolId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.searching = false;
        })
      )
      .subscribe({
        next: (labels: LabelWithAnalysisInfoDTO[] | LabelResponseDTO[]) => {
          if (!labels || labels.length === 0) {
            // No hay resultados para este protocolo, pero mantenemos los existentes
            return;
          }

          // Check if the response is in the expected nested format or flat format
          const firstItem = labels[0] as any;
          const isNestedFormat = 'label' in firstItem;

          // Extract patient name from the first label (último paciente buscado)
          this.patientName = isNestedFormat
            ? (firstItem.label?.patientName || '')
            : (firstItem.patientName || '');

          // Map the data to samples for display
          const newSamples = labels.map(item => {
            const labelData = isNestedFormat ? (item as LabelWithAnalysisInfoDTO) : (item as any);

            // Extract fields based on response format
            const id = isNestedFormat ? labelData.label.id : labelData.id;
            const configName = isNestedFormat
              ? (labelData.labelConfigurationName || labelData.analysisName || 'No disponible')
              : (labelData.name || 'No disponible');
            const analysisName = isNestedFormat
              ? (labelData.analysisName || 'No disponible')
              : (labelData.analysisName || labelData.name || 'No disponible');
            const status = isNestedFormat
              ? (labelData.subStatus || 'CREATED')
              : (labelData.subStatus || 'CREATED');

            return {
              id,
              protocolNumber: this.protocolNumber,
              configurationName: configName,
              analysisName,
              status,
              quantity: 1,
              selected: true
            };
          });

          // Agregar nuevos samples evitando duplicados
          const existingIds = new Set(this.samples.map(s => s.id));
          const uniqueNewSamples = newSamples.filter(sample => !existingIds.has(sample.id));

          if (uniqueNewSamples.length > 0) {
            this.samples = [...this.samples, ...uniqueNewSamples];
          }
        },
        error: (_err) => {
          // En caso de error, no limpiamos los samples existentes, solo mostramos el error
          this.showAlertMessage('error', 'Error', 'No se pudieron cargar los rótulos para este protocolo.');
        }
      });
  }

  /**
   * Checks if any samples are selected
   * @returns True if at least one sample is selected
   */
  hasSelectedSamples(): boolean {
    return this.samples.some(s => s.selected);
  }

  /**
   * Checks if all samples are selected
   * @returns True if all samples are selected
   */
  allSelected(): boolean {
    return this.samples.length > 0 && this.samples.every(s => s.selected);
  }

  /**
   * Toggles selection for all samples
   * @param event - The checkbox event
   */
  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.samples.forEach(s => (s.selected = checked));
  }

  /**
   * Handles print button click - prints selected labels
   */
  onPrint(): void {
    const selectedSamples = this.samples.filter(s => s.selected);

    if (selectedSamples.length === 0) {
      return;
    }

    // Construir el array correcto para el backend
    const labels = selectedSamples.map(sample => ({
      label_id: sample.id,
      quantity: sample.quantity || 1
    }));

    this.labelService.reprintLabels({
      labels, // <-- este es el campo correcto
      reason: 'Reprint requested from UI',
      printer_id: 3 // usa snake_case si el backend lo espera así
    }).subscribe({
      next: () => {
        this.showAlertMessage('success', 'Impresión exitosa', 'Los rótulos se imprimieron correctamente');
      },
      error: (error) => {
        const errorMessage = error.error?.message  || error.message || 'Error al imprimir rótulos';
        this.showAlertMessage('error', 'Error', errorMessage);
      }
    });
  }


  /**
   * Shows an alert message
   * @param type - The alert type
   * @param title - The alert title
   * @param text - The alert text
   */
  private showAlertMessage(type: 'success' | 'error' | 'warning', title: string, text: string): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.showAlert.set(false);
    }, 3000);
  }

  /**
   * Maps LabelSubStatus to badge type
   * @param status - The label sub-status
   * @returns The badge type
   */
  getStatusBadgeType(status: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
    switch (status) {
    case 'CREATED':
      return 'pendiente';
    case 'PRINTED':
      return 'completo';
    case 'REPRINTED':
      return 'inactivo';
    default:
      return 'pendiente';
    }
  }

  /**
   * Maps LabelSubStatus to human-readable label
   * @param status - The label sub-status
   * @returns The status label
   */
  getStatusLabel(status: string): string {
    switch (status) {
    case 'CREATED':
      return 'Creado';
    case 'PRINTED':
      return 'Impreso';
    case 'REPRINTED':
      return 'Reimpreso';
    default:
      return status;
    }
  }

  /**
   * Validates and limits quantity input to max 2 digits (1-99)
   * @param event - The input event
   * @param row - The sample row
   */
  onQuantityInput(event: Event, row: SampleInterface): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);

    // Remove non-numeric characters
    input.value = input.value.replace(/[^0-9]/g, '');

    // Limit to 2 digits
    if (input.value.length > 2) {
      input.value = input.value.slice(0, 2);
      value = parseInt(input.value, 10);
    }

    // Validate range (1-99)
    if (isNaN(value) || value < 1) {
      row.quantity = 1;
      input.value = '1';
    } else if (value > 99) {
      row.quantity = 99;
      input.value = '99';
    } else {
      row.quantity = value;
    }
  }

  /**
   * Removes a sample from the table
   * @param sample - The sample to remove
   */
  onRemoveSample(sample: SampleInterface): void {
    this.samples = this.samples.filter(s => s.id !== sample.id);
  }

  /**
   * Abbreviates analysis name to first word or first meaningful part
   * @param fullName - The complete analysis name
   * @returns The abbreviated name
   */
  getAbbreviatedAnalysisName(fullName: string): string {
    if (!fullName) return '';

    // Split by comma, dash, or parenthesis
    const parts = fullName.split(/[,\-\(]/);
    const firstPart = parts[0].trim();

    // If the first part is very long, take only the first word
    if (firstPart.length > 25) {
      const words = firstPart.split(/\s+/);
      return words[0];
    }

    return firstPart;
  }

  /**
   * Abbreviates multiple analysis names (separated by newlines)
   * @param fullNames - The complete analysis names separated by \n
   * @returns The abbreviated names separated by comma
   */
  getAbbreviatedAnalysisNames(fullNames: string): string {
    if (!fullNames) return '';

    const names = fullNames.split('\n');
    const abbreviated = names.map(name => this.getAbbreviatedAnalysisName(name));

    // If there are many analyses, show count
    if (abbreviated.length > 3) {
      return `${abbreviated.slice(0, 2).join(', ')} (+${abbreviated.length - 2})`;
    }

    return abbreviated.join(', ');
  }
}

