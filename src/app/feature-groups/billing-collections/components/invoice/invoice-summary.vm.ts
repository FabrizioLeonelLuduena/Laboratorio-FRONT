import { PaymentMethodDetail } from '../../invoicing/domain/payment-method-detail.model';
import { PaymentResponseDTO } from '../collector/models/dtos';

/**
 * Línea del detalle del cobro reflejada en la factura y en el resumen
 */
export interface InvoiceSummaryItem {
  description: string;
  totalAmount: number;
  coveredAmount: number;
  patientAmount: number;
  analysisId?: number;
  coverageId?: number;
}

/**
 * Totales del cobro (vista de resumen)
 */
export interface InvoiceSummaryTotals {
  subtotal: number;
  iva: number;
  coinsurance: number;
  total: number;
  paid: number;
  remaining: number;
}

/**
 * Información completa del cobro para el Facturador
 */
export interface InvoiceSummary {
  patientName: string;
  coverageName: string;
  ivaPercentage: number | null;
  items: InvoiceSummaryItem[];
  paymentMethods: PaymentMethodDetail[];
  totals: InvoiceSummaryTotals;
  paymentResponse: PaymentResponseDTO;

  /**
   * Campos opcionales que ahora mockeamos, pero van a venir desde Turnos
   */
  issuedAt?: string;

  // PACIENTE
  patientDni?: string;
  affiliateNumber?: string;

  // COBERTURA/MUTUAL
  coverageCode?: string;

  // EMPRESA EMISORA (responsable AFIP)
  issuerCompanyName?: string;
  issuerCuit?: string;
  issuerAddress?: string;
}

/**
 * Items que se envían a la simulación de Factura B
 */
export interface SimulatedInvoiceItem {
  description: string;
  analysisId?: number;
  coverageId?: number;
  amount: number;
}

/**
 * Modelo de Factura B simulada para UI y modal
 */
export interface SimulatedInvoice {
  kind: 'FACTURA_B';
  invoiceDate: string;
  paymentDate: string;
  paymentCondition: 'Contado';
  paymentType: 'Efectivo';
  currencyId: string;
  invoiceNumberPrefix: string;
  invoiceNumber: string;
  taxableSubtotal: number;
  nonTaxableSubtotal: number;
  totalVat: number;
  grandTotal: number;
  orderId: string;
  accountId: number;
  items: SimulatedInvoiceItem[];
}
