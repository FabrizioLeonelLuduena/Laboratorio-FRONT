/**
 * Stock movement types (from backend)
 * PURCHASE: Stock purchase
 * TRANSFER: Stock transfer
 * ADJUSTMENT: Inventory adjustment
 * RETURN: Stock return
 */
export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN'
}

/**
 * Etiquetas en español para los tipos de movimiento
 */
export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.PURCHASE]: 'Entrada',
  [StockMovementType.TRANSFER]: 'Transferencia',
  [StockMovementType.ADJUSTMENT]: 'Ajuste',
  [StockMovementType.RETURN]: 'Devolución'
};

/**
 * @deprecated Usar StockMovementType en su lugar
 * Mantenido por compatibilidad temporal
 */
export const MovementType = {
  PURCHASE: StockMovementType.PURCHASE,
  TRANSFER: StockMovementType.TRANSFER,
  ADJUSTMENT: StockMovementType.ADJUSTMENT,
  RETURN: StockMovementType.RETURN
} as const;
