/**
 * Cash movement export configuration
 * Defines the column structure for cash movement exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';
import { CashMovement } from '../domain/cash-movement.model';

import * as CashMovementDataHelpers from './cash-movement-data-helpers.util';

/**
 * Column definitions for cash movement Excel exports
 * Used by Excel export service
 */
export const CASH_MOVEMENT_EXPORT_COLUMNS: ExportColumn<CashMovement>[] = [
  {
    header: 'Fecha',
    getValue: (movement) => CashMovementDataHelpers.formatDateTime(movement.transactionDate),
    width: 20
  },
  {
    header: 'Tipo',
    getValue: (movement) => CashMovementDataHelpers.getTransactionTypeLabel(movement),
    width: 18
  },
  {
    header: 'Medio de Pago',
    getValue: (movement) => CashMovementDataHelpers.getPaymentMethodLabel(movement.paymentMethod),
    width: 20
  },
  {
    header: 'Monto Operado',
    getValue: (movement) => CashMovementDataHelpers.formatAmount(movement.amount, movement.type),
    width: 18
  },
  {
    header: 'Monto Previo',
    getValue: (movement) => CashMovementDataHelpers.formatPreviousAmount(movement.previousAmount),
    width: 18
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const CASH_MOVEMENT_PDF_COLUMNS: ExportColumn<CashMovement>[] = [
  {
    header: 'Fecha',
    getValue: (movement) => CashMovementDataHelpers.formatDateTime(movement.transactionDate),
    width: 20
  },
  {
    header: 'Tipo',
    getValue: (movement) => CashMovementDataHelpers.getTransactionTypeLabel(movement),
    width: 18
  },
  {
    header: 'Medio de Pago',
    getValue: (movement) => CashMovementDataHelpers.getPaymentMethodLabel(movement.paymentMethod),
    width: 18
  },
  {
    header: 'Monto',
    getValue: (movement) => CashMovementDataHelpers.formatAmount(movement.amount, movement.type),
    width: 16
  },
  {
    header: 'Previo',
    getValue: (movement) => CashMovementDataHelpers.formatPreviousAmount(movement.previousAmount),
    width: 16
  }
];
