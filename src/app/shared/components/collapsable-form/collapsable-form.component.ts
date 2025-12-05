import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { Subscription } from 'rxjs';

import { GenericButtonComponent } from '../generic-button/generic-button.component';

/**
 * EJEMPLO DE USO:
 *
 * ```html
 * <app-collapsable-form
 *   title="Nuevo Contacto"
 *   size="lg"
 *   [defaultCollapsed]="true"
 *   [fields]="[
 *     { name: 'nombre', label: 'Nombre', type: 'text', required: true, showInSummary: true },
 *     { name: 'telefono', label: 'Teléfono', type: 'tel', showInSummary: true },
 *     { name: 'email', label: 'Email', type: 'email', showInSummary: false },
 *     { name: 'tipo', label: 'Tipo de contacto', type: 'select', options: [
 *         { label: 'Personal', value: 'personal' },
 *         { label: 'Trabajo', value: 'work' }
 *       ], showInSummary: true }
 *   ]"
 *   (save)="guardarContacto($event)"
 *   (cancelAction)="eliminarContacto($event)">
 * </app-collapsable-form>
 * ```
 */

/**
 * Tipos de campos soportados por el componente colapsable genérico.
 */
export type CollapsableFieldType = 'text' | 'number' | 'email' | 'tel' | 'select';

/**
 * Definición de un campo para el formulario colapsable.
 * Cada objeto describe cómo renderizar un input dinámico.
 */
export interface CollapsableFormField {
  /** Nombre interno del campo (clave dentro del FormGroup). */
  name: string;

  /** Texto visible en la etiqueta del campo. */
  label: string;

  /** Tipo de campo (texto, número, email, teléfono o dropdown). */
  type: CollapsableFieldType;

  /** Placeholder opcional para mostrar dentro del input. */
  placeholder?: string;

  /** Define si el campo es obligatorio (validador requerido). */
  required?: boolean;

  /** Opciones disponibles en caso de que el tipo sea `select`. */
  options?: { label: string; value: any }[];

  /** Si es true, el campo aparecerá en el resumen al colapsar */
  showInSummary?: boolean;
}
/**
 * Componente genérico de formulario colapsable.
 *
 * - Soporta campos dinámicos configurados vía @Input.
 * - Puede mostrar inputs, números, emails, teléfonos y selects.
 * - Emite eventos de guardado y borrado hacia el padre.
 * - Muestra un resumen de valores seleccionados al colapsar.
 * - Permite configurar el ancho máximo del formulario con `size`.
 */
@Component({
  selector: 'app-collapsable-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    PanelModule,
    GenericButtonComponent
  ],
  templateUrl: './collapsable-form.component.html'
})
export class CollapsableFormComponent implements OnInit,OnDestroy {
  /** Lista de campos dinámicos (inputs, selects, etc.) */
  @Input({ required: true }) fields: CollapsableFormField[] = [];

  /**
   * Tamaño máximo del formulario.
   * - `sm` → max-w-sm (~24rem)
   * - `md` → max-w-md (~28rem)
   * - `lg` → max-w-2xl (~42rem)
   */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Título por defecto */
  @Input() title = 'Nuevo item';

  /** Define el estado inicial del panel (true = colapsado, false = expandido) */
  @Input() defaultCollapsed = false;

  /** Evento de guardado */
  @Output() save = new EventEmitter<Record<string, any>>();

  /**
   * Emite cuando se presiona el botón "Cancelar".
   * El padre puede suscribirse con (cancelAction)="miFuncion()".
   */
  @Output() cancelAction = new EventEmitter<void>();

  /** Reactive form dinámico */
  form!: FormGroup;

  /** Estado del colapsado */
  collapsed = false;

  /**
   * Constructor.
   * Inyecta FormBuilder para crear el FormGroup dinámicamente.
   */
  constructor(private fb: FormBuilder) {}

  private readonly CANCEL_COLLAPSE_DELAY_MS = 300;
  private cancelTimeoutId?: number;

  /**
   * Ciclo de vida de inicialización del componente.
   * Construye el formulario dinámico a partir de la definición de `fields`.
   */
  ngOnInit(): void {
    // Inicializa collapsed según input
    this.collapsed = this.defaultCollapsed;

    // Construcción del form
    const group: Record<string, any> = {};
    for (const field of this.fields) {
      group[field.name] = ['', field.required ? Validators.required : null];
    }
    this.form = this.fb.group(group);

    // Suscripción reactiva al form para actualizar el resumen
    this.formSub = this.form.valueChanges.subscribe(values => {
      this.summary = this.fields
        .filter(field => field.showInSummary && values[field.name] != null)
        .map(field => `${values[field.name]}`)
        .join(' - ');
    });
  }

  summary = '';
  private formSub?: Subscription;

  /**
   * Ciclo de destucción del componente.
   * Se limpian recursos.
   */
  ngOnDestroy(): void {
    // Limpieza del timeout de cancelación
    if (this.cancelTimeoutId) {
      clearTimeout(this.cancelTimeoutId);
    }

    // Limpieza de la suscripción al form
    this.formSub?.unsubscribe();
  }

  /**
   * Guarda los datos del formulario.
   * - Si es válido, emite los valores y colapsa el panel.
   * - Si no, marca todos los controles como tocados para mostrar validaciones.
   */
  onSave(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
      this.collapsed = true; // auto-colapsar al guardar
    } else {
      this.form.markAllAsTouched();
    }
  }

  /**
   * Acción secundaria (Cancelar).
   *
   * Emite el evento `cancelAction` para que el componente padre
   * decida qué hacer (borrar, resetear, cerrar panel, etc.)
   * Si nadie está suscrito, se aplica el comportamiento por defecto:
   * limpiar el formulario y colapsar luego de un breve delay.
   */
  onCancel(): void {
    if (this.cancelAction.observed) {
      this.cancelAction.emit();
    } else {
      this.form.reset();
      this.cancelTimeoutId = window.setTimeout(() => {
        this.collapsed = true;
      }, this.CANCEL_COLLAPSE_DELAY_MS);
    }
  }


  /** Devuelve la clase de Tailwind para limitar el ancho según el size */
  get sizeClass(): string {
    switch (this.size) {
    case 'sm': return 'max-w-sm';
    case 'lg': return 'max-w-2xl';
    default: return 'max-w-md';
    }
  }
}
