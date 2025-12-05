/**
 * Cash General export configuration
 * Defines the column structure for cash register and movement exports using generic services
 */

import { ExportColumn } from '../../../shared/services/export';

import { CashMovementItem } from './cash-general.models';

/**
 * Status label mapping for cash sessions
 */
export const CASH_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Activa',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada'
};

/**
 * Interface for cash register summary row
 */
export interface CashRegisterSummaryRow {
  id: number;
  name: string;
  branchId: number;
  branchName: string;
  user?: string | null;
  sessionStatus?: 'OPEN' | 'CLOSED' | 'CANCELLED' | null;
  initialAmount: number;
  currentAmount: number;
}

/**
 * Column definitions for cash register summary exports
 * Used by both Excel and PDF export services
 */
export const CASH_REGISTER_EXPORT_COLUMNS: ExportColumn<CashRegisterSummaryRow>[] = [
  {
    header: 'Sucursal',
    getValue: (row) => row.branchName || '-',
    width: 25
  },
  {
    header: 'Caja',
    getValue: (row) => row.name || '-',
    width: 20
  },
  {
    header: 'Estado',
    getValue: (row) =>
      row.sessionStatus ? CASH_STATUS_LABELS[row.sessionStatus] || row.sessionStatus : '-',
    width: 15
  },
  {
    header: 'Monto Inicial',
    getValue: (row) => {
      return row.initialAmount != null
        ? `$ ${row.initialAmount.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 18
  },
  {
    header: 'Monto Actual',
    getValue: (row) => {
      return row.currentAmount != null
        ? `$ ${row.currentAmount.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 18
  }
];

/**
 * PDF column definitions for cash register summary (abbreviated headers for space)
 */
export const CASH_REGISTER_PDF_COLUMNS: ExportColumn<CashRegisterSummaryRow>[] = [
  {
    header: 'Sucursal',
    getValue: (row) => row.branchName || '-',
    width: 45
  },
  {
    header: 'Caja',
    getValue: (row) => row.name || '-',
    width: 35
  },
  {
    header: 'Estado',
    getValue: (row) =>
      row.sessionStatus ? CASH_STATUS_LABELS[row.sessionStatus] || row.sessionStatus : '-',
    width: 25
  },
  {
    header: 'Inicial',
    getValue: (row) => {
      return row.initialAmount != null
        ? `$ ${row.initialAmount.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 30
  },
  {
    header: 'Actual',
    getValue: (row) => {
      return row.currentAmount != null
        ? `$ ${row.currentAmount.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 30
  }
];

/**
 * Column definitions for cash movements exports
 * Used by both Excel and PDF export services
 */
export const CASH_MOVEMENT_EXPORT_COLUMNS: ExportColumn<CashMovementItem>[] = [
  {
    header: 'Método de Pago',
    getValue: (movement) => movement.operation || '-',
    width: 20
  },
  {
    header: 'Fecha / Hora',
    getValue: (movement) => {
      if (!movement.date) return '-';
      const date = new Date(movement.date);
      return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    width: 20
  },
  {
    header: 'Tipo',
    getValue: (movement) => movement.type || '-',
    width: 15
  },
  {
    header: 'Monto',
    getValue: (movement) => {
      if (movement.amount == null) return '-';
      const normalized = Math.abs(movement.amount);
      const prefix = movement.type === 'Egreso' ? '-' : '+';
      return `${prefix}$ ${normalized.toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    },
    width: 18
  },
  {
    header: 'Saldo',
    getValue: (movement) => {
      return movement.balance != null
        ? `$ ${movement.balance.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 18
  }
];

/**
 * PDF column definitions for cash movements (abbreviated headers for space)
 */
export const CASH_MOVEMENT_PDF_COLUMNS: ExportColumn<CashMovementItem>[] = [
  {
    header: 'Método',
    getValue: (movement) => movement.operation || '-',
    width: 30
  },
  {
    header: 'Fecha / Hora',
    getValue: (movement) => {
      if (!movement.date) return '-';
      const date = new Date(movement.date);
      return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    width: 35
  },
  {
    header: 'Tipo',
    getValue: (movement) => movement.type || '-',
    width: 25
  },
  {
    header: 'Monto',
    getValue: (movement) => {
      if (movement.amount == null) return '-';
      const normalized = Math.abs(movement.amount);
      const prefix = movement.type === 'Egreso' ? '-' : '+';
      return `${prefix}$ ${normalized.toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    },
    width: 30
  },
  {
    header: 'Saldo',
    getValue: (movement) => {
      return movement.balance != null
        ? `$ ${movement.balance.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 30
  }
];
