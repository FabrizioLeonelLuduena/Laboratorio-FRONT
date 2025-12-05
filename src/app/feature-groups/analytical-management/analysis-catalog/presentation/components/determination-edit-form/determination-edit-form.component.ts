import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { AuthService } from '../../../../../../core/authentication/auth.service';
import { DeterminationService } from '../../../application/determination.service';
import { Determination } from '../../../domain/determination.model';

/**
 * Formulario para editar una Determinación existente
 */
@Component({
  selector: 'app-determination-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    TagModule,
    DatePipe
  ],
  templateUrl: './determination-edit-form.component.html',
  styleUrl: './determination-edit-form.component.css'
})
export class DeterminationEditFormComponent implements OnInit, OnChanges {
  @ViewChild('genericForm') genericForm!: GenericFormComponent;
  @Input() determination: Determination | null = null;
  @Output() saved = new EventEmitter<Determination>();
  @Output() cancelled = new EventEmitter<void>();

  formFields: GenericFormField[] = [];
  initialValue: any = {};
  saving = false;

  // Alert state
  showAlert = false;
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  alertTitle = '';
  alertText = '';

  /**
   * Initializes component dependencies
   */
  constructor(
    private fb: FormBuilder,
    private determinationService: DeterminationService,
    private authService: AuthService
  ) {}

  /**
   * Gets the current user ID from the authentication service.
   * @returns {number} The current user ID, or 0 if not available
   */
  private getCurrentUserId(): number {
    const user = this.authService.getUser();
    return user?.id ?? 0;
  }

