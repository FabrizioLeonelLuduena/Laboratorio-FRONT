/**
 * Suppliers export configuration
 * Defines the column structure for supplier exports using generic services
 */

import { ExportColumn } from '../../../../../shared/services/export';
import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';

/**
 * Extended supplier type for display with enriched contact information
 */
export type SupplierDisplayRow = ResponseSupplierDTO & {
  contact: string;
  emailOrPhone: string;
};

/**
 * Get first active contact value
 */
function getFirstContact(supplier: SupplierDisplayRow, type: 'EMAIL' | 'PHONE' | 'ADDRESS' = 'EMAIL'): string {
  const contact = (supplier.contacts || []).find(c => c.contactType === type && c.isActive);
  return contact?.description || '-';
}

/**
 * Get all contacts formatted
 */
function getAllContacts(supplier: SupplierDisplayRow): string {
  if (!supplier.contacts || supplier.contacts.length === 0) return '-';

  return supplier.contacts
    .filter(c => c.isActive)
    .map(c => {
      const label = c.label || c.contactType;
      return `${label}: ${c.description}`;
    })
    .join('; ');
}

/**
 * Column definitions for supplier Excel exports
 */
export const SUPPLIER_EXPORT_COLUMNS: ExportColumn<SupplierDisplayRow>[] = [
  {
    header: 'CUIT',
    getValue: (supplier) => supplier.cuit || '-',
    width: 15
  },
  {
    header: 'Razón Social',
    getValue: (supplier) => supplier.companyName || '-',
    width: 40
  },
  {
    header: 'Email',
    getValue: (supplier) => getFirstContact(supplier, 'EMAIL'),
    width: 30
  },
  {
    header: 'Teléfono',
    getValue: (supplier) => getFirstContact(supplier, 'PHONE'),
    width: 20
  },
  {
    header: 'Dirección',
    getValue: (supplier) => getFirstContact(supplier, 'ADDRESS'),
    width: 50
  },
  {
    header: 'Todos los Contactos',
    getValue: (supplier) => getAllContacts(supplier),
    width: 60
  },
  {
    header: 'Estado',
    getValue: (supplier) => supplier.isActive ? 'Activo' : 'Inactivo',
    width: 12
  }
];

/**
 * Column definitions for supplier PDF exports (abbreviated headers)
 */
export const SUPPLIER_PDF_COLUMNS: ExportColumn<SupplierDisplayRow>[] = [
  {
    header: 'CUIT',
    getValue: (supplier) => supplier.cuit || '-',
    width: 25
  },
  {
    header: 'Razón Social',
    getValue: (supplier) => supplier.companyName || '-',
    width: 50
  },
  {
    header: 'Email',
    getValue: (supplier) => getFirstContact(supplier, 'EMAIL'),
    width: 40
  },
  {
    header: 'Teléfono',
    getValue: (supplier) => getFirstContact(supplier, 'PHONE'),
    width: 25
  },
  {
    header: 'Estado',
    getValue: (supplier) => supplier.isActive ? 'Activo' : 'Inactivo',
    width: 18
  }
];
