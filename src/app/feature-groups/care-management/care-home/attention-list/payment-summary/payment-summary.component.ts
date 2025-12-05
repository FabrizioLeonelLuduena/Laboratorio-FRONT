import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal, computed } from '@angular/core';

import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

import { environment } from '../../../../../../environments/environment';
import type { AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { PaymentsService } from '../../../../billing-collections/payments/application/payments.service';
import {
  PaymentDetailDto,
  PaymentDetailItem,
  PaymentCollection,
  PaymentCollectionDto,
  PaymentSummaryData
} from '../../../../billing-collections/payments/payment-view.models';

/**
 * Component to display payment summary when payment already exists
 * Used in attention workflow to prevent duplicate payments
 */
@Component({
  selector: 'app-payment-summary',
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
  templateUrl: './payment-summary.component.html',
  styleUrls: ['./payment-summary.component.css']
})
export class PaymentSummaryComponent implements OnInit {
  @Input() paymentId!: number;
  @Input() attentionId!: number;

  isLoading = signal<boolean>(true);
  paymentData = signal<PaymentSummaryData | null>(null);

  // Computed signal that guarantees non-null payment data for template
  safePaymentData = computed(() => this.paymentData() ?? this.getEmptyPaymentData());

  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /**
   * Constructor for PaymentSummaryComponent
   * @param paymentsService - Service for payment operations
   */
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Lifecycle hook called after component initialization
   * Loads payment summary data
   */
  ngOnInit(): void {
    this.loadPaymentSummary();
  }

  /**
   * Load payment summary from backend
   */
  private loadPaymentSummary(): void {
    if (!this.paymentId) {
      this.showAlert(
        'error',
        'Error',
        'No se proporcionó un ID de pago válido'
      );
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    // Get user ID from localStorage
    const userAuthString = localStorage.getItem('auth_user');
    let userId = 1; // Default value

    if (userAuthString) {
      try {
        const userAuthObject = JSON.parse(userAuthString);
        userId = userAuthObject?.id ?? 1;
      } catch {
        // Error parsing user auth, using default value
      }
    }

    // Call backend to get payment details
    this.paymentsService.getPaymentById(this.paymentId, userId).subscribe({
      next: (response) => {
        // Map backend response to component data structure
        this.paymentData.set({
          paymentId: response.paymentId || this.paymentId,
          date: response.createdAt
            ? new Date(response.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString(),
          status: this.translatePaymentStatus(response.status),
          items: this.mapPaymentDetails(response.details || []),
          paymentMethods: this.mapCollections(response.collections || []),
          totals: {
            subtotal: response.total - response.iva || 0,
            iva: response.iva || 0,
            total: response.total || 0
          }
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert(
          'error',
          'Error',
          'No se pudo cargar la información del pago'
        );
        this.isLoading.set(false);

        // In production, only use mock data if explicitly enabled
        if (!environment.production) {
          this.loadMockData();
        }
      }
    });
  }

  /**
   * Map payment details from backend to component structure
   */
  private mapPaymentDetails(details: PaymentDetailDto[]): PaymentDetailItem[] {
    return details.map((detail) => ({
      description: detail.analysis_name || detail.description || 'Análisis',
      amount: detail.amount || 0
    }));
  }

  /**
   * Map collections (payment methods) from backend to component structure
   */
  private mapCollections(collections: PaymentCollectionDto[]): PaymentCollection[] {
    return collections.map((collection) => ({
      method: this.translatePaymentMethod(collection.payment_method),
      amount: collection.amount || 0
    }));
  }

  /**
   * Translate payment method from backend enum to display text
   */
  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      QR: 'QR / Mercado Pago',
      DEBIT_CARD: 'Tarjeta de Débito',
      CREDIT_CARD: 'Tarjeta de Crédito'
    };
    return translations[method] || method;
  }

  /**
   * Translate payment status from backend enum to display text
   */
  private translatePaymentStatus(status: string): string {
    const translations: Record<string, string> = {
      PROCESSED: 'Completado',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
      COMPLETED: 'Completado',
      FAILED: 'Fallido'
    };
    return translations[status] || status || 'Completado';
  }

  /**
   * Load mock data as fallback
   */
  private loadMockData(): void {
    this.paymentData.set({
      paymentId: this.paymentId,
      date: new Date().toLocaleDateString(),
      status: 'COMPLETADO',
      items: [
        { description: 'Análisis 1', amount: 1500 },
        { description: 'Análisis 2', amount: 2000 }
      ],
      paymentMethods: [{ method: 'Efectivo', amount: 3500 }],
      totals: {
        subtotal: 3000,
        iva: 500,
        total: 3500
      }
    });
    this.isLoading.set(false);
  }

  /**
   * Get empty payment data structure
   */
  private getEmptyPaymentData(): PaymentSummaryData {
    return {
      paymentId: 0,
      date: '',
      status: '',
      items: [],
      paymentMethods: [],
      totals: {
        subtotal: 0,
        iva: 0,
        total: 0
      }
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
   * Maps payment status to a badge status type.
   * @param status - The payment status string.
   * @returns A status compatible with `GenericBadgeComponent`.
   */
  getBadgeStatus(status: string): 'activo' | 'inactivo' | 'pendiente' {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus.includes('PROCESADO') || upperStatus.includes('COMPLETADO')) {
      return 'activo';
    }
    if (upperStatus.includes('CANCELADO') || upperStatus.includes('FALLIDO')) {
      return 'inactivo';
    }
    return 'pendiente';
  }
}
