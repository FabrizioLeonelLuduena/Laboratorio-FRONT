/**
 * Represents an invoice line item, including description, quantity, pricing, VAT, and discounts.
 * Used to create or update items within an invoice request.
 * Links to an account plan and specifies the unit of measure.
 */
export interface InvoiceItemRequest {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountPercentage: number;
  accountPlanId: string;
  unitOfMeasure: string;
}

/**
 * Represents a payment entry within an invoice, detailing method, account, and optional bank info.
 * Supports checks, transfers, and other payment types with validation data.
 * Includes amount and optional fields like bank, check number, and validity date.
 */
export interface InvoicePaymentRequest {
  paymentMethodId: string;
  accountPlanId: string;
  bank?: string;
  checkNumber?: string;
  validityDate?: string;
  amount: number;
}

/**
 * Represents a complete invoice creation payload with header, customer, and financial details.
 * Includes metadata such as type, dates, numbering, currency, and payment conditions.
 * Contains itemized products/services and associated payments for accurate accounting.
 * Used to register new invoices in the system and link them to customers and companies.
 */
export interface InvoiceCreationRequest {
  kind: string;
  description: string;
  invoiceDate: string;
  paymentDate: string;
  paymentCondition: string;
  paymentType: string;
  customerId: string;
  companyId: string;
  currencyId: string;
  invoiceNumberPrefix: string;
  invoiceNumber: string;
  taxableSubtotal: number;
  nonTaxableSubtotal: number;
  totalVat: number;
  grandTotal: number;
  items: InvoiceItemRequest[];
  payments: InvoicePaymentRequest[];
}

/**
 * Represents an analysis item with its unique identifier and authorization status.
 * Used to indicate whether a specific analysis is approved or pending.
 * Typically included in requests or responses related to lab or invoice operations.
 */
export interface ItemDto {
  analysisId: number; // Renamed from analysisId
  authorized: boolean; // Renamed from authorized
}

/**
 * Represents a pricing request linked to a specific plan and its associated analyses.
 * Contains the plan identifier and a list of items to evaluate or authorize.
 * Used to calculate or update pricing based on selected analyses.
 */
export interface PricingRequestDto {
  id_plan: number;
  items: ItemDto[];
}

/**
 * Represents the calculation result for a specific analysis or item within a plan.
 * Includes plan, insurer, and coverage details along with monetary breakdowns.
 * Provides amounts covered by insurance, patient responsibility, and calculation metadata.
 */
export interface CalculateItemResultDTO {
  planName?: string;
  insurerName?: string;
  coverageId?: number;
  analysisId?: number;
  totalAmount?: number;
  coveredAmount?: number;
  patientAmount?: number;
  ubValue?: number;
  ubUsed?: number;
  nbuUsed?: number;
  ubSource?: string;
  nbuVersionId?: number;
  note?: string;
}

/**
 * Represents the response for a medical attention or admission record.
 * Includes identifiers for patient, doctor, insurance plan, and related authorizations.
 * Provides state, urgency, dates, and administrative details for tracking the attention process.
 * Used to manage and display medical attentions within the system.
 */
export interface AtentionResponse {
  attentionId: number;
  insurancePlanId: number;
  analysisAuthorizations: ItemDto[];
  attentionState?: string;
  attentionNumber?: string;
  branchId?: number;
  admissionDate?: number[];
  patientId?: number;
  doctorId?: number;
  indications?: string;
  authorizationNumber?: number;
  isUrgent?: boolean;
  paymentId?: number | null;
  employeeId?: number | null;
  attentionBox?: string | null;
  observations?: string | null;
}

/**
 * Represents a single analysis item with financial details and selection state.
 * Includes total, covered, and patient amounts to reflect billing distribution.
 * Used in medical or laboratory contexts to track and select specific analyses.
 */
export interface AnalysisItem {
  description: string;
  totalAmount: number;
  coveredAmount: number;
  patientAmount: number;
  selected: boolean;
}

/**
 * Represents a patient's basic personal information.
 * Includes full name, national ID, birth date, and contact number.
 * Used for patient identification and registration in medical records.
 */
export interface Patient {
  name: string;
  dni: string;
  birthDate: string;
  phone: string;
}


/**
 * Represents a payment request associated with a specific medical attention.
 * Includes detailed payment breakdowns, collection methods, and applicable VAT.
 * Used to register or process payments within the billing system.
 */
export interface PaymentRequestDTO {
  attentionId: number;
  details: PaymentDetailRequestDTO[];
  collections: CollectionRequestDTO[];
  iva: number;
  copayment: number;
}

/**
 * Represents the detail of a specific analysis within a payment request.
 * Indicates whether the analysis is covered by insurance and its coverage ID.
 * Used to calculate billing and reimbursement information.
 */
export interface PaymentDetailRequestDTO {
  analysisId: number;
  isCovered: boolean;
  coverageId: number;
}

/**
 * Represents a collection entry specifying how a payment was received.
 * Includes amount, payment method, and optional receipt or account reference.
 * Used to record and track payment collections within the system.
 */
export interface CollectionRequestDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  accountId?: number;
}

/**
 * Enumerates the supported payment methods available in the system.
 * Used to categorize and process transactions based on their payment type.
 * Includes options such as cash, QR, POS terminal, credit/debit card, and transfer.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  QR = 'QR',
  POSNET = 'POSNET',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TRANSFER = 'TRANSFER'
}

/**
 * Represents the response data for a specific payment detail entry.
 * Includes analysis and coverage identifiers along with coverage status.
 * Used to return payment breakdown information after processing.
 */
export interface PaymentDetailResponseDTO {
  paymentDetailId: number;
  coverageId?: number;
  analysisId: number;
  isCovered: boolean;
}

/**
 * Represents the response data for a processed payment transaction.
 * Includes payment identifiers, status, message, and financial details.
 * Contains totals, optional QR or order data, and associated payment details.
 */
export interface PaymentResponseDTO {
  paymentId: number;
  status: string;
  message: string;
  copayment: number;
  iva: number;
  orderId?: string;
  paymentDate: string;
  qrData?: string;
  accountId?: number;
  details: PaymentDetailResponseDTO[];
}
/**
 * Represents a basic analysis entity with identification and descriptive data.
 * Includes unique ID, name, description, and code for referencing analyses.
 * Used to display or retrieve analysis information within medical or billing systems.
 */
export interface AnalysisResponse {
  id: number;
  name: string;
  description: string;
  code: string;
}



