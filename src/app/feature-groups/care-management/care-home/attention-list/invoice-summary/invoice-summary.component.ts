import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal, computed } from '@angular/core';

import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { of } from 'rxjs';

import { timeout, catchError } from 'rxjs/operators';

import type { AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { BillingService } from '../../../../billing-collections/invoicing/application/billing.service';
import { Billing } from '../../../../billing-collections/invoicing/domain/billing.model';
import { InvoiceItem, InvoicePaymentMethod, InvoiceSummaryData } from '../../../models/invoice-summary.models';

/**
 * Component to display invoice summary when invoice already exists
 * Used in attention workflow to prevent duplicate invoicing
 */
@Component({
  selector: 'app-invoice-summary',
  standalone: true,
  imports: [
    CommonModule,
    AccordionModule,
    CardModule,
    DividerModule,
    GenericAlertComponent,
    GenericBadgeComponent,
    SpinnerComponent
  ],
  templateUrl: './invoice-summary.component.html',
  styleUrls: ['./invoice-summary.component.css']
})
export class InvoiceSummaryComponent implements OnInit {
  @Input() billingId?: number;
  @Input() attentionId!: number;
  @Input() billingData?: Partial<InvoiceSummaryData>;

  isLoading = signal<boolean>(true);
  invoiceData = signal<InvoiceSummaryData | null>(null);

  // Computed signal that guarantees non-null invoice data for template
  safeInvoiceData = computed(() => this.invoiceData() ?? this.getEmptyInvoiceData());

  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /**
   * Constructor for InvoiceSummaryComponent
   * @param billingService - Service for billing operations
   */
  constructor(private billingService: BillingService) {}

  /**
   * Lifecycle hook called after component initialization
   * Loads invoice summary data
   */
  ngOnInit(): void {
    this.loadInvoiceSummary();
  }

  /**
   * Load invoice summary from backend or use billingData fallback
   */
  private loadInvoiceSummary(): void {
    this.isLoading.set(true);

    // If we have billingId, try to load from backend (Colppy)
    if (this.billingId) {
      this.loadFromBackend(String(this.billingId));
    }
    // Fallback to billingData from collector component
    else if (this.billingData) {
      this.loadFromBillingData();
    }
    // No data available
    else {
      this.showAlert(
        'warning',
        'Sin datos',
        'No se encontró información de facturación'
      );
      this.isLoading.set(false);
    }
  }

  /**
   * Load invoice from backend using BillingService
   * Includes timeout to prevent infinite loading
   */
  private loadFromBackend(invoiceId: string): void {
    this.billingService.getBillingById(invoiceId).pipe(
      timeout(1000), // 10 second timeout
      catchError(() => {
        // Return null to trigger fallback
        return of(null);
      })
    ).subscribe({
      next: (billing) => {
        if (billing) {
          this.invoiceData.set({
            billingId: billing.id || this.billingId,
            date: billing.invoiceDate
              ? new Date(billing.invoiceDate).toLocaleDateString()
              : new Date().toLocaleDateString(),
            status: billing.status || 'COMPLETADO',
            items: this.mapBillingItems(billing.items || []),
            paymentMethods: this.mapPaymentMethods(billing.paymentMethods || []),
            totals: {
              subtotal: billing.netTaxable || 0,
              iva: billing.totalVat || 0,
              total: billing.totalInvoice || 0
            },
            ivaPercentage: this.calculateIvaPercentage(
              billing.totalVat || 0,
              billing.netTaxable || 0
            ),
            invoiceNumber: billing.fullInvoiceNumber || billing.invoiceNumber,
            cae: billing.cae
          });
          this.isLoading.set(false);
        } else {
          // Fallback to billingData if backend fails or returns null
          this.handleBackendFailure();
        }
      },
      error: () => {
        this.handleBackendFailure();
      }
    });
  }

  /**
   * Handle backend failure - fallback to billingData or show default summary
   */
  private handleBackendFailure(): void {
    if (this.billingData) {
      this.loadFromBillingData();
    } else {
      // Show a default completed invoice summary instead of error
      this.invoiceData.set({
        billingId: this.billingId || 0,
        date: new Date().toLocaleDateString(),
        status: 'COMPLETADO',
        items: [],
        paymentMethods: [],
        totals: {
          subtotal: 0,
          iva: 0,
          total: 0
        },
        ivaPercentage: 0
      });
      this.isLoading.set(false);
    }
  }

  /**
   * Load invoice from billingData (passed from collector)
   */
  private loadFromBillingData(): void {
    this.invoiceData.set({
      billingId: this.billingId || 0,
      date: new Date().toLocaleDateString(),
      status: 'COMPLETADO',
      items: this.billingData?.items || [],
      paymentMethods: this.billingData?.paymentMethods || [],
      totals: this.billingData?.totals || {
        subtotal: 0,
        iva: 0,
        total: 0
      },
      ivaPercentage: this.billingData?.ivaPercentage || 0
    });
    this.isLoading.set(false);
  }

  /**
   * Map billing items from Billing model to component structure
   */
  private mapBillingItems(items: Billing['items']): InvoiceItem[] {
    return items.map((item) => ({
      description: item.description || 'Item',
      totalAmount: item.totalAmount || item.unitPrice || 0,
      coveredAmount: 0,
      patientAmount: item.totalAmount || item.unitPrice || 0,
      selected: true
    }));
  }

  /**
   * Map payment methods from Billing model to component structure
   */
  private mapPaymentMethods(methods: Billing['paymentMethods']): InvoicePaymentMethod[] {
    return methods.map((method) => ({
      id: method.id,
      paymentMethod: this.translatePaymentMethod(method.paymentMethod || ''),
      amount: method.amount || 0,
      bank: method.bank,
      number: method.number
    }));
  }

  /**
   * Translate payment method from backend enum to display text
   */
  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      CASH: 'Efectivo',
      TRANSFERENCIA: 'Transferencia',
      TRANSFER: 'Transferencia',
      QR: 'QR / Mercado Pago',
      TARJETA_DEBITO: 'Tarjeta de Débito',
      DEBIT_CARD: 'Tarjeta de Débito',
      TARJETA_CREDITO: 'Tarjeta de Crédito',
      CREDIT_CARD: 'Tarjeta de Crédito',
      CHEQUE: 'Cheque',
      OTRO: 'Otro'
    };
    return translations[method] || method;
  }

  /**
   * Calculate IVA percentage from amounts
   */
  private calculateIvaPercentage(iva: number, subtotal: number): number {
    if (subtotal === 0) return 0;
    return Math.round((iva / subtotal) * 100 * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get empty invoice data structure
   */
  private getEmptyInvoiceData(): InvoiceSummaryData {
    return {
      billingId: 0,
      date: '',
      status: '',
      items: [],
      paymentMethods: [],
      totals: {
        subtotal: 0,
        iva: 0,
        total: 0
      },
      ivaPercentage: 0
    };
  }

  /**
   * Show alert message
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
   * Maps invoice status to a badge status type.
   * @param status The current invoice status.
   * @returns A status compatible with `GenericBadgeComponent`.
   */
  getBadgeStatus(status: string): 'activo' | 'inactivo' | 'pendiente' {
    const upperCaseStatus = status.toUpperCase();
    if (upperCaseStatus === 'COMPLETADO') {
      return 'activo';
    }
    if (upperCaseStatus === 'ANULADO' || upperCaseStatus === 'CANCELADO') {
      return 'inactivo';
    }
    return 'pendiente';
  }
}