/**
 * Modelos comunes compartidos entre todos los módulos de procurement-inventory
 */

/**
 * Error de API estándar
 */
export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  path: string;
}

/**
 * Información de paginación para respuestas
 */
export interface PaginationInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
  hasContent: boolean;
}

/**
 * Constantes de paginación
 */
export const PaginationConstants = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
} as const;

/**
 * DTO genérico para desactivación de entidades
 */
export interface DeactivateDTO {
  reason: string; // OBLIGATORIO, motivo de desactivación
  userId?: number; // OPCIONAL, ID del usuario que realiza la desactivación
}

/**
 * Interfaz base para filtros de búsqueda paginada
 */
export interface BaseSearchFilters {
  page?: number; // Número de página (empieza en 0)
  size?: number; // Tamaño de página (min: 1, max: 100)
  sortBy?: string; // Campo para ordenar
  sortDirection?: 'asc' | 'desc'; // Dirección (asc | desc)
}

/**
 * Respuesta genérica de búsqueda paginada
 */
export interface PaginatedSearchResponse<_T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  message?: string;
}

/**
 * Campos de auditoría comunes
 */
export interface AuditFields {
  created_date_time: string | null; // Formato: "yyyy-MM-dd HH:mm:ss" o null si no disponible
  last_updated_date_time: string | null; // Formato: "yyyy-MM-dd HH:mm:ss" o null si no disponible
  created_user: number | null; // ID del usuario creador o null si no disponible
  last_updated_user: number | null; // ID del último usuario que modificó o null si no disponible
}

/**
 * Interfaz base para entidades con estado activo/inactivo
 */
export interface ActivableEntity {
  isActive: boolean;
}

/**
 * Constantes de validación comunes
 */
export const CommonValidationConstants = {
  MAX_REASON_LENGTH: 255,
  MAX_NAME_LENGTH: 150,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_ADDRESS_LENGTH: 200
} as const;
