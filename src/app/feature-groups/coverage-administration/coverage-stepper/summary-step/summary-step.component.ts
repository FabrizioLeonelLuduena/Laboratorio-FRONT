import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, Input, SimpleChanges, OnChanges, OnInit } from '@angular/core';


import { Divider } from 'primeng/divider';

import { GenericSelectOption } from '../../../../shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { GenericColumn } from '../../../../shared/models/generic-table.models';
import { NbuLabelPipe } from '../../../../shared/pipes/nbu-label.pipe';
import { ScalePipe } from '../../../../shared/pipes/scale.pipe';
import { InsurerCreateRequestDTO } from '../../models/insurer.model';
import { PlanWithAgreement, WizardContactCreateDTO } from '../../models/wizard.model';
import { NbuService } from '../../services/nbu.service';

/** Summary step component showing insurer info and plans table. */
 type SummaryRow = {
  code: string;
  name: string;
  acronym: string;
  description?: string;
  validFromDate: string;
  versionNbu: number | string;
  ubValue: number;
  coveragePercentage: number;
  iva: number;
};

/**
 *
 */
@Component({
  selector: 'app-summary-step',
  imports: [
    GenericTableComponent,
    Divider
  ],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './summary-step.component.html',
  styleUrl: './summary-step.component.css'
})
/** Component that renders the final insurer summary with a plans table using GenericTable. */
export class SummaryStepComponent implements OnChanges, OnInit {
  @Input({ required :true }) insurerData! : InsurerCreateRequestDTO;
  @Input({ required :true }) plansData!: PlanWithAgreement[];
  @Input({ required : true }) contactsData!: WizardContactCreateDTO[];

  columns: GenericColumn[] = [
    { field: 'code', header: 'Código' },
    { field: 'name', header: 'Nombre' },
    { field: 'acronym', header: 'Sigla' },
    { field: 'validFromDate', header: 'Vigente desde', pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    },
    { field: 'versionNbu', header: 'Versión NBU', pipes:
        [
          { token: NbuLabelPipe }
        ]
    },
    { field: 'ubValue', header: 'Valor U.B.', pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.0-0'] }
        ]
    },
    { field: 'coveragePercentage', header: 'Cobertura (%)', pipes:
        [
          { token: ScalePipe, args: [0.01] },
          { token: PercentPipe, args: ['1.0-0'] }
        ]
    },
    { field: 'iva', header: 'IVA (%)', pipes:
        [
          { token: ScalePipe, args: [0.01] },
          { token: PercentPipe, args: ['1.0-2'] }
        ]
    }
  ];

  /**
   * Constructor
   */
  constructor(private nbu: NbuService) {}

  /**
   * Lifecycle: on component initialization, loads NBU options
   */
  ngOnInit(): void {
    this.nbu.getOptions().subscribe({
      next: (opts) => {
        this.nbuVersions = opts;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loading: boolean = false;

  tableData: SummaryRow[] = [];

  /** Human-readable insurer type */
  get insurerTypeName(): string {
    switch (this.insurerData?.insurerType) {
    case 'SELF_PAY': return 'Particular';
    case 'SOCIAL': return 'Obra Social';
    case 'PRIVATE': return 'Prepaga';
    default: return 'Desconocido';
    }
  }

  /** React to changes and rebuild table */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plansData']) {
      this.rebuildTableData();
    }
  }

  nbuVersions: GenericSelectOption[] = [];

  /** Build table rows */
  private rebuildTableData(): void {
    this.tableData = (this.plansData ?? []).map((plan: PlanWithAgreement): SummaryRow => ({
      code: plan.plan.code,
      name: plan.plan.name,
      acronym: plan.plan.acronym,
      description: plan.plan.description,
      validFromDate: plan.agreement.validFromDate,
      versionNbu: plan.agreement.versionNbu,
      ubValue: plan.agreement.ubValue,
      coveragePercentage: plan.agreement.coveragePercentage,
      iva: plan.plan.iva
    }));
  }

}
