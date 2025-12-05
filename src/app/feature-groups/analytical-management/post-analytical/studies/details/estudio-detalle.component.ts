import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { from } from 'rxjs';

import { concatMap, finalize, tap } from 'rxjs/operators';

import { GenericAlertComponent, AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { ResultStatus, StudyDetailDto } from '../../models/models';
import { EstudiosService } from '../../services/estudios.service';
import { ResultsService } from '../../services/results.service';

import { EstudioInfoCardComponent } from './info-patient/estudio-info-card.component';
import { EstudioResultsAccordionComponent } from './results-accordion/estudio-results-accordion.component';


/**
 * Component for displaying study details - Container component
 */
@Component({
  selector: 'app-estudio-detalle',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DynamicDialogModule,
    EstudioInfoCardComponent,
    EstudioResultsAccordionComponent,
    GenericAlertComponent,
    GenericButtonComponent
  ],
  providers: [ResultsService],
  templateUrl: './estudio-detalle.component.html',
  styleUrls: ['./estudio-detalle.component.css']
})
/**
 * EstudioDetalleComponent - Container component that orchestrates child components
 */
export class EstudioDetalleComponent implements OnInit {
  @Input() estudio?: StudyDetailDto;
  @Output() volver = new EventEmitter<void>();

  loading: boolean = false;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';
  validatingAll = false;

  /**
   * Hardcode until the users exists
   */
  private readonly professionalExternalId = 1;

  /**
   * Constructor
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudioService: EstudiosService,
    private resultsService: ResultsService
  ) {}

  /**
   * Initializes the component
   */
  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id && !this.estudio) {
      this.cargarEstudio(id);
    }
  }

  /**
   * Load study details
   */
  cargarEstudio(id: number) {
    this.loading = true;
    this.estudioService.getStudyDetail(id).subscribe({
      next: (detalle) => {
        this.estudio = detalle;
        this.loading = false;
      },
      error: () => {
        this.showAlert('error', 'Error', 'Error al cargar el detalle del estudio');
        this.loading = false;
      }
    });
  }

  /**
   * Handles firma realizada event from signature component
   */
  onFirmaRealizada() {
    // Recargar el estudio para mostrar el estado actualizado
    if (this.estudio) {
      this.cargarEstudio(this.estudio.id);
    }
  }

  /**
   * Handles determinations edited event
   */
  onDeterminationsEdited() {
    // Recargar el estudio para mostrar los cambios
    if (this.estudio) {
      this.cargarEstudio(this.estudio.id);
    }
  }

  /**
   * Handles successful signature event
   */
  onFirmaExitosa(mensaje: string) {
    this.showAlert('success', 'Firma exitosa', mensaje);
  }

  /**
   * Handles signature error event
   */
  onFirmaError(mensaje: string) {
    this.showAlert('error', 'Error en firma', mensaje);
  }

  /**
   * Emits event to go back to the list
   */
  onVolver() {
    this.volver.emit();
  }

  /**
   * Valida todas las determinaciones de todos los resultados
   */
  onValidateAllResults() {
    if (!this.estudio) return;

    // Filtrar solo los resultados que no están validados o firmados
    const resultsToValidate = this.estudio.results.filter(
      r => r.currentStatus !== ResultStatus.VALIDATED && r.currentStatus !== ResultStatus.SIGNED
    );

    if (resultsToValidate.length === 0) {
      this.showAlert('info', 'Información', 'No hay resultados pendientes de validar');
      return;
    }

    this.validatingAll = true;

    // Usar concatMap para ejecutar las validaciones secuencialmente
    from(resultsToValidate).pipe(
      concatMap(result =>
        this.resultsService.validateAll(result.id, this.professionalExternalId).pipe(
          tap(updatedResult => {
            // Actualizar el resultado individual inmediatamente
            if (this.estudio) {
              const idx = this.estudio.results.findIndex(r => r.id === updatedResult.id);
              if (idx !== -1) {
                this.estudio.results[idx] = updatedResult;
              }
            }
          })
        )
      ),
      finalize(() => {
        // Se ejecuta al finalizar todas las validaciones
        this.validatingAll = false;
        if (this.estudio) {
          this.cargarEstudio(this.estudio.id);
        }
        this.showAlert('success', 'Validación exitosa', 'Todos los resultados han sido validados');
      })
    ).subscribe({
      error: () => {
        this.validatingAll = false;
        this.showAlert('error', 'Error en validación', 'Error al validar algunos resultados');
      }
    });
  }

  /**
   * Verifica si hay resultados pendientes de validar
   */
  hasResultsToValidate(): boolean {
    if (!this.estudio) return false;
    return this.estudio.results.some(
      r => r.currentStatus !== ResultStatus.VALIDATED && r.currentStatus !== ResultStatus.SIGNED
    );
  }

  /**
   * Handle messages from child components
   */
  onShowMessage(event: { type: string; title: string; message: string }) {
    this.showAlert(event.type as AlertType, event.title, event.message);
  }

  /**
   * Helper method to display alert messages
   * @param type - Type of alert (success, error, warning, info)
   * @param title - Alert title
   * @param text - Alert message text
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }
}

