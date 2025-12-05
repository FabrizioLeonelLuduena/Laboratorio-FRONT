import { Pipe, PipeTransform } from '@angular/core';

import { NbuService } from '../../feature-groups/coverage-administration/services/nbu.service';

/**
 * Pipe to transform NBU version IDs into their corresponding labels.
 */
@Pipe({
  name: 'nbuLabel',
  pure: false
})
export class NbuLabelPipe implements PipeTransform {

  private cache = new Map<string, string>();
  private loaded = false;
  private loading = false;

  /**
   * Constructor
   */
  constructor(private nbu: NbuService) {}

  /**
   * Ensures that NBU options are loaded and cached.
   */
  private ensureLoaded(): void {
    if (this.loaded || this.loading) return;

    this.loading = true;
    this.nbu.getOptions().subscribe({
      next: (opts: any[]) => {
        for (const o of opts) {
          const key = String(o.value ?? o.id ?? '');
          const label = o.label ?? o.name ?? key;
          this.cache.set(key, label);
        }
        this.loaded = true;
        this.loading = false;
      },
      error: () => {
        // si falla, podés decidir reintentar más tarde
        this.loading = false;
      }
    });
  }

  /**
   * Transforms an NBU version ID into its corresponding label.
   */
  transform(id: any): string {
    const v = id != null ? String(id) : '';
    if (!v) return '';

    this.ensureLoaded();

    // si todavía no cargó, devolvemos el id
    return this.cache.get(v) ?? v;
  }

}
