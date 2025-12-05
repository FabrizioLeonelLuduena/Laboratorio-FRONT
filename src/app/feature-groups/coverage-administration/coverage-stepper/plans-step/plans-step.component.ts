import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, EventEmitter, Output, ViewChild, OnInit } from '@angular/core';

import { MenuItem } from 'primeng/api';


import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import {
  GenericFormComponent,
  GenericFormField, GenericSelectOption
} from '../../../../shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { GenericColumn } from '../../../../shared/models/generic-table.models';
import { NbuLabelPipe } from '../../../../shared/pipes/nbu-label.pipe';
import { ScalePipe } from '../../../../shared/pipes/scale.pipe';
import {
  AgreementWizardCreateRequestDTO,
  PlanWithAgreement,
  PlanWizardCreateRequestDTO
} from '../../models/wizard.model';
import { NbuService } from '../../services/nbu.service';

/**
 * Last step in the creation of an insurer – migrated to GenericTable.
 */
@Component({
  selector: 'app-plans-step',
  imports: [
    GenericTableComponent,
    GenericFormComponent,
    GenericAlertComponent
  ],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './plans-step.component.html',
  styleUrl: './plans-step.component.css'
})
export class PlansStepComponent implements OnInit {
  @Output() validChange = new EventEmitter<boolean>();
  @ViewChild('formComponent') formComponent!: GenericFormComponent;

  loading: boolean = false;
  mode: 'crear' | 'editar' = 'crear';

  /** Fields that must be unique across plans */
  private uniqueKeys: Array<keyof Record<string, any>> = ['code', 'name', 'acronym'];

  plans: Record<string, any>[] = [];

