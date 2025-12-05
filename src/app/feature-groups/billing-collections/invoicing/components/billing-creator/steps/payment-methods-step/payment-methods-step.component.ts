import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';

import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { AdvancedTableComponent, GenericColumn } from '../../../../../../../shared/components/advanced-table/advanced-table.component';
import { PaymentMethodDetail, PaymentMethod, PAYMENT_METHOD_LABELS, FundDestination, FUND_DESTINATION_LABELS } from '../../../../domain';
import { BillingMapper } from '../../../../mappers/billing.mapper';

import { EditPaymentModalComponent } from './edit-payment-modal/edit-payment-modal.component';

/** Form value shape for payment methods. */
interface PaymentMethodFormValue {
  id?: number;
  paymentMethod: PaymentMethod | '';
  fundDestination: FundDestination | '';
  bank?: string;
  number?: string;
  paymentDate: Date | string;
  amount: number;
  observations?: string;
  transactionReference?: string;
}

/** Table row representation for payment methods. */
interface PaymentMethodTableRow {
  id?: number;
  paymentMethod: PaymentMethod | '';
  fundDestination: FundDestination | '';
  bank?: string;
  number?: string;
  paymentDate: string;
  amount: string;
  amountValue: number;
  observations?: string;
  transactionReference?: string;
  paymentMethodLabel: string;
  fundDestinationLabel: string;
}

/**
 * PaymentMethodsStepComponent - Step 4 of billing creator
 * Table with CRUD operations for payment methods
 */
@Component({
  selector: 'app-payment-methods-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    AdvancedTableComponent
  ],
  providers: [DialogService],
  templateUrl: './payment-methods-step.component.html',
  styleUrls: ['./payment-methods-step.component.scss']
})
export class PaymentMethodsStepComponent implements OnInit, OnChanges {
  @Input() paymentMethods: PaymentMethodDetail[] = [];
  @Input() totalAmount: number = 0;
  @Output() paymentMethodsChange = new EventEmitter<PaymentMethodDetail[]>();
  @Output() validChange = new EventEmitter<boolean>();

