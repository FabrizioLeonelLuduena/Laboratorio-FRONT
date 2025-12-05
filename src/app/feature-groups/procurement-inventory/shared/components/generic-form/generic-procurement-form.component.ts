import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  ReactiveFormsModule,
  ValidatorFn
} from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
// Shared
import {
  GenericAlertComponent,
  AlertType
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { CuitFormatPipe } from 'src/app/shared/pipes/cuit-format.pipe';

// Models
import {
  GenericFormConfig,
  FormFieldConfig,
  ProcurementValidationConstants
} from '../../../models/form-config.model';

/**
 * Componente genérico de formulario reactivo para procurement-inventory
 * 
 * Características:
 * - Configuración dinámica mediante objeto config
 * - Soporte para múltiples secciones
 * - Campos de diversos tipos (text, email, number, textarea, checkbox, select, date, array)
 * - Validaciones personalizables
 * - Formularios anidados (arrays)
 * - Modo edición/creación/solo lectura
 * 
 * @example
 * ```html
 * <app-generic-procurement-form
 *   [config]="formConfig"
 *   [initialData]="supplierData"
 *   [loading]="isLoading"
 *   (formSubmit)="onSave($event)"
 *   (formCancel)="onCancel()">
 * </app-generic-procurement-form>
 * ```
 */
@Component({
  selector: 'app-generic-procurement-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericAlertComponent,
    ConfirmationModalComponent,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    InputTextModule,
    InputTextarea,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    TooltipModule,
    MessageModule,
    CuitFormatPipe
  ],
  templateUrl: './generic-procurement-form.component.html',
  styleUrls: ['./generic-procurement-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericProcurementFormComponent implements OnInit, OnChanges {
  /**
   * Configuración del formulario
   */
  @Input() config!: GenericFormConfig;

  /**
   * Datos iniciales para poblar el formulario
   */
  @Input() initialData?: any;

  /**
   * Estado de carga
   */
  @Input() loading = false;

  /**
   * Estado de guardado
   */
  @Input() saving = false;

  /**
   * Evento emitido al enviar el formulario
   */
  @Output() formSubmit = new EventEmitter<any>();

  /**
   * Evento emitido al cancelar
   */
  @Output() formCancel = new EventEmitter<void>();

  /**
   * Evento emitido cuando el formulario cambia
   */
  @Output() formChange = new EventEmitter<any>();

  // Formulario reactivo
  form!: FormGroup;

  // Estado de alertas
  showAlert = false;
  alertMessage = '';
  alertType: AlertType = 'info';

  // Estado de confirmación
  showConfirmation = false;
  confirmationMessage = '';
  pendingRemoval: { fieldName: string; index: number } | null = null;

  // Constantes de validación
  validationConstants = ProcurementValidationConstants;

  /**
   * Constructor
   */
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Inicialización del componente
   */
  ngOnInit(): void {
    this.buildForm();
    
    if (this.initialData) {
      this.populateForm(this.initialData);
    }

    // Emitir cambios del formulario
    this.form.valueChanges.subscribe(value => {
      this.formChange.emit(value);
    });
  }

  /**
   * Detectar cambios en los inputs
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian los datos iniciales y el formulario ya está construido, actualizar
    if (changes['initialData'] && !changes['initialData'].firstChange && this.form) {
      const newData = changes['initialData'].currentValue;
      if (newData) {
        this.populateForm(newData);
        this.cdr.markForCheck();
      }
    }

    // Si cambia la configuración, reconstruir el formulario
    if (changes['config'] && !changes['config'].firstChange) {
      this.buildForm();
      if (this.initialData) {
        this.populateForm(this.initialData);
      }
      this.cdr.markForCheck();
    }
  }

  /**
   * Obtener severity del botón de submit
   */
  get submitSeverity(): 'success' | 'info' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast' {
    return (this.config.submitButtonSeverity || 'success') as 'success' | 'info' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  }

  /**
   * Construir formulario dinámicamente desde la configuración
   */
  private buildForm(): void {
    const formControls: { [key: string]: any } = {};

    this.config.sections.forEach(section => {
      section.fields.forEach(field => {
        // Filtrar campos según modo
        if (this.config.isEditMode && field.createOnly) return;
        if (!this.config.isEditMode && field.editOnly) return;

        formControls[field.name] = this.createFormControl(field);
      });
    });

    this.form = this.fb.group(formControls);

    // Deshabilitar todo si es readonly
    if (this.config.readonly) {
      this.form.disable();
    }
  }

  /**
   * Crear un FormControl basado en la configuración del campo
   */
  private createFormControl(field: FormFieldConfig): any {
    const validators: ValidatorFn[] = [];

    // Validadores estándar
    if (field.required) {
      validators.push(Validators.required);
    }

    if (field.minLength) {
      validators.push(Validators.minLength(field.minLength));
    }

    if (field.maxLength) {
      validators.push(Validators.maxLength(field.maxLength));
    }

    if (field.min !== undefined) {
      validators.push(Validators.min(field.min));
    }

    if (field.max !== undefined) {
      validators.push(Validators.max(field.max));
    }

    if (field.pattern) {
      validators.push(Validators.pattern(field.pattern));
    }

    if (field.type === 'email') {
      validators.push(Validators.email);
    }

    // Validador personalizado
    if (field.customValidator) {
      validators.push(field.customValidator);
    }

    // Crear control según tipo
    if (field.type === 'array') {
      return this.fb.array([]);
    } else {
      const control = new FormControl(
        {
          value: field.defaultValue ?? null,
          disabled: field.disabled || field.readonly || this.config.readonly
        },
        validators
      );
      return control;
    }
  }

  /**
   * Poblar formulario con datos iniciales
   */
  private populateForm(data: any): void {
    Object.keys(data).forEach(key => {
      const control = this.form.get(key);
      
      if (control) {
        if (control instanceof FormArray) {
          // Manejar arrays
          const field = this.findFieldByName(key);
          if (field && field.arrayFields && Array.isArray(data[key])) {
            this.populateFormArray(control, data[key], field.arrayFields);
          }
        } else {
          // Manejar campos simples
          control.setValue(data[key]);
        }
      }
    });
  }

  /**
   * Poblar FormArray con datos
   */
  private populateFormArray(
    formArray: FormArray,
    data: any[],
    fieldsConfig: FormFieldConfig[]
  ): void {
    // Limpiar array
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }

    // Agregar items
    data.forEach(item => {
      const group = this.createFormGroupFromFields(fieldsConfig);
      group.patchValue(item);
      formArray.push(group);
    });
  }

  /**
   * Crear FormGroup desde configuración de campos
   */
  private createFormGroupFromFields(fields: FormFieldConfig[]): FormGroup {
    const controls: { [key: string]: any } = {};
    
    fields.forEach(field => {
      controls[field.name] = this.createFormControl(field);
    });

    return this.fb.group(controls);
  }

  /**
   * Buscar configuración de campo por nombre
   */
  private findFieldByName(name: string): FormFieldConfig | undefined {
    for (const section of this.config.sections) {
      const field = section.fields.find(f => f.name === name);
      if (field) return field;
    }
    return undefined;
  }

  /**
   * Obtener FormArray por nombre de campo
   */
  getFormArray(fieldName: string): FormArray {
    return this.form.get(fieldName) as FormArray;
  }

  /**
   * Agregar item a un FormArray
   */
  addArrayItem(fieldName: string): void {
    const field = this.findFieldByName(fieldName);
    if (!field || !field.arrayFields) return;

    const formArray = this.getFormArray(fieldName);
    const newGroup = this.createFormGroupFromFields(field.arrayFields);
    formArray.push(newGroup);
    this.cdr.markForCheck();
  }

  /**
   * Solicitar confirmación antes de eliminar item de un FormArray
   */
  removeArrayItem(fieldName: string, index: number): void {
    const field = this.findFieldByName(fieldName);
    const itemLabel = field?.label || 'este elemento';
    
    this.confirmationMessage = `¿Está seguro de que desea eliminar ${itemLabel.toLowerCase()} #${index + 1}?`;
    this.pendingRemoval = { fieldName, index };
    this.showConfirmation = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirmar eliminación de item
   */
  confirmRemoveArrayItem(): void {
    if (this.pendingRemoval) {
      const formArray = this.getFormArray(this.pendingRemoval.fieldName);
      formArray.removeAt(this.pendingRemoval.index);
      this.pendingRemoval = null;
    }
    this.showConfirmation = false;
    this.cdr.markForCheck();
  }

  /**
   * Cancelar eliminación de item
   */
  cancelRemoveArrayItem(): void {
    this.pendingRemoval = null;
    this.showConfirmation = false;
    this.cdr.markForCheck();
  }

  /**
   * Verificar si un campo tiene errores
   */
  hasError(fieldName: string, errorType?: string): boolean {
    const control = this.form.get(fieldName);
    if (!control) return false;

    if (errorType) {
      return control.hasError(errorType) && (control.dirty || control.touched);
    }

    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(field: FormFieldConfig): string {
    const control = this.form.get(field.name);
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      return field.required ? this.validationConstants.REQUIRED_MESSAGE : '';
    }

    if (errors['email']) {
      return this.validationConstants.EMAIL_MESSAGE;
    }

    if (errors['maxlength']) {
      return this.validationConstants.MAX_LENGTH_MESSAGE(field.maxLength!);
    }

    if (errors['minlength']) {
      return this.validationConstants.MIN_LENGTH_MESSAGE(field.minLength!);
    }

    if (errors['pattern'] && field.patternMessage) {
      return field.patternMessage;
    }

    if (errors['pattern']) {
      if (field.type === 'cuit') return this.validationConstants.CUIT_MESSAGE;
      if (field.type === 'phone') return this.validationConstants.PHONE_MESSAGE;
    }

    return 'Campo inválido';
  }

  /**
   * Verificar si el campo debe mostrarse
   */
  shouldShowField(field: FormFieldConfig): boolean {
    if (this.config.isEditMode && field.createOnly) return false;
    if (!this.config.isEditMode && field.editOnly) return false;
    return true;
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      this.showError('Por favor, corrija los errores en el formulario');
      return;
    }

    const formValue = this.form.getRawValue();
    this.formSubmit.emit(formValue);
  }

  /**
   * Cancelar formulario
   */
  onCancel(): void {
    this.formCancel.emit();
  }

  /**
   * Marcar todos los campos como tocados
   */
  private markAllAsTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            Object.keys(c.controls).forEach(k => {
              c.get(k)?.markAsTouched();
            });
          }
        });
      }
    });
    this.cdr.markForCheck();
  }

  /**
   * Mostrar alerta de error
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    this.form.reset();
    if (this.initialData) {
      this.populateForm(this.initialData);
    }
  }

  /**
   * Habilitar edición
   */
  enableEdit(): void {
    this.form.enable();
    this.cdr.markForCheck();
  }

  /**
   * Deshabilitar edición
   */
  disableEdit(): void {
    this.form.disable();
    this.cdr.markForCheck();
  }
}
