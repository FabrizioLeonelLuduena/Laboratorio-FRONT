import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { EditPaymentModalComponent } from '../../../../../components/collector/edit-payment-modal/edit-payment-modal.component';
import { AccountLedgerService } from '../../../../application/account-ledger.service';
import { PaymentMethodDetail, PaymentMethod, PAYMENT_METHOD_LABELS } from '../../../../domain';
import { BillingItem } from '../../../../domain/billing-item.model';

/**
 * InvoiceItemsStepComponent - Step 2 of billing creator
 * Custom grid for managing invoice items with autofocus and keyboard navigation
 */
@Component({
  selector: 'app-invoice-items-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    TooltipModule,
    InputNumberModule, // Añadido
    EditPaymentModalComponent
  ],
  templateUrl: './invoice-items-step.component.html',
  styleUrls: ['./invoice-items-step.component.scss']
})
export class InvoiceItemsStepComponent implements OnInit, OnChanges {
  @Input() items: BillingItem[] = [];
  @Input() billing: any; // Para obtener datos generales
  @Output() itemsChange = new EventEmitter<BillingItem[]>();
  @Output() validChange = new EventEmitter<boolean>();
  @Output() paymentMethodsChange = new EventEmitter<PaymentMethodDetail[]>();

  // Editable items array
  editableItems: BillingItem[] = [];
  nextItemId = 1;
  editingIndex: number | null = null;

  // Payment methods
  paymentMethods: PaymentMethodDetail[] = [];
  showPaymentModal = false;

  // Account ledger options for dropdown
  accountOptions: Array<{ label: string; value: string }> = [];
  isLoadingAccounts = false;

  // VAT options
  vatOptions = [
    { label: '21%', value: 21 },
    { label: '10.5%', value: 10.5 },
    { label: '0%', value: 0 }
  ];

  // Column order for keyboard navigation
  private columnOrder = ['description', 'quantity', 'unitPrice', 'discountPercentage', 'vatRate'];
  private defaultAccountId: string | null = null;

  /**
   * Constructor that injects ElementRef and AccountLedgerService
   */
  constructor(
    private elementRef: ElementRef,
    private accountLedgerService: AccountLedgerService
  ) {}

  /**
   * Angular lifecycle hook. Initializes editable items.
   */
  ngOnInit(): void {
    this.loadItems();
    this.validateItems();
    this.loadAccountOptions();

    // Initialize payment methods from billing if available
    if (this.billing?.paymentMethods && this.billing.paymentMethods.length > 0) {
      this.paymentMethods = [...this.billing.paymentMethods];
    }
  }

  /**
   * Angular lifecycle hook. Responds to changes in the input 'items'.
   * @param changes Object containing the changed properties
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      this.loadItems();
      this.validateItems();
    }

    // Load payment methods from billing if it changes
    if (changes['billing'] && !changes['billing'].firstChange) {
      if (this.billing?.paymentMethods && this.billing.paymentMethods.length > 0) {
        this.paymentMethods = [...this.billing.paymentMethods];
      }
    }
  }

  /**
   * Load items into editable array
   */
  private loadItems(): void {
    this.editableItems = [...this.items];
    if (this.editableItems.length > 0) {
      const maxId = Math.max(...this.editableItems.map(i => Number(i.id) || 0));
      this.nextItemId = maxId + 1;
    }
  }

  /**
   * Load accounting accounts from backend
   */
  private loadAccountOptions(): void {
    this.isLoadingAccounts = true;
    this.accountLedgerService.getAccountOptions().subscribe({
      next: (options) => {
        this.accountOptions = options;
        this.defaultAccountId = options[0]?.value ?? null;
        this.applyDefaultAccountToItems();
        this.isLoadingAccounts = false;
      },
      error: (_error) => {
        this.isLoadingAccounts = false;
        // Provide default option if backend fails
        this.accountOptions = [
          { label: 'Cuenta por defecto', value: '4110' }
        ];
        this.defaultAccountId = '4110';
        this.applyDefaultAccountToItems();
      }
    });
  }

