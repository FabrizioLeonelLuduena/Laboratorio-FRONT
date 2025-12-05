import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { DividerModule } from 'primeng/divider';

import { Nbu } from '../../../domain/nbu.model';

/**
 * Manager component for handling NBU abbreviations.
 * Allows adding and removing abbreviations using an editable chips interface.
 * 
 * Features:
 * - Displays current abbreviations as chips
 * - Editable p-chips component for adding new abbreviations
 * - Remove individual abbreviations
 * - Empty state when no abbreviations exist
 * 
 * @example
 * <app-nbu-abbreviations-manager
 *   [currentNbu]="nbu"
 *   (abbreviationsAdded)="onAbbreviationsAdded($event)"
 *   (abbreviationRemoved)="onAbbreviationRemoved($event)" />
 */
@Component({
  selector: 'app-nbu-abbreviations-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChipsModule,
    ButtonModule,
    DividerModule
  ],
  templateUrl: './nbu-abbreviations-manager.component.html',
  styleUrl: './nbu-abbreviations-manager.component.css'
})
export class NbuAbbreviationsManagerComponent {
  /** Current NBU with its abbreviations */
  currentNbu = input<Nbu | undefined>();

  /** Emitted when new abbreviations are added */
  abbreviationsAdded = output<string[]>();

  /** Emitted when an abbreviation is removed */
  abbreviationRemoved = output<string>();

  /** New abbreviations to be added (chips model) */
  newAbbreviations = signal<string[]>([]);

  /** Current abbreviations from NBU */
  currentAbbreviations = computed(() => {
    const nbu = this.currentNbu();
    return nbu?.abbreviations || [];
  });

  /** Check if there are new abbreviations to add */
  hasNewAbbreviations = computed(() => this.newAbbreviations().length > 0);

  /**
   * Handles add button click
   */
  onAdd(): void {
    const abbreviations = this.newAbbreviations();
    if (abbreviations.length > 0) {
      // Filter out empty strings and trim
      const validAbbreviations = abbreviations
        .map(a => a.trim())
        .filter(a => a.length > 0);

      if (validAbbreviations.length > 0) {
        this.abbreviationsAdded.emit(validAbbreviations);
        this.newAbbreviations.set([]);
      }
    }
  }

  /**
   * Handles remove button click for an abbreviation
   */
  onRemove(abbreviation: string): void {
    this.abbreviationRemoved.emit(abbreviation);
  }
}
