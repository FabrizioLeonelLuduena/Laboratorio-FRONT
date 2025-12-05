import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  AttentionBilling,
  CashSessionPayment,
  CashPaymentResponse,
  CashPaymentResponseDto,
  CashPaymentRequestDto,
  mapCashPaymentResponseDtoToModel,
  StudyBilling,
  PaymentViewDto,
  PaymentDetails
} from '../payment-view.models';

/** PaymentsService – exclusivo para COBROS (vista de pago + registrar pago + listar pagos de sesión) */
@Injectable({ providedIn: 'root' })
export class PaymentsService {


  private readonly http = inject(HttpClient);
  private readonly apiRoot = environment.apiUrl.replace(/\/+$/u, '');
  /** Base de endpoints de pagos v1 (evita duplicar /v1 si ya viene en apiUrl) */
  private readonly paymentsBase = this.apiRoot.endsWith('/v1')
    ? `${this.apiRoot}/payments`
    : `${this.apiRoot}/v1/payments`;

  /** Construye headers con X-User-Id y opcionales (token / roles) */
  private buildHeaders(userId: number): HttpHeaders {
    let headers = new HttpHeaders({ 'X-User-Id': String(userId) });
    const token = localStorage.getItem('token');
    const roles = localStorage.getItem('roles');
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (roles) headers = headers.set('X-User-Roles', roles);
    return headers;
  }

  /**
   * Mapea la respuesta del backend al modelo AttentionBilling usado en FE.
   * Espera PaymentViewDTO (swagger): full_name, protocol_number, practices[], etc.
   * @param api - Respuesta del backend
   * @returns Modelo de dominio AttentionBilling
   */
  private mapPaymentViewDto(api: PaymentViewDto): AttentionBilling {
    const practicesRaw: any[] = Array.isArray(api?.practices) ? api.practices : [];
    const studies: StudyBilling[] = practicesRaw.map((p) => ({
      code: p?.code ?? '',
      description: p?.description ?? '',
      unitPrice: Number(p?.unitPrice ?? 0),
      coverage: Number(p?.coverage ?? 0),
      coinsurance: Number(p?.coInsurance ?? 0)
    }));
    return {
      dni: Number(api?.dni ?? 0),
      fullName: api?.fullName ?? '',
      date: api?.date ?? '',
      sucursal: api?.sucursal ?? '',
      username: api?.username ?? '',
      protocolNumber: api?.protocolNumber ?? '',
      studies,
      observations: api?.observations ?? ''
    };
  }

  /**
   * Mapea la respuesta del backend al modelo CashSessionPayment usado en FE.
   * @param api - Respuesta del backend
   * @returns Lista de CashSessionPayment
   */
  private mapSessionPaymentsDto(api: any): CashSessionPayment[] {
    const arr = Array.isArray(api) ? api : api?.payments ?? [];
    return arr.map((p: any) => {
      const amount = Number(p?.amount ?? 0);
      const status: CashSessionPayment['status'] = p?.payment_date || p?.paymentDate ? 'COMPLETED' : 'PENDING';
      return {
        paymentId: Number(p?.payment_id ?? p?.paymentId ?? 0),
        patientId: p?.patient_id ?? p?.patientId,
        cashTransactionId: p?.cash_transaction_id ?? p?.cashTransactionId,
        amount,
        paymentMethod: p?.payment_method ?? p?.paymentMethod ?? '',
        insuranceCoverage: p?.insurance_coverage ?? p?.insuranceCoverage,
        paymentDate: p?.payment_date ?? p?.paymentDate ?? null,
        status
      } as CashSessionPayment;
    });
  }

  /** GET /api/v1/payments?attention_id=&session_id= */
  getPaymentView(params: { attentionId: number; sessionId: number; userId: number; }): Observable<AttentionBilling> {
    const { attentionId, sessionId, userId } = params;
    const httpParams = new HttpParams()
      .set('attention_id', String(attentionId))
      .set('session_id', String(sessionId));
    return this.http
      .get<PaymentViewDto>(this.paymentsBase, { params: httpParams, headers: this.buildHeaders(userId) })
      .pipe(map((api) => this.mapPaymentViewDto(api)));
  }

  /** POST /api/v1/payments/cash */
  processCashPayment(request: { paymentMethod: string; amount: number; attentionId: number; userId: number; }): Observable<CashPaymentResponse> {
    const body: CashPaymentRequestDto = {
      payment_method: request.paymentMethod,
      amount: Number(request.amount.toFixed(2)),
      attention_id: request.attentionId
    };
    return this.http
      .post<CashPaymentResponseDto>(`${this.paymentsBase}`, body, { headers: this.buildHeaders(request.userId) })
      .pipe(map(mapCashPaymentResponseDtoToModel));
  }

  /** GET /api/v1/payments/session/{sessionId} */
  getPaymentsBySession(sessionId: number | string, userId: number): Observable<CashSessionPayment[]> {
    return this.http
      .get<PaymentViewDto>(`${this.paymentsBase}/session/${sessionId}`, { headers: this.buildHeaders(userId) })
      .pipe(map((api) => this.mapSessionPaymentsDto(api)));
  }

  /** Devuelve el último pago (recibo) de la sesión */
  getLastReceipt(sessionId: number | string, userId: number): Observable<CashSessionPayment | null> {
    return this.getPaymentsBySession(sessionId, userId).pipe(
      map((list) => (list.length ? list[list.length - 1] : null))
    );
  }

  /**
   * Crea una orden QR en Mercado Pago (Transferencia/QR).
   */
  processQrPayment(request: { amount: number; attentionId: number; userId: number }): Observable<CashPaymentResponse> {
    return this.processCashPayment({
      paymentMethod: 'QR',
      amount: request.amount,
      attentionId: request.attentionId,
      userId: request.userId
    });
  }

  /**
   * Cancela una orden QR en Mercado Pago.
   */
  cancelQrOrder(orderId: string, userId: number): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/v1/mercadopago/orders/${orderId}/cancel`,
      {},
      { headers: this.buildHeaders(userId) }
    );
  }

  /**
   * Gets the details of a payment by its ID.
   * Backend endpoint: GET /api/v1/payments/{id}
   * @param paymentId - The ID of the payment
   * @param userId - The ID of the current user
   * @returns Observable with the payment details
   */
  getPaymentById(paymentId: number, userId: number): Observable<PaymentDetails> {
    return this.http.get<PaymentDetails>(
      `${this.paymentsBase}/${paymentId}`,
      { headers: this.buildHeaders(userId) }
    );
  }
}
