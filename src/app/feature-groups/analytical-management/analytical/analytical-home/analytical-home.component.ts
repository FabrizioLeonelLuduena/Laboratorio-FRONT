import { Component, inject, ViewChild, signal, DestroyRef, AfterViewInit, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig, TutorialStep } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { WorksheetListComponent } from '../components/worksheet-list/worksheet-list.component';

/**
 * Component for the Analytical Management home page.
 * Displays the main interface for analytical management operations.
 */
@Component({
  selector: 'app-analytical-home',
  imports: [WorksheetListComponent, TutorialOverlayComponent],
  templateUrl: './analytical-home.component.html',
  styleUrl: './analytical-home.component.css'
})
export class AnalyticalHomeComponent implements OnInit, AfterViewInit {

  private pageTitleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private tutorialService = inject(TutorialService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  tutorialConfig = signal<TutorialConfig>({ steps: [] });

  /**
   * Sets the page title and breadcrumbs on component initialization.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Gestión de analítica > Analítica');
    this.breadcrumbService.buildFromRoute(this.route);
  }

  /**
   * Sets up the tutorial after the view has been initialized.
   */
  ngAfterViewInit(): void {
    this.setupTutorial();
  }

  /**
   * Sets up the tutorial by subscribing to the tutorial service and defining the steps.
   */
  private setupTutorial(): void {
    this.tutorialService.trigger$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((route: string) => {
        if (!route.includes('analytical')) return;

        const steps: TutorialStep[] = [
          {
            target: 'app-sample-reception',
            title: 'Recepción de muestras',
            message: 'Este panel se utiliza para buscar y registrar la recepción de muestras.',
            position: 'right'
          },
          {
            target: 'app-sample-reception app-generic-table button:has(.pi-filter)',
            title: 'Filtros avanzados',
            message: 'Usa este botón para filtrar muestras por area.',
            position: 'right',
            highlightPadding: 10
          },
          {
            target: 'app-sample-reception app-generic-table span',
            title: 'Búsqueda rápida',
            message: 'Escribe aquí para realizar una busqueda rapida de muestras.',
            position: 'bottom',
            highlightPadding: 10
          },
          {
            target: 'app-sample-reception app-generic-table button:has(.pi-download)',
            title: 'Exportar tabla',
            message: 'Usa este botón para exportar los datos de la tabla en formato pdf o excel.',
            position: 'left',
            highlightPadding: 10
          },
          {
            target: 'app-sample-reception app-generic-table tbody tr:first-child .sample-checkbox',
            title: 'Selección de muestras',
            message: 'Puedes seleccionar una o varias muestras usando estas casillas para realizar acciones en lote.',
            position: 'right'
          },
          {
            target: 'app-sample-reception .register-button ',
            title: 'Registrar muestra',
            message: 'Usa este botón para registrar las muestras seleccionadas',
            position: 'left',
            highlightPadding: 10
          },
          {
            target: 'app-sample-reception app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
            title: 'Acciones individuales',
            message: 'Desde este menú puedes realizar acciones sobre una muestra específica.',
            position: 'left',
            highlightPadding: 10
          },
          {
            target: 'app-worksheet-list',
            title: 'Lista de planillas',
            message: 'Aquí puedes ver y gestionar las planillas de trabajo del área actual.',
            position: 'left'
          },
          {
            target: 'app-worksheet-list .create-worksheet-button',
            title: 'Crear planilla',
            message: 'Usa este botón para crear una nueva planilla de trabajo.',
            position: 'left',
            highlightPadding: 10
          }
        ];

        this.tutorialConfig.set({ steps });
        this.tutorialOverlay.start();
      });
  }
}

