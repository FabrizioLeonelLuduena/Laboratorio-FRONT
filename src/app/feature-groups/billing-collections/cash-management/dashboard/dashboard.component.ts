import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject, computed, signal, ViewChild, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

// PrimeNG
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { AuthService } from '../../../../core/authentication/auth.service';
import {
  AlertType,
  GenericAlertComponent
} from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService } from '../../../../shared/services/export';
import { PdfExportService } from '../../../../shared/services/export';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { UserResponse } from '../../../user-management/models/login-model';
import { CashMovementService } from '../application/cash-movement.service';
import { CashRegisterService } from '../application/cash-register.service';
import { CashSessionService } from '../application/cash-session.service';
import { CashSummaryService } from '../application/cash-summary.service';
import { CashMovement } from '../domain/cash-movement.model';
import { CashRegister } from '../domain/cash-register.model';
import { CashMovementMapper } from '../mappers/cash-movement.mapper';

import { CASH_MOVEMENT_EXPORT_COLUMNS, CASH_MOVEMENT_PDF_COLUMNS } from './cash-movement-export-config';

/**
 * Constants for movement filter types
 */
const MovementFilterType = {
  ALL: 'all',
  ATTENTION: 'attention',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal'
} as const;

/**
 * Constants for payment method filter types
 */
const PaymentMethodFilterType = {
  ALL: 'all',
  CASH: 'CASH',
  DEBIT_CARD: 'DEBIT_CARD',
  CREDIT_CARD: 'CREDIT_CARD',
  TRANSFER: 'TRANSFER',
  QR: 'QR'
} as const;

/**
 *
 */
interface Column {
  field: string;
  header: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}

/**
 * @component CashDashboardComponent
 * @description Main dashboard for cash register operations, showing current session,
 * summary metrics, and recent movements.
 */