  columns: GenericColumn[] = [
    { field: 'code', header: 'Código', sortable: true },
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'acronym', header: 'Sigla', sortable: true },
    { field: 'validFromDate', header: 'Vigente desde', sortable: true, pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    },
    { field: 'versionNbu', header: 'Versión NBU', sortable: true, pipes:
        [
          { token: NbuLabelPipe }
        ]
    },
    { field: 'ubValue', header: 'Valor U.B.', sortable: true, pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.0-0'] }
        ]
    },
    { field: 'coveragePercentage', header: 'Cobertura (%)', sortable: true, pipes:
        [
          { token: ScalePipe, args: [0.01] },
          { token: PercentPipe, args: ['1.0-0'] }
        ]
    },
    { field: 'iva', header: 'IVA (%)', sortable: true, pipes:
        [
          { token: ScalePipe, args: [0.01] },
          { token: PercentPipe, args: ['1.0-2'] }
        ]
    }
  ];

  /** Row actions for GenericTable */
  getActions = (_row: any): MenuItem[] => [
    { id: 'editar', label: 'Editar', icon: 'pi pi-pencil', command: () => this.onAction({ type: 'editar', row: _row }) },
    { id: 'delete', label: 'Eliminar', icon: 'pi pi-trash', command: () => this.onAction({ type: 'delete', row: _row }) }
  ];

  saving: boolean = false;

  nbuVersions: GenericSelectOption[] = [];


  formFields: GenericFormField[] =
    [
      { name: 'code',        label: 'Código',      type: 'text',     required: true, colSpan:1, maxLength: 20 },
      { name: 'acronym',     label: 'Sigla',    type: 'text',     required: true, colSpan:1 },
      { name: 'name',        label: 'Nombre',      type: 'text',     required: true, colSpan:1, minLength: 3, maxLength: 100 },
      { name: 'validFromDate', label: 'Vigente desde', type: 'date', required: true, colSpan: 1 },
      { name: 'versionNbu',  label: 'Versión NBU', type: 'select', required: true, colSpan: 1, maxLength: 20, options: this.nbuVersions, placeholder: 'Seleccioná la versión del NBU' },
      { name: 'ubValue',     label: 'Valor U.B.',  type: 'number',   required: true, colSpan: 1, min: 0, addonLeft: '$', addonRight: 'ARS' },
      { name: 'coveragePercentage', label: 'Porcentaje de cobertura', type: 'number', required: true, colSpan: 1, min: 0, max: 100, addonRight: '%' },
      { name: 'iva', label: 'IVA', type: 'number', required: true, colSpan: 1, min: 0, max: 100, addonRight: '%', hint: 'Este dato se utiliza en la liquidación', maxFractionDigits: 2 }
      //{ name: 'description', label: 'Descripción', type: 'textarea', rows: 1, colSpan: 1, maxLength: 255 }
    ];

  initialValue: Record<string, any> = {
    validFromDate: new Date()
  };

  /** constructor */
  constructor(private nbu: NbuService) {}

  /** On init */
  ngOnInit(): void {
    this.loading = true;
    this.nbu.getOptions().subscribe({
      next: (opts) => {
        this.nbuVersions = opts;
        this.patchSelectOptions('versionNbu', opts);
        this.rebuildTableRows();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.openAlert('warning', 'No se pudo cargar las versiones del NBU. Pruebe nuevamente más tarde.', 'Aviso');
      }
    });
  }

  /** Update select options in the form */
  private patchSelectOptions(fieldName: string, options: GenericSelectOption[]) {
    this.formFields = this.formFields.map(f =>
      f.name === fieldName ? { ...f, options } : f
    );
  }

  /** Row action handler */
  onAction($event: { type: string; row: Record<string, any> }) {
    const code = $event.row?.['code'];
    const raw = code != null ? this.plans.find(p => p['code'] === code) : undefined;
    switch ($event.type) {
    case 'editar':
      if (raw) {
        this.initialValue = { ...raw };
        this.removePlan(raw);
      }
      this.mode = 'editar';
      break;

    case 'eliminar':
      this.removePlan(raw ?? $event.row);
      break;
    }

  }

  /** Cancel creation */
  onCancel() {
    if (Object.keys(this.initialValue).length > 1) {
      this.onSubmit(this.initialValue);
    }
    this.mode = 'crear';
  }

  /** Submit handler */
  onSubmit($event: any) {
    const duplicates = this.getDuplicateKeys($event);
    if (duplicates.length) {
      const msg = `No se permite crear planes con campos duplicados: ${this.formatDuplicateKeys(duplicates)}.`;
      this.openAlert('error', msg, 'Datos duplicados');
      return;
    }

    this.plans.push($event);
    this.rebuildTableRows();
    this.initialValue = { validFromDate: Date.now()  };
    this.formComponent.onCancel();
    this.checkValidity();
  }

  /** Re-check validity for the wizard */
  checkValidity() {
    const isValid = this.plans.length > 0;
    this.validChange.emit(isValid);
  }

  /** Returns normalized payload for the wizard */
  public getPayload(): PlanWithAgreement[] {
    return this.plans.map((pc: Record<string, any>): PlanWithAgreement => {
      const plan: PlanWizardCreateRequestDTO = {
        code: pc['code'] ?? '',
        acronym: pc['acronym'] ?? '',
        name: pc['name'] ?? '',
        iva: Number(pc['iva']),
        description: pc['description'] ?? ''
      };

      const agreement: AgreementWizardCreateRequestDTO = {
        versionNbu: Number(pc['versionNbu']),
        requiresCopayment: Boolean(pc['requiresCopayment']),
        coveragePercentage: Number(pc['coveragePercentage']),
        ubValue: Number(pc['ubValue']),
        validFromDate: new Date(pc['validFromDate']).toISOString()
      };

      return { plan, agreement };
    });
  }
  /** Find plan index to delete */
  private findPlanIndex(row: Record<string, any>): number {
    if (row?.['code'] != null) {
      return this.plans.findIndex(p => p?.['code'] === row['code']);
    }
    return this.plans.indexOf(row);
  }

  /** Remove from list and refresh */
  private removePlan(row: Record<string, any>): void {
    const idx = this.findPlanIndex(row);
    if (idx >= 0) {
      this.plans.splice(idx, 1);
      this.rebuildTableRows();
      this.checkValidity();
    }
  }


  /** Normalize values for duplicate detection */
  private normalizeForCompare(_key: string, value: any): string {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'number') return String(value);
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return JSON.stringify(value);
  }

  /** Collect duplicate keys */
  private getDuplicateKeys(candidate: Record<string, any>): string[] {
    const dups: string[] = [];
    for (const key of this.uniqueKeys) {
      const cand = this.normalizeForCompare(String(key), candidate[String(key)]);
      if (!cand) continue;
      const exists = this.plans.some(p =>
        this.normalizeForCompare(String(key), p[String(key)]) === cand
      );
      if (exists) dups.push(String(key));
    }
    return dups;
  }

  showAlert = false;
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  alertTitle = '';
  alertText = '';

  /** Open alert banner */
  private openAlert(type: typeof this.alertType, text: string, title?: string) {
    this.alertType = type;
    this.alertText = text;
    this.alertTitle = title ?? '';
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 4000);
  }

  /** Column header helper */
  private headerFor(field: string): string {
    const col = this.columns.find(c => c.field === field);
    return col?.header ?? field;
  }
  /** Humanize list for error message */
  private humanizeList(labels: string[]): string {
    if (labels.length <= 1) return labels[0] ?? '';
    if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  }
  /** Format duplicate keys */
  private formatDuplicateKeys(keys: string[]): string {
    return this.humanizeList(keys.map(k => this.headerFor(k)));
  }

  /** Projection for table display (clone + format visible fields) */
  tableRows: Record<string, any>[] = [];

  /** Rebuild rows */
  private rebuildTableRows(): void {
    this.tableRows = this.plans.map(p => ({
      ...p
    }));
    this.tableRows.reverse();
  }

}
