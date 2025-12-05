import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { NbuVersionService } from '../../../application/nbu-version.service';
import { NbuService } from '../../../application/nbu.service';
import { NbuVersion } from '../../../domain/nbu-version.model';
import { Nbu } from '../../../domain/nbu.model';
import { NbuAbbreviationsManagerComponent } from '../nbu-abbreviations-manager/nbu-abbreviations-manager.component';
import { NbuSynonymsManagerComponent } from '../nbu-synonyms-manager/nbu-synonyms-manager.component';

/**
 * Form for editing an existing NBU.
 * IMPORTANT: NBUs can be shared between multiple analyses.
 * It is recommended to create a new one instead of editing if there are conflicts.
 */
@Component({
  selector: 'app-nbu-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    TagModule,
    TabsModule,
    DividerModule,
    NbuSynonymsManagerComponent,
    NbuAbbreviationsManagerComponent
  ],
  templateUrl: './nbu-edit-form.component.html',
  styleUrl: './nbu-edit-form.component.css'
})
export class NbuEditFormComponent implements OnInit {
  @Input() nbu!: Nbu;
  @Input() readOnly = false; // If true, only shows info without allowing editing
  @Input() currentUb?: number; // UB value from the analysis
  @Output() saved = new EventEmitter<Nbu>();
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

  // Versions where the NBU is associated (from nbu_detail)
  nbuVersionsWithUb = signal<Array<{ version: NbuVersion; ub: number }>>([]);
  loadingVersions = signal<boolean>(false);

  /**
   * Initializes component dependencies
   */
  constructor(
    private nbuService: NbuService,
    private nbuVersionService: NbuVersionService
  ) {}

  /**
   * Initializes the component and loads necessary data
   */
  ngOnInit(): void {
    this.buildFormFields();
    this.setInitialValues();
    this.loadNbuVersionsWithDetails();

    if (this.readOnly) {
      this.showAlertMessage(
        'Este NBU podría estar compartido entre múltiples análisis. La edición está deshabilitada para prevenir cambios no deseados.',
        'warning'
      );
    }
  }

  /**
   * Loads versions where the NBU is associated from the nbu_detail endpoint.
   */
  private loadNbuVersionsWithDetails(): void {
    if (!this.nbu?.id) {
      return;
    }

    this.loadingVersions.set(true);

    this.nbuVersionService.getNbuVersionsWithDetails().subscribe({
      next: (versionsWithDetails) => {
        const nbuId = this.nbu.id!;
        const versionsWithUb: Array<{ version: NbuVersion; ub: number }> = [];

        // Filter versions where the NBU is associated
        versionsWithDetails.forEach(v => {
          const nbuDetail = v.nbuDetails?.find(d => d.nbu?.id === nbuId);
          if (nbuDetail) {
            // Use object destructuring to separate nbuDetails from the rest of the version data
            const { nbuDetails, ...versionData } = v;
            versionsWithUb.push({
              version: versionData as NbuVersion,
              ub: nbuDetail.ub
            });
          }
        });

        this.nbuVersionsWithUb.set(versionsWithUb);
        this.loadingVersions.set(false);
      },
      error: (_error) => {
        // console.error('Error loading NBU versions with details:', _error);
        this.loadingVersions.set(false);
      }
    });
  }

  /**
   * Builds the form fields.
   */
  private buildFormFields(): void {
    this.formFields = [
      {
        name: 'nbuCode',
        label: 'Código NBU',
        type: 'number',
        required: true,
        placeholder: 'Ingresar código NBU',
        colSpan: 1,
        hint: 'Identificador único NBU',
        disabled: this.readOnly,
        messages: {
          required: 'El código NBU es requerido'
        }
      },
      {
        name: 'nbuType',
        label: 'Tipo NBU',
        type: 'text',
        required: false,
        placeholder: 'Ingresar tipo NBU (ej., PMO)',
        colSpan: 1,
        disabled: this.readOnly,
        hint: 'Clasificación de tipo'
      },
      {
        name: 'determination',
        label: 'Determinación',
        type: 'text',
        required: false,
        placeholder: 'Ingresar nombre de determinación',
        colSpan: 2,
        disabled: this.readOnly,
        hint: 'Descripción de la determinación NBU'
      },
      {
        name: 'specificStandardInterpretation',
        label: 'Interpretación estándar específica',
        type: 'textarea',
        required: false,
        placeholder: 'Ingresar interpretación (opcional)',
        colSpan: 3,
        rows: 3,
        disabled: this.readOnly,
        hint: 'Información adicional de interpretación'
      },
      {
        name: 'isUrgency',
        label: 'Es urgencia',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        disabled: this.readOnly
      },
      {
        name: 'isByReference',
        label: 'Es por referencia',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        disabled: this.readOnly
      },
      {
        name: 'isInfrequent',
        label: 'Es infrecuente',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        disabled: this.readOnly
      }
    ];
  }

