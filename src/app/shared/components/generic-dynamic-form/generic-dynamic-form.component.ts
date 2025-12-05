import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewEncapsulation,
  signal,
  computed
} from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidatorFn
} from '@angular/forms';


// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Subscription } from 'rxjs';

import { GenericButtonComponent } from '../generic-button/generic-button.component';


/**
 * Extended field types for dynamic form
 */
export type DynamicFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'select'
  | 'date'
  | 'checkbox'
  | 'textarea'
  | 'password'
  | 'url'
  | 'radio'
  | 'chips';

/**
 * Select option interface
 */
export interface DynamicSelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

/**
 * Custom validation messages per field
 */
export interface DynamicFieldMessages {
  required?: string;
  email?: string;
  pattern?: string;
  min?: string;
  max?: string;
  dateMin?: string;
  dateMax?: string;
  custom?: string;
}

/**
 * Field visibility condition function type
 * Returns true if field should be visible
 */
export type VisibilityCondition = (formValue: Record<string, any>) => boolean;

/**
 * Options update function type
 * Allows dynamic options based on other field values
 */
export type OptionsUpdateFn = (formValue: Record<string, any>) => DynamicSelectOption[];

/**
 * Custom validator function type
 * Receives form value for cross-field validation
 */
export type CrossFieldValidator = (formValue: Record<string, any>) => ValidatorFn;

/**
 * Field change event payload
 */
export interface FieldChangeEvent {
  fieldName: string;
  value: any;
  formValue: Record<string, any>;
}

/**
 * Enhanced form field configuration with dynamic capabilities
 */
export interface DynamicFormField {
  name: string;
  label: string;
  type: DynamicFieldType;

  placeholder?: string;
  hint?: string;
  colSpan?: 1 | 2 | 3 | 4;
  disabled?: boolean;

  /** SELECT */
  options?: DynamicSelectOption[];
  filter?: boolean;
  filterBy?: string;
  filterPlaceholder?: string;

  /** NUMBER */
  min?: number;
  max?: number;

  /** TEXT/TEL/TEXTAREA/PASSWORD/URL */
  pattern?: string | RegExp;

  /** DATE */
  minDate?: Date | string | number;
  maxDate?: Date | string | number;

  /** RADIO */
  radioInline?: boolean;

  /** CHIPS */
  separator?: string;
  addOnBlur?: boolean;
  allowDuplicate?: boolean;

  required?: boolean;
  rows?: number;

  /**
   * Dynamic required condition
   * Makes field required based on other field values
   * @example requiredCondition: (formValue) => formValue.type === 'REAGENTS'
   */
  requiredCondition?: (formValue: Record<string, any>) => boolean;

  /** Input group addons */
  addonLeft?: string;
  addonRight?: string;

  /** Custom messages */
  messages?: DynamicFieldMessages;

  // ===== DYNAMIC FEATURES =====

  /**
   * Visibility condition function
   * Field will be hidden if this returns false
   * @example visibilityCondition: (formValue) => formValue.country === 'Argentina'
   */
  visibilityCondition?: VisibilityCondition;

  /**
   * Dynamic options update function
   * Updates select/radio options based on other field values
   * @example optionsUpdate: (formValue) => getProvincesForCountry(formValue.country)
   */
  optionsUpdate?: OptionsUpdateFn;

  /**
   * Cross-field validator
   * Validates this field based on other field values
   * @example crossFieldValidator: (formValue) => maxDateValidator(formValue.startDate)
   */
  crossFieldValidator?: CrossFieldValidator;

  /**
   * Fields that trigger re-validation of this field when they change
   * @example dependsOn: ['startDate', 'endDate']
   */
  dependsOn?: string[];
}

