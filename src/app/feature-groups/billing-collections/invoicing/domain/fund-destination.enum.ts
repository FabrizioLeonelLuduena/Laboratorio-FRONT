/**
 * Enum for Fund Destination (Destino Fondo)
 */
export enum FundDestination {
  CAJA_GENERAL = 'CAJA_GENERAL',
  CAJA_CHICA = 'CAJA_CHICA',
  BANCO_CUENTA_CORRIENTE = 'BANCO_CUENTA_CORRIENTE',
  BANCO_CAJA_AHORRO = 'BANCO_CAJA_AHORRO',
  INVERSIONES = 'INVERSIONES',
  OTRO = 'OTRO'
}

/**
 * Labels for displaying fund destinations in UI
 */
export const FUND_DESTINATION_LABELS: Record<FundDestination, string> = {
  [FundDestination.CAJA_GENERAL]: 'General cash desk',
  [FundDestination.CAJA_CHICA]: 'Petty cash',
  [FundDestination.BANCO_CUENTA_CORRIENTE]: 'Bank - Checking account',
  [FundDestination.BANCO_CAJA_AHORRO]: 'Bank - Savings account',
  [FundDestination.INVERSIONES]: 'Investments',
  [FundDestination.OTRO]: 'Other'
};