  /**
   * Sets the initial form values.
   */
  private setInitialValues(): void {
    this.initialValue = {
      nbuCode: this.nbu.nbuCode || null,
      nbuType: this.nbu.nbuType || '',
      determination: this.nbu.determination || '',
      specificStandardInterpretation: this.nbu.specificStandardInterpretation || '',
      isUrgency: this.nbu.isUrgency || false,
      isByReference: this.nbu.isByReference || false,
      isInfrequent: this.nbu.isInfrequent || false
    };
  }

  /**
   * Handles form submission.
   * Sends only the fields that were modified (PATCH).
   */
  onSubmit(formData: any): void {
    if (this.readOnly) {
      this.showAlertMessage('Este NBU no puede ser editado en este modo.', 'warning');
      return;
    }

    this.saving.set(true);

    // Build object only with modified fields
    const updateDTO: any = {};

    if (formData.nbuCode !== this.initialValue.nbuCode) {
      updateDTO.nbu_code = formData.nbuCode;
    }
    if (formData.nbuType !== this.initialValue.nbuType) {
      updateDTO.nbu_type = formData.nbuType || null;
    }
    if (formData.determination !== this.initialValue.determination) {
      updateDTO.determination = formData.determination || null;
    }
    if (formData.specificStandardInterpretation !== this.initialValue.specificStandardInterpretation) {
      updateDTO.specific_standard_interpretation = formData.specificStandardInterpretation || null;
    }
    if (formData.isUrgency !== this.initialValue.isUrgency) {
      updateDTO.is_urgency = formData.isUrgency || null;
    }
    if (formData.isByReference !== this.initialValue.isByReference) {
      updateDTO.is_by_reference = formData.isByReference || null;
    }
    if (formData.isInfrequent !== this.initialValue.isInfrequent) {
      updateDTO.is_infrequent = formData.isInfrequent || null;
    }

    // If there are no changes, do nothing
    if (Object.keys(updateDTO).length === 0) {
      this.showAlertMessage('No se detectaron cambios', 'info');
      this.saving.set(false);
      return;
    }

    // Call service with PATCH (only modified fields)
    this.nbuService.updateNbu(this.nbu.id, updateDTO).subscribe({
      next: (updatedNbu: Nbu) => {
        this.saving.set(false);
        this.showAlertMessage('NBU actualizado exitosamente', 'success');
        
        setTimeout(() => {
          this.saved.emit(updatedNbu);
        }, 1500);
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al actualizar el NBU');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Handles synonyms added event
   */
  onSynonymsAdded(synonyms: string[]): void {
    this.saving.set(true);

    this.nbuService.addSynonyms(this.nbu.id, synonyms).subscribe({
      next: () => {
        const count = synonyms.length;
        const message = count === 1 
          ? 'Sinónimo agregado exitosamente' 
          : `${count} sinónimos agregados exitosamente`;
        this.showAlertMessage(message, 'success');
        this.reloadNbu();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al agregar los sinónimos');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Handles synonym removed event
   */
  onSynonymRemoved(synonym: string): void {
    this.saving.set(true);

    this.nbuService.removeSynonyms(this.nbu.id, [synonym]).subscribe({
      next: () => {
        this.showAlertMessage('Sinónimo eliminado exitosamente', 'success');
        this.reloadNbu();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al eliminar el sinónimo');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Handles abbreviations added event
   */
  onAbbreviationsAdded(abbreviations: string[]): void {
    this.saving.set(true);

    this.nbuService.addAbbreviations(this.nbu.id, abbreviations).subscribe({
      next: () => {
        const count = abbreviations.length;
        const message = count === 1 
          ? 'Abreviatura agregada exitosamente' 
          : `${count} abreviaturas agregadas exitosamente`;
        this.showAlertMessage(message, 'success');
        this.reloadNbu();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al agregar las abreviaturas');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Handles abbreviation removed event
   */
  onAbbreviationRemoved(abbreviation: string): void {
    this.saving.set(true);

    this.nbuService.removeAbbreviations(this.nbu.id, [abbreviation]).subscribe({
      next: () => {
        this.showAlertMessage('Abreviatura eliminada exitosamente', 'success');
        this.reloadNbu();
      },
      error: (error: any) => {
        this.saving.set(false);
        const errorMessage = extractErrorMessage(error, 'al eliminar la abreviatura');
        this.showAlertMessage(errorMessage, 'error');
      }
    });
  }

  /**
   * Reloads NBU data after changes
   */
  private reloadNbu(): void {
    this.nbuService.getNbuById(this.nbu.id).subscribe({
      next: (updated) => {
        this.nbu = updated;
        this.saving.set(false);
      },
      error: (_error) => {
        this.saving.set(false);
        // console.error('Error reloading NBU:', _error);
      }
    });
  }

  /**
   * Handles form cancellation.
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Shows an alert message.
   * @param message - The message to display.
   * @param type - The alert type (success, error, warning, info).
   */
  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