/**
 * Generic Dynamic Form Component
 *
 * Enhanced version of GenericFormComponent with dynamic capabilities:
 * - Conditional field visibility based on form values
 * - Dynamic options for select/radio fields
 * - Cross-field validation
 * - Field change events for custom logic
 * - Reactive updates using Angular signals
 *
 * @example
 * ```typescript
 * fields: DynamicFormField[] = [
 *   {
 *     name: 'country',
 *     label: 'País',
 *     type: 'select',
 *     options: [{ label: 'Argentina', value: 'AR' }],
 *     required: true
 *   },
 *   {
 *     name: 'province',
 *     label: 'Provincia',
 *     type: 'select',
 *     visibilityCondition: (formValue) => formValue.country === 'AR',
 *     optionsUpdate: (formValue) => getProvincesFor(formValue.country)
 *   }
 * ];
 * ```
 */
@Component({
  selector: 'app-generic-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    DatePickerModule,
    RadioButtonModule,
    ChipsModule,
    Textarea,
    GenericButtonComponent
  ],
  templateUrl: './generic-dynamic-form.component.html',
  styleUrls: ['./generic-dynamic-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated
})
export class GenericDynamicFormComponent implements OnChanges, OnDestroy {
  // ========== Inputs/Outputs ==========

  @Input({ required: true }) fields: DynamicFormField[] = [];
  @Input() initialValue: Record<string, any> | null = null;
  @Input() title = 'Formulario Dinámico';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() saving = false;
  /** Optional override for empty message in p-select/p-multiselect. */
  @Input() selectEmptyMessage?: string;
  /** Optional override for empty filter message in p-select/p-multiselect. */
  @Input() selectEmptyFilterMessage?: string;

  @Output() submitForm = new EventEmitter<any>();
  @Output() cancelForm = new EventEmitter<void>();
  @Output() fieldChange = new EventEmitter<FieldChangeEvent>();

  // ========== State ==========

  form: UntypedFormGroup = new UntypedFormGroup({});
  private initialSnapshot: Record<string, any> = {};
  private byName: Record<string, DynamicFormField> = {};
  private dateBounds: Record<string, { min: Date | null; max: Date | null }> = {};
  private valueChangesSub?: Subscription;

  // Reactive form value as signal
  formValue = signal<Record<string, any>>({});

  // Visible fields computed based on visibility conditions
  visibleFields = computed(() => {
    const currentValue = this.formValue();
    return this.fields.filter(field => {
      if (!field.visibilityCondition) return true;
      return field.visibilityCondition(currentValue);
    });
  });

  /**
   * Check if a field is dynamically required based on current form state
   * This handles both static 'required' property and dynamic requiredCondition
   */
  isFieldRequired(fieldName: string): boolean {
    const field = this.byName[fieldName];
    if (!field) return false;

    // Static required
    if (field.required) return true;

    // Dynamic required via requiredCondition
    if (field.requiredCondition) {
      const currentValue = this.formValue();
      return field.requiredCondition(currentValue);
    }

    // Legacy: Dynamic required via crossFieldValidator
    if (field.crossFieldValidator) {
      const currentValue = this.formValue();
      const validator = field.crossFieldValidator(currentValue);
      // Create a dummy control to test if validator returns required error
      const testControl = new UntypedFormControl(null);
      const result = validator(testControl);
      return result !== null && result['required'];
    }

    return false;
  }

  // ========== Lifecycle ==========