  paymentMethodsForm!: FormGroup;
  tableData = signal<PaymentMethodTableRow[]>([]);
  dialogRef?: DynamicDialogRef;

  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(DialogService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Table columns configuration
  paymentColumns: GenericColumn[] = [
    { field: 'paymentMethodLabel', header: 'Medio de pago' },
    { field: 'fundDestinationLabel', header: 'Destino de fondos' },
    { field: 'accountLabel', header: 'Cuenta contable' },
    { field: 'amount', header: 'Importe', pipes: [{ name: 'currency', args: ['ARS', 'symbol-narrow'] }] },
    { field: 'paymentDate', header: 'Fecha de pago', pipes: [{ name: 'date', args: ['dd/MM/yyyy'] }] }
  ];

  /**
   * Constructor for PaymentMethodsStepComponent
   * @param fb FormBuilder for reactive forms
   * @param dialogService Service for opening modals
   * @param messageService Service for toast notifications
   * @param confirmationService Service for confirmation dialogs
   */
  /**
   * Angular lifecycle hook. Initializes the form and listeners.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.updateTableData();
  }

  /**
   * Angular lifecycle hook. Responds to input property changes.
   * @param changes Object containing the changed properties
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paymentMethods'] && !changes['paymentMethods'].firstChange) {
      this.updateFormFromPaymentMethods();
      this.updateTableData();
    }
  }

  /**
   * Initialize the form with FormArray
   */
  private initializeForm(): void {
    this.paymentMethodsForm = this.fb.group({
      paymentMethods: this.fb.array([])
    });

    // Initialize with existing payment methods
    if (this.paymentMethods && this.paymentMethods.length > 0) {
      this.updateFormFromPaymentMethods();
    }
  }

  /**
   * Setup form listeners
   */
  private setupFormListeners(): void {
    this.paymentMethodsForm.valueChanges.subscribe(() => {
      this.updateTableData();
      this.validatePaymentMethods();
      if (this.paymentMethodsForm.valid) {
        this.emitPaymentChanges();
      }
    });

    this.paymentMethodsForm.statusChanges.subscribe(() => {
      this.validatePaymentMethods();
    });
  }

  /**
   * Get payment methods FormArray
   */
  get paymentMethodsArray(): FormArray {
    return this.paymentMethodsForm.get('paymentMethods') as FormArray;
  }

  /**
   * Create a payment method FormGroup
   */
  private createPaymentMethodFormGroup(paymentMethod?: PaymentMethodDetail): FormGroup {
    return this.fb.group({
      id: [paymentMethod?.id],
      paymentMethod: [paymentMethod?.paymentMethod || '', Validators.required],
      fundDestination: [paymentMethod?.fundDestination || '', Validators.required],
      bank: [paymentMethod?.bank || ''],
      number: [paymentMethod?.number || ''],
      paymentDate: [
        paymentMethod?.paymentDate ? new Date(paymentMethod.paymentDate) : new Date(),
        Validators.required
      ],
      amount: [paymentMethod?.amount || 0, [Validators.required, Validators.min(0.01)]],
      observations: [paymentMethod?.observations || ''],
      transactionReference: [paymentMethod?.transactionReference || '']
    });
  }

  /**
   * Update form from payment methods input
   */
  private updateFormFromPaymentMethods(): void {
    this.paymentMethodsArray.clear();
    this.paymentMethods.forEach(pm => {
      this.paymentMethodsArray.push(this.createPaymentMethodFormGroup(pm));
    });
  }

  /**
   * Update table data
   */
  private updateTableData(): void {
    const payments = this.paymentFormValues.map((pm) => {
      const paymentDate = this.normalizeDate(pm.paymentDate);
      const amountValue = pm.amount ?? 0;

      const row: PaymentMethodTableRow = {
        id: pm.id,
        paymentMethod: pm.paymentMethod,
        fundDestination: pm.fundDestination,
        bank: pm.bank,
        number: pm.number,
        paymentDate,
        amount: amountValue.toFixed(2),
        amountValue,
        observations: pm.observations,
        transactionReference: pm.transactionReference,
        paymentMethodLabel: this.getPaymentMethodLabel(pm.paymentMethod),
        fundDestinationLabel: this.getFundDestinationLabel(pm.fundDestination)
      };

      return row;
    });

    this.tableData.set(payments);
  }

  /**
   * Validate payment methods
   */
  private validatePaymentMethods(): void {
    const isValid = this.paymentMethodsForm.valid && this.paymentMethodsArray.length > 0;
    this.validChange.emit(isValid);
  }

  /**
   * Public method for parent component to validate
   */
  public validateForm(): boolean {
    if (this.paymentMethodsArray.length === 0) {
      return false;
    }

    if (this.paymentMethodsForm.invalid) {
      Object.keys(this.paymentMethodsArray.controls).forEach(key => {
        const group = this.paymentMethodsArray.at(parseInt(key)) as FormGroup;
        Object.keys(group.controls).forEach(controlKey => {
          group.get(controlKey)?.markAsTouched();
        });
      });
      return false;
    }

    return true;
  }

  /**
   * Add new payment method
   */
  addPaymentMethod(): void {
    // Pre-fill with remaining balance
    const remaining = this.getRemainingBalance();
    const newPayment = BillingMapper.createEmptyPaymentMethod();
    if (remaining > 0) {
      newPayment.amount = remaining;
    }

    this.openPaymentModal(newPayment, -1);
  }

  /**
   * Edit payment method
   */
  editPaymentMethod(index: number): void {
    const paymentFormGroup = this.paymentMethodsArray.at(index);
    if (paymentFormGroup) {
      const formValue = paymentFormGroup.value as PaymentMethodFormValue;
      const paymentDetail = this.toPaymentDetail(formValue);
      this.openPaymentModal(paymentDetail, index);
    }
  }

  /**
   * Handle table action events
   */
  onPaymentAction(event: { type: string; row: PaymentMethodTableRow }): void {
    const { type, row } = event;
    const index = this.findPaymentIndex(row);

    switch (type) {
    case 'edit':
      this.editPaymentMethod(index);
      break;
    case 'delete':
      this.removePaymentMethod(index);
      break;
    }
  }

  /**
   * Find payment index by row data
   */
  private findPaymentIndex(row: PaymentMethodTableRow): number {
    return this.paymentFormValues.findIndex(pm => {
      const normalizedDate = this.normalizeDate(pm.paymentDate);
      const amountValue = pm.amount ?? 0;
      return (
        pm.paymentMethod === row.paymentMethod &&
        amountValue === row.amountValue &&
        normalizedDate === row.paymentDate
      );
    });
  }

  /**
   * Open payment modal for create/edit
   */
  private openPaymentModal(payment: PaymentMethodDetail, index: number): void {
    this.dialogRef = this.dialogService.open(EditPaymentModalComponent, {
      header: index === -1 ? 'Add payment method' : 'Edit payment method',
      width: '700px',
      data: {
        payment,
        totalAmount: this.totalAmount,
        remainingBalance: this.getRemainingBalance()
      }
    });

    this.dialogRef.onClose.subscribe((result: PaymentMethodDetail | null) => {
      if (result) {
        if (index === -1) {
          // Add new
          this.paymentMethodsArray.push(this.createPaymentMethodFormGroup(result));
          this.messageService.add({
            severity: 'success',
            summary: 'Medio de pago agregado',
            detail: 'Se registró el medio de pago correctamente',
            life: 3000
          });
        } else {
          // Update existing
          this.paymentMethodsArray.at(index).patchValue(result);
          this.messageService.add({
            severity: 'success',
            summary: 'Medio de pago actualizado',
            detail: 'Se actualizó el medio de pago correctamente',
            life: 3000
          });
        }

        this.updateTableData();
        this.emitPaymentChanges();
      }
    });
  }

  /**
   * Remove payment method
   */
  removePaymentMethod(index: number): void {
    this.confirmationService.confirm({
      header: 'Delete payment method',
      message: 'Are you sure you want to delete this payment method?',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.paymentMethodsArray.removeAt(index);
        this.updateTableData();
        this.emitPaymentChanges();

        this.messageService.add({
          severity: 'success',
          summary: 'Medio de pago eliminado',
          detail: 'Se quitó el medio de pago de la factura',
          life: 3000
        });
      }
    });
  }

