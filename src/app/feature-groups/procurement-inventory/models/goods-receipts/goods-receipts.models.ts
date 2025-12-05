import { BaseFiltersDTO } from '../../shared/utils/pagination';
import { ResponseDeliveryNoteDetailDTO, RequestDeliveryNoteDetailDTO } from '../goods-receipt-details/goods-receipt-details.models';
import { ResponseSupplierDTO } from '../suppliers/suppliers.model';

/**
 * Enum de estados de notas de entrega (según backend del MD)
 */
export enum DeliveryNoteStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PARTIAL = 'PARTIAL',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

/**
 * Mapeo de estados a etiquetas en español
 */
export const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  [DeliveryNoteStatus.PENDING]: 'Pendiente',
  [DeliveryNoteStatus.RECEIVED]: 'Recibida',
  [DeliveryNoteStatus.PARTIAL]: 'Parcial',
  [DeliveryNoteStatus.RETURNED]: 'Devuelta',
  [DeliveryNoteStatus.CANCELLED]: 'Cancelada'
};

/**
 * Enum de tipos de remito (según MD)
 */
export enum DeliveryNoteType {
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER'
}

/**
 * Mapeo de tipos a etiquetas en español
 */
export const DELIVERY_NOTE_TYPE_LABELS: Record<DeliveryNoteType, string> = {
  [DeliveryNoteType.PURCHASE]: 'Compra',
  [DeliveryNoteType.TRANSFER]: 'Transferencia'
};

/**
 * DTO para crear nota de entrega
 */
export interface RequestDeliveryNoteDTO {
  status: DeliveryNoteStatus | string;
  receiptDate: string; // "yyyy-MM-dd" - REQUERIDO en backend
  notes?: string;
  purchaseOrderId: number;
  supplierId: number; // REQUERIDO en backend
  details: RequestDeliveryNoteDetailDTO[]; // REQUERIDO en backend
}

/**
 * DTO respuesta nota de entrega (extendido según MD)
 */
export interface ResponseDeliveryNoteDTO {
 id: number;
 purchaseOrderId: number;
 supplierName: string;
 status: DeliveryNoteStatus | string;
 details: ResponseDeliveryNoteDetailDTO[];
 receiptDate: string;
 deliveryNoteNumber?: string;
 notes?: string;

 // Campos nuevos del MD
 type?: DeliveryNoteType | string; // PURCHASE o TRANSFER
 purchaseOrderNumber?: string;
 originLocation?: string; // Campo del backend para ubicación de origen
 destinationLocationName?: string;
 observations?: string;
 totalAmount?: number; // Solo para compras
 stockMovementId?: number;
 stockMovementNumber?: string;
 cancellationReason?: string; // Para transferencias canceladas

 // Legacy/compatibility fields
 supplier?: ResponseSupplierDTO;
 receivedDate?: string;
 createdDateTime?: string;
 supplierId?: number;
 isActive?: boolean;
 createdDatetime?: string;
 lastUpdatedDatetime?: string;
 createdUser?: number;
 lastUpdatedUser?: number;
 createdAt?: string;
 createdBy?: string;
 updatedAt?: string;
 updatedBy?: string;

 // Campos agregados dinámicamente en el frontend
 receiptNumber?: string;
 originalStatus?: DeliveryNoteStatus | string;
 statusText?: string;
}

/**
 * DTO de respuesta para creación de nota de entrega
 */
export interface CreateDeliveryNoteResponseDTO {
  message: string;
  deliveryNote: ResponseDeliveryNoteDTO;
}

/**
 * DTO para actualizar nota de entrega
 */
export interface DeliveryNoteUpdateDTO {
  status?: DeliveryNoteStatus | string;
  receipt_date?: string;
  notes?: string;
  purchase_order_id?: number;
  supplier_id?: number;
  details?: RequestDeliveryNoteDetailDTO[];
}

/**
 * DTO de filtros para notas de entrega
 */
export interface DeliveryNoteFiltersDTO extends BaseFiltersDTO {
  searchTerm?: string;
  isActive?: boolean;
  status?: string;
  supplierId?: number;
  purchaseOrderId?: number;
  dateFrom?: string;
  dateTo?: string;
  fromDate?: string; // yyyy-MM-dd (legacy)
  toDate?: string;   // yyyy-MM-dd (legacy)
  page?: number;
  size?: number;
  sort?: string;
  exitType: string;
}

/**
 * DTO for delivery note return (external PURCHASE and internal transfers)
 * Endpoints:
 * - POST /api/v1/stock/delivery-notes/{id}/return (external - to supplier)
 * - POST /api/v1/stock/delivery-notes/{id}/return-internal (internal - between locations)
 */
export interface ReturnDeliveryNoteDTO {
  reason: string;
  userId: string;
  returnDetails: {
    deliveryNoteDetailId: number;
    quantityToReturn: number;
  }[];
}

/**
 * DTO para recepción de transferencia (según MD)
 */
export interface ReceiveTransferDTO {
  userId: string;
  observations?: string;
}

/**
 * Response de devolución de mercadería
 */
export interface ReturnMerchandiseResponseDTO {
  id: number;
  deliveryNoteNumber: string;
  status: DeliveryNoteStatus;
  type: DeliveryNoteType;
  returnMovementId: number;
  returnMovementNumber: string;
  totalReturned: number;
  totalReceived: number;
  returnPercentage: number;
  message: string;
  details: ResponseDeliveryNoteDetailDTO[];
}

// Legacy exports for backward compatibility
/**
 *
 */
export type RequestGoodsReceiptDTO = RequestDeliveryNoteDTO;
/**
 *
 */
export type ResponseGoodsReceiptDTO = ResponseDeliveryNoteDTO;
/**
 *
 */
export type CreateGoodsReceiptResponseDTO = CreateDeliveryNoteResponseDTO;
/**
 *
 */
export type GoodsReceiptUpdateDTO = DeliveryNoteUpdateDTO;
/**
 *
 */
export type GoodsReceiptFiltersDTO = DeliveryNoteFiltersDTO;
