/**
 * DTO representing a cash session response from backend
 */
export interface CashSessionDto {
  sessionId: number;      // ← Matches backend
  userId: number;
  cashRegisterId: number;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  finalCash?: number;
  status: SessionStatus;
}

/**
 * Session status enum (backend format)
 */
export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

/*
Enum que representa los métodos de pago disponibles.*/
export enum BackendPaymentMethod {
  CASH = 'CASH', // Efectivo
  DEBIT_CARD = 'DEBIT_CARD', // Tarjeta de débito
  CREDIT_CARD = 'CREDIT_CARD', // Tarjeta de crédito
  TRANSFER = 'TRANSFER', // Transferencia bancaria
}

/*
Enum que indica el tipo de transacción realizada.*/
export enum TransactionType {
  INFLOW = 'INFLOW', // Entrada de dinero
  OUTFLOW = 'OUTFLOW', // Salida de dinero
}

/**

 DTO de respuesta al registrar un depósito.
 @property transactionId - ID de la transacción.
 @property cashSessionId - ID de la sesión de caja.
 @property transactionType - Tipo de transacción (entrada).
 @property paymentMethod - Método de pago utilizado.
 @property amount - Monto depositado.
 @property reason - Motivo del depósito.
 @property transactionDate - Fecha de la transacción.
 @property canceled - Indica si fue cancelada.
 @property newBalance - Nuevo balance de caja.*/
export interface DepositResponseDTO {
  transactionId: number;
  cashSessionId: number;
  transactionType: TransactionType;
  paymentMethod: BackendPaymentMethod;
  amount: number;
  reason: string;
  transactionDate: string;
  canceled: boolean;
  newBalance: number;
}

/**
DTO para registrar una salida de dinero en caja.
  @property cashSessionId - ID de la sesión de caja.
  @property amount - Monto a retirar.
  @property description - Motivo o detalle del retiro.
  @property authorizedBy - ID del usuario que autoriza la salida.*/
export interface CashOutflowRequest {
  cashSessionId: number;
  amount: number;
  description: string;
  authorizedBy: number;
}

/**

DTO de respuesta al registrar una salida de dinero.
  @property id - ID de la transacción de salida.
  @property message - Mensaje de confirmación o estado.*/
export interface CashOutflowResponse {
  id: number;
  message: string;
}

