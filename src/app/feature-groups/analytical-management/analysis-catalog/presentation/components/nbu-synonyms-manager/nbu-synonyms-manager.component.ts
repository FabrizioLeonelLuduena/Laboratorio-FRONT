import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { DividerModule } from 'primeng/divider';

import { Nbu } from '../../../domain/nbu.model';

/**
 * Manager component for handling NBU synonyms.
 * Allows adding and removing synonyms using an editable chips interface.
 * 
 * Features:
 * - Displays current synonyms as chips
 * - Editable p-chips component for adding new synonyms
 * - Remove individual synonyms
 * - Empty state when no synonyms exist
 * 
 * @example
 * <app-nbu-synonyms-manager
 *   [currentNbu]="nbu"
 *   (synonymsAdded)="onSynonymsAdded($event)"
 *   (synonymRemoved)="onSynonymRemoved($event)" />
 */
@Component({
  selector: 'app-nbu-synonyms-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChipsModule,
    ButtonModule,
    DividerModule
  ],
  templateUrl: './nbu-synonyms-manager.component.html',
  styleUrl: './nbu-synonyms-manager.component.css'
})
export class NbuSynonymsManagerComponent {
  /** Current NBU with its synonyms */
  currentNbu = input<Nbu | undefined>();

  /** Emitted when new synonyms are added */
  synonymsAdded = output<string[]>();

  /** Emitted when a synonym is removed */
  synonymRemoved = output<string>();

  /** New synonyms to be added (chips model) */
  newSynonyms = signal<string[]>([]);

  /** Current synonyms from NBU */
  currentSynonyms = computed(() => {
    const nbu = this.currentNbu();
    return nbu?.synonyms || [];
  });

  /** Check if there are new synonyms to add */
  hasNewSynonyms = computed(() => this.newSynonyms().length > 0);

  /**
   * Handles add button click
   */
  onAdd(): void {
    const synonyms = this.newSynonyms();
    if (synonyms.length > 0) {
      // Filter out empty strings and trim
      const validSynonyms = synonyms
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (validSynonyms.length > 0) {
        this.synonymsAdded.emit(validSynonyms);
        this.newSynonyms.set([]);
      }
    }
  }

  /**
   * Handles remove button click for a synonym
   */
  onRemove(synonym: string): void {
    this.synonymRemoved.emit(synonym);
  }
}
