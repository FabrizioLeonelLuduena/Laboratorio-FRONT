import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { AnalysisService } from '../../../application/analysis.service';
import { Analysis } from '../../../domain/analysis.model';
import { AnalysisDeterminationsManagerComponent } from '../analysis-determinations-manager/analysis-determinations-manager.component';
import { AnalysisNbuSelectorComponent } from '../analysis-nbu-selector/analysis-nbu-selector.component';
import { AnalysisSampleTypeSelectorComponent } from '../analysis-sample-type-selector/analysis-sample-type-selector.component';
import { AnalysisWorksheetSettingSelectorComponent } from '../analysis-worksheet-setting-selector/analysis-worksheet-setting-selector.component';


/**
 * Formulario para editar un análisis existente
 * Permite editar solo los campos propios del análisis (no NBU ni Determinaciones)
 */
@Component({
  selector: 'app-analysis-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    SpinnerComponent,
    ButtonModule,
    DividerModule,
    TabsModule,
    AnalysisNbuSelectorComponent,
    AnalysisSampleTypeSelectorComponent,
    AnalysisWorksheetSettingSelectorComponent,
    AnalysisDeterminationsManagerComponent
  ],
  templateUrl: './analysis-edit-form.component.html',
  styleUrl: './analysis-edit-form.component.css'
})
export class AnalysisEditFormComponent implements OnInit {
  @Input() analysis!: Analysis;
  @Output() saved = new EventEmitter<Analysis>();
  @Output() cancelled = new EventEmitter<void>();

  formFields: GenericFormField[] = [];
  initialValue: any = {};
  saving = signal<boolean>(false);

  // Tab selection
  activeTab = signal<string>('basic');

  // Alert state
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';

  // Flags para tracking de cambios en asociaciones
  private nbuChanged = false;
  private sampleTypeChanged = false;
  private worksheetSettingChanged = false;
  private newNbuId?: number;
  private newSampleTypeId?: number;
  private newWorksheetSettingId?: number;

  /**
   * Initializes component dependencies
   */
  constructor(
    private fb: FormBuilder,
    private analysisService: AnalysisService
  ) {}

  /**
   * Initializes the component and loads necessary data
   */
  ngOnInit(): void {
    this.buildFormFields();
    this.setInitialValues();
  }

  /**
   * Construye los campos del formulario
   */
  private buildFormFields(): void {
    this.formFields = [
      {
        name: 'name',
        label: 'Nombre del análisis',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el nombre del análisis',
        colSpan: 2,
        hint: 'Nombre completo del análisis',
        messages: {
          required: 'El nombre del análisis es requerido',
          minLength: 'El nombre debe tener al menos 3 caracteres',
          maxLength: 'El nombre no puede exceder 200 caracteres'
        },
        minlength: 3,
        maxlength: 200
      },
      {
        name: 'code',
        label: 'Código del análisis',
        type: 'text',
        required: false,
        placeholder: 'Ingrese el código (opcional)',
        colSpan: 1,
        hint: 'Código interno del análisis'
      },
      {
        name: 'shortCode',
        label: 'Código corto',
        type: 'number',
        required: false,
        placeholder: 'Ingrese código corto',
        colSpan: 1,
        hint: 'Código corto numérico'
      },
      {
        name: 'familyName',
        label: 'Nombre de familia',
        type: 'text',
        required: false,
        placeholder: 'Ingrese nombre de familia',
        colSpan: 1,
        hint: 'Familia de clasificación'
      },
      {
        name: 'ub',
        label: 'UB (unidad bioquímica)',
        type: 'number',
        required: false,
        placeholder: 'Ingrese valor UB',
        colSpan: 1,
        hint: 'Valor de unidad bioquímica',
        step: 0.01
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        required: false,
        placeholder: 'Ingrese descripción (opcional)',
        colSpan: 2,
        rows: 4,
        hint: 'Información adicional sobre el análisis',
        maxlength: 1000
      }
    ];
  }

