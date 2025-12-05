import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { finalize } from 'rxjs';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import {
  ConfirmationModalComponent
} from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { GenericColumn } from '../../../../../shared/models/generic-table.models';
import { NbuLabelPipe } from '../../../../../shared/pipes/nbu-label.pipe';
import { ScalePipe } from '../../../../../shared/pipes/scale.pipe';
import { ExcelExportService, PdfExportService } from '../../../../../shared/services/export';
import { AgreementResponseDTO } from '../../../models/agreement.model';
import { PlanCompleteResponseDTO } from '../../../models/plan.model';
import { InsurerPlansService } from '../../../services/insurer-plans.service';
import { NbuService } from '../../../services/nbu.service';

import { PlanFormComponent } from './components/plan-form/plan-form.component';
import { PLANS_EXPORT_COLUMNS, PLANS_PDF_COLUMNS } from './insurer-plans-export-config';

/** Row type shown in the plans table */
 type FormMode = 'view' | 'edit' | 'create';

 /**
  *
  */
 type PlanRow = {
  id: number;
  code?: string | null;
  name?: string | null;
  acronym?: string | null;
  isActive: boolean;
  iva: number;

  // Derived fields from the latest active agreement
  validFromDate?: string | null;
  versionNbu?: string | number | null;
  ubValue?: number | null;
  coveragePercentage?: number | null;

  // computed for GenericTable
  is_active?: boolean;
};

/**
 *
 */
@Component({
  selector: 'app-insurer-plans',
  standalone: true,
  imports: [
    CommonModule,
    GenericTableComponent,
    PlanFormComponent,
    GenericAlertComponent,
    ConfirmationModalComponent

  ],
  templateUrl: './insurer-plans.component.html',
  styleUrls: ['./insurer-plans.component.css']
})
export class InsurerPlansComponent implements OnInit {
  /** Insurer ID */
  @Input({ required: true }) insurerId!: number;
  @Output() plansChanged = new EventEmitter<void>();

  /** Plans */
  plans: PlanRow[] = [];

  /** Loading state */
  loading = false;

  /** Selected plan for view/edit */
  selectedPlan: PlanCompleteResponseDTO | null = null;

  /** Show form */
  showForm = false;
  mode: FormMode = 'create';

  /** Confirmation modal states */
  showDeleteModal = false;
  showActivateModal = false;

  /** Alerts */
  alertType: 'success' | 'error' | 'warning' | null = null;
  alertMessage = '';

  // Reference to GenericTable component to access filtered data
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;

