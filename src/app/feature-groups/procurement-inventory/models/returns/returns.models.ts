/**
 * DTO para crear un ítem de devolución
 */
export interface ReturnItemRequestDTO {
  purchaseOrderDetailId: number;
  returnQuantity: number;
  reason: string;
}

/**
 * DTO para crear una devolución
 */
export interface CreateReturnRequestDTO {
  purchaseOrderId: number;
  items: ReturnItemRequestDTO[];
}

/**
 * DTO de respuesta de ítem de devolución
 */
export interface ReturnItemResponseDTO {
  id: number;
  quantity: number;
  reason: string;
  supplierItemName: string;
}

/**
 * DTO de respuesta de devolución
 */
export interface CreateReturnResponseDTO {
  id: number;
  returnNumber: string;
  status: string;
  createdAt: string;
  items: ReturnItemResponseDTO[];
}

/**
 * DTO para los datos del formulario de devolución
 */
export interface ReturnFormItemDTO {
  deliveryNoteDetailId: number;
  productName: string;
  batchNumber: string;
  receivedQuantity: number;
  returnQuantity: number;
  reason: string;
  selected: boolean;
}