  /**
   * Add new empty item to the table with autofocus
   */
  addNewItem(): void {
    const newItem: BillingItem = {
      id: this.nextItemId++,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercentage: 0,
      vatRate: 21, // Default VAT 21%
      subtotal: 0,
      vatAmount: 0,
      totalAmount: 0,
      enabled: true,
      code: '',
      warehouse: '',
      import: 0,
      local: 0,
      unitOfMeasure: 'unidad',
      accountPlanId: this.defaultAccountId || ''
    };

    this.editableItems = [...this.editableItems, newItem];
    const newIndex = this.editableItems.length - 1;
    this.editingIndex = newIndex;
    this.emitChanges();

    // Autofocus on the first field (description) of the new item
    setTimeout(() => {
      this.focusCell(newIndex, 'description');
    }, 50);
  }

  /**
   * Calculate item totals when values change
   */
  onItemChange(index: number): void {
    const item = this.editableItems[index];

    // Parse values to ensure they are numbers (but don't reassign to avoid focus loss)
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPercentage = Number(item.discountPercentage) || 0;
    const vatRate = Number(item.vatRate) || 0;

    // Calculate subtotal (price * quantity)
    const subtotal = quantity * unitPrice;

    // Calculate discount
    const discountAmount = subtotal * (discountPercentage / 100);

    // Calculate taxable amount (subtotal - discount)
    const taxableAmount = subtotal - discountAmount;

    // Calculate VAT
    const vatAmount = taxableAmount * (vatRate / 100);

    // Calculate total
    const totalAmount = taxableAmount + vatAmount;

    // Update calculated values only (not input values to avoid focus loss)
    item.subtotal = subtotal;
    item.discountAmount = discountAmount;
    item.taxableAmount = taxableAmount;
    item.vatAmount = vatAmount;
    item.totalAmount = totalAmount;

    // Emit changes without recreating the array
    this.itemsChange.emit([...this.editableItems]);
    this.validateItems();
  }

  /**
   * Save edit
   */
  onSaveEdit(index: number): void {
    this.onItemChange(index);
  }

  /**
   * Delete item from table
   */
  deleteItem(index: number): void {
    this.editableItems = this.editableItems.filter((_, i) => i !== index);
    this.emitChanges();
  }

  /**
   * Emit changes to parent
   */
  private emitChanges(): void {
    this.itemsChange.emit([...this.editableItems]);
    this.validateItems();
  }

  /**
   * Validate items
   */
  private validateItems(): void {
    const isValid = this.editableItems.length > 0 &&
      this.editableItems.every(item =>
        item.description?.trim().length > 0 &&
        item.quantity > 0 &&
        item.unitPrice >= 0 &&
        item.accountPlanId?.trim().length > 0
      );
    this.validChange.emit(isValid);
  }

  /**
   * Ensures each item has an account plan selected by default.
   */
  private applyDefaultAccountToItems(): void {
    if (!this.defaultAccountId) {
      return;
    }
    let changed = false;
    this.editableItems = this.editableItems.map(item => {
      if (!item.accountPlanId || item.accountPlanId.trim().length === 0) {
        changed = true;
        return { ...item, accountPlanId: this.defaultAccountId as string };
      }
      return item;
    });
    if (changed) {
      this.emitChanges();
    }
  }

  /**
   * Public method for parent component to validate
   */
  public validateForm(): boolean {
    const isValid = this.editableItems.length > 0 &&
      this.editableItems.every(item =>
        item.description?.trim().length > 0 &&
        item.quantity > 0 &&
        item.unitPrice >= 0 &&
        item.accountPlanId?.trim().length > 0 // Required by backend
      );
    return isValid;
  }