  /**
   * Recorre recursivamente el objeto y elimina cualquier clave que termine en '_datetime'.
   * No se deben enviar fechas al backend en el PUT.
   */
  private removeDateFields(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeDateFields(item));
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        // Omitir campos que terminan en '_datetime'
        if (!key.endsWith('_datetime')) {
          result[key] = this.removeDateFields(value);
        }
      }
      return result;
    }
    return obj;
  }

  /**
   * Determina si se debe enviar result_setting aunque no exista previamente
   * Considera si el usuario tocó algún campo de configuración de resultado
   */
  private shouldSendResultSetting(formData: any): boolean {
    const fields = [
      'isPrintable', 'printOrder', 'printGroup', 'specialPrintName',
      'loadingResultOrder', 'requiresLoadValue', 'requiresApproval', 'canSelfApprove'
    ];
    return fields.some(f => formData[f] !== undefined && formData[f] !== null);
  }

  /**
   * Initializes the component and loads necessary data
   */
  ngOnInit(): void {
    this.buildFormFields();
    this.setInitialValues();
  }

  /**
   * Detects changes to @Input properties
   * Reloads form data when determination changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['determination'] && !changes['determination'].firstChange) {
      // Determination has changed, reload form data
      this.setInitialValues();
    }
  }

  /**
   * Construye los campos del formulario con todas las propiedades necesarias
   */
  private buildFormFields(): void {
    this.formFields = [
      // --- Información Básica ---
      {
        name: 'name',
        label: 'Nombre de la determinación',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el nombre',
        colSpan: 2,
        hint: 'Campo requerido',
        messages: {
          required: 'El nombre es requerido',
          minLength: 'El nombre debe tener al menos 3 caracteres',
          maxLength: 'El nombre debe tener menos de 255 caracteres'
        }
      },
      {
        name: 'percentageVariationTolerated',
        label: 'Variación porcentual tolerada (%)',
        type: 'number',
        required: false,
        placeholder: 'Ej: 5',
        colSpan: 2,
        hint: 'Porcentaje de variación aceptable',
        step: 0.01
      },

      // --- Tiempo de Manipulación ---
      {
        name: 'handlingTimeValue',
        label: 'Tiempo de manipulación',
        type: 'number',
        required: false,
        placeholder: 'Valor',
        colSpan: 1,
        hint: 'Tiempo requerido para procesar'
      },
      {
        name: 'handlingTimeUnit',
        label: 'Unidad de tiempo',
        type: 'select',
        required: false,
        placeholder: 'Seleccione unidad',
        colSpan: 1,
        options: [
          { label: 'Segundos', value: 'SECONDS' },
          { label: 'Minutos', value: 'MINUTES' },
          { label: 'Horas', value: 'HOURS' },
          { label: 'Días', value: 'DAYS' },
          { label: 'Semanas', value: 'WEEKS' },
          { label: 'Meses', value: 'MONTHS' },
          { label: 'Años', value: 'YEARS' }
        ]
      },

      // --- Pre-Analytical Phase ---
      {
        name: 'preIndications',
        label: 'Indicaciones previas',
        type: 'textarea',
        required: false,
        placeholder: 'Indicaciones para el paciente antes del análisis',
        colSpan: 2,
        rows: 3,
        hint: 'Instrucciones pre-analíticas'
      },
      {
        name: 'observations',
        label: 'Observaciones pre-analíticas',
        type: 'textarea',
        required: false,
        placeholder: 'Observaciones generales',
        colSpan: 2,
        rows: 3,
        hint: 'Notas adicionales'
      },

      // --- Result Settings ---
      {
        name: 'isPrintable',
        label: '¿Es imprimible?',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        hint: 'Si el resultado se puede imprimir'
      },
      {
        name: 'printOrder',
        label: 'Orden de impresión',
        type: 'number',
        required: false,
        placeholder: 'Ej: 1',
        colSpan: 1,
        hint: 'Orden en el informe impreso'
      },
      {
        name: 'printGroup',
        label: 'Grupo de impresión',
        type: 'number',
        required: false,
        placeholder: 'Ej: 1',
        colSpan: 1,
        hint: 'Agrupación en el informe'
      },
      {
        name: 'specialPrintName',
        label: 'Nombre especial para impresión',
        type: 'text',
        required: false,
        placeholder: 'Nombre alternativo',
        colSpan: 1,
        hint: 'Nombre que aparece en el informe'
      },
      {
        name: 'loadingResultOrder',
        label: 'Orden de carga de resultado',
        type: 'number',
        required: false,
        placeholder: 'Ej: 1',
        colSpan: 1,
        hint: 'Orden al cargar resultados'
      },
      {
        name: 'requiresLoadValue',
        label: '¿Requiere valor de carga?',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        hint: 'Si debe cargarse un valor'
      },
      {
        name: 'requiresApproval',
        label: '¿Requiere aprobación?',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        hint: 'Si debe ser aprobado'
      },
      {
        name: 'canSelfApprove',
        label: '¿Puede auto-aprobar?',
        type: 'checkbox',
        required: false,
        colSpan: 1,
        hint: 'Si puede aprobar sus propios resultados'
      }
    ];
  }

  /**
   * Establece los valores iniciales del formulario
   */
  private setInitialValues(): void {
    this.initialValue = {
      name: this.determination?.name || '',
      percentageVariationTolerated: this.determination?.percentageVariationTolerated || null,

      // Handling Time
      handlingTimeValue: this.determination?.handlingTime?.timeValue || null,
      handlingTimeUnit: this.determination?.handlingTime?.timeUnit || 'HOURS',

      // Pre-Analytical Phase
      preIndications: this.determination?.preAnalyticalPhaseSetting?.preIndications || '',
      observations: this.determination?.preAnalyticalPhaseSetting?.observations || '',

      // Result Settings
      isPrintable: this.determination?.resultSetting?.isPrintable ?? true,
      printOrder: this.determination?.resultSetting?.printOrder || null,
      printGroup: this.determination?.resultSetting?.printGroup || null,
      specialPrintName: this.determination?.resultSetting?.specialPrintName || '',
      loadingResultOrder: this.determination?.resultSetting?.loadingResultOrder || null,
      requiresLoadValue: this.determination?.resultSetting?.requiresLoadValue ?? true,
      requiresApproval: this.determination?.resultSetting?.requiresApproval ?? true,
      canSelfApprove: this.determination?.resultSetting?.canSelfApprove ?? false
    };
  }

  /**
   * Maneja el submit del formulario
   * Construye el DTO completo con todos los objetos anidados requeridos por el backend
   */
  onSubmit(formData: any): void {
    this.saving = true;

    const isNew = !this.determination || !this.determination.id;
    const currentUserId = this.getCurrentUserId();

    // Construir el DTO completo según la estructura del backend
    // NOTA: No incluimos campos de fecha (created_datetime, last_updated_datetime) ya que el backend no los requiere
    const determinationDTO: any = {
      id: this.determination?.id ?? 0,
      name: formData.name,
      entity_version: this.determination?.entityVersion ?? 0,
      created_user: this.determination?.createdUser ?? (isNew ? currentUserId : 0),
      last_updated_user: currentUserId,
      percentage_variation_tolerated: formData.percentageVariationTolerated ?? 0,

      // Pre-Analytical Phase Setting (solo si existe o si el usuario completó algo)
      // Si existe en this.determination, usar id y entity_version reales
      // Si no existe pero el usuario ingresó valores:
      //   - Si es nueva determinación: crear con id: 0
      //   - Si es edición: no enviar (para evitar error de versión optimista si existe en BD pero no está cargado)
      pre_analytical_phase_setting: (this.determination?.preAnalyticalPhaseSetting || (isNew && (formData.preIndications || formData.observations))) ? (
        this.determination?.preAnalyticalPhaseSetting && this.determination.preAnalyticalPhaseSetting.id > 0 ? {
          // Existe con id válido: usar id y entity_version reales
          id: this.determination.preAnalyticalPhaseSetting.id,
          observations: formData.observations || '',
          entity_version: this.determination.preAnalyticalPhaseSetting.entityVersion ?? 0,
          created_user: this.determination.preAnalyticalPhaseSetting.createdUser ?? 0,
          last_updated_user: currentUserId,
          pre_indications: formData.preIndications || ''
        } : isNew ? {
          // No existe y es nueva determinación: crear nuevo con id: 0
          id: 0,
          observations: formData.observations || '',
          entity_version: 0,
          created_user: currentUserId,
          last_updated_user: currentUserId,
          pre_indications: formData.preIndications || ''
        } : null
      ) : null,

      // Analytical Phase Setting (enviar null si no existe)
      // Si existe, limpiar campos de fecha antes de incluir
      analytical_phase_setting: this.determination?.analyticalPhaseSetting
        ? this.removeDateFields(this.determination.analyticalPhaseSetting)
        : null,

      // Post-Analytical Phase Setting (enviar null si no existe)
      // Si existe, limpiar campos de fecha antes de incluir
      post_analytical_phase_setting: this.determination?.postAnalyticalPhaseSetting
        ? this.removeDateFields(this.determination.postAnalyticalPhaseSetting)
        : null,

      // Result Setting: enviar objeto si existe o si el usuario completó campos
      result_setting: (this.determination?.resultSetting || this.shouldSendResultSetting(formData)) ? (
        this.determination?.resultSetting ? {
          id: this.determination!.resultSetting!.id,
          entity_version: this.determination!.resultSetting!.entityVersion ?? 0,
          created_user: this.determination!.resultSetting!.createdUser ?? 0,
          last_updated_user: currentUserId,
          is_printable: (formData.isPrintable ?? this.determination!.resultSetting!.isPrintable) ?? true,
          print_order: (formData.printOrder ?? this.determination!.resultSetting!.printOrder) ?? 0,
          print_group: (formData.printGroup ?? this.determination!.resultSetting!.printGroup) ?? 0,
          special_print_name: (formData.specialPrintName ?? this.determination!.resultSetting!.specialPrintName) ?? '',
          loading_result_order: (formData.loadingResultOrder ?? this.determination!.resultSetting!.loadingResultOrder) ?? 0,
          requires_load_value: (formData.requiresLoadValue ?? this.determination!.resultSetting!.requiresLoadValue) ?? true,
          requires_approval: (formData.requiresApproval ?? this.determination!.resultSetting!.requiresApproval) ?? true,
          can_self_approve: (formData.canSelfApprove ?? this.determination!.resultSetting!.canSelfApprove) ?? false
        } : {
          // Nuevo ResultSetting (sin id)
          entity_version: 0,
          created_user: currentUserId,
          last_updated_user: currentUserId,
          is_printable: (formData.isPrintable ?? true),
          print_order: (formData.printOrder ?? 0),
          print_group: (formData.printGroup ?? 0),
          special_print_name: (formData.specialPrintName ?? ''),
          loading_result_order: (formData.loadingResultOrder ?? 0),
          requires_load_value: (formData.requiresLoadValue ?? true),
          requires_approval: (formData.requiresApproval ?? true),
          can_self_approve: (formData.canSelfApprove ?? false)
        }
      ) : null,

      // Handling Time: enviar solo si tiene valores válidos
      // Si existe en this.determination, usar id y entity_version reales
      // Si no existe pero el usuario ingresó valores:
      //   - Si es nueva determinación: crear nuevo (sin id para que el backend lo cree)
      //   - Si es edición: no enviar (para evitar error de versión optimista si existe en BD pero no está cargado)
      handling_time: (() => {
        const handlingTime = this.determination?.handlingTime;
        const hasHandlingTime = handlingTime && handlingTime.id && handlingTime.id > 0;
        const hasFormValues = formData.handlingTimeValue && formData.handlingTimeValue > 0;

        if (hasHandlingTime && handlingTime) {
          // Existe con id válido: usar id y entity_version reales
          return {
            id: handlingTime.id,
            entity_version: handlingTime.entityVersion ?? 0,
            created_user: handlingTime.createdUser ?? 0,
            last_updated_user: currentUserId,
            time_value: (formData.handlingTimeValue ?? handlingTime.timeValue) ?? 0,
            time_unit: (formData.handlingTimeUnit ?? handlingTime.timeUnit) ?? 'HOURS'
          };
        } else if (isNew && hasFormValues) {
          // No existe y es nueva determinación: crear nuevo sin id para que el backend lo cree
          return {
            entity_version: 0,
            created_user: currentUserId,
            last_updated_user: currentUserId,
            time_value: formData.handlingTimeValue ?? 0,
            time_unit: formData.handlingTimeUnit ?? 'HOURS'
          };
        }
        return null;
      })()
    };

    // Eliminar cualquier campo de fecha que pueda estar en objetos anidados
    let payload = this.removeDateFields(determinationDTO);

    // Para creaciones (id: 0), omitir el id para que el backend lo cree automáticamente
    // El error "Entity not found with id: 0" sugiere que el backend interpreta id: 0 como actualización
    if (isNew) {
      // Crear un nuevo objeto sin el campo id
      const { id: _id, ...payloadWithoutId } = payload;
      payload = payloadWithoutId;
    }

    // Llamar al servicio PUT para crear o actualizar
    this.determinationService.createOrUpdateDetermination(payload).subscribe({
      next: (result: Determination) => {
        this.saving = false;
        const message = isNew
          ? 'Determinación creada exitosamente'
          : 'Determinación actualizada exitosamente';
        this.displayAlert('success', '¡Éxito!', message);

        setTimeout(() => {
          this.saved.emit(result);
        }, 1500);
      },
      error: (error: any) => {
        this.saving = false;
        const errorMessage = extractErrorMessage(error, 'al guardar la determinación');
        this.displayAlert('error', 'Error', errorMessage);
      }
    });
  }

  /**
   * Dispara el submit del formulario genérico
   */
  triggerSubmit(): void {
    if (this.genericForm) {
      this.genericForm.onSubmit();
    }
  }

  /**
   * Maneja la cancelación del formulario
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Muestra una alerta
   */
  private displayAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    text: string
  ): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