  /** Columns for GenericTable */
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
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.2-2'] }
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
    },
    { field: 'is_active', header: 'Estado', sortable: true }
  ];

  nbuVersions: Array<{ id?: any; value?: any; label?: string; name?: string }> = [];

  /**
   * Constructor
   */
  constructor(
    private planService: InsurerPlansService,
    private nbu: NbuService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private cd: ChangeDetectorRef
  ) {}

  /** ngOnInit lifecycle */
  ngOnInit(): void {
    this.loadPlans();
    this.loadNbuOptions();
  }

  /** Loads all plans */
  loadPlans(): void {
    this.loading = true;
    this.planService.getPlansByInsurer(this.insurerId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: PlanCompleteResponseDTO[] | null | undefined) => {
          const rows = (res ?? []).map(p => this.toRow(p));

          // Order: active first, then alphabetical by name
          rows.sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return (a.name ?? '').localeCompare(b.name ?? '');
          });

          // compute badge field for GenericTable
          this.plans = rows.map(r => ({ ...r, is_active: r.isActive }));
          this.applyNbuLabels();
          this.plansChanged.emit();
        },
        error: () => this.showAlert('Error al cargar los planes.', 'error')
      });
  }

  /** Row actions menu for GenericTable */
  getActions = (row: any): MenuItem[] => {
    const actions: MenuItem[] = [
      { id: 'view', label: 'Ver detalle', icon: 'pi pi-eye', command: () => { this.mode = 'view'; this.selectedPlan = row; this.showForm = true; } },
      { id: 'edit', label: 'Editar', icon: 'pi pi-pencil', command: () => { this.mode = 'edit'; this.selectedPlan = row; this.showForm = true; } }
    ];

    // Acción dinámica según estado
    const isActive = (row as any).isActive;
    if (isActive) {
      actions.push({
        id: 'eliminar',
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          this.selectedPlan = row as any;
          this.showDeleteModal = true;
        }
      });
    }
    else {
      actions.push({
        id: 'activar',
        label: 'Activar',
        icon: 'pi pi-check',
        command: () => {
          this.selectedPlan = row as any;
          this.showActivateModal = true;
        }
      });
    }
    return actions;
  };

  /** Confirms deletion */
  confirmDelete(): void {
    if (!this.selectedPlan) return;
    this.planService
      .deactivatePlan(this.selectedPlan.id)
      .pipe(finalize(() => (this.showDeleteModal = false)))
      .subscribe({
        next: () => {
          this.showAlert('Plan eliminado correctamente.', 'success');
          this.loadPlans();
          this.plansChanged.emit();
        },
        error: () => this.showAlert('Error al eliminar el plan.', 'error')
      });
  }

  /** Cancels deletion */
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedPlan = null;
    this.mode = 'create';
  }

  /** Confirms activation */
  confirmActivate(): void {
    if (!this.selectedPlan) return;
    this.planService
      .activatePlan(this.selectedPlan.id)
      .pipe(finalize(() => (this.showActivateModal = false)))
      .subscribe({
        next: () => {
          this.showAlert('Plan activado correctamente.', 'success');
          this.loadPlans();
          this.plansChanged.emit();
        },
        error: () => this.showAlert('Error al activar el plan.', 'error')
      });
  }

  /** Cancels activation */
  cancelActivate(): void {
    this.showActivateModal = false;
    this.selectedPlan = null;
    this.mode = 'create';
  }

  /** New plan */
  addPlan(): void {
    this.mode = 'create';
    this.selectedPlan = null;
    this.showForm = true;
  }

  /** Reload after save */
  onPlanSaved(): void {
    this.showForm = false;
    this.selectedPlan = null;
    this.loadPlans();
    this.plansChanged.emit();
  }

  /** Cancel form */
  onPlanCanceled(): void {
    this.showForm = false;
    this.selectedPlan = null;
    this.mode = 'create';
  }

  /** Show a temporary alert */
  showAlert(message: string, type: 'success' | 'error' | 'warning'): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => (this.alertType = null), 3500);
  }

  /** Maps full DTO into the flat row consumed by the table */
  private toRow(p: PlanCompleteResponseDTO): PlanRow {
    const latest = this.pickActualAgreement(p.actualAgreements);

    return {
      id: p.id,
      code: p.code ?? null,
      name: p.name ?? null,
      acronym: p.acronym ?? null,
      isActive: p.isActive,
      iva: p.iva ?? null,

      validFromDate: latest?.validFromDate ?? null,
      versionNbu: latest?.versionNbu ?? null,
      ubValue: latest?.ubValue ?? null,
      coveragePercentage: latest?.coveragePercentage ?? null
    };
  }
  /** Picks the most recent agreement by validFromDate */
  private pickActualAgreement (covs: AgreementResponseDTO[] | null | undefined) {
    if (!covs || covs.length === 0) return null;

    // Today boundaries (ignore time)
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const actives = covs.filter(c => {
      const from = new Date(c.validFromDate);
      const to   = c.validToDate ? new Date(c.validToDate) : null;

      const fromOk = from < startToday;      // before today
      const toOk   = to ? to > endToday : true; // after today (null means no end date)
      return fromOk && toOk;
    });

    if (actives.length === 0) return null;

    return [...actives].sort(
      (a, b) => new Date(b.validFromDate).getTime() - new Date(a.validFromDate).getTime()
    )[0];
  }
  /** Load NBU Versions options */
  private loadNbuOptions(): void {
    this.nbu.getOptions().subscribe({
      next: (opts) => {
        this.nbuVersions = opts as any[];
        this.applyNbuLabels(); // ← refresca la tabla si ya hay filas
      },
      error: () => {  }
    });
  }

  /** NBU Versions options */
  private applyNbuLabels(): void {
    if (!this.plans?.length) return;
    this.plans = this.plans.map(p => ({
      ...p,
      versionNbu: this.nbuLabel(p.versionNbu)
    }));
  }
  /** Get NBU label for a value */
  private nbuLabel(value: any): string {
    const v = value != null ? String(value) : '';
    const opt = this.nbuVersions.find(o => {
      const anyOpt = o as any;
      return String(anyOpt.value ?? anyOpt.id ?? '') === v;
    }) as any;
    return opt?.label ?? opt?.name ?? v;
  }

  /** Get filtered data for export (from GenericTable's internal filtered data) */
  private getFilteredDataForExport(): PlanRow[] {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as PlanRow[];
    }
    // Fallback to all plans if table not available
    return this.plans;
  }

  /**
   * Export plans to Excel
   */
  async onExportExcel(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('No hay datos para exportar con los filtros aplicados.', 'warning');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: PLANS_EXPORT_COLUMNS,
        fileName: 'planes-convenios',
        sheetName: 'Planes y Convenios',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('Los planes se exportaron correctamente.', 'success');
      } else {
        this.showAlert(result.error || 'No se pudo generar el archivo de exportación.', 'error');
      }
    } catch {
      this.showAlert('No se pudo generar el archivo de exportación.', 'error');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  /**
   * Export plans to PDF
   */
  async onExportPdf(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('No hay datos para exportar con los filtros aplicados.', 'warning');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: PLANS_PDF_COLUMNS,
        fileName: 'planes-convenios',
        title: 'Listado de Planes y Convenios',
        orientation: 'landscape',
        includeDate: true,
        includeTimestamp: true,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 230,
          y: 8
        }
      });

      if (result.success) {
        this.showAlert('Los planes se exportaron correctamente.', 'success');
      } else {
        this.showAlert(result.error || 'No se pudo generar el archivo de exportación.', 'error');
      }
    } catch {
      this.showAlert('No se pudo generar el archivo de exportación.', 'error');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

}
