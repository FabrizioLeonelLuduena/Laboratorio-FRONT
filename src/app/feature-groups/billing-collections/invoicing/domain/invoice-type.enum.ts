/**
 * Enum for Invoice Types (Tipo de Factura)
 */
export enum InvoiceType {
  TIPO_A = 'TIPO_A',
  TIPO_B = 'TIPO_B',
  TIPO_C = 'TIPO_C',
  TIPO_E = 'TIPO_E',
  TIPO_M = 'TIPO_M'
}

/**
 * Labels for displaying invoice types in UI
 */
export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  [InvoiceType.TIPO_A]: 'Tipo A',
  [InvoiceType.TIPO_B]: 'Tipo B',
  [InvoiceType.TIPO_C]: 'Tipo C',
  [InvoiceType.TIPO_E]: 'Tipo E',
  [InvoiceType.TIPO_M]: 'Tipo M'
};
