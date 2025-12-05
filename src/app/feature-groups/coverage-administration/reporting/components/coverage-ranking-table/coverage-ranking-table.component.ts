import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 *
 */
@Component({
  selector: 'app-coverage-ranking-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="w-full">
      <thead>
      <tr>
        <th class="text-left">Cobertura</th>
        <th class="text-right">Facturado</th>
        <th class="text-right">Prestaciones</th>
        <th class="text-right">Variación</th>
      </tr>
      </thead>
      <tbody>
        @for (r of (rows | slice:0:5); track r.coverage; let i = $index) {
          <tr>
            <td>{{ i + 1 }}. {{ r.coverage }}</td>
            <td class="text-right">{{ r.totalAmount | number:'1.0-0' }}</td>
            <td class="text-right">{{ r.prestations | number }}</td>
            <td class="text-right" [ngClass]="{ 'text-green-600': r.variationPct>=0, 'text-red-600': r.variationPct<0 }">
              {{ r.variationPct | number:'1.1-1' }}%
            </td>
          </tr>
        }
      </tbody>
    </table>
  `
})
export class CoverageRankingTableComponent {
  @Input() rows: { coverage: string; totalAmount: number; prestations: number; variationPct: number }[] = [];
}

