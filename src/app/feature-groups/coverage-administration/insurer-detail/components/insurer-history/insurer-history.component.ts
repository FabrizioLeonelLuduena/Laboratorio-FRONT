import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DatePicker } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { Select } from 'primeng/select';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { GenericColumn } from '../../../../../shared/models/generic-table.models';
import { NbuLabelPipe } from '../../../../../shared/pipes/nbu-label.pipe';
import { ScalePipe } from '../../../../../shared/pipes/scale.pipe';
import { ExcelExportService, PdfExportService } from '../../../../../shared/services/export';
import { AgreementResponseDTO } from '../../../models/agreement.model';
import { AgreementService } from '../../../services/agreement.service';
import { InsurerPlansService } from '../../../services/insurer-plans.service';

import { HISTORY_EXPORT_COLUMNS, HISTORY_PDF_COLUMNS } from './insurer-history-export-config';


/**
 * Coverage history for an insurer – migrated to GenericTable.
 */
@Component({
  selector: 'app-insurer-history',
  imports: [
    GenericTableComponent,
    GenericAlertComponent,
    FormsModule,
    DropdownModule,
    DatePicker,
    Select
  ],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './insurer-history.component.html',
  styleUrl: './insurer-history.component.css'
})
export class InsurerHistoryComponent implements OnChanges {
  @Input({ required: true }) insurerId!: number;

  /** Raw list of coverages from API */
  insurerCoverages: AgreementResponseDTO[] = [];
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  planOptions: { label: string; value: number }[] = [];
  loading = false;

  // Reference to GenericTable component to access filtered data
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;

  // Filters state
  selectedPlanId: number | null = null;
  quickRange: string = '12m';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  // GenericTable columns and rows
  historyColumns : GenericColumn[] = [
    { field: 'versionNbu', header: 'Versión NBU', sortable: true, pipes:
        [
          { token: NbuLabelPipe }
        ]
    },
    { field: 'ubValue', header: 'Valor UB', sortable: true, pipes:
        [
          { token: CurrencyPipe, args: ['ARS', 'symbol-narrow', '1.2-2'] }
        ]
    },
    { field: 'coveragePercentage', header: 'Cobertura', sortable: true, pipes:
        [
          { token: ScalePipe, args: [0.01] },
          { token: PercentPipe, args: ['1.0-0'] }
        ]
    },
    { field: 'validFromDate', header: 'Vigente desde', sortable: true, pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    },
    { field: 'validToDate', header: 'Vigente hasta', sortable: true, nullDisplay: '—', pipes:
        [
          { token: DatePipe, args: ['dd/MM/yyyy'] }
        ]
    }
  ];
  historyRows: Array<Record<string, any>> = [];

  /** Constructor */
  constructor(
    private coverageService: AgreementService,
    private plansService: InsurerPlansService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private cd: ChangeDetectorRef
  ) { }


  quickRanges = [
    { label: 'Personalizado', value: 'custom' },
    { label: 'Último mes', value: '1m' },
    { label: 'Últimos 3 meses', value: '3m' },
    { label: 'Últimos 6 meses', value: '6m' },
    { label: 'Último año', value: '12m' },
    { label: 'Últimos 2 años', value: '24m' }
  ];

  /** Detect input changes */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['insurerId']?.currentValue) {
      this.setDefaultDates();
      this.loadPlans();
    }
  }

  /** Set the dates of the last year by default. */
  private setDefaultDates(): void {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);
    this.dateFrom = start;
    this.dateTo = end;
  }

  /** Load the coverage history for the selected plan. */
  private loadHistory(): void {
    if (!this.selectedPlanId) return;

    const from = this.dateFrom ? this.toISODate(this.dateFrom) : null;
    const to = this.dateTo ? this.toISODate(this.dateTo) : null;

    this.coverageService.search(this.selectedPlanId, from, to).subscribe({
      next: (data) => {
        this.insurerCoverages = data;
        this.historyRows = (data ?? []).map(c => ({
          versionNbu: c.versionNbu,
          ubValue: c.ubValue,
          coveragePercentage: c.coveragePercentage,
          validFromDate: c.validFromDate,
          validToDate: c.validToDate
        }));
      },
      error: () => {
        this.showAlert('error', 'No se pudo cargar el historial.');
      }
    });
  }

  /** Load the plans associated with the current insurer */
  private loadPlans(): void {
    if (!this.insurerId) return;

    this.plansService.getPlansByInsurer(this.insurerId).subscribe({
      next: (plans) => {
        this.planOptions = plans.map((p) => ({
          label: p.name,
          value: p.id
        }));

        if (this.planOptions.length > 0) {
          const lastPlan = [...plans].sort((a, b) => b.id - a.id)[0];
          this.selectedPlanId = lastPlan.id;
          this.loadHistory();
        } else {
          this.insurerCoverages = [];
          this.historyRows = [];
        }
      },
      error: () => {
        this.showAlert('error', 'No se pudieron cargar los planes de la aseguradora.');
      }
    });
  }

  /** Change the date range according to the quick select. */
  onQuickRangeChange(value: string): void {
    this.quickRange = value;
    if (value === 'custom') return;

    const end = new Date();
    const start = new Date();

    switch (value) {
    case '1m': start.setMonth(end.getMonth() - 1); break;
    case '3m': start.setMonth(end.getMonth() - 3); break;
    case '6m': start.setMonth(end.getMonth() - 6); break;
    case '12m': start.setFullYear(end.getFullYear() - 1); break;
    case '24m': start.setFullYear(end.getFullYear() - 2); break;
    }

    this.dateFrom = start;
    this.dateTo = end;
    this.loadHistory();
  }

  /** Update the table when changing plans. */
  onPlanChange(): void {
    this.loadHistory();
  }

  /** When one of the custom dates changes, update the filter. */
  onDateChange(): void {
    if (this.quickRange === 'custom') {
      this.loadHistory();
    }
  }

  /** Convert a date to ISO format (yyyy-MM-dd) */
  private toISODate(value: Date): string {
    return value.toISOString().split('T')[0];
  }

  /** To refresh from the parent */
  public refreshPlans(): void {
    this.loadPlans();
  }

  /** Displays a temporary alert message. */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3500);
  }

  /** Get filtered data for export (from GenericTable's internal filtered data) */
  private getFilteredDataForExport(): Array<Record<string, any>> {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as Array<Record<string, any>>;
    }
    // Fallback to all rows if table not available
    return this.historyRows;
  }

  /**
   * Export history to Excel
   */
  async onExportExcel(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: HISTORY_EXPORT_COLUMNS,
        fileName: 'historial-convenios',
        sheetName: 'Historial de Convenios',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('success', 'El historial se exportó correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  /**
   * Export history to PDF
   */
  async onExportPdf(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: HISTORY_PDF_COLUMNS,
        fileName: 'historial-convenios',
        title: 'Historial de Convenios',
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
        this.showAlert('success', 'El historial se exportó correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

}
