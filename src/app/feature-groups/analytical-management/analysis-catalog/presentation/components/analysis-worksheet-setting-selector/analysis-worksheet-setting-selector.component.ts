import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectModule } from 'primeng/select';

import { GenericButtonComponent } from '../../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../../shared/components/generic-modal/generic-modal.component';
import { AnalysisService } from '../../../application/analysis.service';
import { WorksheetSettingService } from '../../../application/worksheet-setting.service';
import { Analysis } from '../../../domain/analysis.model';
import { WorksheetSetting } from '../../../domain/worksheet-setting.model';
import { WorksheetSettingEditFormComponent } from '../worksheet-setting-edit-form/worksheet-setting-edit-form.component';
import { WorksheetSettingHomeComponent } from '../worksheet-setting-home/worksheet-setting-home.component';

/**
 * Interface for dropdown options
 */
interface WorksheetSettingSelectOption {
  label: string;
  value: number;
  description?: string;
}

/**
 * Selector component for choosing a worksheet setting for an analysis.
 * Displays a searchable dropdown with all available worksheet settings.
 * 
 * @example
 * <app-analysis-worksheet-setting-selector
 *   [currentWorksheetSetting]="analysis.worksheetSetting"
 *   [disabled]="false"
 *   (worksheetSettingSelected)="onWorksheetSettingChange($event)">
 * </app-analysis-worksheet-setting-selector>
 */
@Component({
  selector: 'app-analysis-worksheet-setting-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    GenericButtonComponent,
    GenericModalComponent,
    WorksheetSettingHomeComponent,
    WorksheetSettingEditFormComponent
  ],
  templateUrl: './analysis-worksheet-setting-selector.component.html',
  styleUrl: './analysis-worksheet-setting-selector.component.css'
})
export class AnalysisWorksheetSettingSelectorComponent implements OnInit {
  private worksheetSettingService = inject(WorksheetSettingService);
  private analysisService = inject(AnalysisService);

  // State signals
  options = signal<WorksheetSettingSelectOption[]>([]);
  selectedWorksheetSettingId = signal<number | undefined>(undefined);
  loading = signal<boolean>(false);
  
  // Modal states
  showHelpModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showAddModal = signal<boolean>(false);
  allAnalyses = signal<Analysis[]>([]);
  selectedWorksheetSettingForEdit = signal<WorksheetSetting | null>(null);

  /**
   * Current worksheet setting (if any). Will pre-select this value in the dropdown.
   */
  @Input() set currentWorksheetSetting(value: WorksheetSetting | undefined) {
    if (value?.id) {
      this.selectedWorksheetSettingId.set(value.id);
    }
  }

  /**
   * Disables the selector when true.
   */
  @Input() disabled = false;

  /**
   * Emits the selected worksheet setting ID when user changes selection.
   */
  @Output() worksheetSettingSelected = new EventEmitter<number>();

  /**
   * Initializes the component and loads available worksheet settings.
   */
  ngOnInit(): void {
    this.loadWorksheetSettings();
  }

  /**
   * Loads all available worksheet settings from the backend and maps them to dropdown options.
   */
  private loadWorksheetSettings(): void {
    this.loading.set(true);
    
    this.worksheetSettingService.getWorksheetSettings().subscribe({
      next: (worksheetSettings: WorksheetSetting[]) => {
        const opts: WorksheetSettingSelectOption[] = worksheetSettings.map(setting => ({
          label: setting.name || `Configuración ${setting.id}`,
          value: setting.id,
          description: setting.description
        }));
        
        this.options.set(opts);
        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading worksheet settings:', _error);
        this.options.set([]);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles selection change and emits the selected worksheet setting ID.
   */
  onSelectionChange(event: any): void {
    const worksheetSettingId = event.value;
    if (worksheetSettingId) {
      this.worksheetSettingSelected.emit(worksheetSettingId);
    }
  }

  /**
   * Opens the help modal showing all available worksheet settings.
   */
  openHelpModal(): void {
    // Load all analyses for the worksheet setting home component
    this.analysisService.getAnalyses().subscribe({
      next: (analyses: Analysis[]) => {
        this.allAnalyses.set(analyses);
        this.showHelpModal.set(true);
      },
      error: (_error) => {
        // console.error('Error loading analyses for help modal:', _error);
        // Show modal anyway with empty data
        this.allAnalyses.set([]);
        this.showHelpModal.set(true);
      }
    });
  }

  /**
   * Closes the help modal.
   */
  closeHelpModal(): void {
    this.showHelpModal.set(false);
  }

  /**
   * Opens the edit modal for the currently selected worksheet setting.
   */
  openEditModal(): void {
    const currentId = this.selectedWorksheetSettingId();
    if (!currentId) return;

    // Get the full worksheet setting object with entity_version from the service
    this.worksheetSettingService.getWorksheetSettingById(currentId).subscribe({
      next: (worksheetSetting: WorksheetSetting) => {
        this.selectedWorksheetSettingForEdit.set(worksheetSetting);
        this.showEditModal.set(true);
      },
      error: (_error) => {
        // console.error('Error loading worksheet setting for edit:', _error);
      }
    });
  }

  /**
   * Closes the edit modal.
   */
  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedWorksheetSettingForEdit.set(null);
  }

  /**
   * Opens the add new modal.
   */
  openAddModal(): void {
    this.selectedWorksheetSettingForEdit.set(null);
    this.showAddModal.set(true);
  }

  /**
   * Closes the add modal.
   */
  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  /**
   * Handles successful save from edit/add modal.
   * Reloads the worksheet settings list and closes the modal.
   */
  onWorksheetSettingSaved(savedWorksheetSetting: WorksheetSetting): void {
    // Reload the list to get fresh data with updated entity_version
    this.loadWorksheetSettings();
    
    // Select the saved worksheet setting and emit to parent
    this.selectedWorksheetSettingId.set(savedWorksheetSetting.id);
    this.worksheetSettingSelected.emit(savedWorksheetSetting.id);
    
    // Close modals
    this.closeEditModal();
    this.closeAddModal();
  }
}
