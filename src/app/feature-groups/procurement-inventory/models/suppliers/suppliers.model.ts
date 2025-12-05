import {
  DeactivateDTO,
  ActivableEntity,
  PaginationConstants,
  CommonValidationConstants
} from '../common.models';

/**
 * Constantes de validación específicas de proveedores
 */
export const ValidationConstants = {
  MAX_EMAIL_LENGTH: 150,
  MAX_PHONE_LENGTH: 15,
  MAX_COMPANY_NAME_LENGTH: 300,
  CUIT_LENGTH: 11,
  MAX_SUPPLY_TYPES_LENGTH: 200,
  ...CommonValidationConstants,
  ...PaginationConstants
} as const;

/**
 * Tipo de contacto según el backend
 */
export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS'
}

/**
 * DTO para crear contacto (según backend refactorizado)
 */
export interface RequestContactDTO {
  label?: string;            // Opcional: etiqueta personalizada (ej: "Personal", "Trabajo") - máx 100 caracteres
  description: string;       // Obligatorio: valor real del contacto (email, teléfono o dirección) - máx 500 caracteres
  contactType: ContactType; // EMAIL, PHONE o ADDRESS
  isActive: boolean;        // Estado del contacto
}

/**
 * DTO para actualizar contacto
 */
export interface ContactCreateOrUpdateDTO extends ActivableEntity {
  id?: number;               // Si tiene ID: actualiza, si no: crea nuevo
  label?: string;            // Opcional: etiqueta personalizada (máx 100 caracteres)
  description: string;       // Obligatorio: valor real del contacto (máx 500 caracteres)
  contactType: ContactType; // EMAIL, PHONE o ADDRESS
}

/**
 * DTO de respuesta para contacto
 */
export interface ResponseContactDTO extends ActivableEntity {
  id: number;
  label?: string;            // Etiqueta personalizada del contacto
  description: string;       // Valor real del contacto (email, teléfono, dirección)
  contactType: ContactType;  // EMAIL, PHONE o ADDRESS (converted from contact_type by interceptor)
}

/**
 * Tipo auxiliar para representar contactos en la UI
 * (agrupa EMAIL y PHONE del mismo contacto)
 */
export interface ContactResponse {
  id?: number;
  description: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

/**
 * Interfaz para contactos en el formulario de creación/edición (UI)
 * Usada con CollapsableFormComponent, similar al patrón de Employees
 */
export interface SupplierContact {
  contactType: ContactType;  // EMAIL o PHONE
  description?: string;       // Descripción opcional (Personal, Trabajo, etc.)
  contactValue: string;      // Valor del contacto (email o teléfono)
}

/**
 * DTO para crear supplier item (producto del proveedor)
 */
export interface RequestSupplierItemDTO {
  supply_id: number;         // ID del insumo
  packaging_id: number;      // ID del empaque
  description: string;       // Descripción del producto
  unit_price: string;        // Precio unitario
}

/**
 * DTO para crear proveedor (según backend refactorizado)
 */
export interface RequestSupplierDTO {
  companyName: string;                  // Obligatorio, máximo 300 caracteres, único case-insensitive
  cuit: string;                         // Obligatorio, 11 dígitos, único, INMUTABLE
  contacts: RequestContactDTO[];        // Lista de contactos (al menos uno)
  supplierItems?: RequestSupplierItemDTO[]; // Lista de productos del proveedor (opcional)
}

/**
 * DTO para actualizar proveedor (según backend refactorizado)
 */
export interface SupplierUpdateDTO {
  companyName?: string;             // Máximo 300 caracteres, único
  reason?: string;                   // Motivo del cambio, máx 150 caracteres
  contacts?: ContactRequest[];       // Lista de contactos (sincronización completa)
  supplierItems?: RequestSupplierItemDTO[]; // Lista de productos del proveedor (opcional)
  // NOTA: cuit NO SE PUEDE MODIFICAR (inmutable)
}

/**
 * DTO para desactivar proveedor
 */
export interface SupplierDeactivateDTO extends DeactivateDTO {}

/**
 * Tipo para requests de contacto en updates
 */
export interface ContactRequest {
  id?: number;                // Si tiene ID: actualiza, si no: crea nuevo
  description: string;        // Obligatorio (máx 500 caracteres)
  contactType: ContactType;  // EMAIL, PHONE o ADDRESS
  contactValue: string;      // Valor del contacto
  isActive?: boolean;        // Estado del contacto
}

/**
 * DTO de respuesta para proveedor
 */
export interface ResponseSupplierDTO extends ActivableEntity {
  id: number;
  companyName: string;       // Converted from company_name by interceptor
  cuit: string;
  contacts: ResponseContactDTO[];
  lastUpdatedDateTime: string; // Converted from last_updated_date_time - Formato: "yyyy-MM-dd HH:mm:ss"
  reason?: string; // Deactivation reason (backend returns this field as "reason")
}

/**
 * DTO de respuesta para creación de proveedor
 */
export interface CreateSupplierResponseDTO {
  message: string;           // "Proveedor creado correctamente!"
  supplier: ResponseSupplierDTO;
}

/**
 * DTO de respuesta para detalle de proveedor
 */
export interface SupplierDetailResponseDTO extends ActivableEntity {
  id: number;
  cuit: string;
  companyName: string;
  supplyTypes?: string[]; // Lista de tipos de suministro (puede no estar presente)
  contacts: ResponseContactDTO[];
  supplierItems?: RequestSupplierItemDTO[]; // Lista de productos del proveedor (opcional)
  createdDateTime: string; // Formato: "yyyy-MM-dd HH:mm:ss"
  lastUpdatedDateTime: string; // Formato: "yyyy-MM-dd HH:mm:ss"
  createdUser: string;
  updatedUser: string;
  reason?: string; // Deactivation reason (backend returns this field as "reason")
}

/**
 * DTO para filtros de búsqueda de proveedores
 */
export interface SupplierFiltersDTO {
  searchTerm?: string;          // JSON string con filtros múltiples
  isActive?: boolean;       // Filtro por estado activo
  supplyTypes?: string;     // Filtro por tipos de suministro (máximo 200 caracteres)
  page?: number;            // Número de página (mínimo 0, por defecto 0)
  size?: number;            // Tamaño de página (1-100, por defecto 10)
  sort?: string;            // Ordenamiento (ej: "company_name,asc" o "cuit,desc")
}

/**
 * DTO de respuesta para búsqueda de proveedores
 */
export interface ResponseSupplierSearchDTO {
  content: ResponseSupplierDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  message?: string;
}
