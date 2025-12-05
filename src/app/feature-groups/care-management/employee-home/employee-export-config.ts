/**
 * Employee export configuration
 * Defines the column structure for employee exports using generic services
 */

import { ExportColumn } from '../../../shared/services/export';
import { EmployeeResponse } from '../models/employees.models';

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido'
};

/**
 * Contact type label mapping
 */
const CONTACT_TYPE_LABELS: Record<string, string> = {
  PHONE: 'Teléfono',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp'
};

/**
 * Translate status to Spanish
 */
function translateStatus(status: string | undefined): string {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
}

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Extract primary contact (first email, or first phone, or first contact)
 */
function extractPrimaryContact(employee: EmployeeResponse): string {
  if (!employee.contacts || employee.contacts.length === 0) return '-';

  const email = employee.contacts.find(c => c.contactType === 'EMAIL');
  if (email) return email.contact;

  const phone = employee.contacts.find(c => c.contactType === 'PHONE');
  if (phone) return phone.contact;

  return employee.contacts[0]?.contact || '-';
}

/**
 * Format all contacts as a comma-separated string
 */
function formatAllContacts(employee: EmployeeResponse): string {
  if (!employee.contacts || employee.contacts.length === 0) return '-';

  return employee.contacts
    .map(c => {
      const typeLabel = CONTACT_TYPE_LABELS[c.contactType] || c.contactType;
      return `${typeLabel}: ${c.contact}`;
    })
    .join(', ');
}

/**
 * Format roles/permissions as comma-separated string
 */
function formatRoles(employee: EmployeeResponse): string {
  if (!employee.permissions || employee.permissions.length === 0) return '-';
  return employee.permissions.map(p => p.description).join(', ');
}

/**
 * Column definitions for employee Excel exports
 */
export const EMPLOYEE_EXPORT_COLUMNS: ExportColumn<EmployeeResponse>[] = [
  {
    header: 'Apellido',
    getValue: (employee) => employee.lastName || '-',
    width: 25
  },
  {
    header: 'Nombre',
    getValue: (employee) => employee.name || '-',
    width: 25
  },
  {
    header: 'Documento',
    getValue: (employee) => employee.document || '-',
    width: 15
  },
  {
    header: 'Fecha de Nacimiento',
    getValue: (employee) => formatDate(employee.dateOfBirth),
    width: 18
  },
  {
    header: 'Contacto Principal',
    getValue: (employee) => extractPrimaryContact(employee),
    width: 30
  },
  {
    header: 'Todos los Contactos',
    getValue: (employee) => formatAllContacts(employee),
    width: 50
  },
  {
    header: 'Roles',
    getValue: (employee) => formatRoles(employee),
    width: 40
  },
  {
    header: 'Matrícula',
    getValue: (employee) => employee.registration || '-',
    width: 20
  },
  {
    header: 'Zona',
    getValue: (employee) => employee.zone || '-',
    width: 15
  },
  {
    header: 'Estado',
    getValue: (employee) => translateStatus(employee.status),
    width: 15
  }
];

/**
 * Column definitions for employee PDF exports (abbreviated headers)
 */
export const EMPLOYEE_PDF_COLUMNS: ExportColumn<EmployeeResponse>[] = [
  {
    header: 'Apellido',
    getValue: (employee) => employee.lastName || '-',
    width: 30
  },
  {
    header: 'Nombre',
    getValue: (employee) => employee.name || '-',
    width: 30
  },
  {
    header: 'Doc.',
    getValue: (employee) => employee.document || '-',
    width: 20
  },
  {
    header: 'F. Nac.',
    getValue: (employee) => formatDate(employee.dateOfBirth),
    width: 20
  },
  {
    header: 'Contacto',
    getValue: (employee) => extractPrimaryContact(employee),
    width: 45
  },
  {
    header: 'Roles',
    getValue: (employee) => formatRoles(employee),
    width: 50
  },
  {
    header: 'Estado',
    getValue: (employee) => translateStatus(employee.status),
    width: 20
  }
];
