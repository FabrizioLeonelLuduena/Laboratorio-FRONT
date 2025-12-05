import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

/** Simple heatmap-like table by coverage x practice. */
@Component({
  selector: 'app-coverage-heatmap',
  imports: [CommonModule],
  template: `
    <div class="overflow-auto">
      <table class="min-w-full border-collapse">
        <thead>
        <tr>
          <th class="p-2 border">Cobertura</th>
          @for (p of practices; track p) {
            <th class="p-2 border">{{ p }}</th>
          }
        </tr>
        </thead>
        <tbody>
          @for (c of coverages; track c) {
            <tr>
              <td class="p-2 border whitespace-nowrap">{{ c }}</td>
              @for (p of practices; track p) {
                <td class="p-2 border text-center" [style.background]="cellColor(c,p)" [title]="valueOf(c,p)">
                  {{ valueOf(c,p) }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    '.border{border:1px solid rgba(0,0,0,0.08)}'
  ]
})
export class CoverageHeatmapComponent implements OnChanges {
  @Input() data: { coverage: string; practice: string; value: number }[] = [];

  coverages: string[] = [];
  practices: string[] = [];
  private values = new Map<string, number>();
  private min = 0; private max = 1;

  /**
   *
   */
  /** Builds internal index, unique labels and min/max range on input change. */
  ngOnChanges(): void {
    const cs = new Set<string>();
    const ps = new Set<string>();
    this.values.clear();
    this.min = Number.POSITIVE_INFINITY; this.max = Number.NEGATIVE_INFINITY;
    for (const d of this.data) {
      cs.add(d.coverage); ps.add(d.practice);
      const k = `${d.coverage}__${d.practice}`;
      this.values.set(k, d.value);
      this.min = Math.min(this.min, d.value);
      this.max = Math.max(this.max, d.value);
    }
    this.coverages = Array.from(cs);
    this.practices = Array.from(ps);
    if (!isFinite(this.min)) { this.min = 0; this.max = 1; }
  }

  /**
   *
   */
  /** Returns the numeric value for a coverage/practice combination. */
  valueOf(cov: string, prac: string): number {
    return this.values.get(`${cov}__${prac}`) ?? 0;
  }

  /**
   *
   */
  /** Returns a background color based on normalized value intensity. */
  cellColor(cov: string, prac: string): string {
    const v = this.valueOf(cov, prac);
    const t = this.max === this.min ? 0 : (v - this.min) / (this.max - this.min);
    const hue = 180; // teal-ish
    const light = 95 - Math.round(t * 55); // 95% -> 40%
    return `hsl(${hue}, 60%, ${light}%)`;
  }
}
