import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectModule } from 'primeng/select';

import { NbuService } from '../../../application/nbu.service';
import { Nbu } from '../../../domain/nbu.model';

/**
 * Interface for dropdown options
 */
interface NbuSelectOption {
  label: string;
  value: number;
}

/**
 * Selector component for choosing an NBU for an analysis.
 * Displays a searchable dropdown with all available NBUs.
 * 
 * @example
 * <app-analysis-nbu-selector
 *   [currentNbu]="analysis.nbu"
 *   [disabled]="false"
 *   (nbuSelected)="onNbuChange($event)">
 * </app-analysis-nbu-selector>
 */
@Component({
  selector: 'app-analysis-nbu-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule
  ],
  templateUrl: './analysis-nbu-selector.component.html',
  styleUrl: './analysis-nbu-selector.component.css'
})
export class AnalysisNbuSelectorComponent implements OnInit {
  private nbuService = inject(NbuService);

  // State signals
  options = signal<NbuSelectOption[]>([]);
  selectedNbuId = signal<number | undefined>(undefined);
  loading = signal<boolean>(false);

  /**
   * Current NBU (if any). Will pre-select this value in the dropdown.
   */
  @Input() set currentNbu(value: Nbu | undefined) {
    if (value?.id) {
      this.selectedNbuId.set(value.id);
    }
  }

  /**
   * Disables the selector when true.
   */
  @Input() disabled = false;

  /**
   * Emits the selected NBU ID when user changes selection.
   */
  @Output() nbuSelected = new EventEmitter<number>();

  /**
   * Initializes the component and loads available NBUs.
   */
  ngOnInit(): void {
    this.loadNbus();
  }

  /**
   * Loads all available NBUs from the backend and maps them to dropdown options.
   * Can be called externally to refresh the list after NBU updates.
   */
  loadNbus(): void {
    this.loading.set(true);
    
    this.nbuService.getNbus().subscribe({
      next: (nbus: Nbu[]) => {
        const opts: NbuSelectOption[] = nbus.map(nbu => ({
          label: `${nbu.nbuCode} - ${nbu.determination}`,
          value: nbu.id
        }));
        
        this.options.set(opts);
        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading NBUs:', _error);
        this.options.set([]);
        this.loading.set(false);
      }
    });
  }

  /**
   * Refreshes the NBU list by invalidating cache and reloading.
   * Use this after NBU updates to ensure fresh data.
   */
  refresh(): void {
    // Force a fresh load by reloading the list
    this.loadNbus();
  }

  /**
   * Handles selection change and emits the selected NBU ID.
   */
  onSelectionChange(event: any): void {
    const nbuId = event.value;
    if (nbuId) {
      this.nbuSelected.emit(nbuId);
    }
  }
}
