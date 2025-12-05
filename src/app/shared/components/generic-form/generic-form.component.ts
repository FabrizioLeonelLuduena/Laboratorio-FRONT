import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation, HostBinding
} from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormControl,
  UntypedFormArray,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

/* PrimeNG 17/18/19 */
import { OverlayOptions } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { Divider } from 'primeng/divider';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { CollapsableFormValueAccessorDirective } from '../../directives/collapsable-form-value-accesor.directive';
import { CuitFormatDirective } from '../../directives/cuit-format.directive';
import { DateSlashFormatDirective } from '../../directives/date-slash-format.directive';
import { CollapsableFormComponent, CollapsableFormField } from '../collapsable-form/collapsable-form.component';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
/**
 * Conjunto de tipos de campo admitidos por el formulario genérico.
 * Determina qué control de UI y validaciones se aplican.
 */
export type GenericFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'select' | 'date' | 'checkbox'
  | 'textarea' | 'password' | 'url' | 'radio' | 'array' | 'multiselect'  | 'cuit'
  | 'divider';

/**
 * Opción para campos de tipo `select` o `radio`.
 */
export interface GenericSelectOption {
  /** Texto visible para el usuario. */
  label: string;
  /** Valor enviado en el payload. */
  value: any;
  /** Deshabilita la opción cuando es `true`. */
  disabled?: boolean;
}

/**
 * Mensajes de error personalizados por campo.
 * Si un mensaje no se provee, se usa uno por defecto.
 */
export interface GenericFieldMessages {
  required?: string;
  email?: string;
  pattern?: string;
  min?: string;
  max?: string;
  dateMin?: string;
  dateMax?: string;
  /** También utilizado para la regla de negocio `minSaved`. */
  minItems?: string;
  maxItems?: string;
  minLength?: string;
  maxLength?: string;
}

/**
 * Configuración adicional para campos de tipo `array`.
 * Permite definir metadata de los ítems, límites y labels de acciones.
 */
export interface GenericArrayFieldConfig {
  /** Definición de los campos internos de cada ítem del array. */
  itemFields: CollapsableFormField[];
  /** Título base mostrado en cada colapsable del array. */
  itemsTitle?: string;
  /** Si `true`, cada ítem inicia colapsado. */
  defaultCollapsed?: boolean;
  /** Mínimo de ítems GUARDADOS requeridos (regla de negocio). */
  minItems?: number;
  /** Máximo de ítems permitidos (cantidad total). */
  maxItems?: number;
  /** Texto del botón para agregar ítems. */
  addLabel?: string;
}

/**
 * Descripción de un campo del formulario genérico.
 * Esta metadata se usa para construir dinámicamente el `FormGroup`.
 */
export interface GenericFormField {
  /** Nombre único del control. */
  name: string;
  /** Etiqueta visible junto al control. */
  label: string;
  /** Tipo del control (ver `GenericFieldType`). */
  type: GenericFieldType;

  /** Placeholder del input, cuando aplica. */
  placeholder?: string;
  /** Texto de ayuda al pie del control. */
  hint?: string;
  /** Columnas que ocupa en el grid responsivo. */
  colSpan?: 1 | 2 | 3 | 4;
  /** Deshabilita el control cuando es `true`. */
  disabled?: boolean;

  // SELECT
  /** Opciones para `select` o `radio`. */
  options?: GenericSelectOption[];
  /** Activa filtro en `select`. */
  filter?: boolean;
  /** Campo de la opción que se filtra. */
  filterBy?: string;
  /** Placeholder del filtro. */
  filterPlaceholder?: string;

  // NUMBER
  /** Valor mínimo permitido. */
  min?: number;
  /** Valor máximo permitido. */
  max?: number;
  /** Cantidad maxima de decimales */
  maxFractionDigits?: number;

  // TEXT/TEL/TEXTAREA/PASSWORD/URL
  /** Patrón de validación. */
  pattern?: string | RegExp;
  /** Longitud mínima permitida (para inputs de texto/textarea). */
  minLength?: number;
  /** Longitud máxima permitida (para inputs de texto/textarea). */
  maxLength?: number;

