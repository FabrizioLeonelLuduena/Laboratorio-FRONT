/**
 * Represents the filters available for requesting payment reports.
 * Used to query data from the backend report endpoints.
 */
export interface PaymentsReportRequest {
  /** Optional month filter (format: YYYY-MM). */
  month?: string;

  /** Optional start date for the report range (format: YYYY-MM-DD). */
  dateFrom?: string;

  /** Optional end date for the report range (format: YYYY-MM-DD). */
  dateTo?: string;

  /** Whether to include only payments still in progress. */
  inProgress?: boolean;

  /** Optional ID of the health insurance to filter by. */
  healthInsuranceId?: number;

  /** Optional health plan name or code. */
  plan?: string;

  /** Payment method filter: cash, transfer, or card. */
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';

  /** Optional list of payment statuses (e.g., GENERATED, PAID, REJECTED). */
  status?: string[];
}


/**
 * Represents an aggregated group in a payment report,
 * usually grouped by health insurance or plan.
 */
export interface PaymentsReportGroup {
  /** Unique identifier for the health insurance. */
  healthInsuranceId: number;

  /** Name of the health insurance. */
  healthInsuranceName: string;

  /** Optional plan name or identifier. */
  plan?: string | null;

  /** Number of payments in this group. */
  count: number;

  /** Total amount of all payments within this group. */
  groupTotal: number;
}

/**
 * Represents a single detailed record (payment) in a report.
 */
export interface PaymentsReportItem {
  /** Unique payment identifier. */
  paymentId: number;

  /** Date of the payment (ISO 8601 format or array from backend). */
  date: string;

  /** Health insurance ID related to the payment, or null if missing. */
  healthInsuranceId: number | null;

  /** Health insurance name related to the payment. */
  healthInsuranceName: string | null;

  /** Optional plan or coverage type. */
  plan: string | null;

  /** Patient name associated with the payment. */
  patient: string;

  /** List of practice or service codes included in the payment. */
  practices: string[];

  /** Payment method used (CASH, CARD, or TRANSFER). */
  paymentMethod: string;

  /** Payment base amount (before taxes or coverage). */
  amount: number;

  /** VAT or tax value applied to the payment. */
  vat: number;

  /** Final total amount of the payment. */
  totalAmount: number;

  /** Current status of the payment (e.g., GENERATED, PAID). */
  status: string;
}


/**
 * Represents the backend response for a detailed payment report.
 * Includes grouped and individual payment data, plus pagination metadata.
 */
export interface PaymentsReportResponse {
  /** List of groups (aggregations) in the report. */
  groups: PaymentsReportGroup[];

  /** List of individual payment records. */
  items: PaymentsReportItem[];

  /** Grand total sum of all payments included in the report. */
  grandTotal: number;

  /** Current page number of paginated data. */
  page: number;

  /** Page size (number of items per page). */
  size: number;

  /** Total number of items available across all pages. */
  totalItems: number;

  /** Total number of pages available. */
  totalPages: number;

  /** Optional sort field or criteria used for ordering. */
  sort?: string;
}

/**
 * Represents the summarized total amount by health insurance.
 */
export interface ObraSocialTotalItem {
  /** Health insurance name (Obra Social). */
  obraSocial: string;

  /** Total amount of all payments for this health insurance. */
  total: number;
}

/**
 * Represents the backend response for the summary report
 * (payments grouped by health insurance).
 */
export interface PaymentsSummaryReportResponse {
  /** List of summarized totals per health insurance. */
  items: ObraSocialTotalItem[];

  /** Global total amount across all health insurances. */
  granTotal: number;
}

/**
 * Maps a raw backend response to a structured `PaymentsReportResponse` object.
 *
 * @param dto The raw backend data object.
 * @returns A normalized `PaymentsReportResponse` with safe numeric conversions.
 */
export function mapPaymentsReportResponseDto(dto: any): PaymentsReportResponse {
  return {
    groups: (dto.groups ?? []).map((g: any) => ({
      healthInsuranceId: g.healthInsuranceId,
      healthInsuranceName: g.healthInsuranceName,
      plan: g.plan,
      count: g.count ?? 0,
      groupTotal: Number(g.groupTotal ?? 0)
    })),
    items: (dto.items ?? []).map((i: any) => ({
      paymentId: i.paymentId,
      date: i.date,
      healthInsuranceId: i.healthInsuranceId ?? null,
      healthInsuranceName: i.healthInsuranceName ?? null,
      plan: i.plan ?? null,
      patient: i.patient ?? '',
      practices: i.practices ?? [],
      paymentMethod: i.paymentMethod ?? '',
      amount: Number(i.amount ?? 0),
      vat: Number(i.vat ?? 0),
      totalAmount: Number(i.totalAmount ?? 0),
      status: i.status ?? ''
    })),
    grandTotal: Number(dto.grandTotal ?? 0),
    page: dto.page ?? 0,
    size: dto.size ?? 10,
    totalItems: dto.totalItems ?? 0,
    totalPages: dto.totalPages ?? 0,
    sort: dto.sort ?? ''
  };
}

/**
 * Maps a raw backend summary response to a structured
 * `PaymentsSummaryReportResponse` object.
 *
 * @param dto The raw backend summary data.
 * @returns A normalized `PaymentsSummaryReportResponse` instance.
 */
export function mapPaymentsSummaryReportResponseDto(dto: any): PaymentsSummaryReportResponse {
  return {
    items: (dto.items ?? []).map((i: any) => ({
      obraSocial: i.obraSocial ?? '',
      total: Number(i.total ?? 0)
    })),
    granTotal: Number(dto.granTotal ?? 0)
  };
}
