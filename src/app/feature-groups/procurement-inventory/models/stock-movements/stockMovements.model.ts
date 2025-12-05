/**
 * Enum for exit reason types (RETURN movements)
 * Defines the purpose of stock exits
 */
export enum ExitReason {
  CONSUMPTION = 'CONSUMPTION',           // Internal consumption (production, operations, etc.)
  SUPPLIER_RETURN = 'SUPPLIER_RETURN'    // Return to supplier (quality issues, errors, etc.)
}

/**
 * Detail item for stock movement creation
 */
export interface StockMovementDetailDTO {
  supplyId: number;                // ID del insumo (obligatorio)
  quantity: number;                 // Cantidad a mover (obligatorio)
  batchNumber?: string;            // Número de lote (opcional)
  expirationDate?: string;         // Fecha de expiración (opcional, formato: "yyyy-MM-dd")
  notes?: string;                   // Notas adicionales (opcional)
}

/**
 * DTO for creating Stock Movements (Request)
 * Basado en la especificación del backend
 */
export interface RequestStockMovementDTO {
  destinationLocationId?: number;  // Ubicación destino (obligatorio para PURCHASE, TRANSFER, ADJUSTMENT positive)
  originLocationId?: number;      // Ubicación origen (obligatorio para TRANSFER, RETURN, ADJUSTMENT negative)
  userId: number;                  // ID del usuario responsable (obligatorio)
  supplierId?: number;             // ID del proveedor (obligatorio para PURCHASE)
  reason?: string;                  // Motivo del movimiento (opcional)
  notes?: string;                   // Notas generales (opcional)
  exitReason?: ExitReason | string; // Tipo de egreso (opcional, solo para RETURN): CONSUMPTION o SUPPLIER_RETURN
  details: StockMovementDetailDTO[]; // Detalles del movimiento (al menos uno)
}

/**
 * DTO de respuesta para Movimientos de stock (Response)
 * Basado en ResponseStockMovementDTO del backend
 */
export interface ResponseStockMovementDTO {
  movementId: number;
  message: string;
  movementType: string;
  movementDate: string; // Formato: "yyyy-MM-ddTHH:mm:ss"
  supplyId: number;
  supplyName: string;
  locationId: number;
  locationName: string;
  quantity: number;
  batchNumber?: string;
  responsibleUser: string;
  currentStock: number;
  exitReason?: ExitReason | string; // Tipo de egreso (solo para RETURN/EXIT)
}

/**
 * StockMovementRespondeDTO Interface (para listados)
 * Basado en la respuesta del endpoint GET /api/v1/stock/stock-movements
 */
export interface StockMovementRespondeDTO {
  id: number;
  supply: Supply;
  batch: Batch | null;                    // Puede ser null
  quantity: number;
  movementDate: string;                  // Formato: "yyyy-MM-ddTHH:mm:ss"
  movementType: 'EXIT' | 'TRANSFER' | 'ADJUSTMENT' | 'PURCHASE' | 'RETURN';
  originLocation: Location | null;       // Puede ser null
  destinationLocation: Location | null;  // Puede ser null
  exitReason?: ExitReason | string;      // Tipo de egreso (solo para RETURN/EXIT)
  reason?: string;                        // Motivo del movimiento
}

/**
 * Batch Interface (from backend)
 * Updated according to actual backend response
 */
export interface Batch {
  id: number;
  batchNumber: string;                   // Batch number
  expirationDate: number[] | string;     // Format: [yyyy, MM, dd] or string "yyyy-MM-dd"
  isActive: boolean;                     // Batch active status
  notes?: string | null;                  // Notes (can be null) - only in some endpoints
  supplyId?: number;                     // Supply ID - only in some endpoints
  supplierId?: number;                   // Supplier ID - only in some endpoints
  supplierName?: string;                 // Supplier Name - if expanded by backend
}

/**
 * Location Interface (from backend)
 */
export interface Location {
  id: number;
  name: string;
  locationType: string;
  address: string | null;            // Can be null
  isActive: boolean;                // Added according to backend spec
}

/**
 * Supply Interface (from backend)
 */
export interface Supply {
  id: number;
  name: string;
  notes: string | null;              // Updated according to backend spec
  categoryName: string;             // Updated according to backend spec
  isActive: boolean;
}

/**
 * DTO for stock movement search filters
 */
export interface StockMovementFiltersDTO {
  searchTerm?: string;      // Global search term
  movementType?: string;    // Filter by movement type
  adjustmentReason?: string; // Filter by adjustment reason
  page?: number;             // Page number (minimum 0, default 0)
  size?: number;             // Page size (1-100, default 10)
  sort?: string;             // Sorting (e.g., "movementDate,desc" or "supply.name,asc")
}

/**
 * DTO for updating stock movement details (Request)
 * Used for editing PURCHASE movements
 */
export interface UpdateStockMovementDTO {
  quantity?: number;         // Updated quantity
  batchNumber?: string;      // Updated batch number
  expirationDate?: string;   // Updated expiration date (format: "yyyy-MM-dd")
  notes?: string;            // Updated notes
}
