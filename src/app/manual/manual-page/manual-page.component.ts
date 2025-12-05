import { NgForOf, NgIf } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { ManualPage } from '../IManual';
import { ManualBlocksComponent } from '../manual-blocks/manual-blocks.component';
import { ManualToggleComponent } from '../manual-toggle/manual-toggle.component';
import { ManualService } from '../manual.service';

/**
 * Componente que renderiza una página del manual.
 * Se suscribe a los parámetros de ruta (moduleId, pageId) y carga la página correspondiente.
 */
@Component({
  selector: 'app-manual-page',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    ManualBlocksComponent,
    RouterLink,
    ManualToggleComponent
  ],
  templateUrl: './manual-page.component.html',
  styleUrls: ['./manual-page.component.css']
})
export class ManualPageComponent implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private manualService = inject(ManualService);

  private destroy$ = new Subject<void>();

  page = signal<ManualPage | null>(null);
  // índice de la sección abierta (accordion). null = ninguno abierto
  openIndex = signal<number | null>(null);

  /**
   * Inicializa la suscripción a la ruta y carga la página.
   */
  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const moduleId = params.get('moduleId');
        const pageId = params.get('pageId');

        if (!moduleId || !pageId) {
          this.page.set(null);
          return;
        }

        // Resetear scroll al inicio de la página al cambiar de ruta
        window.scrollTo({ top: 0, behavior: 'auto' });

        this.manualService.getPage(moduleId, pageId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (page) => {
              this.page.set(page);
              // inicializar openIndex solo para actions-appointments
              if (page.id === 'actions-appointments') {
                const idx = page.sections.findIndex(s => s.open === true);
                // Si no hay ninguno con open:true, dejar en -1 (ninguno abierto)
                this.openIndex.set(idx >= 0 ? idx : -1);
              } else {
                this.openIndex.set(null);
              }
            },
            error: () => {
              this.page.set(null);
              this.openIndex.set(null);
            }
          });
      });
  }

  /**
   * Maneja el toggle de una sección (accordion).
   * @param index índice de la sección
   * @param newState nuevo estado (true = abierto)
   */
  onToggle(index: number, newState: boolean) {
    if (newState) {
      this.openIndex.set(index);
    } else {
      // si se cierra el mismo, dejar ninguno abierto
      if (this.openIndex() === index) this.openIndex.set(null);
    }
  }

  /**
   * Limpia suscripciones en la destrucción del componente.
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