@Component({
  selector: 'app-cash-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    CardModule,
    GenericButtonComponent,
    TableModule,
    TagModule,
    MenuModule,
    DividerModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    GenericTableComponent,
    GenericAlertComponent,
    TutorialOverlayComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class CashDashboardComponent
implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('menu') menu!: Menu;
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('dateTemplate') dateTemplate!: TemplateRef<CashMovement>;
  @ViewChild('typeTemplate') typeTemplate!: TemplateRef<CashMovement>;
  @ViewChild('paymentMethodTemplate')
    paymentMethodTemplate!: TemplateRef<CashMovement>;
  @ViewChild('amountTemplate') amountTemplate!: TemplateRef<CashMovement>;
  @ViewChild('prevAmountTemplate')
    prevAmountTemplate!: TemplateRef<CashMovement>;
  @ViewChild('userTemplate') userTemplate!: TemplateRef<CashMovement>;

  private sessionService = inject(CashSessionService);
  private movementService = inject(CashMovementService);
  private summaryService = inject(CashSummaryService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);
  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private readonly registerService = inject(CashRegisterService);
  private readonly branchesService = inject(BranchService);
  private cdr = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private readonly tutorialService = inject(TutorialService);

  private tutorialSub?: Subscription;

  readonly registerName = signal<string>('');

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: '.dashboard__header',
        title: 'Panel de Control de Caja',
        message:
          'Aquí puedes ver toda la información de tu sesión actual, registrar nuevos movimientos y cerrar la caja al finalizar tu turno.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table:table-intro',
        title: 'Historial de Movimientos',
        message:
          'Esta tabla muestra todos los movimientos de tu sesión visualizando la fecha, el tipo, medio de pago, el monto operado y el monto previo.',
        position: 'top'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de Búsqueda',
        message:
          'Utiliza los filtros para buscar movimientos por tipo (Atención, Depósito, Extracción) y medio de pago (Efectivo, Tarjeta, etc.).',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda Rápida',
        message:
          'Utiliza la barra de búsqueda para encontrar movimientos de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar Datos',
        message:
          'Exporta el historial de movimientos a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom'
      }
    ],
    onComplete: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
    },
    onSkip: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
    }
  });
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  private userResponse: Partial<UserResponse> = {};

  // --- State Signals ---
  /** Signal for the current cash register session. */
  readonly currentSession = signal<CashRegister | null>(null);
  /** Signal for the cash summary data fetched from the backend. */
  readonly summary = this.summaryService.summary;
  /** Signal for the list of transactions in the current session. */
  readonly transactions = signal<CashMovement[]>([]);
  /** Signal indicating if transactions are being loaded. */
  readonly isLoading = signal<boolean>(true);
  /** Signal for the search term used to filter transactions. */
  readonly searchTerm = signal<string>('');
  /** Signal for the currently selected transaction for contextual actions. */
  readonly selectedTransaction = signal<CashMovement | null>(null);
  /** Signal for the selected payment method filter option. */
  readonly selectedPaymentFilter = signal<string>('all');

  readonly branchName = signal<string>('');

  // --- Menu Models ---
  menuItems: MenuItem[] = [];
  paymentMenuItems: MenuItem[] = [];
  filterMenuItems: MenuItem[] = [];
  tableFilters: Filter[] = [];
  transactionsColumns: Column[] = [];

  userName = '';

  // --- Filter State Signals ---
  /** Signal for the selected transaction type filter option. */
  readonly selectedTypeFilter = signal<string>('all');

  // --- Computed Properties ---
  /** Computed signal that filters transactions based on current filter criteria. */
  readonly filteredTransactions = computed(() => {
    let filtered = this.transactions();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((t) => {
        const typeLabel = this.getTransactionTypeLabel(t).toLowerCase();
        const paymentLabel = this.getPaymentMethodLabel(
          t.paymentMethod
        ).toLowerCase();
        return (
          t.reason?.toLowerCase().includes(term) ||
          t.type.toLowerCase().includes(term) ||
          typeLabel.includes(term) ||
          paymentLabel.includes(term)
        );
      });
    }

    const typeFilter = this.selectedTypeFilter();
    if (typeFilter !== MovementFilterType.ALL) {
      switch (typeFilter) {
      case MovementFilterType.ATTENTION:
        filtered = filtered.filter(
          (t) => t.type === 'INFLOW' && t.isFromAttention
        );
        break;
      case MovementFilterType.DEPOSIT:
        filtered = filtered.filter(
          (t) => t.type === 'INFLOW' && !t.isFromAttention
        );
        break;
      case MovementFilterType.WITHDRAWAL:
        filtered = filtered.filter((t) => t.type === 'OUTFLOW');
        break;
      }
    }

    const paymentFilter = this.selectedPaymentFilter();
    if (paymentFilter !== PaymentMethodFilterType.ALL) {
      filtered = filtered.filter((t) => t.paymentMethod === paymentFilter);
    }

    return filtered;
  });

  /** The current cash balance, derived from the summary data. Defaults to 0 if summary is not available. */
  readonly currentBalance = computed(() => {
    return this.summary()?.totalCash ?? 0;
  });

  /** Computed signal that prepares transaction data for the table component. */
  readonly transactionsTableData = computed<Record<string, unknown>[]>(() =>
    this.filteredTransactions().map(
      (transaction) =>
        ({
          ...transaction,
          typeLabel: this.getTransactionTypeLabel(transaction),
          paymentLabel: this.getPaymentMethodLabel(transaction.paymentMethod)
        } as Record<string, unknown>)
    )
  );

  /**
   * Angular lifecycle hook invoked after component initialization.
   */
  ngOnInit(): void {
    this.titleService.setTitle('Panel de caja');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Movimientos' }
    ]);
    this.loadSessionData();
    this.getUser();
    //this.setupColumns();
    //this.initializeMenus();
    this.loadBranchData();
    this.setupFilters();

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe(
      (route: string) => {
        if (
          !route.includes('billing-collections') ||
          !route.includes('dashboard')
        )
          return;

        setTimeout(() => {
          this.tutorialOverlay?.start();
        }, 500);
      }
    );
  }

  /**
   * Angular lifecycle hook called after the component's view (and its child views) has been initialized.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setupColumns();
    });
  }

  /**
   * Configures the column metadata consumed by the reusable table component.
   */
  private setupColumns(): void {
    this.transactionsColumns = [
      {
        field: 'transactionDate',
        header: 'Fecha',
        sortable: true,
        template: this.dateTemplate
      },
      {
        field: 'type',
        header: 'Tipo',
        sortable: true,
        template: this.typeTemplate
      },
      {
        field: 'paymentMethod',
        header: 'Medio de pago',
        sortable: true,
        template: this.paymentMethodTemplate
      },
      {
        field: 'amount',
        header: 'Monto operado',
        sortable: true,
        template: this.amountTemplate
      },
      {
        field: 'previousAmount',
        header: 'Monto previo',
        sortable: true,
        template: this.prevAmountTemplate
      }
    ];
  }

  /**
   * Loads current session data from the session service state.
   */
  private loadSessionData(): void {
    const session = this.sessionService.currentSession();

    if (session) {
      this.currentSession.set(session);
      this.loadTransactions();
      this.loadSummary();
      this.loadRegisterName();
      return;
    }

    this.sessionService.loadCurrentSession().subscribe({
      next: (loadedSession) => {
        if (loadedSession) {
          this.currentSession.set(loadedSession);
          this.loadTransactions();
          this.loadSummary();
          this.loadRegisterName();
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.showAlert(
          'error',
          'Error al cargar sesión',
          'No se pudo obtener la sesión de caja.'
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Loads transactions for the current session from the movement service.
   */
  private loadTransactions(): void {
    this.isLoading.set(true);
    const session = this.currentSession();
    if (!session) {
      this.transactions.set([]);
      this.isLoading.set(false);
      return;
    }

    this.movementService.getMovements(session.id).subscribe({
      next: (movs) => {
        this.transactions.set(movs);
        this.isLoading.set(false);
      },
      error: () => {
        this.transactions.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Loads the cash summary for the current session from the summary service.
   * Updates the summary signal on success or shows an error message.
   */
  private loadSummary(): void {
    const session = this.currentSession();
    if (!session) {
      this.summaryService.clear();
      return;
    }

    this.summaryService.refresh(session.id);
  }

  /**
   * Loads the cash summary for the current session from the summary service.
   * Updates the summary signal on success or shows an error message.
   */
  private loadRegisterName(): void {
    const session = this.currentSession();
    if (!session?.cashRegisterId) {
      this.registerName.set('');
      return;
    }

    this.registerService.getRegisterNameById(session.cashRegisterId).subscribe({
      next: (name) => this.registerName.set(name),
      error: () => this.registerName.set('')
    });
  }

  /**
   * Navigates to a specified application path.
   * @param path - The path to navigate to.
   */
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  /**
   * Shows the context menu for a specific transaction.
   * @param event - The DOM event that triggered the action.
   * @param transaction - The transaction to show the menu for.
   */
  showMenu(event: Event, transaction: CashMovement): void {
    this.selectedTransaction.set(transaction);
    this.buildMenuItems(transaction);
    this.menu.toggle(event);
  }

  /**
   * Builds the menu items for the selected transaction's context menu.
   * @param transaction - The transaction to build the menu for.
   */
  private buildMenuItems(transaction: CashMovement): void {
    this.menuItems = [
      {
        label: 'Detalles',
        icon: 'pi pi-eye',
        command: () => this.viewDetails(transaction)
      },
      {
        label: 'Recibo',
        icon: 'pi pi-file-pdf',
        visible: false,
        command: () => this.viewVoucher(transaction)
      },
      { separator: true },
      {
        label: 'Añadir nota',
        icon: 'pi pi-comment',
        command: () => this.addNote(transaction)
      },
      { separator: true },
      {
        label: 'Cancelar Transacción',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => this.cancelTransaction(transaction)
      }
    ];
  }

  /**
   * Placeholder for viewing transaction details.
   * @param transaction - The transaction to view.
   */
  viewDetails(transaction: CashMovement): void {
    // TODO: Implement details modal
    this.showAlert(
      'info',
      'Detalles',
      `Mostrando detalles de la transacción ${transaction.id}`
    );
  }

  /**
   * Placeholder for viewing a transaction voucher.
   * @param transaction - The transaction whose voucher to view.
   */
  viewVoucher(transaction: CashMovement): void {
    // TODO: Implement voucher display
    this.showAlert(
      'info',
      'Comprobante',
      `Mostrando comprobante de la transacción ${transaction.id}`
    );
  }

  /**
   * Placeholder for adding a note to a transaction.
   * @param transaction - The transaction to add a note to.
   */
  addNote(transaction: CashMovement): void {
    // TODO: Implement add note modal
    this.showAlert(
      'info',
      'Nota',
      `Agregando nota a la transacción ${transaction.id}`
    );
  }

  /**
   * Initiates the process to cancel a transaction after user confirmation.
   * @param transaction - The transaction to cancel.
   */
  cancelTransaction(transaction: CashMovement): void {
    const session = this.currentSession();
    if (session) this.summaryService.refresh(session.id);
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this transaction?',
      header: 'Confirm Cancellation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, cancel',
      rejectLabel: 'No',
      accept: () => {
        // TODO: Implement transaction cancellation logic
        this.showAlert(
          'success',
          'Transacción cancelada',
          `La transacción ${transaction.id} ha sido cancelada.`
        );
        this.loadTransactions();
      }
    });
  }

  /**
   * Gets the severity color for a transaction type tag.
   * @param transaction - The transaction.
   * @returns 'success', 'warning', or 'info'.
   */
  getTransactionTypeSeverity(
    transaction: CashMovement
  ): 'success' | 'warning' | 'info' | 'danger' {
    switch (transaction.type) {
    case 'INFLOW':
      if (transaction.isFromAttention) {
        return 'success';
      } else {
        return 'info';
      }
    case 'OUTFLOW':
      return 'danger';
    default:
      return 'info';
    }
  }

  /**
   * Gets the display label for a transaction type.
   * @param transaction - The transaction.
   * @returns The display label string.
   */
  getTransactionTypeLabel(transaction: CashMovement): string {
    switch (transaction.type) {
    case 'INFLOW':
      if (transaction.isFromAttention) {
        return 'Atención';
      } else {
        return 'Depósito';
      }
    case 'OUTFLOW':
      return 'Extracción';
    default:
      return 'Movimiento';
    }
  }

  /**
   * Returns a human-readable label for a payment method code.
   *
   * Delegates to CashMovementMapper.getPaymentMethodLabel to map a payment method
   * identifier (for example 'CASH', 'CARD', etc.) to its corresponding display label.
   *
   * @param method - The payment method identifier or code to map.
   * @returns A user-facing label for the provided payment method. If the method
   * is not recognized, the mapper's fallback behavior will apply (e.g. it may
   * return the original code or a default label).
   */
  getPaymentMethodLabel(method: string): string {
    return CashMovementMapper.getPaymentMethodLabel(method);
  }

  /**
   * Formats a transaction amount with a currency symbol and sign.
   * @param amount - The numerical amount.
   * @param type - The transaction type ('INFLOW' or 'OUTFLOW').
   * @returns The formatted amount string.
   */
  formatAmount(amount: number, type: string): string {
    const formattedAmount = Math.abs(amount);
    const prefix = type === 'OUTFLOW' ? '-' : '+';
    return `${prefix}$${formattedAmount.toLocaleString('es-AR', {
      minimumFractionDigits: 2
    })}`;
  }

  /**
   * Gets the formatted opening date of the current session.
   * @returns The formatted date string.
   */
  readonly formattedOpeningDate = computed(() => {
    const session = this.currentSession();
    if (!session) return 'Date not available';
    const date = new Date(session.openedAt);

    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  });

  /**
   * Sets the type filter state.
   * @param filter - The selected type filter.
   */
  setTypeFilter(filter: string): void {
    this.selectedTypeFilter.set(filter);
  }

  /**
   * Clears all active filters and resets the search term.
   */
  clearFilters(): void {
    this.selectedTypeFilter.set(MovementFilterType.ALL);
    this.searchTerm.set('');
    this.showAlert(
      'info',
      'Filtros limpiados',
      'Todos los filtros han sido limpiados.'
    );
  }

  /**
   * Gets the authenticated user's data from the `AuthService`.
   *
   * Populates the local `userResponse` property and sets the
   * `user` form control's value with the formatted full name.
   *
   * If no user is found in the service, it displays an error modal.
   *
   * @returns {void}
   */
  getUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userResponse = user;
      this.userName =
        this.userResponse.firstName + ', ' + this.userResponse.lastName;
    }
  }

  /**
   * Handles filter-related actions emitted from the table's filter popover.
   *
   * @param {FilterChangeEvent} event The filter event.
   * @returns {void}
   */
  onTableFilterAction(event: FilterChangeEvent): void {
    const typeFilter =
      event.filters.find((f) => f.id === 'type')?.value ??
      MovementFilterType.ALL;
    this.setTypeFilter(typeFilter as string);

    const paymentFilter =
      event.filters.find((f) => f.id === 'payment')?.value ??
      PaymentMethodFilterType.ALL;
    this.selectedPaymentFilter.set(paymentFilter as string);
  }

  /**
   * Handles export actions emitted from the table's export menu.
   *
   * Exports the filtered transactions to Excel or PDF format.
   *
   * @param {object} evt The export event object.
   * @param {'excel' | 'pdf'} evt.type The selected export format.
   * @returns {void}
   */
  async onTableExportAction(evt: { type: 'excel' | 'pdf' }): Promise<void> {
    this.isLoading.set(true);
    this.cdr.markForCheck();

    try {
      // Use filtered transactions for export
      const dataToExport = this.filteredTransactions();
      let result;

      if (evt.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: CASH_MOVEMENT_EXPORT_COLUMNS,
          fileName: 'movimientos_caja',
          sheetName: 'Movimientos',
          includeTimestamp: true
        });
      } else if (evt.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: CASH_MOVEMENT_PDF_COLUMNS,
          fileName: 'movimientos_caja',
          title: 'Movimientos de Caja',
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
        this.showAlert('success', 'Exportación exitosa', 'Los movimientos se exportaron correctamente.');
      } else {
        this.showAlert('error', 'Error al exportar', result?.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'Error al exportar', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Loads branch data by matching the current session's cash register to branches.
   * Fetches all branches with their registers and finds the branch that contains
   * the cash register matching the current session's cashRegisterId.
   * In case of an error, displays an alert notification for 3 seconds.
   */
  private loadBranchData(): void {
    const currentCashRegisterId = this.currentSession()?.cashRegisterId;

    if (!currentCashRegisterId) {
      return;
    }

    this.registerService.getBranches().subscribe({
      next: (branchesWithRegisters) => {
        // Find the branch that contains the register matching the current session's cashRegisterId
        for (const branchData of branchesWithRegisters) {
          const matchingRegister = branchData.registers.find(
            register => register.registerId === currentCashRegisterId
          );

          if (matchingRegister) {
            // Found the matching branch, now get its name from branchService
            this.branchesService.getBranchOptions().subscribe({
              next: (branches) => {
                const branch = branches.find(b => b.id === branchData.branchId);
                if (branch) {
                  this.branchName.set(branch.description);
                }
              },
              error: () => {
                this.showAlert(
                  'error',
                  'Error al cargar las sucursales',
                  'No se pudo cargar el nombre de la sucursal'
                );
              }
            });
            break;
          }
        }
      },
      error: () => {
        this.showAlert(
          'error',
          'Error al cargar las sucursales',
          'No hay sucursales disponibles'
        );
      }
    });
  }

  /**
   * Initializes the component's table filter configuration.
   *
   * @private
   * @returns void
   */
  private setupFilters(): void {
    this.tableFilters = [
      {
        id: 'type',
        label: 'Filtrar por Tipo',
        type: 'radio',
        options: [
          { label: 'Todos', value: MovementFilterType.ALL, active: true },
          {
            label: 'Atención',
            value: MovementFilterType.ATTENTION,
            active: false
          },
          {
            label: 'Depósito',
            value: MovementFilterType.DEPOSIT,
            active: false
          },
          {
            label: 'Extracción',
            value: MovementFilterType.WITHDRAWAL,
            active: false
          }
        ]
      },
      {
        id: 'payment',
        label: 'Medio de pago',
        type: 'radio',
        options: [
          { label: 'Todos', value: PaymentMethodFilterType.ALL, active: true },
          { label: 'Efectivo', value: PaymentMethodFilterType.CASH, active: false },
          { label: 'Tarjeta de Débito', value: PaymentMethodFilterType.DEBIT_CARD, active: false },
          { label: 'Tarjeta de Crédito', value: PaymentMethodFilterType.CREDIT_CARD, active: false },
          { label: 'Transferencia', value: PaymentMethodFilterType.TRANSFER, active: false },
          { label: 'QR', value: PaymentMethodFilterType.QR, active: false }
        ]
      }
    ];
  }

  /**
   * Helper method to display alert messages
   * @param type - Type of alert (success, error, warning, info)
   * @param title - Alert title
   * @param text - Alert message text
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

}
