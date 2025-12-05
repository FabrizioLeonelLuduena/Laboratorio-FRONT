import { AfterViewInit, Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

import { map, startWith, Subscription } from 'rxjs';

import { distinctUntilChanged } from 'rxjs/operators';

import {
  GenericFormComponent,
  GenericFormField,
  GenericSelectOption
} from '../../../../shared/components/generic-form/generic-form.component';
import { InsurerCreateRequestDTO } from '../../models/insurer.model';
import {
  PrivateHealthDataDTO,
  SelfPayDataDTO,
  SocialHealthDataDTO,
  SpecificDataDTO
} from '../../models/specific-data-model';
import { WizardContactCreateDTO } from '../../models/wizard.model';

/**
 * InsurerStepComponent: Step for entering insurer data in the wizard.
 * Handles dynamic form fields based on insurer type and manages form validity and payload mapping.
 */
@Component({
  selector: 'app-insurer-step',
  imports: [
    GenericFormComponent
  ],
  templateUrl: './insurer-step.component.html',
  styleUrl: './insurer-step.component.css'
})
export class InsurerStepComponent implements AfterViewInit, OnDestroy {
  /** Emits form validity changes */
  @Output() validChange = new EventEmitter<boolean>();
  /** Emits when the form is submitted */
  @Output() submitForm = new EventEmitter();
  /** Reference to the generic form child component */
  @ViewChild(GenericFormComponent) genericForm!: GenericFormComponent;

  /** Indicates if the form is being saved */
  saving = false;
  /** Title for the form */
  formTitle = 'Datos de la aseguradora';

  /** Insurer type options */
  tipos: GenericSelectOption[] = [
    { label: 'Obra Social', value: 'SOCIAL' },
    { label: 'Prepaga', value: 'PRIVATE' }
  ];

  /** Base fields for the form */
  formFields: GenericFormField[] = [
    { name: 'code', label: 'Código', type: 'text', required: true, maxLength: 20, colSpan: 1 },
    { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 100, minLength:3,colSpan: 1 },
    { name: 'acronym', label: 'Sigla', type: 'text', required: true, colSpan: 1 },
    { name: 'cuit', label: 'CUIT', type: 'text', required: true, colSpan:1 , pattern: '^(\\d{2}-?\\d{8}-?\\d{1})$' },
    // Divider for visual separation
    //{ name: 'separador1', label: '', type: 'divider', colSpan: 4, align:'left' },
    { name: 'insurerType', label: 'Tipo', type: 'select', options: this.tipos, required: true, placeholder: 'Seleccioná tipo', colSpan: 1 },
    { name: 'authorizationUrl',
      label: 'URL de autorización',
      type: 'url', required: false,
      maxLength: 255, colSpan: 1,
      pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
      messages:
        {
          pattern: 'La URL debe comenzar con http:// o https://'
        } },
    { name: 'description', label: 'Observaciones', type: 'textarea', required: false, maxLength: 255, colSpan: 2,rows:1 }
    /*{ name: 'separador3', label: '', type: 'divider', colSpan: 4, align:'left' },
    { name: 'phoneNumber', label: 'Teléfono', type: 'tel', required: false, pattern:'^([0|\+[0-9]{1,5})?([0-9]{10})$',
      messages:
      {
        pattern: 'El número de teléfono debe tener entre 10 y 15 dígitos y puede incluir el código de país.'
      } },
    { name: 'email', label: 'E-Mail', type: 'email', required: false, maxLength: 100, colSpan: 1 }*/
  ];

  /** Subscription for form status changes */
  private formStatusSub?: Subscription;
  /** Reference to the current form instance */
  private formRef: any = null;

  /** Initial value for the form */
  initialValue: Record<string, any> = { insurerType: null };

  // ===== Lifecycle hooks =====
  /**
   * After view initialization: binds controls and applies initial insurer type.
   */
  ngAfterViewInit(): void {
    this.bindFormValidityWatcherIfNeeded();
    // Apply initial insurer type if exists
    const _t =
      this.genericForm.control('insurerType')?.value ??
      this.initialValue['insurerType'];
  }

  /**
   * On destroy: unsubscribe from all subscriptions.
   */
  ngOnDestroy(): void {
    this.formStatusSub?.unsubscribe();
  }



  /**
   * Generates a signature for the fields array for change detection.
   * @param fields Array of GenericFormField
   * @returns String signature
   */
  private signature(fields: GenericFormField[]): string {
    return JSON.stringify(
      fields.map((f) => ({
        n: f.name,
        t: f.type,
        r: !!f.required,
        c: f.colSpan ?? 1
      }))
    );
  }

  // ===== Snapshot / restore helpers =====
  /**
   * Takes a snapshot of form control flags (touched, dirty, disabled).
   * @param group FormGroup
   * @returns Snapshot of flags
   */
  private snapshotFlags(
    group: FormGroup
  ): Record<string, { touched: boolean; dirty: boolean; disabled: boolean }> {
    const out: Record<
      string,
      { touched: boolean; dirty: boolean; disabled: boolean }
    > = {};
    Object.keys(group.controls).forEach((name) => {
      const c = group.controls[name];
      out[name] = { touched: c.touched, dirty: c.dirty, disabled: c.disabled };
    });
    return out;
  }

  /**
   * Restores form control flags from a snapshot.
   * @param group FormGroup
   * @param flags Snapshot of flags
   */
  private restoreFlags(
    group: FormGroup,
    flags: Record<string, { touched: boolean; dirty: boolean; disabled: boolean }>
  ): void {
    Object.keys(flags).forEach((name) => {
      const c: AbstractControl | null = group.controls[name] ?? null;
      if (!c) return;
      const f = flags[name];
      if (f.disabled && c.enabled) c.disable({ emitEvent: false });
      if (!f.disabled && c.disabled) c.enable({ emitEvent: false });
      if (f.touched) c.markAsTouched({ onlySelf: true });
      else c.markAsUntouched({ onlySelf: true });
      if (f.dirty) c.markAsDirty({ onlySelf: true });
      else c.markAsPristine({ onlySelf: true });
      c.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
    group.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  /**
   * Returns the final payload mapped to InsurerCreateRequestDTO format.
   * @returns Payload object or null if form is invalid
   */
  public getPayload(): {insurer:InsurerCreateRequestDTO,contacts:WizardContactCreateDTO[]} | null {
    const form = this.genericForm?.form;
    if (!form) return null;
    if (form.invalid) {
      form.markAllAsTouched();
      this.validChange.emit(false);
      return null;
    }
    const raw = form.getRawValue();
    return {
      insurer: {
        code: raw['code'] ?? '',
        name: raw['name'] ?? '',
        acronym: raw['acronym'] ?? '',
        insurerType: raw['insurerType'] ?? 'PRIVATE',
        description: raw['description'] ?? null,
        autorizationUrl: raw['authorizationUrl'] ?? null,
        specificData: this.mapSpecificData(raw)
      },
      contacts:
        [
          {
            contact: raw['phoneNumber'] ?? null,
            contactType: 'PHONE'
          },
          {
            contact: raw['email'] ?? null,
            contactType: 'EMAIL'
          }
        ]
    };
  }

  /**
   * Builds the `specificData` object according to insurer type.
   * @param raw Raw form values
   * @returns SpecificDataDTO object
   */
  private mapSpecificData(raw: Record<string, any>): SpecificDataDTO {
    const type = raw['insurerType'];
    const socialHealth: SocialHealthDataDTO | null =
      type === 'SOCIAL'
        ? {
          cuit: raw['cuit'] ?? ''
        }
        : null;
    const privateHealth: PrivateHealthDataDTO | null =
      type === 'PRIVATE'
        ? {
          cuit: raw['cuit'] ?? '',
          copay_policy: raw['copayPolicy'] ?? ''
        }
        : null;
    const selfPay: SelfPayDataDTO | null =
      type === 'SELF_PAY'
        ? {
          accepted_payment_methods: raw['acceptedPaymentMethods'] ?? ''
        }
        : null;
    return {
      socialHealth: socialHealth,
      privateHealth: privateHealth,
      selfPay: selfPay
    };
  }

  /**
   * Binds the form validity watcher and emits validity changes.
   */
  private bindFormValidityWatcherIfNeeded(): void {
    if (!this.genericForm) return;
    const form = this.genericForm.form;
    if (!form || form === this.formRef) return;
    this.formStatusSub?.unsubscribe();
    this.formRef = form;
    this.validChange.emit(form.valid);
    this.formStatusSub = form.statusChanges
      .pipe(
        startWith(form.status),
        map(() => form.valid),
        distinctUntilChanged()
      )
      .subscribe((isValid) => this.validChange.emit(isValid));
  }

  /**
   * Handles cancel action (reserved for future use).
   */
  onCancel() {
    // Reserved for future cancel logic
  }
}
