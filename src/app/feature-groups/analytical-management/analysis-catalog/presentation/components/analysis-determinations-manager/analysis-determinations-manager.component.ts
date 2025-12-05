import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { DeterminationService } from '../../../application/determination.service';
import { Determination } from '../../../domain/determination.model';

/**
 * Manager component for handling analysis determinations.
 * Displays current determinations in a table and provides multi-select for adding new ones.
 * 
 * Features:
 * - Displays current determinations with name, unit, handling time
 * - Multi-select dropdown to add determinations
 * - Remove individual determinations with button
 * - Loading states and empty states
 * 
 * @example
 * <app-analysis-determinations-manager
 *   [currentDeterminations]="analysis.determinations"
 *   (determinationsAdded)="onDeterminationsAdded($event)"
 *   (determinationRemoved)="onDeterminationRemoved($event)" />
 */
@Component({
  selector: 'app-analysis-determinations-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    TableModule,
    ButtonModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule
  ],
  templateUrl: './analysis-determinations-manager.component.html',
  styleUrl: './analysis-determinations-manager.component.css'
})
export class AnalysisDeterminationsManagerComponent implements OnInit {
  private readonly determinationService = inject(DeterminationService);

  /** Current determinations associated with the analysis */
  currentDeterminations = input<Determination[]>([]);

  /** Emitted when new determinations are added */
  determinationsAdded = output<number[]>();

  /** Emitted when a determination is removed */
  determinationRemoved = output<number>();

  /** All available determinations for selection */
  availableDeterminations = signal<Determination[]>([]);

  /** Selected determinations from multiselect */
  selectedDeterminationIds = signal<number[]>([]);

  /** Loading state */
  loading = signal<boolean>(false);

  /** Options for the multiselect dropdown */
  options = computed(() => {
    const available = this.availableDeterminations();
    const current = this.currentDeterminations();
    
    // Filter out already-added determinations
    const currentIds = new Set(current.map(d => d.id));
    
    return available
      .filter(det => !currentIds.has(det.id))
      .map(det => ({
        label: this.formatDeterminationLabel(det),
        value: det.id
      }));
  });

  /** Computed property for table data */
  tableData = computed(() => this.currentDeterminations());

  /**
   * Initializes the component and loads available determinations
   */
  ngOnInit(): void {
    this.loadAvailableDeterminations();
  }

  /**
   * Loads all available determinations from the service
   */
  private loadAvailableDeterminations(): void {
    this.loading.set(true);
    
    this.determinationService.getDeterminations().subscribe({
      next: (determinations) => {
        this.availableDeterminations.set(determinations);
        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading determinations:', _error);
        this.availableDeterminations.set([]);
        this.loading.set(false);
      }
    });
  }

  /**
   * Formats determination label for multiselect
   */
  private formatDeterminationLabel(det: Determination): string {
    return det.name;
  }

  /**
   * Handles add button click
   */
  onAdd(): void {
    const ids = this.selectedDeterminationIds();
    if (ids.length > 0) {
      this.determinationsAdded.emit(ids);
      this.selectedDeterminationIds.set([]);
    }
  }

  /**
   * Handles remove button click for a determination
   */
  onRemove(determinationId: number): void {
    this.determinationRemoved.emit(determinationId);
  }

  /**
   * Formats handling time for display
   */
  formatHandlingTime(handlingTime?: any): string {
    if (!handlingTime) return 'N/D';
    
    const parts = [];
    if (handlingTime.hours) parts.push(`${handlingTime.hours}h`);
    if (handlingTime.minutes) parts.push(`${handlingTime.minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : 'N/D';
  }

  /**
   * Gets measurement unit name (placeholder - unit info not in current model)
   */
  getUnitName(_det: Determination): string {
    return 'N/D';
  }
}