  /**
   * Calculate total payments
   */
  getTotalPayments(): number {
    return this.paymentFormValues.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );
  }

  /**
   * Calculate remaining balance
   */
  getRemainingBalance(): number {
    const totalPayments = this.getTotalPayments();
    return Math.max(0, this.totalAmount - totalPayments);
  }

  /**
   * Check if payments are complete
   */
  isPaymentComplete(): boolean {
    const difference = Math.abs(this.totalAmount - this.getTotalPayments());
    return difference < 0.01; // Allow small rounding differences
  }

  /**
   * Get payment method label
   */
  private getPaymentMethodLabel(value: PaymentMethod | ''): string {
    if (!value) return '';
    return PAYMENT_METHOD_LABELS[value] || value;
  }

  /**
   * Get fund destination label
   */
  private getFundDestinationLabel(value: FundDestination | ''): string {
    if (!value) return '';
    return FUND_DESTINATION_LABELS[value] || value;
  }

  /** Returns the current payment method form values. */
  private get paymentFormValues(): PaymentMethodFormValue[] {
    return this.paymentMethodsArray.value as PaymentMethodFormValue[];
  }

  /** Normalizes a date value into `YYYY-MM-DD` format. */
  private normalizeDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return value;
  }

  /** Emits the current payment methods to the parent component. */
  private emitPaymentChanges(): void {
    const details = this.paymentFormValues.map(value => this.toPaymentDetail(value));
    this.paymentMethodsChange.emit(details);
  }

  /** Maps a form value into a typed payment method detail. */
  private toPaymentDetail(value: PaymentMethodFormValue): PaymentMethodDetail {
    const paymentMethod = (value.paymentMethod || PaymentMethod.EFECTIVO) as PaymentMethod;
    const fundDestination = (value.fundDestination || FundDestination.CAJA_GENERAL) as FundDestination;
    const paymentDate = this.normalizeDate(value.paymentDate);

    return {
      id: value.id,
      paymentMethod,
      fundDestination,
      bank: value.bank || undefined,
      number: value.number || undefined,
      paymentDate,
      amount: value.amount,
      observations: value.observations || undefined,
      transactionReference: value.transactionReference || undefined
    };
  }
}

