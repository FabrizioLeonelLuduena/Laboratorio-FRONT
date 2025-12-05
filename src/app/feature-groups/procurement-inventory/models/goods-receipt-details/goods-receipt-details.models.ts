import { BaseFiltersDTO } from '../../shared/utils/pagination';

/**
 * DTO simplificado de batch para detalles de nota de entrega
 */
export interface SimpleBatchResponseDTO {
  id: number;
  batchNumber: string;
  expirationDate: string;
  isActive: boolean;

}

/**
 * DTO para crear detalle de nota de entrega
 */
export interface RequestDeliveryNoteDetailDTO {
  receivedQuantity: number;
  deliveryNoteId: number;
  supplierItemId: number;
  // Campos adicionales que la API espera al crear detalles
  requestedQuantity?: number;
  batchId?: number;
  batchNumber?: string | null;
  expirationDate?: string | null; // yyyy-MM-dd
  batchNotes?: string | null;

}

/**
 * DTO de respuesta de detalle de nota de entrega
 */
export interface ResponseDeliveryNoteDetailDTO {
  id: number;
  receivedQuantity: number;
  supplierItemId: number;      // Campo principal del backend
  supplierItemName: string;    // Campo principal del backend
  requestedQuantity?: number;  // Agregar esta propiedad que se usa en el servicio
  notes?: string;              // Agregar esta propiedad para el mock data
  deliveryNoteId?: number;
  supplyId?: number;
  supplyName?: string;
  supply?: {
    id?: number;
    name?: string;
  };

  productId?: number;
  productName?: string;
  batchId?: number;
  batchNumber?: string;
  batch?: SimpleBatchResponseDTO;
  expirationDate?: string;     // Fecha de vencimiento enviada directamente por el backend

  quantityReceived?: number;
  quantityOrdered?: number;
  unitPrice?: number;
  goodsReceiptId?: number;
  isActive?: boolean;
  createdDatetime?: string;
  lastUpdatedDatetime?: string;
  createdUser?: number;
  lastUpdatedUser?: number;
}

/**
 * DTO de respuesta para creación de detalle de nota de entrega
 */
export interface CreateDeliveryNoteDetailResponseDTO {
  message: string;
  deliveryNoteDetail: ResponseDeliveryNoteDetailDTO;
}

/**
 * DTO para actualizar detalle de nota de entrega
 */
export interface DeliveryNoteDetailUpdateDTO {
  receivedQuantity?: number;
  unitPrice?: number;
  batchId?: number;
}

/**
 * DTO de filtros para detalles de nota de entrega
 */
export interface DeliveryNoteDetailFiltersDTO extends BaseFiltersDTO {
  deliveryNoteId?: number;
  supplyId?: number;
  searchTerm?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// Legacy exports for backward compatibility
/**
 *
 */
export type RequestGoodsReceiptDetailDTO = RequestDeliveryNoteDetailDTO;
/**
 *
 */
export type ResponseGoodsReceiptDetailDTO = ResponseDeliveryNoteDetailDTO;
/**
 *
 */
export type CreateGoodsReceiptDetailResponseDTO = CreateDeliveryNoteDetailResponseDTO;
/**
 *
 */
export type GoodsReceiptDetailUpdateDTO = DeliveryNoteDetailUpdateDTO;
/**
 *
 */
export type GoodsReceiptDetailFiltersDTO = DeliveryNoteDetailFiltersDTO;
