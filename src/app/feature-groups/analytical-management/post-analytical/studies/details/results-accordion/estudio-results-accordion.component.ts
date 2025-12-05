/* eslint-disable import/order */
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TagModule } from 'primeng/tag';

import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';

import { ResultDetailDto, ResultStatus, StudyStatus, ValidationStatus } from '../../../models/models';
import { ResultsService } from '../../../services/results.service';

import { EditDeterminationsDialogComponent } from './edit-determinations-dialog.component';
/* eslint-enable import/order */

/**
 * Component for displaying study results in accordion format
 */
@Component({
  selector: 'app-estudio-results-accordion',
  standalone: true,
  imports: [CommonModule, AccordionModule, BadgeModule, TagModule, GenericButtonComponent],
  templateUrl: './estudio-results-accordion.component.html',
  styleUrls: ['./estudio-results-accordion.component.css'],
  providers: [ResultsService, DialogService]
})

export class EstudioResultsAccordionComponent {
  @Input({ required: true }) results!: ResultDetailDto[];
  @Input({ required: true }) studyStatus!: StudyStatus;
  @Input({ required: true }) protocolCode!: string;
  @Output() validatedAll = new EventEmitter<void>();
  @Output() determinationsEdited = new EventEmitter<void>();
  @Output() showMessage = new EventEmitter<{ type: string; title: string; message: string }>();

  /**
   * Hardcode until the users exists
   */
  private readonly professionalExternalId = 1;

  /**
   * Dialog reference
   */
  private dialogRef: DynamicDialogRef | undefined;

  /**
   * Constructor
   * @param resultsService Results service for API calls
   * @param cdr ChangeDetectorRef for manual change detection
   * @param dialogService Dialog service for opening dialogs
   */
  constructor(
    private resultsService: ResultsService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  /**
   * Valida todas las determinaciones de un resultado
   */
  onValidateAll(result: ResultDetailDto) {
    this.resultsService.validateAll(result.id, this.professionalExternalId).subscribe({
      next: (updatedResult: ResultDetailDto) => {
        // Crear un nuevo array con el resultado actualizado
        this.results = this.results.map(r =>
          r.id === updatedResult.id ? updatedResult : r
        );
        this.cdr.detectChanges(); // Forzar detección de cambios
        this.validatedAll.emit();
        this.showMessage.emit({
          type: 'success',
          title: 'Validación exitosa',
          message: `Todas las determinaciones de ${result.resultTypeName} han sido validadas`
        });
      },
      error: () => {
        this.showMessage.emit({
          type: 'error',
          title: 'Error',
          message: 'Error al validar las determinaciones'
        });
      }
    });
  }

  /**
   * Verifica si todas las determinaciones de un resultado están validadas manualmente
   */
  isResultManuallyValidated(result: ResultDetailDto): boolean {
    if (!result?.determinations || result.determinations.length === 0) {
      return false;
    }
    return result.determinations.every(det => det.manualValidationStatus === ValidationStatus.VALID);
  }

  /**
   * Opens edit determinations dialog
   */
  onEditDeterminations(result: ResultDetailDto) {
    this.dialogRef = this.dialogService.open(EditDeterminationsDialogComponent, {
      header: `Editar Determinaciones - ${result.resultTypeName}`,
      width: '700px',
      modal: true,
      dismissableMask: true,
      data: {
        determinations: result.determinations,
        studyStatus: this.studyStatus,
        resultStatus: result.currentStatus,
        protocolCode: this.protocolCode,
        analyticResultId: result.analyticResultId
      }
    });

    this.dialogRef.onClose.subscribe((data) => {
      if (data && data.determinations) {
        this.saveDeterminations(data.protocolCode, data.analyticResultId, data.determinations);
      }
    });
  }

  /**
   * Saves edited determinations
   */
  private saveDeterminations(protocolCode: string, analyticResultId: string, determinations: any[]) {
    this.resultsService.editDeterminations(
      protocolCode,
      analyticResultId,
      { determinations }
    ).subscribe({
      next: (response) => {
        if (response.errors && response.errors.length > 0) {
          const errorMsg = `Operación completada con advertencias:\n${response.errors.join('\n')}`;
          this.showMessage.emit({
            type: 'warn',
            title: 'Operación parcial',
            message: `Agregadas: ${response.added}, Actualizadas: ${response.updated}. ${errorMsg}`
          });
        } else {
          this.showMessage.emit({
            type: 'success',
            title: 'Operación exitosa',
            message: `Agregadas: ${response.added}, Actualizadas: ${response.updated}`
          });
        }
        this.determinationsEdited.emit();
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'Error al editar determinaciones';
        this.showMessage.emit({
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
      }
    });
  }

  /**
   * Check if study is closed
   */
  isStudyClosed(): boolean {
    return this.studyStatus === StudyStatus.CLOSED;
  }

  // Expose enums to template
  readonly ResultStatus = ResultStatus;
  readonly ValidationStatus = ValidationStatus;

  /**
   * Get result status label
   */
  getResultStatusLabel(status: ResultStatus): string {
    switch (status) {
    case ResultStatus.PENDING:
      return 'PENDIENTE';
    case ResultStatus.VALIDATING:
      return 'VALIDANDO';
    case ResultStatus.VALIDATED:
      return 'VALIDADO';
    case ResultStatus.SIGNED:
      return 'FIRMADO';
    case ResultStatus.REJECTED:
      return 'RECHAZADO';
    default:
      return 'DESCONOCIDO';
    }
  }

  /**
   * Get result status severity
   */
  getResultStatusSeverity(status: ResultStatus): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
    case ResultStatus.SIGNED:
      return 'success';
    case ResultStatus.VALIDATED:
      return 'info';
    case ResultStatus.VALIDATING:
      return 'warn';
    case ResultStatus.REJECTED:
      return 'danger';
    default:
      return 'warn';
    }
  }

  /**
   * Gets the severity for the validation badge
   */
  getValidationSeverity(validationStatus: ValidationStatus): 'success' | 'danger' | 'warn' | 'info' {
    switch (validationStatus) {
    case ValidationStatus.VALID:
      return 'success';
    case ValidationStatus.INVALID:
    case ValidationStatus.REJECTED:
      return 'danger';
    case ValidationStatus.PENDING:
      return 'warn';
    default:
      return 'info';
    }
  }
}

