import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';

import { AccordionModule } from 'primeng/accordion';

import { NumberToWordsPipe } from '../../../../../../../shared/pipes/number-to-words.pipe';
import { Billing, BillingItem, PaymentMethodDetail, PaymentMethod, PAYMENT_METHOD_LABELS, INVOICE_TYPE_LABELS } from '../../../../domain';

/**
 * SummaryStepComponent - Step 3 of billing creator
 * Read-only summary with 3 expandable accordions: General Data, Items, Payment Methods
 */
@Component({
  selector: 'app-summary-step',
  standalone: true,
  imports: [
    CommonModule,
    AccordionModule,
    NumberToWordsPipe
  ],
  templateUrl: './summary-step.component.html',
  styleUrls: ['./summary-step.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SummaryStepComponent {
  @Input() billing?: Billing;
  @Input() items: BillingItem[] = [];
  @Input() paymentMethods: PaymentMethodDetail[] = [];

  /**
   * Get formatted date
   */
  getFormattedDate(): string {
    if (this.billing?.invoiceDate) {
      const date = new Date(this.billing.invoiceDate);
      return date.toLocaleDateString('es-AR');
    }
    return '24/10/2025';
  }

  /**
   * Get full invoice number
   */
  getFullInvoiceNumber(): string {
    return this.billing?.fullInvoiceNumber || '1234-12345678';
  }

  /**
   * Get invoice type label
   */
  getInvoiceTypeLabel(): string {
    if (this.billing?.invoiceType) {
      return INVOICE_TYPE_LABELS[this.billing.invoiceType] || this.billing.invoiceType;
    }
    return 'Tipo A';
  }

  /**
   * Get client name
   */
  getClientName(): string {
    return this.billing?.customerId || 'Cliente no especificado';
  }

  /**
   * Get observations
   */
  getObservations(): string {
    return this.billing?.observations || 'Sin observaciones';
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] || method;
  }

  /**
   * Get total items
   */
  getTotalItems(): number {
    return this.items.length;
  }

  /**
   * Get total quantity
   */
  getTotalQuantity(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  /**
   * Get grand total
   */
  getGrandTotal(): number {
    return this.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  }

  /**
   * Get total payment methods
   */
  getTotalPayments(): number {
    return this.paymentMethods.reduce((sum, pm) => sum + (pm.amount || 0), 0);
  }

  /**
   * Get subtotal (before tax)
   */
  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  }

  /**
   * Get total tax
   */
  getTotalTax(): number {
    return this.items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  }

  /**
   * Get average tax rate
   */
  getAverageTaxRate(): number {
    if (this.items.length === 0) return 0;
    const totalVatRate = this.items.reduce((sum, item) => sum + (item.vatRate || 0), 0);
    return Math.round(totalVatRate / this.items.length);
  }

}
