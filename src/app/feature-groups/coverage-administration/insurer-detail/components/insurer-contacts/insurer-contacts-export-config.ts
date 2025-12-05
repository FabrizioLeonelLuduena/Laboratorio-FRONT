/**
 * Contacts export configuration
 * Defines the column structure for insurer contacts exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';

/** Contact row type for export */
type ContactRow = {
  contactTypeName?: string | null;
  contact?: string | null;
};

/**
 * Columns configuration for Excel export
 */
export const CONTACTS_EXPORT_COLUMNS: ExportColumn<ContactRow>[] = [
  {
    header: 'Tipo de contacto',
    getValue: (row) => row.contactTypeName || '-',
    width: 25
  },
  {
    header: 'Contacto',
    getValue: (row) => row.contact || '-',
    width: 40
  }
];

/**
 * Columns configuration for PDF export
 */
export const CONTACTS_PDF_COLUMNS: ExportColumn<ContactRow>[] = [
  {
    header: 'Tipo de contacto',
    getValue: (row) => row.contactTypeName || '-',
    width: 80
  },
  {
    header: 'Contacto',
    getValue: (row) => row.contact || '-',
    width: 120
  }
];
