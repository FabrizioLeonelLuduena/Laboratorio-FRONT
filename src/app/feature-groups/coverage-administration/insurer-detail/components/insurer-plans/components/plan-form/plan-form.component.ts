import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';

import { finalize, map, of, switchMap } from 'rxjs';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import {
  GenericFormComponent,
  GenericFormField,
  GenericSelectOption
} from 'src/app/shared/components/generic-form/generic-form.component';

import {
  AgreementCreateRequestDTO,
  AgreementResponseDTO,
  AgreementUpdateRequestDTO
} from '../../../../../models/agreement.model';
import { PlanCompleteResponseDTO, PlanResponseDTO } from '../../../../../models/plan.model';
import { AgreementService } from '../../../../../services/agreement.service';
import { InsurerPlansService } from '../../../../../services/insurer-plans.service';
import { NbuService } from '../../../../../services/nbu.service';
import { WizardService } from '../../../../../services/wizard-service';


/**
 * FormMode type: possible modes for the form (view, edit, create)
 */
type FormMode = 'view' | 'edit' | 'create';

/**
 * @component PlanFormComponent
 *
 * Handles creation, editing, and viewing of insurer plans and their agreements.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [CommonModule, GenericFormComponent, GenericAlertComponent],
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.css']
})
export class PlanFormComponent implements OnChanges, OnInit {
  @Input() plan?: PlanCompleteResponseDTO | PlanResponseDTO | null;
  @Input({ required: true }) insurerId!: number;
  @Input() mode: FormMode = 'view';
  @Input() visible = false;

  @Output() saved = new EventEmitter<PlanResponseDTO>();
  @Output() cancelled = new EventEmitter<void>();

  saving = false;
  /** Controls component alerts */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  private nbuOptions: GenericSelectOption[] = [];
  private loadingNbu = false;

  /**
   * Base fields for the plan form
   */
  private coreFields: GenericFormField[] =
    [
      { name: 'code',        label: 'Código',      type: 'text',     required: true, colSpan:1, maxLength: 20 },
      { name: 'acronym',     label: 'Sigla',    type: 'text',     required: true, colSpan:1 },
      { name: 'name',        label: 'Nombre',      type: 'text',     required: true, colSpan:1, minLength: 3, maxLength: 100 },
      { name: 'validFromDate', label: 'Vigente desde', type: 'date', required: true, colSpan: 1 },
      { name: 'versionNbu',  label: 'Versión NBU', type: 'select', required: true, colSpan: 1, maxLength: 20, options: [], placeholder: 'Seleccioná la versión del NBU' },
      { name: 'ubValue',     label: 'Valor U.B.',  type: 'number',   required: true, colSpan: 1, min: 0, addonLeft: '$', addonRight: 'ARS' },
      { name: 'coveragePercentage', label: 'Porcentaje de cobertura', type: 'number', required: true, colSpan: 1, min: 0, max: 100, addonRight: '%' },
      //{ name: 'description', label: 'Descripción', type: 'textarea', rows: 1, colSpan: 1, maxLength: 255 }
      { name: 'iva', label: 'IVA', type: 'number', required: true, colSpan: 1, min: 0, max: 100, addonRight: '%', hint: 'Este dato se utiliza en la liquidación', maxFractionDigits: 2 }
    ];


  /**
   * Cache for fields with dynamic options and disabled state
   */
  private fieldsCache: GenericFormField[] = [];
  /**
   * Initial value cache for the form
   */
  private initialValueCache: Record<string, any> | null = null;
  /**
   * Returns the fields for the form, with disabled state applied
   */
  get fields(): GenericFormField[] { return this.fieldsCache; }


  /**
   * Returns the title for the form based on mode
   */
  get title(): string {
    return this.mode === 'view' ? 'Detalle del plan'
      : this.mode === 'edit' ? 'Editar plan'
        : 'Nuevo plan';
  }

  /**
   * Returns the initial value for the form
   */
  get initialValue(): Record<string, any> | null { return this.initialValueCache; }

  /**
   * Constructor
   */
  constructor(
    private plansService: InsurerPlansService,
    private coverageService: AgreementService,
    private wizardService: WizardService,
    private nbuService: NbuService) {}

  /**
   * Lifecycle: on component initialization, loads NBU options and sets up fields
   */
  ngOnInit(): void {
    if (!this.fieldsCache.length) {
      const isView = this.mode === 'view';
      this.fieldsCache = this.coreFields.map(f => ({ ...f, disabled: isView }));
    }

    this.loadingNbu = true;
    this.nbuService.getOptions()
      .pipe(finalize(() => (this.loadingNbu = false)))
      .subscribe({
        next: (opts) => {
          this.nbuOptions = opts;
          this.patchSelectOptions('versionNbu', opts);
        },
        error: () => this.showAlert('warning', 'No pude cargar las versiones del NBU.')
      });
  }

  /**
   * Lifecycle: on input changes, updates fields and initial value
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      const isView = this.mode === 'view';
      // Aplicamos disabled y mantenemos las opciones actuales (si ya llegaron)
      this.fieldsCache = this.coreFields
        .map(f => f.name === 'versionNbu' ? { ...f, options: this.nbuOptions } : f)
        .map(f => ({ ...f, disabled: isView }));
    }

    if (changes['plan'] || changes['mode']) {
      this.initialValueCache = this.buildInitialValue(this.plan);
    }
  }

  /**
   * Updates select options for a given field in the form
   * @param fieldName Name of the field to update
   * @param options Options to set
   */
  private patchSelectOptions(fieldName: string, options: GenericSelectOption[]) {
    this.coreFields = this.coreFields.map(f => f.name === fieldName ? ({ ...f, options }) : f);
    const isView = this.mode === 'view';
    this.fieldsCache = this.coreFields
      .map(f => f.name === fieldName ? ({ ...f, options }) : f)
      .map(f => ({ ...f, disabled: isView }));
  }

  /** Aplano plan+primera coverage al initialValue (para editar) */
  private buildInitialValue(plan?: PlanResponseDTO | PlanCompleteResponseDTO | null): Record<string, any> | null {
    if (!plan) return null;
    return {
      // plan
      id: plan.id,
      insurerId: (plan as any).insurerId,
      code: (plan as any).code,
      acronym: (plan as any).acronym,
      name: (plan as any).name,
      description: (plan as any).description,
      iva: (plan as any).iva,
      // coverage
      versionNbu: (plan as any).versionNbu ?? null,
      coveragePercentage: (plan as any).coveragePercentage,
      ubValue: (plan as any).ubValue,
      //todo poner fecha de la coberutra
      validFromDate: (plan as any).validFromDate
    };
  }

  /**
   * Normalizes form values before sending
   */
  private normalize(form: Record<string, any>): {
    plan: { code: string; acronym: string; name: string; description: string, iva: number};
    agreement: {
      versionNbu: number | null;
      coveragePercentage: number | null;
      ubValue: number | null;
      validFromDate: string | null;
    };
  } {
    const out = { ...form };

    // Plan: trim/upper según tu criterio
    const plan = {
      code: String(out['code'] ?? '').trim().toUpperCase(),
      acronym: String(out['acronym'] ?? '').trim().toUpperCase(),
      name: String(out['name'] ?? '').trim(),
      description: String(out['description'] ?? '').trim(),
      iva: out['iva'] ?? null
    };

    // Coverage: coerciones y fecha ISO (sin zona)
    const agreement = {
      versionNbu: out['versionNbu'] != null ? Number(out['versionNbu']) : null,
      coveragePercentage: out['coveragePercentage'] != null ? Number(out['coveragePercentage']) : null,
      ubValue: out['ubValue'] != null ? Number(out['ubValue']) : null,
      validFromDate: out['validFromDate'] ?? null
    };

    return { plan, agreement: agreement };
  }

  // ==========================
  // Helpers de comparación
  // ==========================
  /**
   * hasPlanChanges.
   */
  private hasPlanChanges(current: PlanResponseDTO, next: { code: string; acronym: string; name: string; description: string; iva: number }): boolean {
    return (
      (current.code ?? '') !== (next.code ?? '') ||
      (current.acronym ?? '') !== (next.acronym ?? '') ||
      (current.name ?? '') !== (next.name ?? '') ||
      (current.description ?? '') !== (next.description ?? '') ||
      (current.iva ?? null) !== (next.iva ?? null)
    );
  }

  /**
   * Gets the current agreement for the plan
   */
  private getCurrentAgreement(): AgreementResponseDTO | null {
    const p = this.plan as PlanCompleteResponseDTO | undefined | null;
    return p?.actualAgreements?.reverse()[0] ?? null;
  }

  /**
   * Checks if there are changes in the agreement data
   */
  private hasAgreementChanges(current: AgreementResponseDTO | null, next: {
    versionNbu: number | null;
    coveragePercentage: number | null;
    ubValue: number | null;
    validFromDate: string | null;
  }): boolean {
    if (!current) {
      // No había cobertura: si el form trae algo, hay cambios
      return !!(next.versionNbu || next.coveragePercentage || next.ubValue || next.validFromDate);
    }
    return (
      (current.versionNbu ?? null) !== (next.versionNbu ?? null) ||
      (current.coveragePercentage ?? null) !== (next.coveragePercentage ?? null) ||
      (current.ubValue ?? null) !== (next.ubValue ?? null) ||
      (current.validFromDate ?? null) !== (next.validFromDate ?? null)
    );
  }

  /**
   * Emits cancellation event
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Shows an alert message
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3200);
  }

  /**
   * Handles success after saving a plan
   */
  private handleSuccess(plan: PlanResponseDTO, message: string): void {
    this.saving = false;
    this.showAlert('success', message);
    this.saved.emit(plan);
  }

  /**
   * Handles error after failing to save a plan
   */
  private handleError(message: string): void {
    this.saving = false;
    this.showAlert('error', message);
  }

  /**
   * Handles form submission for creating or editing a plan
   * @param formValue Form value provided by GenericForm
   */
  onSubmit(formValue: Record<string, any>): void {
    if (this.mode === 'view') return;

    this.saving = true;
    const { plan: planData, agreement: covData } = this.normalize(formValue);

    // ---------- CREATE ----------
    if (this.mode === 'create') {
      this.saving = true;

      const request = {
        insurer_id: this.insurerId,
        plan:
          {
            plan: {
              insurerId: this.insurerId,
              code: (planData.code ?? '').trim(),
              acronym: (planData.acronym ?? '').trim(),
              name: (planData.name ?? '').trim(),
              description: planData.description ?? ''
            },
            agreement: {
              insurerPlanId: 0,
              versionNbu: covData.versionNbu ?? 0,
              requiresCopayment: true,
              coveragePercentage: covData.coveragePercentage ?? 0,
              ubValue: covData.ubValue ?? 0,
              validFromDate: covData.validFromDate
            }
          }
      };

      this.wizardService.createPlanWizard(request)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: (res) => this.handleSuccess(res, 'El plan y su convenio fueron creados correctamente.'),
          error: () => this.handleError('No se pudo crear el plan/convenio.')
        });

      return;
    }

    // Editar
    if (!this.plan?.id) {
      this.saving = false;
      this.handleError('No se encontró el identificador del plan.');
      return;
    }

    const currentAgreement = this.getCurrentAgreement();
    const planChanged = this.hasPlanChanges(this.plan as PlanResponseDTO, planData);
    const coverageChanged = this.hasAgreementChanges(currentAgreement, covData);

    if (!planChanged && !coverageChanged) {
      this.saving = false;
      this.showAlert('warning', 'No hay cambios para guardar.');
      return;
    }

    const plan$ = planChanged
      ? this.plansService.updatePlan(this.plan.id, {
        id: this.plan.id,
        code: planData.code,
        acronym: planData.acronym,
        name: planData.name,
        description: planData.description ?? '',
        iva: planData.iva
      })
      : of(this.plan as PlanResponseDTO);

    plan$
      .pipe(
        switchMap((plan) => {
          if (!coverageChanged) return of(plan);

          if (currentAgreement?.id) {
            // Update coverage
            const body: AgreementUpdateRequestDTO = {
              id: currentAgreement.id,
              insurerPlanId: plan.id,
              versionNbu: covData.versionNbu ?? 0,
              coveragePercentage: covData.coveragePercentage ?? 0,
              ubValue: covData.ubValue ?? 0,
              validFromDate: covData.validFromDate ?? Date.now().toString(),
              requiresCopayment: true
            };
            return this.coverageService.updateAgreement(currentAgreement.id, body).pipe(map(() => plan));
          } else {
            // Create coverage si no existía
            const body: AgreementCreateRequestDTO = {
              insurerPlanId: plan.id,
              versionNbu: covData.versionNbu ?? 0,
              coveragePercentage: covData.coveragePercentage ?? 0,
              ubValue: covData.ubValue ?? 0,
              validFromDate: covData.validFromDate ?? Date.now().toString(),
              requiresCopayment: true
            };
            return this.coverageService.createAgreement(body).pipe(map(() => plan));
          }
        }),
        finalize(() => this.saving = false)
      )
      .subscribe({
        next: (plan) => {
          const msg =
            planChanged && coverageChanged
              ? 'El plan y su convenio fueron actualizados.'
              : planChanged
                ? 'El plan fue actualizado.'
                : 'El convenio fue actualizada.';
          this.handleSuccess(plan, msg);
        },
        error: () => this.handleError('No se pudieron guardar los cambios.')
      });
  }
}
