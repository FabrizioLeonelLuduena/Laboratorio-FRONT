import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

/**
 * Displays a table of attentions that are delayed in the workflow.
 */
@Component({
  selector: 'app-delayed-attentions-table',
  standalone: true,
  imports: [CommonModule, TableModule, CardModule, ButtonModule],
  template: `
    <p-card>
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-color)] mb-4">
        <div class="flex items-start gap-2 flex-1 min-w-0">
          <i class="pi pi-clock text-base text-[var(--brand-primary)] shrink-0 mt-0.5"></i>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-semibold text-[var(--on-surface)] m-0 leading-tight">Atenciones demoradas</h3>
          </div>
        </div>
        <p-button icon="pi pi-info-circle" [text]="true" [rounded]="true" size="small" class="w-7 h-7 min-w-7 self-start"></p-button>
      </div>
      <p-table [value]="data" [tableStyle]="{'min-width': '50rem'}">
        <ng-template pTemplate="header">
          <tr>
            <th>Estado</th>
            <th>Tiempo Acumulado</th>
            <th>Responsable</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-attention>
          <tr>
            <td>{{ attention.state }}</td>
            <td>{{ attention.time }}</td>
            <td>{{ attention.responsible }}</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `
})
export class DelayedAttentionsTableComponent {
  @Input() data: any[] = [];
}