  /**
   * Rebuild form when fields or initial value changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['initialValue']) {
      this.buildForm();
      // Initialize form value signal
      this.formValue.set(this.form.getRawValue());
    }
  }

  /**
   * Cleanup subscriptions to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
  }

  // ========== Dynamic Updates ==========

  /**
   * Handle dynamic updates when form value changes
   * - Update dynamic options
   * - Re-validate dependent fields
   * - Re-validate fields with requiredCondition
   */
  private handleDynamicUpdates(formValue: Record<string, any>): void {
    this.fields.forEach(field => {
      // Update dynamic options
      if (field.optionsUpdate) {
        const newOptions = field.optionsUpdate(formValue);
        // Store updated options in field reference
        field.options = newOptions;
      }

      // Re-validate fields with requiredCondition
      if (field.requiredCondition) {
        const control = this.form.get(field.name);
        if (control) {
          control.updateValueAndValidity({ emitEvent: false });
        }
      }

      // Re-validate fields with cross-field validators
      if (field.crossFieldValidator && field.dependsOn) {
        const control = this.form.get(field.name);
        if (control) {
          control.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  // ========== Template Helpers ==========

  /**
   * Get form control by name
   */
  control(name: string): AbstractControl | null {
    return this.form?.get(name) ?? null;
  }

  /**
   * Mark field as touched on blur
   */
  markTouched(name: string): void {
    const c = this.control(name);
    if (c && !c.touched) {
      c.markAsTouched();
    }
  }

  /**
   * Check if field is invalid and should show error
   */
  isInvalid(name: string): boolean {
    const c = this.control(name);
    return !!c && (c.touched || c.dirty) && c.invalid;
  }

  /**
   * Get error message for field
   */
  errorMsg(name: string): string {
    const c = this.control(name);
    const f = this.byName[name];
    if (!c || !f) return '';

    const msg = f.messages || {};
    if (!c.errors) return '';

    if (c.errors['required']) return msg.required ?? 'Este campo es obligatorio.';
    if (c.errors['email']) return msg.email ?? 'Ingresá un correo válido.';
    if (c.errors['pattern']) return msg.pattern ?? 'El formato no es válido.';
    if (c.errors['custom']) return msg.custom ?? 'Valor no válido.';

    if (c.errors['min']) {
      const v = f?.min ?? c.errors['min']?.min;
      return msg.min ?? `Debe ser mayor o igual a ${v}.`;
    }
    if (c.errors['max']) {
      const v = f?.max ?? c.errors['max']?.max;
      return msg.max ?? `Debe ser menor o igual a ${v}.`;
    }
    if (c.errors['dateMin']) {
      const d = this.dateBounds[name]?.min;
      return msg.dateMin ?? `La fecha debe ser posterior o igual a ${this.formatDate(d)}.`;
    }
    if (c.errors['dateMax']) {
      const d = this.dateBounds[name]?.max;
      return msg.dateMax ?? `La fecha debe ser anterior o igual a ${this.formatDate(d)}.`;
    }

    return 'Revisá este campo.';
  }

  /**
   * Handle field change event
   */
  onFieldChange(fieldName: string): void {
    const control = this.control(fieldName);
    if (control) {
      const event: FieldChangeEvent = {
        fieldName,
        value: control.value,
        formValue: this.form.getRawValue()
      };
      this.fieldChange.emit(event);
    }
  }

  /**
   * Submit form if valid
   */
  onSubmit(): void {
    if (this.form?.valid) {
      this.submitForm.emit(this.form.getRawValue());
    } else {
      this.form?.markAllAsTouched();
    }
  }

  /**
   * Cancel and reset form
   */
  onCancel(): void {
    this.form?.reset(this.initialSnapshot);
    this.cancelForm.emit();
  }

  /**
   * TrackBy function for ngFor
   */
  trackByName = (_: number, f: DynamicFormField) => f.name;

  /**
   * Get min date for date picker
   */
  getMinDate(name: string): Date | null {
    const b = this.dateBounds[name];
    return b ? b.min : null;
  }

  /**
   * Get max date for date picker
   */
  getMaxDate(name: string): Date | null {
    const b = this.dateBounds[name];
    return b ? b.max : null;
  }

  // ========== Chips Stabilization ==========

  /**
   * Stabilize chips array after add
   */
  onChipsAdd(name: string): void {
    this.stabilizeChipsArray(name);
  }

  /**
   * Stabilize chips array after remove
   */
  onChipsRemove(name: string): void {
    this.stabilizeChipsArray(name);
  }

  /**
   * Clone chips array to prevent mutation issues
   */
  private stabilizeChipsArray(name: string): void {
    const c = this.control(name) as UntypedFormControl | null;
    if (!c) return;
    const arr = Array.isArray(c.value) ? c.value : [];
    c.setValue([...arr], { emitEvent: true });
  }

  // ========== Form Building ==========

  /**
   * Build reactive form from field configuration
   */
  private buildForm(): void {
    const group: Record<string, UntypedFormControl> = {};
    this.byName = {};
    this.dateBounds = {};
    const snapshot: Record<string, any> = {};

    for (const f of this.fields ?? []) {
      this.byName[f.name] = f;
      const validators = this.collectValidators(f);
      const initial = this.resolveInitial(f);
      snapshot[f.name] = initial;

      group[f.name] = new UntypedFormControl(
        { value: initial, disabled: !!f.disabled },
        validators
      );
    }

    // Unsubscribe from previous form
    this.valueChangesSub?.unsubscribe();

    // Create new form
    this.form = new UntypedFormGroup(group);
    this.initialSnapshot = snapshot;

    // Subscribe to new form changes
    this.valueChangesSub = this.form.valueChanges.subscribe(value => {
      this.formValue.set(value);
      this.handleDynamicUpdates(value);
    });
  }

  /**
   * Collect validators for field including cross-field validators
   */
  private collectValidators(f: DynamicFormField): ValidatorFn[] {
    const v: ValidatorFn[] = [];

    if (f.required) v.push(Validators.required);
    if (f.type === 'email') v.push(Validators.email);

    if (f.type === 'number') {
      if (typeof f.min === 'number') v.push(Validators.min(f.min));
      if (typeof f.max === 'number') v.push(Validators.max(f.max));
    }

    if (f.pattern) v.push(Validators.pattern(f.pattern));

    // Date range validator
    if (f.type === 'date' && (f.minDate != null || f.maxDate != null)) {
      const { min, max } = this.resolveDateBounds(f);
      this.dateBounds[f.name] = { min, max };
      v.push(this.dateRangeValidator(min, max));
    }

    // Dynamic required condition
    if (f.requiredCondition) {
      v.push((control: AbstractControl) => {
        const formValue = this.form?.getRawValue() ?? {};
        const isRequired = f.requiredCondition!(formValue);
        if (isRequired) {
          return Validators.required(control);
        }
        return null;
      });
    }

    // Cross-field validator
    if (f.crossFieldValidator) {
      v.push((control: AbstractControl) => {
        const formValue = this.form?.getRawValue() ?? {};
        const validator = f.crossFieldValidator!(formValue);
        return validator(control);
      });
    }

    return v;
  }

  /**
   * Resolve initial value for field
   */
  private resolveInitial(f: DynamicFormField): any {
    const provided = this.initialValue?.[f.name];
    const defaults: Record<DynamicFieldType, any> = {
      text: '',
      email: '',
      tel: '',
      number: null,
      select: null,
      date: null,
      checkbox: false,
      textarea: '',
      password: '',
      url: '',
      radio: null,
      chips: []
    };

    let base = provided !== undefined ? provided : defaults[f.type];
    if (f.type === 'date' && base != null) {
      base = this.normalizeDateInput(base);
    }

    return base;
  }

  /**
   * Resolve date bounds for validation
   */
  private resolveDateBounds(f: DynamicFormField) {
    return {
      min: this.normalizeDateInput(f.minDate),
      max: this.normalizeDateInput(f.maxDate)
    };
  }

  /**
   * Normalize date input to Date object
   */
  private normalizeDateInput(input: any): Date | null {
    if (input == null || input === '') return null;
    if (input instanceof Date) return this.toDateOnly(input);

    if (typeof input === 'number' || typeof input === 'string') {
      const d = new Date(input);
      if (!isNaN(d.getTime())) return this.toDateOnly(d);
    }

    return null;
  }

  /**
   * Strip time from date for comparison
   */
  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Date range validator
   */
  private dateRangeValidator(min: Date | null, max: Date | null): ValidatorFn {
    return (control: AbstractControl) => {
      const raw = control.value;
      if (!raw) return null;

      const d = this.normalizeDateInput(raw);
      if (!d) return null;

      if (min && d < min) return { dateMin: true };
      if (max && d > max) return { dateMax: true };

      return null;
    };
  }

  /**
   * Format date for display in error messages
   */
  private formatDate(d?: Date | null): string {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