  /**
   * Establece los valores iniciales del formulario
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.analysis.name || '',
      code: this.analysis.code || '',
      shortCode: this.analysis.shortCode || null,
      familyName: this.analysis.familyName || '',
      ub: this.analysis.ub || null,
      description: this.analysis.description || ''
    };
  }

  /**
   * Handles NBU selection change
   */
  onNbuSelected(nbuId: number): void {
    this.nbuChanged = true;
    this.newNbuId = nbuId;
  }

  /**
   * Handles sample type selection change
   */
  onSampleTypeSelected(sampleTypeId: number): void {
    this.sampleTypeChanged = true;
    this.newSampleTypeId = sampleTypeId;
  }

  /**
   * Handles worksheet setting selection change
   */
  onWorksheetSettingSelected(worksheetSettingId: number): void {
    this.worksheetSettingChanged = true;
    this.newWorksheetSettingId = worksheetSettingId;
  }

  /**
   * Maneja el submit del formulario
   * Envía solo los campos que fueron modificados (PATCH)
   */
  onSubmit(formData: any): void {
    this.saving.set(true);

    // Construir objeto solo con los campos modificados (en camelCase)
    const updateDTO: Partial<Analysis> = {};

    if (formData.name !== this.initialValue.name) {
      updateDTO.name = formData.name;
    }
    if (formData.code !== this.initialValue.code) {
      updateDTO.code = formData.code || undefined;
    }
    if (formData.shortCode !== this.initialValue.shortCode) {
      updateDTO.shortCode = formData.shortCode || undefined;
    }
    if (formData.familyName !== this.initialValue.familyName) {
      updateDTO.familyName = formData.familyName || undefined;
    }
    if (formData.ub !== this.initialValue.ub) {
      updateDTO.ub = formData.ub || undefined;
    }
    if (formData.description !== this.initialValue.description) {
      updateDTO.description = formData.description || undefined;
    }

    // IMPORTANTE: Siempre agregar entityVersion para control de concurrencia optimista
    // El backend requiere este campo para detectar conflictos de edición concurrente
    updateDTO.entityVersion = this.analysis.entityVersion ?? 0;

    // Verificar si hay cambios en campos básicos o asociaciones
    const hasBasicChanges = Object.keys(updateDTO).length > 1 || !('entityVersion' in updateDTO);
    const hasAssociationChanges = this.nbuChanged || this.sampleTypeChanged || this.worksheetSettingChanged;

    if (!hasBasicChanges && !hasAssociationChanges) {
      this.showAlertMessage('No se detectaron cambios', 'info');
      this.saving.set(false);
      return;
    }

    // Actualizar campos básicos primero (si hay cambios)
    if (hasBasicChanges) {
      this.updateBasicFields(updateDTO);
    } else if (hasAssociationChanges) {
      // Si solo hay cambios en asociaciones, actualizar directamente
      this.updateAssociations();
    }
  }

