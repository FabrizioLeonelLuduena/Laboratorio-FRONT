import {
  PaginatedSearchResponse,
  BaseSearchFilters,
  DeactivateDTO,
  AuditFields,
  ActivableEntity,
  PaginationConstants,
  CommonValidationConstants
} from '../common.models';

/**
 * Estados de lote disponibles
 */
export enum BatchStatus {
  ACTIVE = 'Activo',
  EXPIRED = 'Vencido',
  DEPLETED = 'Agotado'
}

/**
 * Constantes de validación específicas de lotes
 */
export const BatchValidationConstants = {
  MAX_BATCH_CODE_LENGTH: 100,
  MIN_INITIAL_QUANTITY: 0.01,
  ...CommonValidationConstants,
  ...PaginationConstants
} as const;

/**
 * DTO para crear lote
 */
export interface RequestBatchDTO {
  supplyId: number;            // OBLIGATORIO, ID del insumo
  supplierId: number;          // OBLIGATORIO, ID del proveedor
  batchCode: string;           // OBLIGATORIO, máx 100 caracteres
  manufacturingDate: string;   // OBLIGATORIO, formato: "yyyy-MM-dd"
  expirationDate: string;      // OBLIGATORIO, formato: "yyyy-MM-dd"
  initialQuantity: number;     // OBLIGATORIO, decimal, mínimo 0.01
  status: BatchStatus;         // OBLIGATORIO
}

/**
 * DTO para actualizar lote
 */
export interface BatchUpdateDTO {
  supplierId?: number;          // OPCIONAL, ID del proveedor
  manufacturingDate?: string;   // OPCIONAL, formato: "yyyy-MM-dd"
  expirationDate?: string;      // OPCIONAL, formato: "yyyy-MM-dd"
  initialQuantity?: number;     // OPCIONAL, decimal, mínimo 0.01
  status?: BatchStatus;         // OPCIONAL
}

/**
 * DTO para desactivar lote
 */
export interface BatchDeactivateDTO extends DeactivateDTO {}

/**
 * DTO de respuesta para lote
 */
export interface ResponseBatchDTO extends AuditFields, ActivableEntity {
  id: number; // ID único del lote
  supplyId: number; // ID del insumo
  supplyName: string; // Nombre del insumo
  supplierId: number; // ID del proveedor
  supplierName: string; // Nombre de la compañía proveedora
  batchCode: string; // Código de lote
  manufacturingDate: string; // Fecha de fabricación, formato: "yyyy-MM-dd"
  expirationDate: string; // Fecha de vencimiento, formato: "yyyy-MM-dd"
  initialQuantity: number; // Cantidad inicial (decimal)
  status: BatchStatus; // Estado del lote
}

/**
 * DTO de respuesta para creación de lote
 */
export interface CreateBatchResponseDTO {
  message: string;              // "Lote creado correctamente!"
  batch: ResponseBatchDTO;
}

/**
 * DTO para filtros de búsqueda de lotes
 */
export interface BatchFiltersDTO extends BaseSearchFilters, ActivableEntity {
  supplyId?: number; // Filtro por ID del insumo
  supplierId?: number; // Filtro por ID del proveedor
  batchNumber?: string; // Búsqueda parcial por código de lote
  status?: BatchStatus; // Filtro por estado
  expirationDateFrom?: string; // Fecha de vencimiento desde (formato: "yyyy-MM-dd")
  expirationDateTo?: string; // Fecha de vencimiento hasta (formato: "yyyy-MM-dd")
}

/**
 * DTO de respuesta para búsqueda de lotes
 */
export interface ResponseBatchSearchDTO extends PaginatedSearchResponse<ResponseBatchDTO> {
  batches: ResponseBatchDTO[];
}
