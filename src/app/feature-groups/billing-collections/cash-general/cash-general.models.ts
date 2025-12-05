/**
 * Estados permitidos para las cajas de caja general.
 */
export type CashBoxStatus = 'ACTIVA' | 'PAUSADA' | 'CERRADA';

/**
 * Representa la información resumida de una caja dentro de una sucursal.
 */
export interface CashRegisterBox extends Record<string, unknown> {
  id: string;
  name: string;
  user: string;
  initialAmount: number;
  currentAmount: number;
  status: CashBoxStatus;
}

/**
 * Agrupación de cajas por sucursal para la vista de Caja General.
 */
export interface CashBranchGroup {
  id: string;
  name: string;
  city: string;
  boxes: CashRegisterBox[];
}

/**
 * Tipos de movimiento soportados en la UI.
 */
export type MovementType = 'Ingreso' | 'Egreso';

/**
 * Movimiento consolidado que se mostrará en la pestaña de Movimientos.
 */
export interface CashMovementItem extends Record<string, unknown> {
  id: string;
  branchId: string;
  boxId: string;
  operation: string;
  type: MovementType;
  amount: number;
  balance: number;
  date: string;
  user: string;
}
