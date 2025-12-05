/**
 * Cash Detail export configuration
 * Defines the column structure for cash detail session exports using generic services
 */

import { ExportColumn } from '../../../shared/services/export';

import { CashSessionRow } from './cash-detail-page.component';

/**
 * Status label mapping for cash sessions
 */
export const CASH_SESSION_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Activa',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada'
};

/**
 * Column definitions for cash detail session exports
 * Used by both Excel and PDF export services
 */
export const CASH_DETAIL_EXPORT_COLUMNS: ExportColumn<CashSessionRow>[] = [
  {
    header: 'Fecha Apertura',
    getValue: (session) => {
      if (!session.openedAt) return '-';
      const date = new Date(session.openedAt);
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
    header: 'Fecha Cierre',
    getValue: (session) => {
      if (!session.closedAt) return '-';
      const date = new Date(session.closedAt);
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
    header: 'Monto Inicial',
    getValue: (session) => {
      return session.initialCash != null
        ? `$ ${session.initialCash.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 18
  },
  {
    header: 'Monto Cierre',
    getValue: (session) => {
      return session.finalCash != null
        ? `$ ${session.finalCash.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 18
  },
  {
    header: 'Estado',
    getValue: (session) =>
      CASH_SESSION_STATUS_LABELS[session.status] || session.status || '-',
    width: 15
  }
];

/**
 * PDF column definitions (abbreviated headers for space)
 */
export const CASH_DETAIL_PDF_COLUMNS: ExportColumn<CashSessionRow>[] = [
  {
    header: 'Apertura',
    getValue: (session) => {
      if (!session.openedAt) return '-';
      const date = new Date(session.openedAt);
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
    header: 'Cierre',
    getValue: (session) => {
      if (!session.closedAt) return '-';
      const date = new Date(session.closedAt);
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
    header: 'Inicial',
    getValue: (session) => {
      return session.initialCash != null
        ? `$ ${session.initialCash.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 30
  },
  {
    header: 'Cierre',
    getValue: (session) => {
      return session.finalCash != null
        ? `$ ${session.finalCash.toLocaleString('es-AR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}`
        : '-';
    },
    width: 30
  },
  {
    header: 'Estado',
    getValue: (session) =>
      CASH_SESSION_STATUS_LABELS[session.status] || session.status || '-',
    width: 20
  }
];