  // DATE
  /** Fecha mínima admitida (Date, timestamp o ISO). */
  minDate?: Date | string | number;
  /** Fecha máxima admitida (Date, timestamp o ISO). */
  maxDate?: Date | string | number;
  /** Formato de fecha para el datepicker (ej.: 'dd/mm/yy'). */
  dateFormat?: string;
  /** Muestra selector de fecha cuando es `false`. */
  hideDate?: boolean;
  /** Muestra selector de hora cuando es `true`. */
  showTime?: boolean;
  /** Formato horario para time picker: '12' o '24'. */
  hourFormat?: '12' | '24';

  // RADIO
  /** Muestra radios en línea cuando es `true`. */
  radioInline?: boolean;

  /** Marca el campo como requerido. */
  required?: boolean;
  /** Cantidad de filas para `textarea`. */
  rows?: number;

  // InputGroup addons
  /** Addon a la izquierda del control. */
  addonLeft?: string;
  /** Addon a la derecha del control. */
  addonRight?: string;

  // Mensajes custom
  /** Mensajes de error personalizados. */
  messages?: GenericFieldMessages;

  // Permite acceso dinámico desde templates (evita errores de compilación en f['prop']).
  [key: string]: any;

  // MULTISELECT
  /** Mínimo de opciones seleccionadas (si no se define y required=true => 1). */
  minSelected?: number;
  /** Máximo de opciones seleccionadas. */
  maxSelected?: number;
  /** Máximo de etiquetas visibles antes de “…” (propiedad de PrimeNG). */
  maxSelectedLabels?: number;
  /** Límite duro de selección (bloquea seleccionar más). */
  selectionLimit?: number;
  /** Modo de visualización de seleccionados: 'chip' o 'comma'. */
  display?: 'chip' | 'comma';

  // ARRAY
  /** Configuración de campos tipo array. */
  array?: GenericArrayFieldConfig;

  // DIVIDER

  /** Alineación del contenido dentro del divider (label opcional). */
  align?: 'left' | 'center' | 'right';

}

/* ===================== Componente ===================== */
/**
 * Componente de formulario genérico que construye dinámicamente un `FormGroup`
 * a partir de la metadata `fields`. Soporta:
 * - Validaciones comunes (required, email, patrón, min/max, rango de fechas).
 * - Campos `date` con límites mínimos/máximos normalizados a “solo día”.
 * - Campos `array` con una regla de negocio: solo se envían ítems “guardados”.
 * - Accesibilidad básica (atributos `aria-*` y mensajes de error).
 */
@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // PrimeNG
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    DatePickerModule,
    RadioButtonModule,
    // Collapsable
    CollapsableFormComponent,
    CollapsableFormValueAccessorDirective,
    MultiSelect,
    Textarea,
    CuitFormatDirective,
    DateSlashFormatDirective,
    Divider,
    GenericButtonComponent
  ],
  templateUrl: './generic-form.component.html',
  styleUrls: ['./generic-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated
})
export class GenericFormComponent implements OnChanges {
  /* -------- Inputs / Outputs -------- */
  /** Tipo de botón submit (por defecto 'create') */
  @Input() submitType: 'save' | 'accept' | 'cancel' | 'back' | 'search' | 'create' | 'custom' | 'alternative' = 'create';
  /** Icono opcional para el botón submit */
  @Input() submitIcon?: string | null = 'pi pi-plus';
  /** Color personalizado para el botón submit (var CSS sin var(), p.ej. '--brand-primary-700') */
  @Input() buttonColor?: string | null = '--brand-primary-700';
  /** Color de texto personalizado para el botón submit (var CSS sin var()) */
  @Input() buttonTextColor?: string | null = '--canvas';

