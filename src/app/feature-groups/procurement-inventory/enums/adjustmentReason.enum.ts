/**
 * Inventory adjustment reason
 * Used when movement_type is ADJUSTMENT
 */
export enum AdjustmentReason {
  BREAKAGE = 'BREAKAGE',
  MAINTENANCE = 'MAINTENANCE',
  SALE = 'SALE',
  GIFT = 'GIFT'
}

/**
 * Translates adjustment reason enum values to Spanish labels for UI display
 * @param reason - Adjustment reason enum value
 * @returns Spanish translation of the adjustment reason
 */
export function translateAdjustmentReason(reason: string): string {
  const translations: Record<string, string> = {
    'BREAKAGE': 'Rotura',
    'MAINTENANCE': 'Mantenimiento',
    'SALE': 'Venta',
    'GIFT': 'Regalo'
  };

  return translations[reason] || reason;
}

/**
 * Returns all adjustment reasons sorted alphabetically by their Spanish translation
 * @returns Array of adjustment reason enum values sorted alphabetically
 */
export function getAdjustmentReasonsSorted(): string[] {
  const reasons = Object.values(AdjustmentReason);
  return reasons.sort((a, b) =>
    translateAdjustmentReason(a).localeCompare(translateAdjustmentReason(b), 'es')
  );
}
