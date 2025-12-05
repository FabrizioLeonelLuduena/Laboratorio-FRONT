/**
 * Modelos para Purchase Order Details
 */

/**
 * DTO para crear un detalle de orden de compra
 * 7 campos total: 6 obligatorios + unit_price opcional
 * Usar snake_case según contrato backend
 */
export interface CreatePurchaseOrderDetailDTO {
  purchase_order_id: number; // Obligatorio - la orden debe existir
  supplier_item_id: number;  // Obligatorio - referencia al item del proveedor
  quantity: number;          // Obligatorio - debe ser > 0
  unit_price?: number;       // Opcional - se autocompleta desde supplier_item si no se envía, debe ser >= 0
  // Campos opcionales - ya no son requeridos por el backend actualizado
  supply_id?: number;         // Opcional - se obtiene automáticamente del supplierItem
  unit_of_measure_id?: number; // Opcional - se obtiene automáticamente del supplierItem
  packaging_id?: number;      // Opcional - se obtiene automáticamente del supplierItem
}

/**
 * DTO para actualizar un detalle de orden de compra
 * Solo campos modificables
 */
export interface UpdatePurchaseOrderDetailDTO {
  quantity?: number;         // > 0
  unit_price?: number;       // >= 0
  supplier_item_id?: number; // Debe ser del mismo proveedor
}

/**
 * DTO de respuesta de un detalle de orden de compra
 */
export interface PurchaseOrderDetailDTO {
  id: number;
  purchase_order_id: number;
  supplier_item_id: number;
  supply_id: number;
  unit_of_measure_id: number;
  packaging_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_datetime?: string;
  last_updated_datetime?: string;
  // Relaciones expandidas (opcional)
  supply?: {
    id: number;
    name: string;
    sku?: string;
  };
  unitOfMeasure?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
  packaging?: {
    id: number;
    unitsPerPackage: number;
    uomName?: string;
    description?: string;
  };
  supplierItem?: {
    id: number;
    itemCode?: string;
    description?: string;
    unitPrice?: string;
    packaging?: {
      id: number;
      unitsPerPackage: number;
      description?: string;
    };
    unitOfMeasure?: {
      id: number;
      name: string;
      abbreviation?: string;
    };
  };
}

/**
 * Respuesta al crear un detalle
 */
export interface CreatePurchaseOrderDetailResponse {
  message: string;
  purchaseOrderDetail: PurchaseOrderDetailDTO;
}

