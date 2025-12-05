import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, computed, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { switchMap, catchError, of } from 'rxjs';
import { BasicTableComponent } from 'src/app/shared/components/basic-table/basic-table.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
import { ColumnConfig } from 'src/app/shared/models/column-config';

import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PaymentsService } from '../application/payments.service';
import { AttentionBilling, CashPaymentResponse, CashSessionPayment } from '../payment-view.models';

/**
 * Componente para gestionar el formulario de pagos.
 * - Muestra detalles de la atención y estudios/prácticas.
 * - Permite ingresar monto a cobrar y método de pago.
 */
@Component({
  selector: 'app-payments-form',
  standalone: true,
  templateUrl: './payments-form.component.html',
  styleUrls: ['./payments-form.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericButtonComponent,
    GenericAlertComponent,
    SpinnerComponent,
    BasicTableComponent
  ]
})
export class PaymentsFormComponent implements OnInit {
  @Input() attentionId?: number;
  @Input() sessionId?: number;
  @Input() userId?: number;

  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentsService);
  private readonly destroyRef = inject(DestroyRef);
  private breadcrumbService = inject(BreadcrumbService);
  private lastLoadedKey: `${number}|${number}` | null = null;
  private router = inject(Router);


  readonly loading = signal(false);
  readonly attentionBilling = signal<AttentionBilling | null>(null);
  readonly lastMovement = signal<CashSessionPayment | null>(null);
  readonly lastPayment = signal<CashPaymentResponse | null>(null);

  readonly uiAlert = signal<UiAlert | null>(null);

  /**
   * Clears the currently displayed UI alert by setting the `uiAlert` signal to null.
   */
  private clearAlert(): void {
    this.uiAlert.set(null);
  }

  readonly observationsControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)]
  });

  readonly paymentMethodControl = new FormControl<string>('CASH', {
    nonNullable: true
  });

  readonly paidAmountControl = new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.min(0)]
  });

  readonly paymentMethodOptions = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Débito', value: 'DEBIT' },
    { label: 'Crédito', value: 'CREDIT' },
    { label: 'Transferencia / QR MP', value: 'TRANSFER' }
  ];


  readonly suggestedAmount = computed<number>(() => {
    const studies = this.attentionBilling()?.studies ?? [];
    return studies.reduce((acc, p) => acc + (p.coinsurance || 0), 0);
  });

  readonly rows = computed<PaymentPracticeRow[]>(() => {
    const studies = this.attentionBilling()?.studies ?? [];
    return studies.map((p, idx) => ({
      id: idx,
      code: p.code,
      description: p.description,
      unitPrice: this.roundToTwo(p.unitPrice),
      coverage: this.roundToTwo(p.coverage),
      coinsurance: this.roundToTwo(p.coinsurance)
    }));
  });

  readonly tableColumns: ColumnConfig[] = [
    { columnDef: 'code', header: 'Código' },
    { columnDef: 'description', header: 'Descripción' },
    { columnDef: 'unitPrice', header: 'Precio' },
    { columnDef: 'coverage', header: 'Cobertura' },
    { columnDef: 'coinsurance', header: 'Coseguro' }
  ];
  /**
   * Muestra un mensaje de error en el panel local.
   */
  private showError(msg: string): void {
    this.uiAlert.set({
      type: 'error',
      title: 'Error',
      text: msg
    });
  }

  /**
   * Muestra un mensaje de éxito en el panel local.
   */
  private showSuccess(msg: string): void {
    this.uiAlert.set({
      type: 'success',
      title: 'Operacion exitosa',
      text: msg
    });
  }

  /**
   * Muestra un mensaje de advertencia en el panel local.
   */
  private showWarn(msg: string): void {
    this.uiAlert.set({
      type: 'warning',
      title: 'Atencion',
      text: msg
    });
  }

  /**
   * Resuelve parámetros necesarios para llamadas al servicio.
   */
  private resolveParams(): {
    attentionId?: number;
    sessionId?: number;
    userId?: number;
    } {
    const q = this.route.snapshot.queryParamMap;
    const attention =
      this.attentionId ?? this.toNumOrUndefined(q.get('attention_id'));
    const session =
      this.sessionId ?? this.toNumOrUndefined(q.get('session_id'));
    const uid =
      this.userId ?? (Number(localStorage.getItem('userId')) || 1);
    return { attentionId: attention, sessionId: session, userId: uid };
  }

  /**
   * Convierte string|null a number|undefined de forma segura.
   */
  private toNumOrUndefined(value: string | null): number | undefined {
    if (value == null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  /**
   * Realiza la llamada al servicio para obtener la vista de pago.
   */
  private fetchPaymentView(attentionId: number, sessionId: number, userId: number): void {
    this.loading.set(true);
    this.clearAlert();

    this.payments.getPaymentView({ attentionId, sessionId, userId }).pipe(
      switchMap((view: AttentionBilling | null) => {
        this.attentionBilling.set(view);
        this.observationsControl.setValue(view?.observations ?? '');
        return this.payments.getLastReceipt(sessionId, userId).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (last: CashSessionPayment | null) => {
        this.lastMovement.set(last);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const backendMsg = (err.error && (err.error.message || err.error.error)) || '';
        const msg = backendMsg || err.message || 'No se pudo cargar la vista de facturación.';
        this.showError(msg);
        this.loading.set(false);
      }
    });
  }

  /**
   * Recarga la vista de pago con los parámetros actuales.
   */
  reload(): void {
    const { attentionId, sessionId, userId } = this.resolveParams();
    if (!attentionId || !sessionId || !userId) {
      this.showWarn('Faltan parámetros: attention_id, session_id o userId');
      return;
    }
    this.fetchPaymentView(attentionId, sessionId, userId);
  }

  /**
   * Procesa el pago con los datos del formulario.
   */
  submitPayment(): void {
    const amount = this.suggestedAmount();
    const method = this.paymentMethodControl.value;
    const { sessionId, attentionId, userId } = this.resolveParams();
    this.clearAlert();

    if (!amount || !sessionId || !attentionId || !userId) {
      this.showWarn('Complete monto, sesión, atención y usuario antes de continuar');
      return;
    }

    if (amount <= 0) {
      this.showWarn('El monto a cobrar debe ser mayor a 0');
      return;
    }

    if (method === 'TRANSFER') {
      this.loading.set(true);

      this.payments.processQrPayment({ amount, attentionId, userId }).subscribe({
        next: (res) => {
          if (!res || !res.orderId) {
            this.showError('No se pudo generar la orden QR.');
            this.loading.set(false);
            return;
          }

          localStorage.setItem('qr_orderId', res.orderId);
          localStorage.setItem('qr_amount', amount.toString());
          localStorage.setItem('qr_attention', attentionId.toString());
          localStorage.setItem('qr_session', sessionId.toString());

          this.router.navigate(['/billing-collections/payments/qr'], {
            queryParams: { attention_id: attentionId, session_id: sessionId }
          });

          this.loading.set(false);
        },
        error: () => {
          this.showError('No se pudo generar el QR de pago.');
          this.loading.set(false);
        }
      });

      return;
    }

    this.loading.set(true);
    const request = { paymentMethod: method, amount, attentionId, userId };

    this.payments
      .processCashPayment(request)
      .pipe(
        switchMap((resp: CashPaymentResponse | null) => {
          this.showSuccess('Pago registrado con éxito.');
          this.lastPayment.set(resp);
          this.observationsControl.reset('');
          this.paidAmountControl.reset(0);
          this.paymentMethodControl.reset('CASH');
          return this.payments.getLastReceipt(sessionId, userId).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (last: CashSessionPayment | null) => {
          this.lastMovement.set(last);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const backendMsg = (err.error && (err.error.message || err.error.error)) || '';
          const msg = backendMsg || err.message || 'No se pudo procesar el pago.';
          this.showError(msg);
          this.loading.set(false);
        }
      });
  }

  /**
   * Calcula el subtotal (suma de precios unitarios).
   */
  calculateSubtotal(): number {
    const studies = this.attentionBilling()?.studies ?? [];
    return studies.reduce((acc, p) => acc + (p.unitPrice || 0), 0);
  }

  /**
   * Calcula el total de cobertura (suma de coberturas).
   */
  calculateCoverage(): number {
    const studies = this.attentionBilling()?.studies ?? [];
    return studies.reduce((acc, p) => acc + (p.coverage || 0), 0);
  }

  /**
   * Calcula el total de coseguro (suma de coseguros).
   */
  calculateCoseguro(): number {
    const studies = this.attentionBilling()?.studies ?? [];
    return studies.reduce((acc, p) => acc + (p.coinsurance || 0), 0);
  }

  /**
   * Calcula la diferencia entre lo pagado y el total sugerido.
   */
  getDifference(): number {
    const paid = this.paidAmountControl.value ?? 0;
    if (paid === 0) return 0;
    const total = this.suggestedAmount();
    return Math.round((paid - total) * 100) / 100;
  }


  /**
   * Convierte el código del método de pago a un nombre amigable.
   */
  getFriendlyPaymentMethodName(method?: string): string {
    if (!method) return 'Desconocido';
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      TRANSFER: 'QR/MP',
      BANK: 'Transferencia'
    };
    const upper = method.toUpperCase();
    return labels[upper] || method;
  }

  /**
   * Redondea un número a dos decimales de forma segura.
   */
  private roundToTwo(value: number | null | undefined): number {
    const numeric = Number.isFinite(value) ? Number(value) : 0;
    return Math.round(numeric * 100) / 100;
  }

  /**
   * Hook del ciclo de vida Angular: `ngOnInit`
   * Se ejecuta automáticamente una vez que el componente ha sido inicializado.
   */
  ngOnInit(): void {
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Cobros' }
    ]);

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const attentionId = this.toNumOrUndefined(params.get('attention_id'));
        const sessionId = this.toNumOrUndefined(params.get('session_id'));
        const userId = Number(localStorage.getItem('userId')) || 1;

        if (!attentionId || !sessionId) {
          this.showWarn('Faltan parámetros attention_id o session_id en la URL');
          return;
        }
        if (!userId) {
          this.showWarn('Falta userId (logueate o setea localStorage.userId)');
          return;
        }

        const key = `${attentionId}|${sessionId}`;
        if (this.lastLoadedKey === key && this.attentionBilling()) {
          return;
        }
        this.fetchPaymentView(attentionId, sessionId, userId);
        this.lastLoadedKey = key as `${number}|${number}`;
      });
  }
}

/**
 * Modelo para las filas de la tabla de prácticas en el formulario de pagos.
 */
interface PaymentPracticeRow {
  id: number;
  code: string;
  description: string;
  unitPrice: number;
  coverage: number;
  coinsurance: number;
  [key: string]: string | number;
}
/**
 * Estado de alerta mostrado en el encabezado del formulario.
 */
interface UiAlert {
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
  title?: string;
}



















