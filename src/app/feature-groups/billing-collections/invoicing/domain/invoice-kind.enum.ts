/**
 * Enum for Invoice Kind (Tipo de Comprobante Combined)
 * This enum combines VoucherType and InvoiceType into a single value
 * to match the backend API structure from Colppy
 */
export enum InvoiceKind {
  // Invoices
  INVOICE_A = 'FACTURA_A',
  INVOICE_B = 'FACTURA_B',
  INVOICE_C = 'FACTURA_C',
  INVOICE_D = 'FACTURA_D',

  // Credit notes
  CREDIT_NOTE_A = 'NOTA_CREDITO_A',
  CREDIT_NOTE_B = 'NOTA_CREDITO_B',
  CREDIT_NOTE_C = 'NOTA_CREDITO_C',
  CREDIT_NOTE_D = 'NOTA_CREDITO_D',

  // Debit notes
  DEBIT_NOTE_A = 'NOTA_DEBITO_A',
  DEBIT_NOTE_B = 'NOTA_DEBITO_B',
  DEBIT_NOTE_C = 'NOTA_DEBITO_C',
  DEBIT_NOTE_D = 'NOTA_DEBITO_D'
}

/**
 * Labels for displaying invoice kinds in UI
 */
export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  [InvoiceKind.INVOICE_A]: 'Factura A',
  [InvoiceKind.INVOICE_B]: 'Factura B',
  [InvoiceKind.INVOICE_C]: 'Factura C',
  [InvoiceKind.INVOICE_D]: 'Factura D',
  [InvoiceKind.CREDIT_NOTE_A]: 'Nota de crédito A',
  [InvoiceKind.CREDIT_NOTE_B]: 'Nota de crédito B',
  [InvoiceKind.CREDIT_NOTE_C]: 'Nota de crédito C',
  [InvoiceKind.CREDIT_NOTE_D]: 'Nota de crédito D',
  [InvoiceKind.DEBIT_NOTE_A]: 'Nota de débito A',
  [InvoiceKind.DEBIT_NOTE_B]: 'Nota de débito B',
  [InvoiceKind.DEBIT_NOTE_C]: 'Nota de débito C',
  [InvoiceKind.DEBIT_NOTE_D]: 'Nota de débito D'
};

/**
 * Helper function to get InvoiceKind from separate VoucherType and InvoiceType
 * Useful for migration from old structure
 */
export function getInvoiceKindFromSeparateTypes(voucherType: string, invoiceType: string): InvoiceKind | null {
  const combinedKey = `${voucherType}_${invoiceType.replace('TIPO_', '')}` as InvoiceKind;

  if (Object.values(InvoiceKind).includes(combinedKey)) {
    return combinedKey;
  }

  return null;
}

/**
 * Helper function to split InvoiceKind into separate VoucherType and InvoiceType
 * Useful for displaying in UI components that still use separate fields
 */
export function splitInvoiceKind(kind: InvoiceKind): { voucherType: string; invoiceType: string } {
  const parts = kind.split('_');
  const type = parts[parts.length - 1]; // Last part is the type (A, B, C, D)
  const voucher = parts.slice(0, -1).join('_'); // Everything else is the voucher type

  return {
    voucherType: voucher,
    invoiceType: `TIPO_${type}`
  };
}
