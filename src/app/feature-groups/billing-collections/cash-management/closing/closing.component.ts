import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextarea } from 'primeng/inputtextarea';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';

import { AuthService } from '../../../../core/authentication/auth.service';
import { BasicTableComponent } from '../../../../shared/components/basic-table/basic-table.component';
import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { PrimeModalService } from '../../../../shared/components/modal/prime-modal.service';
import { ColumnConfig } from '../../../../shared/models/column-config';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { CashRegisterService } from '../application/cash-register.service';
import { CashSessionService } from '../application/cash-session.service';
import { CashSummaryService } from '../application/cash-summary.service';
import {
  TransactionBreakdown,
  TransactionTableRow
} from '../dto/response/cash-summary.dto';

/**
 * CashClosingComponent - Handles the UI and workflow for cash register closing.
 * Retrieves current session details, displays summary of transactions,
 * calculates cash differences, and performs the close cash session process.
 */
@Component({
  selector: 'app-cash-closing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputNumberModule,
    InputTextarea,
    BasicTableComponent,
    GenericButtonComponent,
    GenericAlertComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './closing.component.html',
  styleUrls: ['./closing.component.css']
})
export class CashClosingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly branchesService = inject(BranchService);
  private readonly sessionService = inject(CashSessionService);
  private readonly summaryService = inject(CashSummaryService);
  private readonly modalService = inject(PrimeModalService);
  private readonly registerService = inject(CashRegisterService);
  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);

  readonly userName = signal<string>('');
  readonly branchName = signal<string>('');
  readonly registerName = signal<string>('');
  readonly sessionId = signal<number | null>(null);
  readonly initialCash = signal<number>(0);
  readonly finalCash = signal<number>(0);
  readonly openedAt = signal<string>('');
  readonly movementCount = signal<number>(0);

  readonly isLoadingSummary = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly transactions = signal<TransactionTableRow[]>([]);
  readonly showConfirmationModal = signal<boolean>(false);

  // Reactive numeric difference: declaredCash (form) - finalCash (system)
  readonly differenceValue = signal<number>(0);

  readonly alert = signal<{
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    text: string
  } | null>(null);

  private pendingCloseDetails: { final_cash: string; observations: string } | null = null;
  closingForm!: FormGroup;

  tableColumns: ColumnConfig[] = [
    { columnDef: 'type', header: 'Tipo' },
    { columnDef: 'cash', header: 'Efectivo' },
    { columnDef: 'qr', header: 'QR' },
    { columnDef: 'card', header: 'Tarjeta' },
    { columnDef: 'transfer', header: 'Transferencia' },
    { columnDef: 'total', header: 'Total' }
  ];

  readonly minAmount = 0;
  // Adjusted to 12 digits: 999.999.999.999
  readonly maxAmount = 999999999999;

  /**
   * Lifecycle initialization.
   * Sets up form, loads user, branch and the active cash session data.
   */
  ngOnInit(): void {
    this.titleService.setTitle('Cierre de caja');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Cierre de caja' }
    ]);
    this.loadCurrentSession();
    this.initForm();
    this.loadUserData();
    this.loadBranchData();
  }

  /**
   * Initializes the closing form including declared cash
   * and attaches a listener to recalculate the difference vs system cash.
   */
  private initForm(): void {
    this.closingForm = this.fb.group({
      declaredCash: [0, [Validators.required, Validators.min(this.minAmount), Validators.max(this.maxAmount), this.amountLimitValidator(this.maxAmount)]],
      observations: ['', [Validators.maxLength(500)]]
    });

    // Update difference when declared cash changes
    const declaredControl = this.closingForm.get('declaredCash');
    declaredControl?.valueChanges.subscribe((val) => {
      const declared = Number(val ?? 0) || 0;
      const system = Number(this.finalCash()) || 0;
      this.differenceValue.set(declared - system);
    });
  }

  /**
   * Validador personalizado: limita parte entera a 12 dígitos y hasta 2 decimales
   */
  private amountLimitValidator(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (val == null || val === '') return null;
      // Aceptar tanto número como string con separadores
      let str = String(val);
      // Reemplazar separadores de miles y comas decimales
      str = str.replace(/\./g, ''); // quitar puntos de miles
      str = str.replace(/,/g, '.'); // usar punto como separador decimal
      const num = Number(str);
      if (isNaN(num)) return { invalidNumber: true };

      if (num > max) {
        return { max: { max, actual: num } };
      }

      const parts = str.split('.');
      const integerPart = parts[0].replace('-', '').replace(/^0+(?=\d)/, '');
      const fractionPart = parts[1] ?? '';

      if (integerPart.length > 12) {
        return { integerTooLong: { maxDigits: 12, actualDigits: integerPart.length } };
      }
      if (fractionPart.length > 2) {
        return { fractionTooLong: { maxDecimals: 2, actualDecimals: fractionPart.length } };
      }
      return null;
    };
  }

  /**
   * Handler para el evento onInput de p-inputNumber: clampa el valor al máximo y limita a 2 decimales
   */
  onAmountInput(event: any): void {
    if (!event) return;
    const raw = event?.value ?? event?.target?.value ?? event;
    if (raw == null || raw === '') return;

    let str = String(raw);
    // Si viene con formateo (p-inputNumber puede pasar number directamente)
    if (typeof raw === 'number') {
      const clamped = Math.min(raw, this.maxAmount);
      const rounded = Math.round(clamped * 100) / 100;
      const control = this.closingForm.get('declaredCash');
      if (control && Number(control.value) !== rounded) {
        control.setValue(rounded, { emitEvent: false });
      }
      return;
    }

    // limpiar separadores de miles y normalizar decimales
    str = str.replace(/\./g, '');
    str = str.replace(/,/g, '.');

    // Limitar a máximo 12 dígitos enteros + 2 decimales = 15 caracteres máximo (sin punto decimal)
    const parts = str.split('.');
    let integerPart = parts[0].replace('-', '');
    const fractionPart = parts[1] ?? '';

    // Truncar parte entera a 12 dígitos
    if (integerPart.length > 12) {
      integerPart = integerPart.substring(0, 12);
    }

    // Truncar decimales a 2 dígitos
    let truncatedFraction = fractionPart.substring(0, 2);

    str = integerPart + (truncatedFraction ? '.' + truncatedFraction : '');
    const num = Number(str);
    if (isNaN(num)) return;

    let clamped = Math.min(num, this.maxAmount);
    // limitar a 2 decimales
    clamped = Math.round(clamped * 100) / 100;

    const control = this.closingForm.get('declaredCash');
    if (control && Number(control.value) !== clamped) {
      control.setValue(clamped, { emitEvent: false });
    }
  }

  /**
   * Bloquea la entrada si ya hay 12 dígitos en la parte entera
   */
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const value = input.value ?? '';
    // Obtener solo los dígitos (eliminar separadores y símbolos)
    const digitsOnly = value.replace(/\D/g, '');

    // Si ya hay 12 dígitos y se intenta escribir otro dígito (y no es retroceso/delete/etc)
    if (digitsOnly.length >= 12 && /\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Al perder foco, asegurar dos decimales en el control
   */
  onAmountBlur(): void {
    const control = this.closingForm.get('declaredCash');
    if (!control) return;
    const val = control.value;
    if (val == null || val === '') return;
    const num = Number(String(val).replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(num)) return;
    const clamped = Math.min(num, this.maxAmount);
    const rounded = Math.round(clamped * 100) / 100;
    if (Number(control.value) !== rounded) {
      control.setValue(rounded, { emitEvent: false });
    }
  }

  /**
   * Loads authenticated user data to display in UI.
   * Retrieves user from AuthService.
   */
  private loadUserData(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName.set(`${user.firstName} ${user.lastName}`);
    }
  }

  /**
   * Loads branch information related to the user's environment.
   * Sets alerts if branches are not found.
   */
  private loadBranchData(): void {
    this.branchesService.getBranchOptions().subscribe({
      next: (branches) => {
        if (branches && branches.length > 0) {
          this.branchName.set(branches[0].description);
        }
      },
      error: () => {
        this.alert.set({
          type: 'error',
          title: 'Error al cargar las sucursales',
          text: 'No hay sucursales disponibles'
        });
        setTimeout(() => this.alert.set(null), 3000);      }
    });
  }

  /**
   * Selects all text in an input field when focused.
   * @param event - The focus event from the input element.
   */
  selectAll(event: any) {
    setTimeout(() => {
      event.target.select();
    });
  }
  /**
   * Loads the currently open cash session.
   * If found, session details and summary are fetched.
   * Otherwise, an error alert is displayed.
   */
  private loadCurrentSession(): void {
    this.sessionService.loadCurrentSession().subscribe({
      next: (session) => {
        if (session) {
          this.sessionId.set(session.id);
          this.initialCash.set(session.initialCash || 0);
          const openedAtStr = session.openedAt
            ? typeof session.openedAt === 'string'
              ? session.openedAt
              : session.openedAt.toString()
            : '';
          this.openedAt.set(openedAtStr);
          this.loadSummary(session.id);
          if (session.cashRegisterId) {
            this.loadRegisterName(session.cashRegisterId);
          }
        } else {
          this.alert.set({
            type: 'error',
            title: 'Sesión no encontrada',
            text: 'No hay sesión abierta'
          });
          setTimeout(() => this.alert.set(null), 5000);
        }
      },
      error: ( ) => {
        this.router.navigate(['/billing-collections/home']);
      }
    });
  }

  /**
   * Loads and displays the name of the cash register by its identifier.
   * If an error occurs, defaults to empty name.
   */
  private loadRegisterName(registerId: number): void {
    this.registerService.getRegisterNameById(registerId).subscribe({
      next: (name) => this.registerName.set(name),
      error: () => this.registerName.set('')
    });
  }

  /**
   * Fetches the cash summary from backend related to the open session.
   * Updates UI status and errors accordingly.
   */
  private loadSummary(sessionId: number): void {
    this.isLoadingSummary.set(true);

    this.summaryService.getSummary(sessionId).subscribe({
      next: (summary: any) => {
        this.processSummaryData(summary);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        this.alert.set({
          type: 'error',
          title: 'Error al cargar resumen',
          text: err?.message || 'Error al cargar el resumen'
        });
        setTimeout(() => this.alert.set(null), 5000);
        this.isLoadingSummary.set(false);
      }
    });
  }

  /**
   * Processes summary payload into UI signals:
   * - total cash
   * - movement count
   * - declared cash default value
   * - transaction breakdown table rows
   */
  private processSummaryData(summary: any): void {
    // The backend may return different shapes; handle the common ones.
    const totalCash =
      summary?.totalCash ?? summary?.total_cash ?? summary?.totalGeneral ?? 0;
    const movementCount = summary?.movementCount ?? summary?.movement_count ?? 0;

    this.finalCash.set(totalCash);
    this.movementCount.set(movementCount);
    this.closingForm.get('declaredCash')?.setValue(totalCash);

    // Recalculate difference after setting final cash and declared value
    const declared =
      Number(this.closingForm.get('declaredCash')?.value ?? 0) || 0;
    const system = Number(this.finalCash()) || 0;
    this.differenceValue.set(declared - system);

    const rows: TransactionTableRow[] = [];

    // Preferred shape: summary.transactions: { KEY: { cash, qr, card, transfer, total } }
    if (summary && typeof summary.transactions === 'object') {
      for (const [key, value] of Object.entries(summary.transactions)) {
        const data = value as TransactionBreakdown;
        rows.push(
          this.mapTransactionRow(this.humanizeTransactionType(key), data)
        );
      }
    } else if (summary && summary.breakdown) {
      // Single breakdown object
      rows.push(
        this.mapTransactionRow(
          'Resumen',
          summary.breakdown as TransactionBreakdown
        )
      );
    } else if (summary) {
      // Fallback: try to construct a TOTAL row from known numeric fields
      const fallback: TransactionBreakdown = {
        cash: summary.totalCash ?? summary.initialCashAmount ?? 0,
        qr: summary.totalCard ?? 0,
        card: summary.totalCard ?? 0,
        transfer: 0,
        total: totalCash
      };
      rows.push(this.mapTransactionRow('Total', fallback));
    }

    this.transactions.set(rows);
    this.updateVisibleColumns(rows);
  }

  /**
   * Dynamically adjusts visible table columns
   * based on transaction values returned from backend.
   */
  private updateVisibleColumns(data: TransactionTableRow[]): void {
    const allColumns: ColumnConfig[] = [
      { columnDef: 'type', header: 'Tipo' },
      { columnDef: 'cash', header: 'Efectivo' },
      { columnDef: 'qr', header: 'QR' },
      { columnDef: 'card', header: 'Tarjeta' },
      { columnDef: 'transfer', header: 'Transferencia' },
      { columnDef: 'total', header: 'Total' }
    ];

    if (data.length === 0) {
      this.tableColumns = allColumns;
      return;
    }

    const columnsToKeep: Set<string> = new Set(['type', 'total']);

    const dataColumns: (keyof TransactionTableRow)[] = [
      'cash',
      'qr',
      'card',
      'transfer'
    ];

    for (const colDef of dataColumns) {
      if (typeof colDef === 'string') {
        const hasValue = data.some((row) => row[colDef] !== '---');
        if (hasValue) {
          columnsToKeep.add(colDef);
        }
      }
    }

    this.tableColumns = allColumns.filter((c) => columnsToKeep.has(c.columnDef));
  }

  /**
   * Converts a backend transaction category key into a human-friendly label.
   */
  private humanizeTransactionType(key: string): string {
    const k = (key || '').toString().toUpperCase();
    switch (k) {
    case 'ATTENTION':
    case 'ATTENTIONS':
      return 'Atención';
    case 'DEPOSITS':
    case 'DEPOSIT':
      return 'Depósitos';
    case 'WITHDRAWALS':
    case 'WITHDRAWAL':
      return 'Retiros';
    case 'TOTAL':
      return 'Total';
    default:
      // Capitalize and replace underscores
      return k
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
    }
  }

  /**
   * Maps TransactionBreakdown into a TransactionTableRow formatted for UI display.
   */
  private mapTransactionRow(
    type: string,
    data: TransactionBreakdown
  ): TransactionTableRow {
    return {
      type,
      cash: this.formatCurrency(data.cash),
      qr: this.formatCurrency(data.qr),
      card: this.formatCurrency(data.card),
      transfer: this.formatCurrency(data.transfer),
      total: this.formatCurrency(data.total)
    };
  }

  /**
   * Formats a numeric value into localized ARS currency.
   * If value is zero or null, returns placeholder '---'.
   */
  private formatCurrency(value: number): string {
    if (!value || value === 0) {
      return '---';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(value);
  }

  /**
   * Triggered when the closing action is requested.
   * Validates the form and shows a confirmation modal before proceeding.
   */
  onSubmit(): void {
    if (this.closingForm.invalid || this.isSaving()) {
      this.closingForm.markAllAsTouched();
      return;
    }

    const declaredCashValue = Number(this.closingForm.value.declaredCash ?? 0);
    this.pendingCloseDetails = {
      final_cash: declaredCashValue.toFixed(2),
      observations: this.closingForm.value.observations || ''
    };

    this.showConfirmationModal.set(true);
  }

  /**
   * Confirm close: if pending details exist, clear them, hide the confirmation modal, and process the closing.
   */
  onConfirmClose(): void {
    const closeDetails = this.pendingCloseDetails;
    if (!closeDetails) {
      return;
    }

    this.pendingCloseDetails = null;
    this.showConfirmationModal.set(false);
    this.processClosing(closeDetails);
  }

  /**
   * Cancels the close action by clearing pending details and hiding the confirmation modal.
   */
  onCancelClose(): void {
    this.pendingCloseDetails = null;
    this.showConfirmationModal.set(false);
  }

  /**
   * Sends the closing operation to backend including declared final cash
   * and optional observations. Displays success or error alerts accordingly.
   * On success, navigates back to Billing Collections home.
   */
  private processClosing(closeDetails: {
    final_cash: string
    observations: string
  }): void {
    this.isSaving.set(true);
    this.error.set(null);

    this.sessionService
      .closeSessionWithAmount(parseFloat(closeDetails.final_cash))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.alert.set({
            type: 'success',
            title: 'Cierre exitoso',
            text: 'La caja se cerró correctamente'
          });
          setTimeout(() => {
            this.alert.set(null);
            this.router.navigate(['/billing-collections/home']);
          }, 2000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.error.set(err?.message || 'Error al cerrar la sesión');
          this.modalService
            .error('Error', 'No se pudo cerrar la caja')
            .subscribe();
        }
      });
  }

  /**
   * Cancels the close operation and navigates back to home screen.
   */
  onCancel(): void {
    this.router.navigate(['/billing-collections/home']);
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
    return `${prefix}$${formattedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }

  /**
   * Gets the formatted opening date of the current session.
   * @returns The formatted date string.
   */
  readonly formattedOpeningDate = computed(() => {
    const openedStr = this.openedAt();
    if (!openedStr) return 'Fecha no disponible';

    const date = new Date(openedStr);

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
}
