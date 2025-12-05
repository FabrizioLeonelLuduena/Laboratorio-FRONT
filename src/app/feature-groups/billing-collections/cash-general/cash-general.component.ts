import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import { TabView, TabViewModule } from 'primeng/tabview';
import { forkJoin } from 'rxjs';
import { PageTitleService } from 'src/app//shared/services/page-title.service';
import {
  GenericAlertComponent,
  AlertType
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { GenericColumn } from 'src/app/shared/models/generic-table.models';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from 'src/app/shared/services/export';

import { BranchOption } from '../../care-management/models/branches';
import { BranchService } from '../../care-management/services/branch.service';
import { CashMovementService } from '../cash-management/application/cash-movement.service';
import { CashRegisterService } from '../cash-management/application/cash-register.service';

import {
  CASH_MOVEMENT_EXPORT_COLUMNS,
  CASH_MOVEMENT_PDF_COLUMNS,
  CASH_REGISTER_EXPORT_COLUMNS,
  CASH_REGISTER_PDF_COLUMNS,
  CashRegisterSummaryRow
} from './cash-general-export-config';
import { CashMovementItem } from './cash-general.models';

/** Estado de sesión que viene del backend */
type CashSessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';


/**
 * Componente de Caja General
 */
@Component({
  selector: 'app-cash-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TabViewModule,
    GenericButtonComponent,
    GenericAlertComponent,
    GenericTableComponent,
    GenericBadgeComponent
  ],
  templateUrl: './cash-general.component.html',
  styleUrls: ['./cash-general.component.css']
})
export class CashGeneralComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(PageTitleService);
  private readonly renderer = inject(Renderer2);
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly branchService = inject(BranchService);
  private readonly cashMovementService = inject(CashMovementService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<CashRegisterSummaryRow>;
  @ViewChild('initialAmountTemplate') initialAmountTemplate!: TemplateRef<CashRegisterSummaryRow>;
  @ViewChild('currentAmountTemplate') currentAmountTemplate!: TemplateRef<CashRegisterSummaryRow>;
  @ViewChild('movementDateTemplate') movementDateTemplate!: TemplateRef<CashMovementItem>;
  @ViewChild('movementTypeTemplate') movementTypeTemplate!: TemplateRef<CashMovementItem>;
  @ViewChild('movementAmountTemplate') movementAmountTemplate!: TemplateRef<CashMovementItem>;
  @ViewChild('movementBalanceTemplate') movementBalanceTemplate!: TemplateRef<CashMovementItem>;
  @ViewChild('registerButtonRef') registerButtonRef?: ElementRef<HTMLDivElement>;
  @ViewChild(TabView) tabView?: TabView;

  readonly infoAlert = {
    type: 'info' as AlertType,
    title: 'Consolidado diario',
    text: 'Visualizá las cajas activas por sucursal y controlá movimientos desde un solo lugar.'
  };

  /** Filas de la tabla de resumen de cajas */
  readonly registerRows = signal<CashRegisterSummaryRow[]>([]);

  /** Monto actual de la caja principal */
  readonly mainCurrentAmount = signal<number>(0);

  /** Movimientos del tab "Movimientos" (se llenan desde backend) */
  readonly movements = signal<CashMovementItem[]>([]);

  /** Columnas de ambas tablas */
  readonly registerColumns = signal<GenericColumn[]>([]);
  readonly movementColumns = signal<GenericColumn[]>([]);

  /** Mensajes UI (errores, avisos, etc.) */
  readonly uiMessage = signal<{ type: AlertType; title: string; text: string } | null>(null);

  /** Filas que consume la tabla de movimientos */
  readonly movementRows = computed(() => this.movements());

  /** Loading state for exports */
  readonly loading = signal(false);

  /**
   * Acciones de la tabla de cajas.
   */
  getRegisterTableActions = (row: CashRegisterSummaryRow) => [
    {
      id: 'view',
      label: 'Ver detalle',
      icon: 'pi pi-eye',
      command: () => this.handleBoxAction('view', row)
    }
  ];

  // =============================
  // Ciclo de vida
  // =============================

  /**
   * Inicialización del componente
   */
  ngOnInit(): void {
    this.titleService.setTitle('Caja general');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections' },
      { label: 'Caja general' }
    ]);

    const nav = history.state;
    if (nav?.refresh) {
      this.loadSummaryData();
      return;
    }

    this.loadSummaryData();
  }

  /**
   * Configuración post-vista
   */
  ngAfterViewInit(): void {
    queueMicrotask(() => {
      // Orden: Sucursal, Caja, Estado, Monto inicial, Monto actual
      this.registerColumns.set([
        { field: 'branchName', header: 'Sucursal', sortable: true },
        { field: 'name', header: 'Caja', sortable: true },
        {
          field: 'sessionStatus',
          header: 'Estado',
          sortable: true,
          template: this.statusTemplate
        },
        {
          field: 'initialAmount',
          header: 'Monto inicial',
          sortable: true,
          template: this.initialAmountTemplate
        },
        {
          field: 'currentAmount',
          header: 'Monto actual',
          sortable: true,
          template: this.currentAmountTemplate
        }
      ]);

      this.movementColumns.set([
        { field: 'operation', header: 'Método de pago', sortable: true },
        { field: 'date', header: 'Fecha / Hora', template: this.movementDateTemplate, sortable: true },
        { field: 'type', header: 'Tipo', template: this.movementTypeTemplate, sortable: true },
        { field: 'amount', header: 'Monto', template: this.movementAmountTemplate, sortable: true },
        { field: 'balance', header: 'Saldo previo', template: this.movementBalanceTemplate, sortable: true }
      ]);

      this.attachRegisterButtonToTabs();
    });
  }

  // =============================
  // Carga de datos
  // =============================

  /**
   * Carga el resumen de la caja principal, sucursales y sus cajas.
   * También dispara la carga de movimientos para la caja principal.
   */
  private loadSummaryData(): void {
    forkJoin({
      main: this.cashRegisterService.getMainRegister(),
      branches: this.cashRegisterService.getBranches(),
      branchOptions: this.branchService.getBranchOptions()
    }).subscribe({
      next: ({ main, branches, branchOptions }) => {
        const rows: CashRegisterSummaryRow[] = [];

        const mainCurrent = Number(
          (main as any).current_amount ?? (main as any).currentAmount ?? 0
        );
        this.mainCurrentAmount.set(mainCurrent);

        const mainRegisterId: number | undefined =
          (main as any).register_id ?? (main as any).registerId;

        if (mainRegisterId != null) {
          this.loadMovementsForRegister(mainRegisterId);
        }

        const branchMap = new Map<number, string>();
        branchOptions.forEach((opt: BranchOption) => {
          branchMap.set(opt.id, opt.description ?? '');
        });

        branches.forEach((branch: any) => {
          const branchId: number = branch.branch_id ?? branch.branchId;

          const branchName =
            branchMap.get(branchId) ?? `Sucursal ${branchId ?? ''}`;

          (branch.registers ?? []).forEach((reg: any) => {
            const registerId: number = reg.register_id ?? reg.registerId;

            const sessionStatus: CashSessionStatus | null =
              (reg.session_status ?? reg.sessionStatus) ?? null;

            const initialAmount =
              Number(reg.initial_cash ?? reg.initialCash ?? 0);

            const currentAmount =
              Number(reg.current_cash ?? reg.currentCash ?? 0);

            rows.push({
              id: registerId,
              name: reg.description,
              branchId,
              branchName,
              user: null,
              sessionStatus,
              initialAmount,
              currentAmount
            });
          });
        });

        this.registerRows.set(rows);
      },
      error: (err: any) => {
        const msg = err?.message ?? 'No se pudo cargar el resumen de cajas.';
        this.uiMessage.set({
          type: 'error',
          title: 'Error al cargar datos',
          text: msg
        });
      }
    });
  }

  /**
   * Carga las sesiones de una caja específica y luego carga
   * los movimientos de la primera sesión.
   */
  private loadMovementsForRegister(registerId: number): void {
    this.cashRegisterService.getRegisterSessions(registerId, { page: 0, size: 1 }).subscribe({
      next: (page: any) => {
        const sessions = page?.content ?? [];
        if (!Array.isArray(sessions) || sessions.length === 0) {
          this.movements.set([]);
          return;
        }

        const first = sessions[0];
        const sessionId: number =
          first.session_id ?? first.sessionId ?? first.id;

        if (!sessionId) {
          this.movements.set([]);
          return;
        }

        this.loadMovementsForSession(sessionId);
      },
      error: (err: any) => {
        const msg =
          err?.message ?? 'No se pudieron obtener las sesiones de la caja principal.';
        this.uiMessage.set({
          type: 'error',
          title: 'Error al cargar sesiones',
          text: msg
        });
      }
    });
  }

  /**
   * Carga los movimientos de una sesión específica y los mapea
   * al formato de la tabla.
   */
  private loadMovementsForSession(sessionId: number): void {
    this.cashMovementService.getMovements(sessionId).subscribe({
      next: (movements) => {
        const cashMovement: CashMovementItem[] = movements.map((movement) => ({
          id: movement.id.toString(),
          operation: this.getPaymentMethodLabel(movement.paymentMethod),
          date: movement.transactionDate.toISOString(),
          type: movement.type === 'OUTFLOW' ? 'Egreso' : 'Ingreso',
          amount: movement.amount,
          balance: movement.previousAmount,
          branchId: '0',
          boxId: movement.sessionId.toString(),
          user: movement.userId?.toString() ?? ''
        }));
        this.movements.set(cashMovement);
      },
      error: (err: any) => {
        const msg =
          err?.message ??
          'No se pudieron obtener los movimientos de la caja principal.';
        this.uiMessage.set({
          type: 'error',
          title: 'Error al cargar movimientos',
          text: msg
        });
        this.movements.set([]);
      }
    });
  }

  /**
   * Convierte el paymentMethod del backend a texto legible
   */
  private getPaymentMethodLabel(paymentMethod: string): string {
    const labels: Record<string, string> = {
      'CASH': 'Efectivo',
      'DEBIT_CARD': 'Débito',
      'CREDIT_CARD': 'Crédito',
      'TRANSFER': 'Transferencia',
      'QR': 'QR'
    };
    return labels[paymentMethod] ?? paymentMethod;
  }

  // =============================
  // UI / helpers
  // =============================

  /**
   * Navega a la pantalla de registro de movimientos
   */
  navigateToRegister(): void {
    this.router.navigate(
      ['/billing-collections/cash-general/register'],
      {
        state: { from: 'main' }
      }
    );
  }

  /**
   * Maneja las acciones de la tabla de cajas
   */
  handleBoxAction(action: 'view' | 'close', target: CashRegisterSummaryRow): void {
    if (action === 'view') {
      this.router.navigate(
        ['/billing-collections/cash-detail', target.id],
        {
          state: {
            boxName: target.name,
            branchName: target.branchName,
            totalCurrentAmount: target.currentAmount
          }
        }
      );
    } else {
      return;
    }
  }

  /**
   * Retorna el status del badge según el estado de la sesión
   */
  getBadgeStatus(status?: CashSessionStatus | null): 'activo' | 'inactivo' {
    switch (status) {
    case 'OPEN':
      return 'activo';
    case 'CLOSED':
      return 'inactivo';
    default:
      return 'inactivo';
    }
  }

  /**
   * Retorna el label del estado de la sesión
   */
  getStatusLabel(status?: CashSessionStatus | null): string {
    switch (status) {
    case 'OPEN':
      return 'ACTIVA';
    case 'CLOSED':
      return 'CERRADA';
    default:
      return 'INACTIVA';
    }
  }

  private readonly movementAmountFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  /**
   * Formatea el monto de un movimiento con signo + o -
   */
  formatMovementAmount(amount: number, type: string): string {
    const normalized = Math.abs(amount);
    const prefix = type === 'Egreso' ? '-' : '+';
    return `${prefix}${this.movementAmountFormatter.format(normalized)}`;
  }

  /**
   * Adjunta el botón "Registrar" a la barra de tabs
   */
  private attachRegisterButtonToTabs(): void {
    const navElement = this.tabView?.navbar?.nativeElement as HTMLElement | undefined;
    const buttonContainer = this.registerButtonRef?.nativeElement;
    if (!navElement || !buttonContainer) return;

    if (!navElement.contains(buttonContainer)) {
      this.renderer.appendChild(navElement, buttonContainer);
    }

    buttonContainer.classList.add('tab-register-button--active');
  }

  /**
   * Export the cash register summary to Excel or PDF
   * @param filteredData - Filtered register data from the table
   * @param event - Export event specifying `type` as 'excel' or 'pdf'
   */
  async handleRegisterExport(filteredData: CashRegisterSummaryRow[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: filteredData,
          columns: CASH_REGISTER_EXPORT_COLUMNS,
          fileName: 'resumen_cajas',
          sheetName: 'Resumen de Cajas',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: filteredData,
          columns: CASH_REGISTER_PDF_COLUMNS,
          fileName: 'resumen_cajas',
          title: 'Resumen de Cajas - Facturación',
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
        this.uiMessage.set({
          type: 'success',
          title: 'Exportación exitosa',
          text: 'El resumen de cajas se exportó correctamente.'
        });
      } else {
        this.uiMessage.set({
          type: 'error',
          title: 'Error al exportar',
          text: result?.error || 'No se pudo generar el archivo de exportación.'
        });
      }
    } catch {
      this.uiMessage.set({
        type: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo de exportación.'
      });
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Export the cash movements to Excel or PDF
   * @param filteredData - Filtered movement data from the table
   * @param event - Export event specifying `type` as 'excel' or 'pdf'
   */
  async handleMovementExport(filteredData: CashMovementItem[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: filteredData,
          columns: CASH_MOVEMENT_EXPORT_COLUMNS,
          fileName: 'movimientos_caja',
          sheetName: 'Movimientos',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: filteredData,
          columns: CASH_MOVEMENT_PDF_COLUMNS,
          fileName: 'movimientos_caja',
          title: 'Movimientos de Caja - Facturación',
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
        this.uiMessage.set({
          type: 'success',
          title: 'Exportación exitosa',
          text: 'Los movimientos se exportaron correctamente.'
        });
      } else {
        this.uiMessage.set({
          type: 'error',
          title: 'Error al exportar',
          text: result?.error || 'No se pudo generar el archivo de exportación.'
        });
      }
    } catch {
      this.uiMessage.set({
        type: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo de exportación.'
      });
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
