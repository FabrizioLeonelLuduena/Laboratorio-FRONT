import { Directive, Host, Self, OnDestroy, OnInit, forwardRef } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors } from '@angular/forms';

import { Subscription } from 'rxjs';

import { CollapsableFormComponent } from '../components/collapsable-form/collapsable-form.component';

/**
 * ControlValueAccessor para `app-collapsable-form`.
 *
 * Esta directiva actúa como puente entre un `CollapsableFormComponent` y los
 * formularios reactivos de Angular, permitiendo usar el componente colapsable
 * como si fuera un control nativo (`formControlName`, `formControl` o `ngModel`).
 * Además:
 *  - Propaga cambios del hijo al control padre.
 *  - Marca el control como *touched* cuando el usuario guarda o cancela.
 *  - Respeta el estado *disabled* proveniente del padre.
 *  - Expone validación basada en la validez del formulario interno del colapsable.
 */
@Directive({
  selector: `
    app-collapsable-form[formControlName],
    app-collapsable-form[formControl],
    app-collapsable-form[ngModel]
  `,
  standalone: true,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CollapsableFormValueAccessorDirective), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CollapsableFormValueAccessorDirective), multi: true }
  ]
})
export class CollapsableFormValueAccessorDirective implements OnInit, OnDestroy, ControlValueAccessor {
  private subs = new Subscription();
  private pending: any = null;
  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  /**
   * Crea la directiva e inyecta el componente colapsable host.
   * `@Host()` y `@Self()` aseguran que la directiva se conecte únicamente
   * al `CollapsableFormComponent` del elemento actual.
   * @param host Componente colapsable que actúa como control hijo.
   */
  constructor(@Host() @Self() private host: CollapsableFormComponent) {}

  /**
   * Hook de inicialización. Establece la conexión con el componente host
   * (suscripciones y sincronización de valores) cuando su `form` interno
   * está disponible.
   */
  ngOnInit(): void { this.connect(); }

  /**
   * Hook de destrucción. Libera recursos y evita pérdidas de memoria
   * anulando las suscripciones activas.
   */
  ngOnDestroy(): void { this.subs.unsubscribe(); }

  /**
   * Recibe el valor desde el control padre y lo aplica al componente hijo.
   * Si el `form` del hijo aún no está listo, lo almacena como pendiente
   * para aplicarlo luego en `connect()`.
   * @param value Valor recibido desde el control padre.
   */
  writeValue(value: any): void {
    if (!this.host.form) { this.pending = value ?? {}; return; }
    this.applyToChild(value ?? {});
  }

  /**
   * Registra el callback que Angular invocará cada vez que cambie
   * el valor en el componente hijo.
   * @param fn Función de notificación de cambios.
   */
  registerOnChange(fn: (v: any) => void): void { this.onChange = fn; }

  /**
   * Registra el callback que Angular invocará cuando el control
   * deba marcarse como *touched*.
   * @param fn Función de notificación de "tocado".
   */
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  /**
   * Habilita o deshabilita el formulario interno del componente hijo
   * para reflejar el estado del control padre.
   * @param isDisabled `true` para deshabilitar; `false` para habilitar.
   */
  setDisabledState(isDisabled: boolean): void {
    if (!this.host.form) return;
    isDisabled ? this.host.form.disable({ emitEvent: false }) : this.host.form.enable({ emitEvent: false });
  }

  /**
   * Informa al sistema de formularios si el control es válido en función
   * de la validez del formulario interno del `CollapsableFormComponent`.
   * @returns `null` si es válido; un objeto `ValidationErrors` en caso contrario.
   */
  validate(_: AbstractControl): ValidationErrors | null {
    return this.host.form?.valid ? null : { invalidForm: true };
  }

  /**
   * Establece las suscripciones necesarias entre el componente host y
   * el control padre. Si el `form` del host aún no existe, reintenta
   * en el próximo microtask para esperar su inicialización.
   *
   * - Suscribe a `valueChanges` para propagar cambios (`onChange`).
   * - Propaga *touched* al padre cuando el usuario guarda o cancela.
   * - Aplica cualquier valor pendiente recibido antes de que el host estuviera listo.
   */
  private connect(): void {
    if (!this.host.form) { Promise.resolve().then(() => this.connect()); return; }

    if (this.pending !== null) { this.applyToChild(this.pending); this.pending = null; }

    // hijo -> padre
    this.subs.add(this.host.form.valueChanges.subscribe(v => this.onChange(v)));

    // touched
    this.subs.add(this.host.save.subscribe(() => this.onTouched()));
    this.subs.add(this.host.cancelAction.subscribe(() => this.onTouched()));
  }

  /**
   * Aplica el valor al formulario del `CollapsableFormComponent` sin emitir eventos
   * y actualiza el resumen visible del colapsable usando los `fields` con
   * `showInSummary = true`.
   * @param value Valor a parchar en el formulario hijo.
   */
  private applyToChild(value: any): void {
    this.host.form.patchValue(value, { emitEvent: false });
    // Actualizamos el summary del host para reflejar el valor entrante
    const fields = this.host.fields ?? [];
    this.host.summary = fields
      .filter(f => f.showInSummary && value?.[f.name] != null && value?.[f.name] !== '')
      .map(f => `${value[f.name]}`)
      .join(' - ');
  }
}
