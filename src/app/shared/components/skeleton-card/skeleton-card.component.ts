import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { SkeletonModule } from 'primeng/skeleton';

/**
 * SkeletonCardComponent
 *
 * Lightweight placeholder to display while dashboard chart cards are loading
 * or when used as a generic placeholder. Reuses PrimeNG Skeletons to mimic
 * a card title and a chart block.
 */
@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  template: `
    <div class="border border-[var(--border-color)] rounded-lg bg-[var(--surface-card)] p-4">
      <p-skeleton height="24px" styleClass="mb-3"></p-skeleton>
      <p-skeleton height="260px"></p-skeleton>
    </div>
  `
})
export class SkeletonCardComponent {}
