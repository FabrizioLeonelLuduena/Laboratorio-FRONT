import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectModule } from 'primeng/select';

import { GenericButtonComponent } from '../../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../../shared/components/generic-modal/generic-modal.component';
import { AnalysisService } from '../../../application/analysis.service';
import { SampleTypeService } from '../../../application/sample-type.service';
import { Analysis } from '../../../domain/analysis.model';
import { SampleType } from '../../../domain/sample-type.model';
import { SampleTypeEditFormComponent } from '../sample-type-edit-form/sample-type-edit-form.component';
import { SampleTypeHomeComponent } from '../sample-type-home/sample-type-home.component';

/**
 * Interface for dropdown options
 */
interface SampleTypeSelectOption {
  label: string;
  value: number;
}

/**
 * Selector component for choosing a sample type for an analysis.
 * Displays a searchable dropdown with all available sample types.
 * 
 * @example
 * <app-analysis-sample-type-selector
 *   [currentSampleType]="analysis.sampleType"
 *   [disabled]="false"
 *   (sampleTypeSelected)="onSampleTypeChange($event)">
 * </app-analysis-sample-type-selector>
 */
@Component({
  selector: 'app-analysis-sample-type-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    GenericButtonComponent,
    GenericModalComponent,
    SampleTypeHomeComponent,
    SampleTypeEditFormComponent
  ],
  templateUrl: './analysis-sample-type-selector.component.html',
  styleUrl: './analysis-sample-type-selector.component.css'
})
export class AnalysisSampleTypeSelectorComponent implements OnInit {
  private sampleTypeService = inject(SampleTypeService);
  private analysisService = inject(AnalysisService);

  // State signals
  options = signal<SampleTypeSelectOption[]>([]);
  selectedSampleTypeId = signal<number | undefined>(undefined);
  loading = signal<boolean>(false);
  
  // Modal states
  showHelpModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showAddModal = signal<boolean>(false);
  allAnalyses = signal<Analysis[]>([]);
  selectedSampleTypeForEdit = signal<SampleType | null>(null);

  /**
   * Current sample type (if any). Will pre-select this value in the dropdown.
   */
  @Input() set currentSampleType(value: SampleType | undefined) {
    if (value?.id) {
      this.selectedSampleTypeId.set(value.id);
    }
  }

  /**
   * Disables the selector when true.
   */
  @Input() disabled = false;

  /**
   * Emits the selected sample type ID when user changes selection.
   */
  @Output() sampleTypeSelected = new EventEmitter<number>();

  /**
   * Initializes the component and loads available sample types.
   */
  ngOnInit(): void {
    this.loadSampleTypes();
  }

  /**
   * Loads all available sample types from the backend and maps them to dropdown options.
   */
  private loadSampleTypes(): void {
    this.loading.set(true);
    
    this.sampleTypeService.getSampleTypes().subscribe({
      next: (sampleTypes: SampleType[]) => {
        const opts: SampleTypeSelectOption[] = sampleTypes.map(type => ({
          label: type.name,
          value: type.id
        }));
        
        this.options.set(opts);
        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading sample types:', _error);
        this.options.set([]);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles selection change and emits the selected sample type ID.
   */
  onSelectionChange(event: any): void {
    const sampleTypeId = event.value;
    if (sampleTypeId) {
      this.sampleTypeSelected.emit(sampleTypeId);
    }
  }

  /**
   * Opens the help modal showing all available sample types.
   */
  openHelpModal(): void {
    // Load all analyses for the sample type home component
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
   * Opens the edit modal for the currently selected sample type.
   */
  openEditModal(): void {
    const currentId = this.selectedSampleTypeId();
    if (!currentId) return;

    // Get the full sample type object with entity_version from the service
    this.sampleTypeService.getSampleTypeById(currentId).subscribe({
      next: (sampleType: SampleType) => {
        this.selectedSampleTypeForEdit.set(sampleType);
        this.showEditModal.set(true);
      },
      error: (_error) => {
        // console.error('Error loading sample type for edit:', _error);
      }
    });
  }

  /**
   * Closes the edit modal.
   */
  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedSampleTypeForEdit.set(null);
  }

  /**
   * Opens the add new modal.
   */
  openAddModal(): void {
    this.selectedSampleTypeForEdit.set(null);
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
   * Reloads the sample types list and closes the modal.
   */
  onSampleTypeSaved(savedSampleType: SampleType): void {
    // Reload the list to get fresh data with updated entity_version
    this.loadSampleTypes();
    
    // Select the saved sample type and emit to parent
    this.selectedSampleTypeId.set(savedSampleType.id);
    this.sampleTypeSelected.emit(savedSampleType.id);
    
    // Close modals
    this.closeEditModal();
    this.closeAddModal();
  }
}
