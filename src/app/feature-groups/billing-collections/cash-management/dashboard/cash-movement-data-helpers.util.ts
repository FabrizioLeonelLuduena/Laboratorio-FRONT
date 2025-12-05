/**
 * Cash movement data helper utilities
 * Functions for formatting and transforming cash movement data for exports
 */

import { CashMovement } from '../domain/cash-movement.model';
import { CashMovementMapper } from '../mappers/cash-movement.mapper';

/**
 * Formats date to DD/MM/YYYY HH:mm format
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Gets the transaction type label
 */
export function getTransactionTypeLabel(movement: CashMovement): string {
  switch (movement.type) {
  case 'INFLOW':
    if (movement.isFromAttention) {
      return 'Atención';
    } else {
      return 'Depósito';
    }
  case 'OUTFLOW':
    return 'Extracción';
  default:
    return 'Movimiento';
  }
}

/**
 * Gets the payment method label
 */
export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '-';
  return CashMovementMapper.getPaymentMethodLabel(method);
}

/**
 * Formats amount with currency and sign
 */
export function formatAmount(amount: number | null | undefined, type: string): string {
  if (amount === null || amount === undefined) return '-';
  const formattedAmount = Math.abs(amount);
  const prefix = type === 'OUTFLOW' ? '-' : '+';
  return `${prefix} $ ${formattedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats previous amount with currency
 */
export function formatPreviousAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