  /** Metadata de campos que define estructura, validaciones y UI. */
  @Input({ required: true }) fields: GenericFormField[] = [];
  /** Valor inicial del formulario (por nombre de campo). */
  @Input() initialValue: Record<string, any> | null = null;
  /** Título del formulario. */
  @Input() showHeader = true;
  @Input() title = 'Formulario';
  /** Tamaño visual que ajusta el ancho máximo del contenedor. */
  @Input() size: 'sm' | 'md' | 'lg' | 'full' = 'full';
  /** Estado de guardado; deshabilita botones mientras es `true`. */
  @Input() saving = false;
  @Input() submitLabel = 'Guardar';
  @Input() cancelLabel = 'Cancelar';
  @Input() showCancel = true;
  @Input() showSubmit = true;
  /** Optional override for empty message in p-select/p-multiselect. */
  @Input() selectEmptyMessage?: string;
  /** Optional override for empty filter message in p-select/p-multiselect. */
  @Input() selectEmptyFilterMessage?: string;

  @Input() showAsterisk = true;
  @Input() showCard = true;
  @Input() showAddons = true;
  /** Validadores personalizados a nivel del FormGroup (e.g., para validar campos relacionados). */
  @Input() formValidators: ValidatorFn | ValidatorFn[] | null = null;

  @Input() maxCols: 1 | 2 | 3 | 4 = 4;

  /**
   * host binding
   */
  @HostBinding('style.--cols-lg')
  get hostColsLg(): string {
    return String(this.maxCols ?? 4);
  }

  /** Emite el payload listo para enviar (arrays filtrados por “guardados”). */
  @Output() submitForm = new EventEmitter<any>();
  /** Emite cuando el usuario cancela y se resetea al snapshot inicial. */
  @Output() cancelForm = new EventEmitter<void>();

  /* -------- Estado interno -------- */
  /** `FormGroup` construido dinámicamente a partir de `fields`. */
  form: UntypedFormGroup = new UntypedFormGroup({});
  /** Snapshot del valor inicial para permitir “Cancelar”. */
  private initialSnapshot: Record<string, any> = {};
  /** Índice rápido de `fields` por nombre de control. */
  private byName: Record<string, GenericFormField> = {};
  /** Límites de fecha normalizados por control `date`. */
  private dateBounds: Record<string, { min: Date | null; max: Date | null }> = {};

  /** Mapa de índices GUARDADOS por cada campo array (solo esos se envían). */
  private savedMap: Record<string, Set<number>> = {};

  /* -------- Ciclo de vida -------- */
  /**
   * Reconstruye el formulario cuando cambian `fields` o `initialValue`.
   * @param changes Cambios detectados por Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['initialValue']) {
      this.buildForm();
    }
  }

  /* -------- Helpers de template/UX -------- */
  /**
   * Devuelve la clase de ancho máximo según `size`.
   * @returns Clase CSS de ancho máximo.
   */
  get sizeClass(): string {
    switch (this.size) {
    case 'full': return 'max-w-full';
    case 'sm': return 'max-w-sm';
    case 'lg': return 'max-w-3xl';
    default:   return 'max-w-2xl';
    }
  }

  /**
   * Obtiene un `AbstractControl` por nombre.
   * @param name Nombre del control.
   * @returns El control correspondiente o `null` si no existe.
   */
  control(name: string): AbstractControl | null {
    return this.form?.get(name) ?? null;
  }

  /**
   * Marca un control como *touched* si aún no lo está.
   * @param name Nombre del control a marcar.
   */
  markTouched(name: string): void {
    const c = this.control(name);
    if (c && !c.touched) c.markAsTouched();
  }

  /**
   * Indica si el control es inválido y fue tocado o modificado.
   * @param name Nombre del control.
   * @returns `true` si está en estado de error visible, `false` en caso contrario.
   */
  isInvalid(name: string): boolean {
    const c = this.control(name);
    return !!c && (c.touched || c.dirty) && c.invalid;
  }

  /**
   * Valor para `aria-invalid` del control indicado.
   * @param name Nombre del control.
   * @returns `'true'` si es inválido, `null` si no lo es.
   */
  ariaInvalid(name: string): 'true' | null {
    return this.isInvalid(name) ? 'true' : null;
  }

  /**
   * Id del elemento de error asociado al control (para `aria-describedby`).
   * @param name Nombre del control.
   * @returns ID del error o `null` si el control es válido.
   */
  ariaErrorId(name: string): string | null {
    return this.isInvalid(name) ? `err-${name}` : null;
  }

