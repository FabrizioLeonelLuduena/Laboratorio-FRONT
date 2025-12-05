import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MenuItem } from 'primeng/api';
import { Checkbox } from 'primeng/checkbox';
import { Subject, takeUntil } from 'rxjs';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { Filter } from 'src/app/shared/models/filter.model';

import { SettlementSpecialRulesDTO, RuleType, PlanSelectionItem, PlanRulesPayload } from '../../models/rules.model';

/**
 * Special rules for Settlement
 */
@Component({
  selector: 'app-special-rules',
  standalone: true,
  imports: [
    FormsModule,
    GenericButtonComponent,
    GenericModalComponent,
    GenericTableComponent,
    GenericAlertComponent,
    Checkbox,
    GenericFormComponent
  ],
  templateUrl: './special-rules.component.html',
  styleUrls: ['./special-rules.component.css']
})
export class SpecialRulesComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() visible = false;
  @Input() insurerId!: number | null;
  @Input() plans: PlanSelectionItem[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<PlanRulesPayload[]>();

  @ViewChild(GenericFormComponent) formComp!: GenericFormComponent;

  private destroy$ = new Subject<void>();

  applyAll = false;
  selectedPlans: number[] = [];
  formFields: GenericFormField[] = this.buildFields(RuleType.FIXED_AMOUNT);
  plansRulesMap: Record<number, SettlementSpecialRulesDTO[]> = {};

  /** Selected plan used as client-side filter for table visualization. */
  selectedPlanFilter: number | null = null;

  lastFormSnapshot: Partial<SettlementSpecialRulesDTO> = {
    type: RuleType.FIXED_AMOUNT,
    amount: 0
  };

  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** Table filters: plan selector */
  tableFilters: Filter[] = [
    {
      id: 'planId',
      type: 'select',
      label: 'Plan',
      filterConfig: { searchBar: true },
      options: []
    }
  ];

  /**
   * constructor
   */
  constructor() {}

  /**
   * ngOnChanges.
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plans'] && !changes['plans'].firstChange) {
      this.initPlanFilterOptions();
    }
  }

  /**
   * ngAfterViewInit
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initTypeWatcher();
      this.restoreLastValuesIntoForm();
      this.initPlanFilterOptions();
    }, 0);
  }

  /**
   * Cleans up subscriptions on destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Watch for changes in the 'type' field and reconnect the watcher each time the form is rebuilt.
   */
  private initTypeWatcher(): void {
    queueMicrotask(() => {
      const form = this.formComp?.form;
      if (!form) return;

      this.destroy$.next();

      const typeCtrl = form.get('type');
      if (!typeCtrl) return;

      typeCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type: RuleType) => {
        if (!type) return;
        const prevValues = form.getRawValue();

        this.formFields = this.buildFields(type);

        setTimeout(() => {
          const f = this.formComp?.form;
          if (!f) return;

          f.get('type')?.setValue(type, { emitEvent: false });
          f.get('amount')?.setValue(prevValues.amount ?? 0, { emitEvent: false });
          f.get('minQuantity')?.setValue(prevValues.minQuantity ?? null, { emitEvent: false });
          f.get('maxQuantity')?.setValue(prevValues.maxQuantity ?? null, { emitEvent: false });
          f.get('equalQuantity')?.setValue(prevValues.equalQuantity ?? null, { emitEvent: false });

          this.initTypeWatcher();
        }, 0);
      });
    });
  }

  /**
   * Keeps the last value in the inputs
   */
  private restoreLastValuesIntoForm(): void {
    const f = this.formComp?.form;
    if (!f) return;
    f.get('type')?.setValue(this.lastFormSnapshot.type ?? RuleType.FIXED_AMOUNT, { emitEvent: false });
    f.get('amount')?.setValue(this.lastFormSnapshot.amount ?? null, { emitEvent: false });
    f.get('minQuantity')?.setValue(this.lastFormSnapshot.minQuantity ?? null, { emitEvent: false });
    f.get('maxQuantity')?.setValue(this.lastFormSnapshot.maxQuantity ?? null, { emitEvent: false });
    f.get('equalQuantity')?.setValue(this.lastFormSnapshot.equalQuantity ?? null, { emitEvent: false });
  }

  /**
   * Builds the form field list based on the selected rule type
   */
  private buildFields(type: RuleType): GenericFormField[] {
    const typeSelect: GenericFormField = {
      name: 'type',
      label: 'Tipo de regla',
      type: 'select',
      required: true,
      options: [
        { label: 'Igual a', value: RuleType.EQUALS },
        { label: 'Entre valores (límites incluidos)', value: RuleType.BETWEEN }
      ],
      colSpan: 1
    };

    const amount: GenericFormField = {
      name: 'amount',
      label: 'Monto',
      type: 'number',
      addonLeft: '$',
      min: 1,
      required: true,
      colSpan: 1
    };

    switch (type) {
    case RuleType.BETWEEN:
      return [
        typeSelect,
        { name: 'minQuantity', label: 'Cantidad mínima', type: 'number', min: 1, colSpan: 1 },
        { name: 'maxQuantity', label: 'Cantidad máxima', type: 'number', min: 1, colSpan: 1 },
        amount
      ];

    case RuleType.EQUALS:
      return [typeSelect, { name: 'equalQuantity', label: 'Cantidad exacta', type: 'number', min: 1, colSpan: 1 }, amount];
    default:
      return [typeSelect, amount];
    }
  }

  /** Returns row-level actions for the rules table. */
  getActions = (row: { planId: number; ruleIndex: number }): MenuItem[] => [
    {
      id: 'delete',
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => this.deleteRule(row.planId, row.ruleIndex)
    }
  ];

  /**
   * Table columns for the flat rules table
   */
  get columns() {
    return [
      { field: 'planName', header: 'Plan' },
      { field: 'ruleTypeLabel', header: 'Tipo de regla' },
      { field: 'minQuantity', header: 'Mínimo' },
      { field: 'maxQuantity', header: 'Máximo' },
      { field: 'amount', header: 'Monto' }
    ];
  }

  /**
   * Flat representation of all rules, optionally filtered by selected plan from generic filter.
   */
  get rulesTableRows() {
    const rows: Array<{
      planId: number;
      planName: string;
      ruleTypeLabel: string;
      minQuantity: number | string;
      maxQuantity: number | string;
      amount: number;
      ruleIndex: number;
    }> = [];

    const activePlanFilter = this.tableFilters
      .find(f => f.id === 'planId')
      ?.options?.find(o => o.active)?.value as number | null | undefined;

    Object.keys(this.plansRulesMap).forEach((pid) => {
      const planId = +pid;
      if (activePlanFilter !== null && activePlanFilter !== undefined && planId !== activePlanFilter) {
        return;
      }

      const plan = this.plans.find((p) => p.id === planId);
      const rules = this.plansRulesMap[planId] ?? [];

      rules.forEach((rule, index) => {
        const { label, min, max } = this.getRuleDisplay(rule);

        rows.push({
          planId,
          planName: plan?.name ?? '-',
          ruleTypeLabel: label,
          minQuantity: min,
          maxQuantity: max,
          amount: rule.amount,
          ruleIndex: index
        });
      });
    });

    return rows;
  }

  /**
   * Returns display label and min/max values (in Spanish) for a given rule.
   */
  private getRuleDisplay(rule: SettlementSpecialRulesDTO): { label: string; min: number | string; max: number | string } {
    switch (rule.type) {
    case RuleType.BETWEEN:
      return {
        label: 'Entre valores',
        min: rule.minQuantity ?? '-',
        max: rule.maxQuantity ?? '-'
      };
    case RuleType.EQUALS:
      return {
        label: 'Igual a',
        min: rule.equalQuantity ?? '-',
        max: rule.equalQuantity ?? '-'
      };
    case RuleType.FIXED_AMOUNT:
      return {
        label: 'Monto fijo',
        min: '-',
        max: '-'
      };
    default:
      return {
        label: rule.type ?? '-',
        min: '-',
        max: '-'
      };
    }
  }

  /**
   * Converts a rule into a numeric range [min, max].
   * Returns null if the rule is not quantity-based.
   */
  private getRangeFromRule(rule: Partial<SettlementSpecialRulesDTO>): [number, number] | null {
    if (!rule.type || rule.type === RuleType.FIXED_AMOUNT) {
      return null;
    }

    switch (rule.type) {
    case RuleType.EQUALS:
      return [rule.equalQuantity!, rule.equalQuantity!];
    case RuleType.BETWEEN:
      return [rule.minQuantity!, rule.maxQuantity!];
    default:
      return null;
    }
  }

  /**
   * Checks if a new rule's quantity range overlaps with existing rules for a given plan.
   */
  private checkForOverlap(newRule: SettlementSpecialRulesDTO, existingRules: SettlementSpecialRulesDTO[]): boolean {
    const newRange = this.getRangeFromRule(newRule);
    if (!newRange) {
      return false;
    }
    const [newMin, newMax] = newRange;
    for (const existingRule of existingRules) {
      const existingRange = this.getRangeFromRule(existingRule);
      if (existingRange) {
        const [existingMin, existingMax] = existingRange;
        if (newMax >= existingMin && newMin <= existingMax) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Adds a new rule to the list
   */
  loadRule(): void {
    const f = this.formComp?.form;
    if (!f) return;

    const raw = f.getRawValue();

    if (!raw.type) {
      this.showAlert('warning', 'Seleccioná un tipo de regla.');
      return;
    }

    if (!raw.amount || raw.amount <= 0) {
      this.showAlert('warning', 'El monto debe ser mayor que cero.');
      return;
    }

    if (
      (raw.type === RuleType.BETWEEN && (!raw.minQuantity || !raw.maxQuantity)) ||
      (raw.type === RuleType.EQUALS && !raw.equalQuantity)
    ) {
      this.showAlert('warning', 'Completá las cantidades requeridas.');
      return;
    }

    if (raw.type === RuleType.BETWEEN && raw.minQuantity && raw.maxQuantity && raw.minQuantity >= raw.maxQuantity) {
      this.showAlert('warning', 'La cantidad mínima debe ser menor que la máxima.');
      return;
    }

    // When rule type is EQUALS, force minQuantity and maxQuantity to match equalQuantity
    const equalQuantityValue = raw.type === RuleType.EQUALS ? Number(raw.equalQuantity) : null;

    const rule: SettlementSpecialRulesDTO = {
      type: raw.type,
      description: '',
      analysisId: raw.analysisId ?? 0,
      minQuantity: raw.type === RuleType.EQUALS ? equalQuantityValue! : raw.minQuantity ?? 0,
      maxQuantity: raw.type === RuleType.EQUALS ? equalQuantityValue! : raw.maxQuantity ?? 0,
      equalQuantity: raw.equalQuantity ?? 0,
      amount: Number(raw.amount)
    };

    const targetPlans = this.applyAll ? this.plans.map(p => p.id) : this.selectedPlans;
    if (!targetPlans.length) {
      this.showAlert('warning', 'Seleccioná al menos un plan.');
      return;
    }
    for (const planId of targetPlans) {
      const existingRules = this.plansRulesMap[planId] || [];
      if (this.checkForOverlap(rule, existingRules)) {
        const plan = this.plans.find(p => p.id === planId);
        this.showAlert('warning', `La regla para el plan "${plan?.name}" se superpone con una regla existente.`);
        return;
      }
    }

    this.lastFormSnapshot = { ...rule };

    targetPlans.forEach(pid => {
      if (!this.plansRulesMap[pid]) this.plansRulesMap[pid] = [];
      this.plansRulesMap[pid].push({ ...rule });
    });
  }

  /**
   * Emits confirm event and close modal
   */
  confirmModal(): void {
    const payload: PlanRulesPayload[] = Object.keys(this.plansRulesMap).map((pid) => ({
      planId: +pid,
      rules: this.plansRulesMap[+pid]
    }));
    this.confirm.emit(payload);
    // this.showAlert('success', 'Reglas guardadas.');
    this.visibleChange.emit(false);
  }

  /**
   * Delete a single rule from the table
   */
  deleteRule(planId: number, index: number): void {
    this.plansRulesMap[planId].splice(index, 1);
    if (!this.plansRulesMap[planId].length) delete this.plansRulesMap[planId];
  }

  /**
   * Displays temporary alert message.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 2500);
  }

  /**
   * Initializes plan filter options from the @Input() plans array.
   */
  private initPlanFilterOptions(): void {
    const options = [
      { label: 'Todos', value: null, active: true },
      ...this.plans.map(p => ({ label: p.name, value: p.id, active: false }))
    ];
    this.tableFilters = this.tableFilters.map(f =>
      f.id === 'planId' ? { ...f, options } : f
    );
  }
}
