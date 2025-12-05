import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';

import { AccountLedgerService } from '../../../../../application/account-ledger.service';
import {
  FundDestination,
  FUND_DESTINATION_LABELS
} from '../../../../../domain/fund-destination.enum';
import {
  PaymentMethodDetail,
  BANK_OPTIONS
} from '../../../../../domain/payment-method-detail.model';
import {
  PaymentMethod,
  PAYMENT_METHOD_LABELS
} from '../../../../../domain/payment-method.enum';

/**
 * EditPaymentModalComponent - Modal for creating/editing payment methods
 */
@Component({
  selector: 'app-edit-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    InputTextarea,
    ButtonModule
  ],
  templateUrl: './edit-payment-modal.component.html',
  styleUrls: ['./edit-payment-modal.component.scss']
})
export class EditPaymentModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly accountLedgerService = inject(AccountLedgerService);

  paymentForm!: FormGroup;
  payment?: PaymentMethodDetail = this.config.data?.payment;
  totalAmount: number = this.config.data?.totalAmount || 0;
  remainingBalance: number = this.config.data?.remainingBalance || 0;

  // Dropdown options
  paymentMethodOptions = Object.keys(PaymentMethod).map(key => ({
    label: PAYMENT_METHOD_LABELS[key as PaymentMethod],
    value: key
  }));

  fundDestinationOptions = Object.keys(FundDestination).map(key => ({
    label: FUND_DESTINATION_LABELS[key as FundDestination],
    value: key
  }));

  bankOptions = BANK_OPTIONS.map(bank => ({
    label: bank,
    value: bank
  }));

  // Account ledger options
  accountOptions: Array<{ label: string; value: string }> = [];
  isLoadingAccounts = false;

  /**
   * Angular lifecycle hook. Initializes the form and conditional validators.
   */
  ngOnInit(): void {
    this.loadAccountOptions();
    this.initializeForm();
    this.setupConditionalValidators();
  }

  /**
   * Load accounting accounts from backend
   */
  private loadAccountOptions(): void {
    this.isLoadingAccounts = true;
    this.accountLedgerService.getAccountOptions().subscribe({
      next: (options) => {
        this.accountOptions = options;
        this.isLoadingAccounts = false;
      },
      error: (_error) => {
        this.isLoadingAccounts = false;
        // Provide default option if backend fails
        this.accountOptions = [
          { label: 'Cuenta por defecto - 1010', value: '1010' }
        ];
      }
    });
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    const paymentDate = this.payment?.paymentDate
      ? new Date(this.payment.paymentDate)
      : new Date();

    this.paymentForm = this.fb.group({
      paymentMethod: [
        this.payment?.paymentMethod || PaymentMethod.EFECTIVO,
        Validators.required
      ],
      fundDestination: [
        this.payment?.fundDestination || FundDestination.CAJA_GENERAL,
        Validators.required
      ],
      accountPlanId: [
        this.payment?.accountPlanId || '',
        Validators.required // Required by backend
      ],
      bank: [this.payment?.bank || ''],
      number: [this.payment?.number || ''],
      paymentDate: [paymentDate, Validators.required],
      amount: [
        this.payment?.amount || this.remainingBalance || 0,
        [Validators.required, Validators.min(0.01)]
      ],
      observations: [this.payment?.observations || ''],
      transactionReference: [this.payment?.transactionReference || '']
    });
  }

  /**
   * Setup conditional validators based on payment method
   */
  private setupConditionalValidators(): void {
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(paymentMethod => {
      const bankControl = this.paymentForm.get('bank');
      const numberControl = this.paymentForm.get('number');

      // Clear validators
      bankControl?.clearValidators();
      numberControl?.clearValidators();

      // Add conditional validators
      switch (paymentMethod) {
      case PaymentMethod.TRANSFERENCIA:
      case PaymentMethod.CHEQUE:
        bankControl?.setValidators([Validators.required]);
        numberControl?.setValidators([Validators.required]);
        break;
      case PaymentMethod.TARJETA_DEBITO:
      case PaymentMethod.TARJETA_CREDITO:
        numberControl?.setValidators([Validators.required]);
        break;
      default:
        break;
      }

      bankControl?.updateValueAndValidity();
      numberControl?.updateValueAndValidity();
    });

    // Trigger initial validation
    const currentPaymentMethod = this.paymentForm.get('paymentMethod')?.value;
    this.paymentForm.get('paymentMethod')?.setValue(currentPaymentMethod);
  }

  /**
   * Check if bank field is required
   */
  isBankRequired(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    return (
      paymentMethod === PaymentMethod.TRANSFERENCIA ||
      paymentMethod === PaymentMethod.CHEQUE
    );
  }

  /**
   * Check if number field is required
   */
  isNumberRequired(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    return (
      paymentMethod === PaymentMethod.TRANSFERENCIA ||
      paymentMethod === PaymentMethod.CHEQUE ||
      paymentMethod === PaymentMethod.TARJETA_DEBITO ||
      paymentMethod === PaymentMethod.TARJETA_CREDITO
    );
  }

  /**
   * Get field label based on payment method
   */
  getNumberLabel(): string {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    switch (paymentMethod) {
    case PaymentMethod.CHEQUE:
      return 'Número de cheque';
    case PaymentMethod.TRANSFERENCIA:
      return 'Número de transferencia';
    case PaymentMethod.TARJETA_DEBITO:
    case PaymentMethod.TARJETA_CREDITO:
      return 'Últimos 4 dígitos';
    default:
      return 'Número';
    }
  }

  /**
   * Save payment method
   */
  save(): void {
    if (this.paymentForm.invalid) {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.paymentForm.value;
    const paymentMethod: PaymentMethodDetail = {
      id: this.payment?.id,
      paymentMethod: formValue.paymentMethod,
      fundDestination: formValue.fundDestination,
      accountPlanId: formValue.accountPlanId, // Required by backend
      bank: formValue.bank || undefined,
      number: formValue.number || undefined,
      paymentDate: formValue.paymentDate instanceof Date
        ? formValue.paymentDate.toISOString().split('T')[0]
        : formValue.paymentDate,
      amount: formValue.amount,
      observations: formValue.observations || undefined,
      transactionReference: formValue.transactionReference || undefined
    };

    this.ref.close(paymentMethod);
  }

  /**
   * Cancel and close modal
   */
  cancel(): void {
    this.ref.close(null);
  }

  /**
   * Fill with remaining balance
   */
  fillRemainingBalance(): void {
    if (this.remainingBalance > 0) {
      this.paymentForm.patchValue({
        amount: this.remainingBalance
      });
    }
  }

  /**
   * Check if field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
    }
    return '';
  }
}

