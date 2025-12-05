/**
 * Invoice data helper utilities
 * Functions for formatting and transforming invoice data for exports
 */

import { InvoiceableType, InvoiceableTypeLabels } from '../domain/invoiceable-type.enum';
import { Invoiceable } from '../domain/invoiceable.model';

/**
 * Formats date to DD/MM/YYYY format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats amount to currency string
 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Gets the type label for an invoiceable
 */
export function getTypeLabel(type: InvoiceableType | null | undefined): string {
  if (!type) return '-';
  return InvoiceableTypeLabels[type] || type;
}

/**
 * Gets the invoice status label
 */
export function getInvoiceStatus(item: Invoiceable): string {
  if (!item.invoiceReference) {
    return 'Sin facturar';
  }
  if (item.invoiceReference.invoiceReference === '') {
    return 'Pendiente';
  }
  return 'Facturada';
}

/**
 * Gets the invoice number or placeholder
 */
export function getInvoiceNumber(item: Invoiceable): string {
  if (!item.invoiceReference || item.invoiceReference.invoiceReference === '') {
    return '—';
  }
  return item.invoiceReference.invoiceReference;
}

/**
 * Gets the description or placeholder
 */
export function getDescription(description: string | null | undefined): string {
  return description || '-';
}