  /**
   * Resuelve el mensaje de error a mostrar para un control,
   * priorizando los mensajes personalizados definidos en `fields`.
   * @param name Nombre del control.
   * @returns Cadena de error a mostrar o `''` si no hay error.
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
    if (c.errors['minlength']) {
      const req = c.errors['minlength']?.requiredLength;
      return msg.minLength ?? `Debe tener al menos ${req} caracteres.`;
    }
    if (c.errors['maxlength']) {
      const req = c.errors['maxlength']?.requiredLength;
      return msg.maxLength ?? `Debe tener como máximo ${req} caracteres.`;
    }
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

    // Arrays
    if (c.errors['minSaved']) {
      const min = this.byName[name]?.array?.minItems ?? c.errors['minSaved']?.min;
      return msg.minItems ?? `Debés guardar al menos ${min} ítem(s).`;
    }
    if (c.errors['minItems']) {
      const min = this.byName[name]?.array?.minItems ?? c.errors['minItems']?.min;
      return msg.minItems ?? `Agregá al menos ${min} ítem(s).`;
    }
    if (c.errors['maxItems']) {
      const max = this.byName[name]?.array?.maxItems ?? c.errors['maxItems']?.max;
      return msg.maxItems ?? `No superes ${max} ítem(s).`;
    }

    return 'Revisá este campo.';
  }

  /* -------- Submit / Cancel -------- */
  /**
   * Valída el formulario y, si es válido, emite el payload listo para enviar.
   * Si no es válido, marca todos los controles como *touched*.
   */
  onSubmit(): void {
    if (!this.form?.valid) {
      this.form?.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = this.buildSubmitValueFrom(raw);
    this.submitForm.emit(payload);
  }

  /**
   * Restaura el formulario al snapshot inicial y emite `cancelForm`.
   */
  onCancel(): void {
    this.resetToSnapshot();
    this.cancelForm.emit();
  }

  /* -------- Date bounds getters -------- */
  /**
   * Obtiene la fecha mínima permitida para un control `date`.
   * @param name Nombre del control.
   * @returns Fecha mínima o `null` si no aplica.
   */
  getMinDate(name: string): Date | null {
    return this.dateBounds[name]?.min ?? null;
  }

  /**
   * Obtiene la fecha máxima permitida para un control `date`.
   * @param name Nombre del control.
   * @returns Fecha máxima o `null` si no aplica.
   */
  getMaxDate(name: string): Date | null {
    return this.dateBounds[name]?.max ?? null;
  }

  /* -------- Arrays: API pública -------- */
  /**
   * Devuelve el `FormArray` asociado a un campo tipo `array`.
   * @param name Nombre del campo array.
   * @returns El `UntypedFormArray` correspondiente.
   */
  arrayOf(name: string): UntypedFormArray {
    return this.form.get(name) as UntypedFormArray;
  }

  /**
   * Agrega un ítem vacío al `FormArray` indicado respetando `maxItems`.
   * @param name Nombre del campo array.
   */
  addArrayItem(name: string): void {
    const f = this.byName[name];
    if (!f || f.type !== 'array') return;

    const arr = this.arrayOf(name);
    const max = f.array?.maxItems;
    if (typeof max === 'number' && arr.length >= max) return;

    arr.push(new UntypedFormControl({}));
    this.savedMap[name] ??= new Set<number>();
    arr.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Guarda el valor de un ítem del array y lo marca como “guardado”.
   * @param name Nombre del campo array.
   * @param index Índice del ítem a actualizar.
   * @param value Valor a persistir en el ítem.
   */
  onArrayItemSave(name: string, index: number, value: any): void {
    const arr = this.arrayOf(name);
    const ctrl = arr.at(index) as UntypedFormControl;
    ctrl.setValue(value ?? {}, { emitEvent: false });

    this.savedMap[name] ??= new Set<number>();
    this.savedMap[name].add(index);

    arr.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Elimina un ítem del array y reindexa el conjunto de “guardados”.
   * @param name Nombre del campo array.
   * @param index Índice del ítem a eliminar.
   */
  onArrayItemCancel(name: string, index: number): void {
    const arr = this.arrayOf(name);
    arr.removeAt(index);

    const old = this.savedMap[name] ?? new Set<number>();
    const next = new Set<number>();
    old.forEach(i => { if (i !== index) next.add(i > index ? i - 1 : i); });
    this.savedMap[name] = next;

    arr.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Calcula el estado resumido del campo `array` para mostrar en la cabecera:
   * nivel, mensaje, cantidad total, cantidad guardada y mínimo requerido.
   * @param name Nombre del campo array.
   * @returns Objeto con nivel (`ok`/`warn`/`error`), mensaje y contadores.
   */
  arrayStatus(name: string): { level: 'ok' | 'warn' | 'error'; message: string | null; saved: number; total: number; required: number } {
    const f = this.byName[name];
    const arr = this.arrayOf(name);
    const min = f?.array?.minItems ?? 0;

    const total = arr?.length ?? 0;
    const saved = this.savedMap[name]?.size ?? 0;

    const hasInvalidChild = !!arr?.controls?.some(c => c.invalid);
    const needMoreSaved = saved < min;
    const hasDrafts = total > saved;

    if (needMoreSaved) {
      const faltan = Math.max(0, min - saved);
      return { level: 'error', message: `Faltan ${faltan} por guardar`, saved, total, required: min };
    }
    if (hasInvalidChild) {
      return { level: 'warn', message: 'Hay ítems con errores', saved, total, required: min };
    }
    if (hasDrafts) {
      return { level: 'warn', message: 'Hay borradores sin guardar', saved, total, required: min };
    }
    return { level: 'ok', message: null, saved, total, required: min };
  }

  /* -------- Construcción y validaciones -------- */
  /**
   * Construye el `FormGroup` a partir de `fields` y `initialValue`.
   * - Normaliza límites de fecha.
   * - Inicializa `savedMap` para campos `array`.
   * - Genera un `snapshot` para soportar “Cancelar”.
   */
  private buildForm(): void {
    const group: Record<string, UntypedFormControl | UntypedFormArray> = {};
    this.byName = {};
    this.dateBounds = {};
    this.savedMap = {};
    const snapshot: Record<string, any> = {};

    for (const f of this.fields ?? []) {
      this.byName[f.name] = f;

      if (f.type === 'divider') {
        continue;
      }

      /* ----- Arrays ----- */
      if (f.type === 'array') {
        const min = f.array?.minItems ?? 0;

        // Validación por ÍTEMS GUARDADOS (regla de negocio)
        const validators = [this.arraySavedCountValidator(f.name, min)];

        // (Opcional) también podés validar por cantidad total
        if (typeof f.array?.maxItems === 'number' || typeof f.array?.minItems === 'number') {
          validators.push(this.arrayLengthValidator(f.array?.minItems, f.array?.maxItems));
        }

        const arr = new UntypedFormArray([], Validators.compose(validators));
        const initialItems: any[] = Array.isArray(this.initialValue?.[f.name]) ? this.initialValue![f.name] : [];

        if (initialItems.length) {
          // Ítems iniciales se consideran guardados
          this.savedMap[f.name] = new Set<number>();
          initialItems.forEach((item, idx) => {
            arr.push(new UntypedFormControl(item ?? {}));
            this.savedMap[f.name].add(idx);
          });
        } else {
          // Placeholders: NO marcados como guardados
          for (let i = 0; i < (f.array?.minItems ?? 0); i++) {
            arr.push(new UntypedFormControl({}));
          }
          this.savedMap[f.name] = new Set<number>();
        }

        group[f.name] = arr;
        snapshot[f.name] = arr.getRawValue();
        continue;
      }

      /* ----- No-array ----- */
      const validators = this.collectValidators(f);
      const initial = this.resolveInitial(f);
      snapshot[f.name] = initial;

      group[f.name] = new UntypedFormControl(
        { value: initial, disabled: !!f.disabled },
        validators
      );
    }

    // Aplicar validadores del FormGroup si están definidos
    const formValidators = this.formValidators
      ? (Array.isArray(this.formValidators) ? this.formValidators : [this.formValidators])
      : [];

    this.form = new UntypedFormGroup(group, formValidators.length ? Validators.compose(formValidators) : null);
    this.initialSnapshot = snapshot;
  }

  /**
   * Arma el arreglo de validadores para un campo (no-array),
   * incluyendo email, patrón, min/max y rango de fechas si aplica.
   * @param f Metadata del campo.
   * @returns Lista de validadores para el control.
   */
  private collectValidators(f: GenericFormField) {
    const v = [];

    if (f.type === 'multiselect') {
      const minSel = (typeof f.minSelected === 'number')
        ? f.minSelected
        : (f.required ? 1 : undefined);
      const maxSel = (typeof f.maxSelected === 'number') ? f.maxSelected : undefined;

      if (minSel != null || maxSel != null) {
        v.push(this.multiSelectLengthValidator(minSel, maxSel));
      }
      return v;
    }

    if (f.required) v.push(Validators.required);
    if (f.type === 'email') v.push(Validators.email);
    if (f.type === 'number') {
      if (typeof f.min === 'number') v.push(Validators.min(f.min));
      if (typeof f.max === 'number') v.push(Validators.max(f.max));
    }
    if (f.pattern) v.push(Validators.pattern(f.pattern));

    // Validadores de longitud para campos de texto/textarea
    if (typeof f.minLength === 'number') v.push(Validators.minLength(f.minLength));
    if (typeof f.maxLength === 'number') v.push(Validators.maxLength(f.maxLength));

    if (f.type === 'date' && (f.minDate != null || f.maxDate != null)) {
      const { min, max } = this.resolveDateBounds(f);
      this.dateBounds[f.name] = { min, max };
      v.push(this.dateRangeValidator(min, max));
    }
    return v;
  }

  /**
   * Crea un validador de longitud para `FormArray` por cantidad total.
   * @param min Cantidad mínima de ítems.
   * @param max Cantidad máxima de ítems.
   * @returns Función validadora para `UntypedFormArray`.
   */
  private arrayLengthValidator(min?: number, max?: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof UntypedFormArray)) return null;
      const len = control.length;
      if (typeof min === 'number' && len < min) return { minItems: { min, actual: len } };
      if (typeof max === 'number' && len > max) return { maxItems: { max, actual: len } };
      return null;
    };
  }

  /**
   * Crea un validador para la regla de negocio “mínimo de ítems GUARDADOS”.
   * Usa `savedMap` para contar sólo los ítems marcados como guardados.
   * @param fieldName Nombre del campo array.
   * @param min Mínimo de ítems guardados requeridos.
   * @returns Función validadora para `UntypedFormArray`.
   */
  private arraySavedCountValidator(fieldName: string, min?: number) {
    return (_control: AbstractControl): ValidationErrors | null => {
      if (typeof min !== 'number' || min <= 0) return null;
      const saved = this.savedMap[fieldName]?.size ?? 0;
      return saved < min ? { minSaved: { min, actual: saved } } : null;
    };
  }

  /**
   * Obtiene el valor inicial del campo con normalización de fechas (a “solo día”).
   * @param f Metadata del campo.
   * @returns Valor inicial normalizado.
   */
  private resolveInitial(f: GenericFormField): any {
    const provided = this.initialValue?.[f.name];

    const defaults: Record<GenericFieldType, any> = {
      text: '', email: '', tel: '',
      number: null, select: null, date: null,
      checkbox: false, textarea: '', password: '',
      url: '', radio: null, array: [], multiselect: [],
      cuit: '', divider: null
    };

    let base = (provided !== undefined ? provided : defaults[f.type]);

    // Date a "solo día"
    if (f.type === 'date' && base != null) base = this.normalizeDateInput(base);

    return base;
  }

  /**
   * Calcula los límites de fecha normalizados (min/max) para un campo `date`.
   * @param f Metadata del campo.
   * @returns Objeto con `min` y `max` como `Date | null`.
   */
  private resolveDateBounds(f: GenericFormField) {
    return { min: this.normalizeDateInput(f.minDate), max: this.normalizeDateInput(f.maxDate) };
  }

  /**
   * Normaliza una entrada de fecha (Date/ISO/timestamp) a un objeto `Date`
   * sin hora (00:00:00). Devuelve `null` si la entrada es inválida.
   * @param input Valor de entrada de fecha.
   * @returns `Date` sin hora o `null`.
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
   * Quita la parte horaria de una `Date` para comparar “por día”.
   * @param d Fecha original.
   * @returns Fecha con horas/min/seg en cero.
   */
  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Crea un validador de rango de fechas (min/max) para controles `date`.
   * @param min Fecha mínima (o `null`).
   * @param max Fecha máxima (o `null`).
   * @returns Función validadora que chequea `dateMin` y/o `dateMax`.
   */
  private dateRangeValidator(min: Date | null, max: Date | null) {
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
   * Formatea una `Date` como `dd/MM/yyyy` para mensajes de error.
   * @param d Fecha a formatear.
   * @returns Cadena formateada o `''` si la fecha es nula.
   */
  private formatDate(d?: Date | null): string {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Restaura el formulario al snapshot inicial, incluyendo:
   * - Arrays: reconstituye ítems y marca los iniciales como “guardados”.
   * - Controles simples: restaura valores y estado `disabled`.
   * También limpia estados de *pristine* y *untouched*.
   */
  private resetToSnapshot(): void {
    for (const f of this.fields ?? []) {
      if (f.type === 'array') {
        const arr = this.arrayOf(f.name);
        const snap: any[] = Array.isArray(this.initialSnapshot[f.name]) ? this.initialSnapshot[f.name] : [];

        if (arr.length === snap.length) {
          for (let i = 0; i < snap.length; i++) {
            (arr.at(i) as UntypedFormControl).setValue(snap[i] ?? {}, { emitEvent: false });
          }
        } else {
          arr.disable({ emitEvent: false });
          arr.clear({ emitEvent: false });
          for (const item of snap) {
            arr.push(new UntypedFormControl(item ?? {}));
          }
          arr.enable({ emitEvent: false });
        }

        this.savedMap[f.name] = new Set<number>(snap.map((_, i) => i)); // iniciales = guardados
        arr.updateValueAndValidity({ emitEvent: false });
      } else {
        const c = this.control(f.name) as UntypedFormControl;
        c?.setValue(this.initialSnapshot[f.name] ?? null, { emitEvent: false });
        if (f.disabled) c?.disable({ emitEvent: false }); else c?.enable({ emitEvent: false });
      }
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  /**
   * Construye el payload a enviar, filtrando en los campos `array`
   * únicamente los ítems marcados como “guardados”.
   * @param raw Valor crudo del formulario (`getRawValue()`).
   * @returns Objeto listo para enviar a API/servicio.
   */
  private buildSubmitValueFrom(raw: any): any {
    const out: any = { ...raw };

    for (const f of this.fields ?? []) {
      if (f.type !== 'array') continue;
      const arrValues: any[] = Array.isArray(raw[f.name]) ? raw[f.name] : [];
      const saved = this.savedMap[f.name] ?? new Set<number>();
      out[f.name] = arrValues.filter((_, i) => saved.has(i));
    }
    return out;
  }

  /** Valida la cantidad seleccionada en un multiselect. */
  private multiSelectLengthValidator(min?: number, max?: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as any[] | null | undefined;
      const len = Array.isArray(value) ? value.length : 0;

      if (typeof min === 'number' && len < min) {
        // Si el mínimo es 1, devolvemos 'required' para mensajes consistentes
        if (min === 1) return { required: true };
        return { minItems: { min, actual: len } };
      }
      if (typeof max === 'number' && len > max) {
        return { maxItems: { max, actual: len } };
      }
      return null;
    };
  }

  overlayOpts: OverlayOptions = {
    appendTo: 'body',
    autoZIndex: true,
    baseZIndex: 100,
    styleClass: 'gf-overlay'
  };


}