  /**
   * Calculate totals for display: Total Quantity
   * @returns The sum of all item quantities.
   */
  getTotalQuantity(): number {
    return this.editableItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  /**
   * Calculate totals for display: Total Subtotal
   * @returns The sum of all item subtotals.
   */
  getTotalSubtotal(): number {
    return this.editableItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }

  /**
   * Calculate totals for display: Total VAT
   * @returns The sum of all item VAT amounts.
   */
  getTotalVat(): number {
    return this.editableItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  }

  /**
   * Calculate totals for display: Grand Total
   * @returns The sum of all item total amounts.
   */
  getTotalAmount(): number {
    return this.editableItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  }

  /**
   * Calculate total taxable amount (gravado)
   */
  getTotalTaxable(): number {
    return this.editableItems.reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
  }

  /**
   * Calculate total non-taxable amount (no gravado)
   */
  getTotalNonTaxable(): number {
    // Por ahora retorna 0, pero se puede extender en el futuro
    return 0;
  }

  // --- Keyboard Navigation Methods ---

  /**
   * Handle key down events for navigation (Enter/Tab)
   */
  onKeyDown(event: KeyboardEvent | Event, rowIndex: number, colName: string): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Enter' || keyEvent.key === 'Tab') {
      event.preventDefault();
      this.navigateToNextCell(rowIndex, colName, keyEvent.shiftKey);
    }
  }

  /**
   * Navigate to next cell (right or down)
   */
  private navigateToNextCell(rowIndex: number, colName: string, reverse: boolean = false): void {
    const currentColIndex = this.columnOrder.indexOf(colName);

    if (reverse) {
      // Navigate backwards (Shift+Tab)
      if (currentColIndex > 0) {
        // Move to previous column
        this.focusCell(rowIndex, this.columnOrder[currentColIndex - 1]);
      } else if (rowIndex > 0) {
        // Move to last column of previous row
        this.focusCell(rowIndex - 1, this.columnOrder[this.columnOrder.length - 1]);
      }
    } else {
      // Navigate forwards (Enter/Tab)
      if (currentColIndex < this.columnOrder.length - 1) {
        // Move to next column
        this.focusCell(rowIndex, this.columnOrder[currentColIndex + 1]);
      } else if (rowIndex < this.editableItems.length - 1) {
        // Move to first column of next row
        this.focusCell(rowIndex + 1, this.columnOrder[0]);
      } else {
        // Last cell - add new row and focus first cell
        this.addNewItem();
      }
    }
  }

  /**
   * Focus on a specific cell
   */
  private focusCell(rowIndex: number, colName: string): void {
    let element: HTMLElement | null = null;

    if (colName === 'description') {
      // For description field, use data attributes (regular input)
      element = this.elementRef.nativeElement.querySelector(
        `input[data-row="${rowIndex}"][data-col="${colName}"]`
      );
    } else if (colName === 'vatRate') {
      // For p-dropdown, focus the dropdown trigger element
      const inputId = `${colName}-${rowIndex}`;
      element = this.elementRef.nativeElement.querySelector(`#${inputId}`);
      // If inputId element not found, try to find the dropdown's focusable element
      if (!element) {
        const dropdownWrapper = this.elementRef.nativeElement.querySelector(
          `.grid-cell.col-iva:nth-child(${rowIndex + 1}) .p-dropdown`
        );
        if (dropdownWrapper) {
          element = dropdownWrapper.querySelector('.p-dropdown-label') || dropdownWrapper;
        }
      }
    } else {
      // For PrimeNG components, use inputId pattern
      const inputId = `${colName}-${rowIndex}`;
      element = this.elementRef.nativeElement.querySelector(`#${inputId}`);
    }

    if (element) {
      element.focus();
      // Only select text for description field
      if (colName === 'description' && element.tagName === 'INPUT') {
        (element as HTMLInputElement).select();
      }
    }
  }

  /**
   * Handle cell focus
   */
  onCellFocus(rowIndex: number, _colName: string): void {
    this.editingIndex = rowIndex;
  }

  // --- Payment Methods ---

  /**
   * Open payment method modal
   */
  openPaymentModal(): void {
    this.showPaymentModal = true;
  }

  /**
   * Close payment method modal
   */
  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  /**
   * Handle payment method saved from modal
   */
  onPaymentMethodSaved(payment: PaymentMethodDetail): void {
    this.paymentMethods = [...this.paymentMethods, payment];
    this.paymentMethodsChange.emit(this.paymentMethods);
    this.showPaymentModal = false;
  }

  /**
   * Delete payment method
   */
  deletePaymentMethod(index: number): void {
    this.paymentMethods = this.paymentMethods.filter((_, i) => i !== index);
    this.paymentMethodsChange.emit(this.paymentMethods);
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] || method;
  }

  /**
   * Get remaining balance
   */
  getRemainingBalance(): number {
    const total = this.getTotalAmount();
    const paid = this.paymentMethods.reduce((sum, pm) => sum + (pm.amount || 0), 0);
    return Math.max(0, total - paid);
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
}
