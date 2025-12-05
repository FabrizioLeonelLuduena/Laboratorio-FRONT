/** Practice DTO returned by the backend (snake_case). */
export interface PracticeViewDto {
  /** Practice code or internal identifier. */
  code: string;

  /** Full description of the practice or procedure. */
  description: string;

  /** Unit price for the practice (gross amount). */
  unit_price: number;

  /** Amount covered by the health insurance. */
  coverage: number;

  /** Coinsurance amount paid by the patient. */
  coinsurance: number;
}

/** Payment view DTO returned by the backend. */
export interface PaymentViewDto {
  /** Patient’s national identification number (DNI). */
  dni: number;

  /** Patient’s full name. */
  full_name: string;

  /** Payment or attention date (format: YYYY-MM-DD). */
  date: string;

  /** Branch or location where the service was performed. */
  sucursal: string;

  /** Username of the operator or professional. */
  username: string;

  /** Associated protocol number. */
  protocol_number: string;

  /** List of practices performed in this attention. */
  practices: PracticeViewDto[];

  /** Additional notes or observations. */
  observations: string;
}

/** Request DTO used to retrieve the payment view. */
export interface PaymentViewRequestDto {
  /** Identifier of the attention to retrieve. */
  attention_id: number;

  /** Identifier of the cash session. */
  session_id: number;
}

/** DTO used to send a payment request to the backend. */
export interface PaymentRequestDto {
  /** Payment method (enum in backend, e.g., 'CASH', 'CARD'). */
  paymentMethod: string;

  /** Amount to be processed. */
  amount: number;

  /** Identifier of the current cash session. */
  sessionId: number;
}

/** DTO representing the backend response after processing a payment. */
export interface PaymentResponseDto {
  /** Unique transaction identifier. */
  transactionId: number;

  /** Transaction status (e.g., 'SUCCESS', 'FAILED'). */
  status: string;

  /** Backend message describing the transaction result. */
  message: string;

  /** Processed amount. */
  amount: number;

  /** Date and time of the transaction (ISO timestamp). */
  transactionDate: string;
}


/** Practice model used in the frontend domain layer (camelCase). */
export interface PracticeView {
  /** Practice code or internal identifier. */
  code: string;

  /** Full description of the practice or procedure. */
  description: string;

  /** Unit price for the practice (gross amount). */
  unitPrice: number;

  /** Amount covered by the health insurance. */
  coverage: number;

  /** Coinsurance amount paid by the patient. */
  coinsurance: number;
}

/** Payment view model used in the frontend domain layer. */
export interface PaymentView {
  /** Patient’s national identification number (DNI). */
  dni: number;

  /** Patient’s full name. */
  fullName: string;

  /** Payment or attention date (ISO format). */
  date: string;

  /** Branch or location where the service was performed. */
  sucursal: string;

  /** Username of the operator or professional. */
  username: string;

  /** Associated protocol number. */
  protocolNumber: string;

  /** List of practices performed in this attention. */
  practices: PracticeView[];

  /** Additional notes or observations. */
  observations: string;
}

/** Payment request sent from the frontend to the backend. */
export interface PaymentRequest {
  /** Payment method (enum in backend, e.g., 'CASH', 'CARD'). */
  paymentMethod: string;

  /** Amount to be processed. */
  amount: number;

  /** Identifier of the current cash session. */
  sessionId: number;
}

/** Payment response mapped to the frontend domain model. */
export interface PaymentResponse {
  /** Unique transaction identifier. */
  transactionId: number;

  /** Transaction status (e.g., 'SUCCESS', 'FAILED'). */
  status: string;

  /** Backend message describing the transaction result. */
  message: string;

  /** Processed amount. */
  amount: number;

  /** Date and time of the transaction (ISO timestamp). */
  transactionDate: string;
}


/**
 * Maps a backend `PaymentViewDto` (snake_case) to the frontend
 * domain model `PaymentView` (camelCase).
 *
 * @param dto PaymentViewDto object received from backend.
 * @returns Normalized `PaymentView` instance.
 */
export function mapPaymentViewDtoToModel(dto: PaymentViewDto): PaymentView {
  return {
    dni: dto.dni,
    fullName: dto.full_name,
    date: dto.date,
    sucursal: dto.sucursal,
    username: dto.username,
    protocolNumber: dto.protocol_number,
    practices: (dto.practices ?? []).map(mapPracticeDtoToModel),
    observations: dto.observations ?? ''
  };
}

/**
 * Maps a `PracticeViewDto` from backend format (snake_case)
 * to the frontend domain model `PracticeView`.
 *
 * @param dto PracticeViewDto received from backend.
 * @returns Normalized `PracticeView` instance.
 */
export function mapPracticeDtoToModel(dto: PracticeViewDto): PracticeView {
  return {
    code: dto.code,
    description: dto.description,
    unitPrice: dto.unit_price,
    coverage: dto.coverage,
    coinsurance: dto.coinsurance
  };
}

/**
 * Maps a backend `PaymentResponseDto` to the frontend
 * domain model `PaymentResponse`.
 *
 * @param dto PaymentResponseDto received from backend.
 * @returns Normalized `PaymentResponse` instance.
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
