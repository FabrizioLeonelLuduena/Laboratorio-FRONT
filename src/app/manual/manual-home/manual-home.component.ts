import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { ManualService, ManualSearchResult } from '../manual.service';

/**
 * Componente de la página principal del manual: muestra módulos y permite búsqueda
 */
@Component({
  standalone: true,
  selector: 'app-manual-home',
  imports: [NgFor, NgIf],
  templateUrl: './manual-home.component.html',
  styleUrl: './manual-home.component.css'
})
export class ManualHomeComponent implements OnInit {

  manualService = inject(ManualService);
  router = inject(Router);

  // Computed para que siempre esté actualizado
  modules = computed(() => this.manualService.modules());

  // Búsqueda
  query = signal('');
  results = signal<ManualSearchResult[]>([]);
  loading = signal(false);
  private searchTimeout: any = null;

  /**
   * Resetea el scroll al inicio cuando se carga el componente
   */
  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /**
   * Abre el primer elemento del módulo
   * @param module módulo seleccionado
   */
  openModule(module: any) {
    const first = module.sidebar[0];
    this.router.navigate(['/manual', module.id, first.id]);
  }

  /**
   * Manejador del input de búsqueda (debounce interno)
   * @param value texto ingresado
   */
  onSearchInput(value: string) {
    this.query.set(value);
    // Debounce simple
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch(value);
    }, 300);
  }

  /**
   * Ejecuta la búsqueda en el servicio y actualiza resultados
   * @param value consulta
   */
  async performSearch(value: string) {
    const q = value?.trim();
    if (!q) {
      this.results.set([]);
      return;
    }

    this.loading.set(true);
    try {
      const res = await this.manualService.search(q);
      this.results.set(res);
    } catch {
      // En prod deberíamos reportar el error a un servicio de telemetría
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Navega a la sección encontrada
   * @param r resultado de búsqueda
   */
  openResult(r: ManualSearchResult) {
    // navegar a la ruta del manual: /manual/:moduleId/:pageId
    this.router.navigate(['/manual', r.moduleId, r.pageId]);
  }

  /**
   * Limpia el texto de búsqueda y resultados
   */
  clearSearch() {
    this.query.set('');
    this.results.set([]);
  }

}
