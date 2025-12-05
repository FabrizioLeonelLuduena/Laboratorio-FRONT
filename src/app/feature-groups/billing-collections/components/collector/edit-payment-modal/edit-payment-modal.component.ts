import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { PaymentMethodDetail } from '../../../invoicing/domain';
import { PaymentMethod } from '../../../invoicing/domain';

/**
 * EditPaymentModalComponent - Modal for creating/editing payment methods
 * Custom version for Collector component with specific UI modifications
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
    ButtonModule,
    GenericModalComponent,
    GenericButtonComponent
  ],
  templateUrl: './edit-payment-modal.component.html',
  styleUrls: ['./edit-payment-modal.component.css']
})
export class EditPaymentModalComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() payment?: PaymentMethodDetail;
  @Input() totalAmount: number = 0;
  @Input() remainingBalance: number = 0;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<PaymentMethodDetail>();

  paymentForm!: FormGroup;

  readonly minAmount = 0.01;
  readonly maxAmount = 9999999999999; // 9.999.999.999.999

  paymentMethodOptions = [
    { label: 'Efectivo', value: PaymentMethod.EFECTIVO },
    { label: 'Transferencia', value: PaymentMethod.TRANSFERENCIA },
    { label: 'QR', value: PaymentMethod.QR }
  ];

  fundDestinationOptions = [
    { label: 'Sucursal centro', value: 'SUCURSAL_CENTRO' }
  ];

  bankOptions = [
    { label: 'MercadoPago', value: 'MercadoPago' },
    { label: 'Ualá', value: 'Ualá' }
  ];

  /**
   * Constructor
   */
  constructor(private readonly fb: FormBuilder) {}

  /**
   * Component initialization
   */
  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Handle input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.initializeForm();
      // Dar foco y seleccionar texto del input de monto después de que se renderice
      setTimeout(() => {
        const amountInput = document.getElementById('amount') as HTMLInputElement;
        if (amountInput) {
          amountInput.focus();
          amountInput.select();
        }
      }, 150);
    } else if (changes['remainingBalance'] && this.paymentForm) {
      this.paymentForm.patchValue({
        amount: this.remainingBalance || 0
      });
    }

    if (changes['remainingBalance'] && this.paymentForm) {
      const amountControl = this.paymentForm.get('amount');
      amountControl?.setValue(this.remainingBalance || 0);
      amountControl?.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.remainingBalance)
      ]);
      amountControl?.updateValueAndValidity();
    }
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.paymentForm = this.fb.group({
      paymentMethod: [PaymentMethod.EFECTIVO, Validators.required],
      fundDestination: [
        { value: 'SUCURSAL_CENTRO', disabled: true },
        Validators.required
      ],
      bank: ['MercadoPago'],
      amount: [
        this.remainingBalance || 0,
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(this.remainingBalance)
        ]
      ]
    });
  }

  /**
   * Check if bank field should be visible
   */
  shouldShowBank(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    return paymentMethod === PaymentMethod.TRANSFERENCIA;
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

    const formValue = this.paymentForm.getRawValue();
    const paymentMethod: PaymentMethodDetail = {
      id: this.payment?.id,
      paymentMethod: formValue.paymentMethod,
      fundDestination: formValue.fundDestination as any,
      bank: this.shouldShowBank() ? formValue.bank : undefined,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: formValue.amount
    };

    this.saved.emit(paymentMethod);
    this.onClose();
  }

  /**
   * Cancel and close modal
   */
  cancel(): void {
    this.onClose();
  }

  /**
   * Close modal
   */
  onClose(): void {
    this.closed.emit();
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
   * Returns true when field is invalid and touched/dirty
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['min']) {
        return `El valor mínimo es ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `El valor no puede superar el saldo restante (${field.errors['max'].max})`;
      }
    }
    return '';
  }

  /**
   * Selects all text in an input field when focused
   */
  selectAll(event: any): void {
    setTimeout(() => {
      event.target.select();
    });
  }

  /**
   * Handles amount input changes
   */
  onAmountInput(event: any): void {
    if (!event) return;
    const raw = event?.value ?? event?.target?.value ?? event;
    if (raw == null || raw === '') return;

    // Usar remainingBalance como máximo dinámico
    const effectiveMax = Math.min(this.maxAmount, this.remainingBalance);

    let str = String(raw);
    if (typeof raw === 'number') {
      const clamped = Math.min(raw, effectiveMax);
      const rounded = Math.round(clamped * 100) / 100;
      const control = this.paymentForm.get('amount');
      if (control && Number(control.value) !== rounded) {
        control.setValue(rounded, { emitEvent: false });
      }
      return;
    }

    str = str.replace(/\./g, '');
    str = str.replace(/,/g, '.');

    const parts = str.split('.');
    let integerPart = parts[0].replace('-', '');
    const fractionPart = parts[1] ?? '';

    if (integerPart.length > 13) {
      integerPart = integerPart.substring(0, 13);
    }

    let truncatedFraction = fractionPart.substring(0, 2);
    str = integerPart + (truncatedFraction ? '.' + truncatedFraction : '');
    const num = Number(str);
    if (isNaN(num)) return;

    let clamped = Math.min(num, effectiveMax);
    clamped = Math.round(clamped * 100) / 100;

    const control = this.paymentForm.get('amount');
    if (control && Number(control.value) !== clamped) {
      control.setValue(clamped, { emitEvent: false });
    }
  }

  /**
   * Handles amount input blur event to format value
   */
  onAmountBlur(): void {
    const control = this.paymentForm.get('amount');
    if (!control) return;
    const val = control.value;
    if (val == null || val === '') return;
    const num = Number(String(val).replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(num)) return;
    const effectiveMax = Math.min(this.maxAmount, this.remainingBalance);
    const clamped = Math.min(num, effectiveMax);
    const rounded = Math.round(clamped * 100) / 100;
    if (Number(control.value) !== rounded) {
      control.setValue(rounded, { emitEvent: false });
    }
  }

  /**
   * Prevents input if amount exceeds 13 digits
   */
  onAmountKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const value = input.value ?? '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && /\d/.test(event.key)) {
      event.preventDefault();
    }
  }
}
