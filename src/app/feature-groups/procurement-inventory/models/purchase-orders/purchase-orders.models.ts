import { BaseFiltersDTO } from '../../shared/utils/pagination';
import { PurchaseOrderDetailDTO } from '../purchase-order-details/purchase-order-details.models';
import { ResponseSupplierDTO } from '../suppliers/suppliers.model';

/**
 * Enum of purchase order states (according to backend)
 */
export enum PurchaseOrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

/**
 * Mapping of states to labels in Spanish (en mayúsculas)
 */
export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.PENDING]: 'PENDIENTE',
  [PurchaseOrderStatus.APPROVED]: 'ENVIADA',
  [PurchaseOrderStatus.RECEIVED]: 'RECIBIDA',
  [PurchaseOrderStatus.CANCELLED]: 'CANCELADA'
};

/**
 * DTO to create a purchase order (according to backend specifications)
 * Backend espera los campos en snake_case
 * NOTA: order_date es OPCIONAL - si no se envía, el backend usa la fecha actual automáticamente
 */
export interface RequestPurchaseOrderDTO {
  order_date?: string;       // Format: YYYY-MM-DD (ISO date) - OPCIONAL, backend asigna fecha actual si no se envía
  supplier_id: number;       // Supplier ID (required)
  /** @deprecated Status is always PENDING when creating. This field is ignored by backend. */
  status?: PurchaseOrderStatus; // Ignorado - siempre será PENDING
  destination_location_id?: number; // Location ID donde llegarán los insumos (opcional)
  notes?: string;            // Optional notes
}

/**
 * Response DTO with the data of a purchase order
 */
export interface ResponsePurchaseOrderDTO {
  id: number;
  purchaseOrderNumber: string, //Secuential purchase order number
  orderDate: string;        // Order date in ISO format
  status: string;            // State: PENDING | SENT | RECEIVED | CANCELLED
  notes?: string;            // Optional notes
  cancellationReason?: string; // Motivo de cancelación (solo si status === 'CANCELLED')
  supplier: ResponseSupplierDTO; // Supplier data
  destinationLocation?: {    // Ubicación donde llegarán los insumos (opcional)
    id: number;
    name: string;
    address?: string;
  };
  details?: PurchaseOrderDetailDTO[]; // Details (can be empty or null)
  created_datetime: string;  // Creation timestamp
  last_updated_datetime: string; // Last update timestamp
  created_user: number;      // Creation user ID
  last_updated_user: number; // Last update user ID
  is_active: boolean;        // Active/inactive state
}

/**
 * Response DTO for purchase order creation
 */
export interface CreatePurchaseOrderResponseDTO {
  message: string;
  purchaseOrder: ResponsePurchaseOrderDTO;
}

/**
 * DTO to update a purchase order (according to backend)
 * Uses camelCase - the case-converter interceptor will convert to snake_case automatically
 * Backend expects: status, notes, destination_location_id, cancellation_reason
 */
export interface PurchaseOrderUpdateDTO {
  status?: string;  // Order state (PENDING, SENT, RECEIVED, CANCELLED)
  notes?: string;   // Order notes
  destinationLocationId?: number; // Ubicación destino (opcional)
  cancellationReason?: string; // Motivo de cancelación (obligatorio si status === 'CANCELLED')
}

/**
 * DTO to deactivate a purchase order
 */
export interface PurchaseOrderDeactivateDTO {
  reason: string;  // Deactivation reason (required)
}

/**
 * DTO for purchase order search filters
 */
export interface PurchaseOrderFiltersDTO extends BaseFiltersDTO {
  searchTerm?: string;
  isActive?: boolean;
  status?: string;
  page?: number;            // Page number (minimum 0, default 0)
  size?: number;            // Page size (1-100, default 10)
  sort?: string;
}