  /**
   * Updates basic analysis fields
   */
  private updateBasicFields(updateDTO: Partial<Analysis>): void {
    this.analysisService.updateAnalysis(this.analysis.id, updateDTO).subscribe({
      next: (updatedAnalysis: Analysis) => {
        // Si hay cambios en asociaciones, actualizarlos también
        if (this.nbuChanged || this.sampleTypeChanged || this.worksheetSettingChanged) {
          this.updateAssociations();
        } else {
          this.saving.set(false);
          this.showAlertMessage('Análisis actualizado correctamente', 'success');
          setTimeout(() => {
            this.saved.emit(updatedAnalysis);
          }, 1500);
        }
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al actualizar el análisis');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Updates analysis associations (NBU, SampleType, WorksheetSetting)
   */
  private updateAssociations(): void {
    let completedUpdates = 0;
    let totalUpdates = 0;
    let hasErrors = false;

    // Contar cuántas actualizaciones hay que hacer
    if (this.nbuChanged) totalUpdates++;
    if (this.sampleTypeChanged) totalUpdates++;
    if (this.worksheetSettingChanged) totalUpdates++;

    const checkCompletion = () => {
      completedUpdates++;
      if (completedUpdates === totalUpdates) {
        this.saving.set(false);
        if (!hasErrors) {
          this.showAlertMessage('Análisis y asociaciones actualizadas correctamente', 'success');
          // Recargar el análisis para obtener datos actualizados
          this.analysisService.getAnalysisById(this.analysis.id).subscribe({
            next: (updated) => {
              setTimeout(() => {
                this.saved.emit(updated);
              }, 1500);
            }
          });
        }
      }
    };

    // Actualizar NBU si cambió
    if (this.nbuChanged && this.newNbuId) {
      this.analysisService.updateAnalysisNbu(this.analysis.id, this.newNbuId).subscribe({
        next: () => checkCompletion(),
        error: (error) => {
          hasErrors = true;
          const errorMessage = extractErrorMessage(error, 'al actualizar el NBU asociado');
          this.showAlertMessage(errorMessage, 'error');
          checkCompletion();
        }
      });
    }

    // Actualizar SampleType si cambió
    if (this.sampleTypeChanged && this.newSampleTypeId) {
      this.analysisService.updateAnalysisSampleType(this.analysis.id, this.newSampleTypeId).subscribe({
        next: () => checkCompletion(),
        error: (error) => {
          hasErrors = true;
          const errorMessage = extractErrorMessage(error, 'al actualizar el tipo de muestra asociado');
          this.showAlertMessage(errorMessage, 'error');
          checkCompletion();
        }
      });
    }

    // Actualizar WorksheetSetting si cambió
    if (this.worksheetSettingChanged && this.newWorksheetSettingId) {
      this.analysisService.updateAnalysisWorksheetSetting(this.analysis.id, this.newWorksheetSettingId).subscribe({
        next: () => checkCompletion(),
        error: (error) => {
          hasErrors = true;
          const errorMessage = extractErrorMessage(error, 'al actualizar la configuración de hoja asociada');
          this.showAlertMessage(errorMessage, 'error');
          checkCompletion();
        }
      });
    }
  }

  /**
   * Handles determinations added event
   */
  onDeterminationsAdded(determinationIds: number[]): void {
    if (!determinationIds.length) return;

    // Filter out determinations that are already associated with this analysis
    const currentDeterminationIds = new Set(
      (this.analysis.determinations || []).map(d => d.id)
    );
    const newDeterminationIds = determinationIds.filter(id => !currentDeterminationIds.has(id));

    if (!newDeterminationIds.length) {
      this.showAlertMessage('Las determinaciones seleccionadas ya están asociadas a este análisis', 'warning');
      return;
    }

    this.saving.set(true);
    this.analysisService.addDeterminations(this.analysis.id, newDeterminationIds).subscribe({
      next: () => {
        this.showAlertMessage(`${newDeterminationIds.length} determinación(es) agregada(s) correctamente`, 'success');
        // Recargar análisis para reflejar cambios
        this.reloadAnalysis();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al agregar las determinaciones');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Handles determination removed event
   */
  onDeterminationRemoved(determinationId: number): void {
    this.saving.set(true);
    this.analysisService.removeDeterminations(this.analysis.id, [determinationId]).subscribe({
      next: () => {
        this.showAlertMessage('Determinación eliminada correctamente', 'success');
        // Recargar análisis para reflejar cambios
        this.reloadAnalysis();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al eliminar la determinación');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Reloads analysis data after determination changes
   */
  reloadAnalysis(): void {
    this.analysisService.getAnalysisById(this.analysis.id).subscribe({
      next: (updated) => {
        this.analysis = updated;
        this.setInitialValues(); // Re-set initial values to reflect changes
        this.saving.set(false);
      },
      error: (_error) => {
        this.saving.set(false);
        // console.error('Error reloading analysis:', _error);
      }
    });
  }

  /**
   * Maneja la cancelación del formulario
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Muestra un mensaje de alerta
   */
  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;

    // Auto-hide después de 5 segundos
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
