import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { StepsModule } from 'primeng/steps';

import { PaymentMethod as UIPaymentMethod } from '../../../invoicing/domain/payment-method.enum';

/**
 * Step configuration for payment processing
 */
export interface PaymentStep {
  payment_id: number;
  paymentMethod: UIPaymentMethod;
  amount: number;
  label: string;
  onStepLoad?: () => void;
  onStepComplete?: () => void;
}

/**
 * PaymentStepperModalComponent - Modal with stepper for payment completion
 * Each step represents a payment method that needs confirmation
 */
@Component({
  selector: 'app-payment-stepper-modal',
  standalone: true,
  imports: [
    CommonModule,
    StepsModule,
    ButtonModule
  ],
  templateUrl: './payment-stepper-modal.component.html',
  styleUrls: ['./payment-stepper-modal.component.css']
})
export class PaymentStepperModalComponent implements OnInit {
  steps: PaymentStep[] = [];
  stepItems: MenuItem[] = [];
  activeIndex: number = 0;
  isProcessing: boolean = false;

  UIPaymentMethod = UIPaymentMethod;

  /**
   * Constructor of the component
   */
  constructor(
    private readonly ref: DynamicDialogRef,
    private readonly config: DynamicDialogConfig
  ) {
    this.steps = this.config.data?.steps || [];
  }

  /**
   * Method called on component initialization
   */
  ngOnInit(): void {
    this.initializeSteps();
    this.loadCurrentStep();
  }

  /**
   * Initialize stepper items for UI
   */
  private initializeSteps(): void {
    this.steps = this.sortSteps(this.steps);

    this.stepItems = this.steps.map((step, index) => ({
      label: step.label,
      command: () => {
        if (index <= this.activeIndex) {
          this.activeIndex = index;
        }
      }
    }));
  }

  /**
   * Sort steps: QR always last
   */
  private sortSteps(steps: PaymentStep[]): PaymentStep[] {
    const qrSteps = steps.filter(s => s.paymentMethod === UIPaymentMethod.QR);
    const otherSteps = steps.filter(s => s.paymentMethod !== UIPaymentMethod.QR);
    return [...otherSteps, ...qrSteps];
  }

  /**
   * Get current step
   */
  get currentStep(): PaymentStep | undefined {
    return this.steps[this.activeIndex];
  }

  /**
   * Check if current step is the last one
   */
  get isLastStep(): boolean {
    return this.activeIndex === this.steps.length - 1;
  }

  /**
   * Check if current step is QR
   */
  get isQRStep(): boolean {
    return this.currentStep?.paymentMethod === UIPaymentMethod.QR;
  }

  /**
   * Get button label
   */
  get buttonLabel(): string {
    if (this.isLastStep) {
      return 'Aceptar';
    }
    return 'Continuar';
  }

  /**
   * Load current step and trigger onStepLoad event
   */
  private loadCurrentStep(): void {
    const step = this.currentStep;
    if (step?.onStepLoad) {
      step.onStepLoad();
    }
  }

  /**
   * Handle continue/accept button click
   */
  onContinue(): void {
    const step = this.currentStep;
    if (!step) return;

    this.isProcessing = true;

    if (step.onStepComplete) {
      step.onStepComplete();
    }

    setTimeout(() => {
      this.isProcessing = false;

      if (this.isLastStep) {
        this.ref.close({ success: true });
      } else {
        this.activeIndex++;
        this.loadCurrentStep();
      }
    }, 500);
  }

  /**
   * Get icon class for payment method
   */
  getPaymentIcon(paymentMethod: UIPaymentMethod): string {
    switch (paymentMethod) {
    case UIPaymentMethod.EFECTIVO:
      return 'pi pi-money-bill';
    case UIPaymentMethod.TRANSFERENCIA:
      return 'pi pi-send';
    case UIPaymentMethod.QR:
      return 'pi pi-qrcode';
    default:
      return 'pi pi-wallet';
    }
  }

  /**
   * Get step type for rendering
   */
  getStepType(paymentMethod: UIPaymentMethod): 'cash' | 'transfer' | 'qr' {
    if (paymentMethod === UIPaymentMethod.QR) {
      return 'qr';
    } else if (paymentMethod === UIPaymentMethod.TRANSFERENCIA) {
      return 'transfer';
    }
    return 'cash';
  }
}
