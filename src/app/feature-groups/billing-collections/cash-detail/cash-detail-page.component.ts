import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import {
  AlertType,
  GenericAlertComponent
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import {
  GenericTableComponent
} from 'src/app/shared/components/generic-table/generic-table.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { GenericColumn } from 'src/app/shared/models/generic-table.models';
import { ExcelExportService, PdfExportService } from 'src/app/shared/services/export';

import { CashRegisterService } from '../cash-management/application/cash-register.service';

import {
  CASH_DETAIL_EXPORT_COLUMNS,
  CASH_DETAIL_PDF_COLUMNS
} from './cash-detail-export-config';

/**
 * Cash session status type
 */
type CashSessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

/**
 * Cash session row interface for table display
 */
export interface CashSessionRow {
  sessionId: number;
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  finalCash: number | null;
  status: CashSessionStatus;
}

/**
 *
 */
interface CashDetailSummary {
  cashId: string;
  boxName: string;
  branchName: string;
  total: number;
}

/**
 *
 */
@Component({
  selector: 'app-cash-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    DropdownModule,
    GenericButtonComponent,
    GenericAlertComponent,
    GenericModalComponent,
    GenericTableComponent,
    GenericBadgeComponent,
    FormsModule
  ],
  templateUrl: './cash-detail-page.component.html',
  styleUrl: './cash-detail-page.component.scss'
})
export class CashDetailPageComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cashRegisterService = inject(CashRegisterService);

  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly cdr = inject(ChangeDetectorRef);

  amountModalVisible = signal(false);
  transferAmount: number = 0;
  @ViewChild('openedTemplate') openedTemplate!: TemplateRef<CashSessionRow>;
  @ViewChild('closedTemplate') closedTemplate!: TemplateRef<CashSessionRow>;
  @ViewChild('initialCashTemplate') initialCashTemplate!: TemplateRef<CashSessionRow>;
  @ViewChild('finalCashTemplate') finalCashTemplate!: TemplateRef<CashSessionRow>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<CashSessionRow>;

  readonly sessions = signal<CashSessionRow[]>([]);
  readonly filteredSessions = signal<CashSessionRow[]>([]);
  readonly movementColumns = signal<GenericColumn[]>([]);
  readonly alertMessage = signal<{ type: AlertType; title: string; text: string } | null>(null);
  readonly emptyModalVisible = signal(false);
  readonly loading = signal(false);

  readonly detailSummary = signal<CashDetailSummary>({
    cashId: '',
    boxName: 'Caja no identificada',
    branchName: 'Sucursal no identificada',
    total: 0
  });

  readonly tableFilters = signal<Filter[]>([
    {
      id: 'status',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Abiertas', value: 'OPEN' },
        { label: 'Cerradas', value: 'CLOSED' },
        { label: 'Canceladas', value: 'CANCELLED' }
      ]
    }
  ]);

  readonly subtitle = computed(
    () =>
      `Caja ${this.detailSummary().boxName} en Sucursal ${this.detailSummary().branchName}`
  );

  /**
   * Constructor
   */
  constructor() {
    const cashIdParam = this.route.snapshot.paramMap.get('cashId');
    const cashIdNumber = cashIdParam ? Number(cashIdParam) : NaN;

    const navState =
      this.router.getCurrentNavigation()?.extras.state as
        | { branchName?: string; totalCurrentAmount?: number }
        | undefined;

    this.detailSummary.set({
      cashId: cashIdParam ?? '',
      boxName: 'Cargando...',
      branchName: navState?.branchName ?? 'Sucursal no identificada',
      total: navState?.totalCurrentAmount ?? 0
    });

    if (!Number.isNaN(cashIdNumber)) {

      this.cashRegisterService
        .getRegisterNameById(cashIdNumber)
        .subscribe({
          next: (registerName: string) => {
            this.detailSummary.update((summary) => ({
              ...summary,
              boxName: registerName
            }));
          },
          error: () => {
            this.detailSummary.update((summary) => ({
              ...summary,
              boxName: `Caja ${cashIdNumber}`
            }));
          }
        });

      this.loadSessions(cashIdNumber);

    } else {
      this.alertMessage.set({
        type: 'error',
        title: 'Caja no válida',
        text: 'No se pudo determinar el identificador de la caja.'
      });
    }
  }


  /** Initializes the table column definitions once the view templates are available. */
  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.movementColumns.set([
        {
          field: 'openedAt',
          header: 'Apertura',
          template: this.openedTemplate,
          sortable: true
        },
        {
          field: 'closedAt',
          header: 'Cierre',
          template: this.closedTemplate,
          sortable: true
        },
        {
          field: 'initialCash',
          header: 'Monto inicial',
          template: this.initialCashTemplate,
          sortable: true
        },
        {
          field: 'finalCash',
          header: 'Monto cierre',
          template: this.finalCashTemplate,
          sortable: true
        },
        {
          field: 'status',
          header: 'Estado',
          template: this.statusTemplate,
          sortable: true
        }
      ]);
    });
  }

  /** Handles filter changes coming from the generic table and updates the filtered list. */
  handleFilterChange(event: FilterChangeEvent): void {
    const statusFilter = event.filters.find((f) => f.id === 'status')?.value as
      | CashSessionStatus
      | null
      | undefined;

    const base = this.sessions();
    const next =
      statusFilter && typeof statusFilter === 'string'
        ? base.filter((s) => s.status === statusFilter)
        : base;
    this.filteredSessions.set(next);

    this.tableFilters.update((filters) =>
      filters.map((filter) =>
        filter.id !== 'status'
          ? filter
          : {
            ...filter,
            options: filter.options?.map((option) => ({
              ...option,
              active: option.value === (statusFilter ?? null)
            }))
          }
      )
    );
  }

  /**
   * Export the current session list to Excel or PDF using generic export services.
   * @param filteredData - Filtered session data from the table
   * @param event - Export event specifying `type` as 'excel' or 'pdf'.
   */
  async handleExportAction(filteredData: CashSessionRow[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      let result;
      const boxName = this.detailSummary().boxName || 'Caja';
      const branchName = this.detailSummary().branchName || 'Sucursal';

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: filteredData,
          columns: CASH_DETAIL_EXPORT_COLUMNS,
          fileName: `sesiones_${boxName.toLowerCase().replace(/\s+/g, '_')}`,
          sheetName: 'Sesiones de Caja',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: filteredData,
          columns: CASH_DETAIL_PDF_COLUMNS,
          fileName: `sesiones_${boxName.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Sesiones de ${boxName} - ${branchName}`,
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
      }

      if (result?.success) {
        this.alertMessage.set({
          type: 'success',
          title: 'Exportación exitosa',
          text: 'Las sesiones de caja se exportaron correctamente.'
        });
      } else {
        this.alertMessage.set({
          type: 'error',
          title: 'Error al exportar',
          text: result?.error || 'No se pudo generar el archivo de exportación.'
        });
      }
    } catch {
      this.alertMessage.set({
        type: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo de exportación.'
      });
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Loads all sessions for the given register and prepares the table rows. */
  private loadSessions(registerId: number): void {
    this.cashRegisterService.getRegisterSessions(registerId).subscribe({
      next: (page: any) => {
        const rows: CashSessionRow[] = (page?.content ?? []).map(
          (session: any): CashSessionRow => ({
            sessionId: session.sessionId,
            openedAt: session.openedAt,
            closedAt: session.closedAt,
            initialCash: Number(session.initialCash ?? 0),
            finalCash:
              session.finalCash != null ? Number(session.finalCash) : null,
            status: session.status as CashSessionStatus
          })
        );

        this.sessions.set(rows);
        this.filteredSessions.set(rows);

        const openSession = rows.find((r) => r.status === 'OPEN');
        const summarySource = openSession ?? rows[0];

        if (summarySource) {
          this.detailSummary.update((summary) => ({
            ...summary,
            total: summarySource.finalCash ?? summarySource.initialCash
          }));
        }
      },
      error: (err: any) => {
        const message =
          err?.message || 'No se pudieron cargar las sesiones de caja.';
        this.alertMessage.set({
          type: 'error',
          title: 'Error',
          text: message
        });
      }
    });
  }

  /** Maps a session status to the visual badge style. */
  getBadgeStatus(status?: CashSessionStatus | null): 'activo' | 'inactivo' {
    switch (status) {
    case 'OPEN':
      return 'activo';
    case 'CLOSED':
    case 'CANCELLED':
    default:
      return 'inactivo';
    }
  }

  /** Maps a session status to the label text shown in the badge. */
  getStatusLabel(status?: CashSessionStatus | null): string {
    switch (status) {
    case 'OPEN':
      return 'ACTIVA';
    case 'CLOSED':
      return 'CERRADA';
    case 'CANCELLED':
      return 'CANCELADA';
    default:
      return '-';
    }
  }

  /** Navigates back to the general cash page. */
  goBack(): void {
    this.router.navigate(['/billing-collections/cash-general']);
  }

  /** Opens the confirmation modal for emptying the cash register. */
  openEmptyModal(): void {
    this.emptyModalVisible.set(true);
    this.amountModalVisible.set(true);
  }

  /**
   * Closes the empty modal.
   */
  closeAmountModal(): void {
    this.amountModalVisible.set(false);
    this.transferAmount = 0;
  }

  /** Confirms the empty action and updates the current total in the summary. */
  confirmTransfer(): void {
    const amount = Number(this.transferAmount);
    const registerId = Number(this.detailSummary().cashId);

    if (amount <= 0) {
      this.alertMessage.set({
        type: 'warning',
        title: 'Monto inválido',
        text: 'Ingresá un monto mayor a cero.'
      });
      return;
    }

    const payload = { amount };

    this.cashRegisterService.emptyRegister(registerId, payload).subscribe({
      next: () => {
        this.detailSummary.update((s) => ({
          ...s,
          total: s.total - amount
        }));

        this.alertMessage.set({
          type: 'success',
          title: 'Transferencia realizada',
          text: 'El monto fue transferido correctamente a la caja grande.'
        });

        this.amountModalVisible.set(false);
        this.transferAmount = 0;

        this.router.navigate(['/billing-collections/cash-general'], {
          state: { refresh: true }
        });
      },

      error: () => {
        this.alertMessage.set({
          type: 'error',
          title: 'Error',
          text: 'No se pudo realizar la transferencia.'
        });
      }
    });
  }
}
