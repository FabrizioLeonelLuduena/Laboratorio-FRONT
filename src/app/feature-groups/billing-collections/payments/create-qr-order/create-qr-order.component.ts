import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import QRCode from 'qrcode';
import { finalize } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';


/**
 * Componente que genera y muestra un pago QR mediante /api/v1/payments,
 * permitiendo también su cancelación manual.
 */
@Component({
  selector: 'app-create-qr-order',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, CardModule, ButtonModule],
  templateUrl: './create-qr-order.component.html',
  styleUrl: './create-qr-order.component.css'
})
export class CreateQrOrderComponent implements OnInit {
  private readonly testHeaders = new HttpHeaders({
    'X-User-Id': '1',
    'X-User-Roles': 'ADMINISTRADOR'
  });
  /** Señales reactivas */
  readonly qrData = signal<string | null>(null);
  readonly qrImageUrl = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly amount = signal<number>(0);
  readonly attentionId = signal<number | null>(null);
  readonly sessionId = signal<number | null>(null);
  readonly orderId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  /**
   * constructor
   */
  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private breadcrumbService: BreadcrumbService
  ) {}

  /**
   * Inicializa el componente y genera la orden QR.
   */
  ngOnInit(): void {
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Cobros', routerLink: '/billing-collections/payments' },
      { label: 'QR' }
    ]);

    const storedAmount = localStorage.getItem('qr_amount');
    const storedAttention = localStorage.getItem('qr_attention');
    const storedSession = localStorage.getItem('qr_session');

    // 🔹 Asegura que el monto tenga solo 2 decimales válidos
    const rawAmount = parseFloat(storedAmount ?? '0');
    const formattedAmount = Number(rawAmount.toFixed(2));

    const attentionId = Number(storedAttention ?? 0);
    const sessionId = Number(storedSession ?? 0);

    this.amount.set(formattedAmount);
    this.attentionId.set(attentionId);
    this.sessionId.set(sessionId);

    if (!formattedAmount || !attentionId) {
      this.errorMessage.set('Faltan datos para generar el QR.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    this.http
      .post<any>(
        `${environment.apiUrl}/v1/payments`,
        {
          payment_method: 'QR',
          amount: formattedAmount,
          attention_id: attentionId
        },
        { headers: this.testHeaders }
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: async (res) => {
          const orderId = res?.order_id || null;
          const paymentId = res?.transaction_id || null;

          this.orderId.set(orderId);

          if (orderId) {
            const qrPayload = res?.qr_data || res?.order_id;
            const qrUrl = await QRCode.toDataURL(qrPayload, { width: 250 });
            this.qrData.set(qrPayload);
            this.qrImageUrl.set(qrUrl);

            localStorage.setItem('qr_orderId', orderId);
            if (paymentId) {
              localStorage.setItem('qr_paymentId', paymentId.toString());
            }
          } else {
            this.errorMessage.set('No se recibió un order_id válido del servidor.');
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo generar el QR. Intente nuevamente.');
        }
      });
  }


  /**
   * Cancela manualmente la orden QR actual llamando al backend.
   */
  cancelOrder(): void {
    const paymentId = Number(localStorage.getItem('qr_paymentId'));
    const userId = Number(localStorage.getItem('user_id') ?? 1);

    if (!paymentId) {
      this.errorMessage.set('No se encontró el ID del pago para cancelar.');
      return;
    }

    if (!confirm('¿Seguro que deseas cancelar este pago QR?')) return;

    this.isLoading.set(true);

    this.http
      .post(
        `${environment.apiUrl}/v1/payments/${paymentId}/cancel`,
        '"QR"',
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'X-User-Id': String(userId),
            'X-User-Roles': 'ADMINISTRADOR'
          })
        }
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ( ) => {
          alert('Pago QR cancelado correctamente.');
          this.clearLocalStorage();
          this.navigateBack();
        },
        error: () => {
          this.errorMessage.set('No se pudo cancelar el pago. Intente nuevamente.');
        }
      });
  }


  /**
   * Regresa a la vista principal de pagos.
   */
  returnToPayments(): void {
    this.clearLocalStorage();
    this.navigateBack();
  }

  /**
   * Redirige a la pantalla principal de cobros.
   */
  private navigateBack(): void {
    const attentionId = this.attentionId() || 1;
    const sessionId = this.sessionId() || 1;

    this.router.navigate(['/billing-collections/payments'], {
      queryParams: {
        attention_id: attentionId,
        session_id: sessionId
      }
    });
  }

  /**
   * Limpia los datos temporales del localStorage.
   */
  private clearLocalStorage(): void {
    localStorage.removeItem('qr_data');
    localStorage.removeItem('qr_amount');
    localStorage.removeItem('qr_attention');
    localStorage.removeItem('qr_orderId');
    localStorage.removeItem('qr_session');
  }
}
