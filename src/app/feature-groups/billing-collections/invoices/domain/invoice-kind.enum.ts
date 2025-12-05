export enum InvoiceKind {
  INVOICE_A = 'FACTURA_A',
  INVOICE_B = 'FACTURA_B',
  INVOICE_C = 'FACTURA_C',
  INVOICE_E = 'FACTURA_E',
  CREDIT_NOTE_A = 'NOTA_CREDITO_A',
  CREDIT_NOTE_B = 'NOTA_CREDITO_B',
  CREDIT_NOTE_C = 'NOTA_CREDITO_C',
  DEBIT_NOTE_A = 'NOTA_DEBITO_A',
  DEBIT_NOTE_B = 'NOTA_DEBITO_B',
  DEBIT_NOTE_C = 'NOTA_DEBITO_C'
}

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  [InvoiceKind.INVOICE_A]: 'Factura A',
  [InvoiceKind.INVOICE_B]: 'Factura B',
  [InvoiceKind.INVOICE_C]: 'Factura C',
  [InvoiceKind.INVOICE_E]: 'Factura E',
  [InvoiceKind.CREDIT_NOTE_A]: 'Nota de Crédito A',
  [InvoiceKind.CREDIT_NOTE_B]: 'Nota de Crédito B',
  [InvoiceKind.CREDIT_NOTE_C]: 'Nota de Crédito C',
  [InvoiceKind.DEBIT_NOTE_A]: 'Nota de Débito A',
  [InvoiceKind.DEBIT_NOTE_B]: 'Nota de Débito B',
  [InvoiceKind.DEBIT_NOTE_C]: 'Nota de Débito C'
};
