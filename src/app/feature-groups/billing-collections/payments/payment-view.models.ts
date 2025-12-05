// Modelos para Payments alineados a los DTO del backend

/** DTO de práctica devuelta por el backend (snake_case). */
export interface PracticeViewDto {
  code: string;
  description: string;
  unit_price: number;
  coverage: number;
  co_insurance: number;
}

/** DTO de vista de pago devuelto por el backend. */
export interface PaymentViewDto {
  dni: number;
  fullName: string;
  date: string; // LocalDate -> 'YYYY-MM-DD'
  sucursal: string;
  username: string;
  protocolNumber: string;
  practices: PracticeViewDto[];
  observations: string;
}

/** DTO de request para obtener la vista de pago. */
export interface PaymentViewRequestDto {
  attention_id: number;
  session_id: number;
}

/** DTO para procesar un pago en el backend. */
export interface PaymentRequestDto {
  /** Método de pago (enum en backend, p. ej. 'CASH'). */
  paymentMethod: string;
  /** Importe a procesar. */
  amount: number;
  /** Identificador de la sesión de caja. */
  sessionId: number;
}

/** DTO de respuesta al procesar un pago. */
export interface PaymentResponseDto {
  transactionId: number;
  status: string; // 'SUCCESS' | 'FAILED' | etc.
  message: string;
  amount: number;
  transactionDate: string; // ISO timestamp
}

// ========== Modelos de dominio (camelCase) ==========

/** Modelo de práctica usado en el FE (camelCase). */
export interface PracticeView {
  code: string;
  description: string;
  unitPrice: number;
  coverage: number;
  copayment: number;
}

/** Modelo de vista de pago usado en el FE. */
export interface PaymentView {
  dni: number;
  fullName: string;
  date: string; // ISO date string
  sucursal: string;
  username: string;
  protocolNumber: string;
  practices: PracticeView[];
  observations: string;
}

/** Request de pago desde el FE. */
export interface PaymentRequest {
  paymentMethod: string;
  amount: number;
  sessionId: number;
}

/** Respuesta del backend al procesar un pago, mapeada al dominio FE. */
export interface PaymentResponse {
  transactionId: number;
  status: string;
  message: string;
  amount: number;
  transactionDate: string;
}
/** DTO específico para pagos en efectivo (cash). */
export interface CashPaymentRequestDto {
  payment_method: string;
  amount: number;
  attention_id: number;
}

/** Respuesta específica del backend para pagos en efectivo. */
export interface CashPaymentResponseDto {
  transaction_id: number;
  status: string;
  message: string;
  amount: number;
  transaction_date: string;
  order_id?: string;
}
/** Modelo de un estudio/práctica con información de facturación. */
export interface StudyBilling {
  code: string;
  description: string;
  unitPrice: number;
  coverage: number;
  coinsurance: number;
}

/** Modelo que representa los datos de facturación de una atención (visto en FE).
 * Proviene del endpoint `/api/payments` y contiene paciente + estudios con precios.
 */
export interface AttentionBilling {
  dni: number;
  fullName: string;
  date: string; // ISO date string
  sucursal: string;
  username: string;
  protocolNumber: string;
  studies: StudyBilling[];
  observations: string;
}

/** Request para iniciar/registrar un cobro en caja desde el FE. */
export interface CashPaymentRequest {
  paymentMethod: string;
  amount: number;
  sessionId: number;
}

/** Respuesta del backend al procesar un pago en caja, mapeada al dominio FE. */
export interface CashPaymentResponse {
  transactionId: number | null;
  status?: string;
  message?: string;
  amount?: number;
  transactionDate?: string;
  orderId?: string | null;
}

/**
 * Registro de cobro dentro de una cash-session (movimiento en la sesión de caja).
 * Mapea la estructura que devuelve `/api/v1/cash-sessions/{id}/payments`.
 */
export interface CashSessionPayment {
  paymentId: number;
  patientId?: number;
  cashTransactionId?: number;
  amount: number;
  paymentMethod: string;
  insuranceCoverage?: string;
  paymentDate?: string | null;
  // Estado derivado en FE: 'PENDING' | 'COMPLETED' | 'UNKNOWN'
  status?: 'PENDING' | 'COMPLETED' | 'UNKNOWN';
}

// ========== Mapeadores ==========

/**
 * Mapea un PaymentViewDto (snake_case) al modelo de dominio PaymentView (camelCase).
 * @param dto - DTO recibido del backend
 * @returns Modelo de dominio PaymentView
 */
export function mapPaymentViewDtoToModel(dto: PaymentViewDto): PaymentView {
  return {
    dni: dto.dni,
    fullName: dto.fullName,
    date: dto.date,
    sucursal: dto.sucursal,
    username: dto.username,
    protocolNumber: dto.protocolNumber,
    practices: (dto.practices ?? []).map(mapPracticeDtoToModel),
    observations: dto.observations ?? ''
  };
}

/**
 * Mapea una práctica en formato DTO a modelo de dominio.
 * @param dto - PracticeViewDto
 * @returns PracticeView
 */
export function mapPracticeDtoToModel(dto: PracticeViewDto): PracticeView {
  return {
    code: dto.code,
    description: dto.description,
    unitPrice: dto.unit_price,
    coverage: dto.coverage,
    copayment: dto.co_insurance
  };
}

/**
 * Mapea la respuesta de pago del backend al modelo de dominio FE.
 * @param dto - PaymentResponseDto
 * @returns PaymentResponse
 */
export function mapPaymentResponseDto(dto: PaymentResponseDto): PaymentResponse {
  return {
    transactionId: dto.transactionId,
    status: dto.status,
    message: dto.message,
    amount: dto.amount,
    transactionDate: dto.transactionDate
  };
}
/**
*  Mapea la respuesta de un pago en efectivo del backend al modelo de dominio.
* */
export function mapCashPaymentResponseDtoToModel(dto: CashPaymentResponseDto): CashPaymentResponse {
  return {
    transactionId: dto.transaction_id,
    status: dto.status,
    message: dto.message,
    amount: dto.amount,
    transactionDate: dto.transaction_date,
    orderId: dto.order_id ?? null
  };
}

// ========== Payment Details Models (for summary components) ==========

/**
 * Represents a single payment item/detail line
 */
export interface PaymentDetailItem {
  description: string;
  amount: number;
}

/**
 * Represents a payment collection method
 */
export interface PaymentCollection {
  method: string;
  amount: number;
}

/**
 * Payment totals breakdown
 */
export interface PaymentTotals {
  subtotal: number;
  iva: number;
  total: number;
}

/**
 * Complete payment details response from backend
 * Used by getPaymentById endpoint
 */
export interface PaymentDetails {
  paymentId: number;
  createdAt: string;
  status: string;
  details: PaymentDetailDto[];
  collections: PaymentCollectionDto[];
  total: number;
  iva: number;
}

/**
 * Payment detail DTO from backend (snake_case)
 */
export interface PaymentDetailDto {
  analysis_name?: string;
  description?: string;
  amount: number;
}

/**
 * Payment collection DTO from backend (snake_case)
 */
export interface PaymentCollectionDto {
  payment_method: string;
  amount: number;
}

/**
 * Payment summary data structure used in FE component
 */
export interface PaymentSummaryData {
  paymentId: number;
  date: string;
  status: string;
  items: PaymentDetailItem[];
  paymentMethods: PaymentCollection[];
  totals: PaymentTotals;
}
