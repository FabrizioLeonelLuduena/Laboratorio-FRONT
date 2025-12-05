/**
 * Appointment Configuration export configuration
 * Defines the column structure for configuration exports using generic services
 */

import { ExportColumn } from '../../../../shared/services/export';

/**
 * Display row interface for appointment configurations
 * This matches the displayRows computed signal structure
 */
export interface ConfigurationDisplayRow {
  id: number;
  branchId: number;
  startTime: string;
  endTime: string;
  timeRange: string;
  appointmentsCount: number;
  slotDurationMinutes: number;
  isRecurring: boolean;
  recurringDaysOfWeek: number[];
  validFromDate: string;
  validToDate: string;
  active: boolean;
  version: number;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  createdUser: number;
  lastUpdatedUser: number;
  inactive: boolean;
  isRecurringLabel: string;
  activeLabel: string;
  dayOfWeekLabel: string;
  periodLabel: string;
}

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  'Activo': 'Activo',
  'Inactivo': 'Inactivo',
  'Desactivado': 'Desactivado'
};

/**
 * Format date to dd/MM/yyyy
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Column definitions for appointment configuration Excel exports
 */
export const CONFIGURATION_EXPORT_COLUMNS: ExportColumn<ConfigurationDisplayRow>[] = [
  {
    header: 'Días',
    getValue: (config) => config.dayOfWeekLabel || '-',
    width: 25
  },
  {
    header: 'Horario Inicio',
    getValue: (config) => config.startTime || '-',
    width: 15
  },
  {
    header: 'Horario Fin',
    getValue: (config) => config.endTime || '-',
    width: 15
  },
  {
    header: 'Capacidad',
    getValue: (config) => config.appointmentsCount?.toString() || '0',
    width: 12
  },
  {
    header: 'Duración (min)',
    getValue: (config) => config.slotDurationMinutes?.toString() || '0',
    width: 15
  },
  {
    header: 'Tipo',
    getValue: (config) => config.isRecurringLabel || '-',
    width: 15
  },
  {
    header: 'Fecha Desde',
    getValue: (config) => formatDate(config.validFromDate),
    width: 18
  },
  {
    header: 'Fecha Hasta',
    getValue: (config) => formatDate(config.validToDate),
    width: 18
  },
  {
    header: 'Estado',
    getValue: (config) => STATUS_LABELS[config.activeLabel] || config.activeLabel || '-',
    width: 15
  }
];

/**
 * Column definitions for appointment configuration PDF exports (abbreviated headers)
 */
export const CONFIGURATION_PDF_COLUMNS: ExportColumn<ConfigurationDisplayRow>[] = [
  {
    header: 'Días',
    getValue: (config) => config.dayOfWeekLabel || '-',
    width: 30
  },
  {
    header: 'Horario',
    getValue: (config) => config.timeRange || `${config.startTime} - ${config.endTime}`,
    width: 25
  },
  {
    header: 'Capacidad',
    getValue: (config) => `${config.appointmentsCount || 0} turnos`,
    width: 20
  },
  {
    header: 'Duración',
    getValue: (config) => `${config.slotDurationMinutes || 0} min`,
    width: 18
  },
  {
    header: 'Tipo',
    getValue: (config) => config.isRecurringLabel || '-',
    width: 20
  },
  {
    header: 'Período',
    getValue: (config) => config.periodLabel || `${formatDate(config.validFromDate)} - ${formatDate(config.validToDate)}`,
    width: 40
  },
  {
    header: 'Estado',
    getValue: (config) => STATUS_LABELS[config.activeLabel] || config.activeLabel || '-',
    width: 18
  }
];
