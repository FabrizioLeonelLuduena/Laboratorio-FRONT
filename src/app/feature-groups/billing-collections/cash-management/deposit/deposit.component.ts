import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

import {
  CashOperationFormComponent,
  OperationFormConfig,
  OperationFormData
} from '../../../../shared/components/cash-operation-form/cash-operation-form.component';
import { PrimeModalService } from '../../../../shared/components/modal/prime-modal.service';
import { CashMovementService } from '../application/cash-movement.service';
import { CashSessionService } from '../application/cash-session.service';
import { CashRegister } from '../domain/cash-register.model';
import { DepositOperationConfig, DepositOperationData } from '../view-models/cash-deposit.vm';

/**
 * @component CashDepositComponent
 * @description
 * Componente encargado de registrar **depósitos (pagos de pacientes)** en caja.
 * - Muestra un formulario dinámico con `CashOperationFormComponent`.
 * - Solicita confirmación antes de registrar el pago.
 * - Muestra un modal de éxito y redirige automáticamente al dashboard.
 */
@Component({
  selector: 'app-cash-deposit',
  standalone: true,
  imports: [CashOperationFormComponent],
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.css']
})
export class CashDepositComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly sessionService = inject(CashSessionService);
  private readonly movementService = inject(CashMovementService);
  private readonly modalService = inject(PrimeModalService);

  /** Estado principal (signals) */
  readonly depositViewModel = signal<{
    isLoading: boolean;
    isSubmitting: boolean;
    currentCashRegister: CashRegister | null;
    formConfig: DepositOperationConfig;
    error: string | null;
  }>({
    isLoading: true,
    isSubmitting: false,
    currentCashRegister: null,
    formConfig: {
      type: 'deposit',
      title: 'Registrar Pago',
      subtitle: 'Ingrese los datos del pago del paciente',
      amountLabel: 'Monto del Pago',
      paymentMethodLabel: 'Método de Pago',
      conceptLabel: 'Concepto del Pago',
      observationsLabel: 'Observaciones',
      submitButtonText: 'Registrar Pago',
      cancelButtonText: 'Cancelar'
    },
    error: null
  });

  readonly isLoading = computed(() => this.depositViewModel().isLoading);
  readonly isSubmitting = computed(() => this.depositViewModel().isSubmitting);
  readonly currentCashRegister = computed(() => this.depositViewModel().currentCashRegister);
  readonly hasError = computed(() => this.depositViewModel().error !== null);
  readonly errorMessage = computed(() => this.depositViewModel().error);

  /** Configuración de formulario */
  formConfig: OperationFormConfig = {
    type: 'deposit',
    title: 'Registrar Pago',
    subtitle: 'Ingrese los datos del pago del paciente',
    concepts: [
      { name: 'Consulta médica' },
      { name: 'Tratamiento' },
      { name: 'Medicamentos' },
      { name: 'Estudios de laboratorio' },
      { name: 'Otros servicios' }
    ],
    showReceiptNumber: true,
    showCustomer: true,
    showQuickConcepts: true,
    allowedPaymentMethods: ['Efectivo', 'Tarjeta Debito', 'Tarjeta Credito', 'Transferencia'],
    minAmount: 0.01,
    icon: ''
  };


  /**
   *aa
   */
  ngOnInit(): void {
    this.initializeDepositForm();
    this.loadCashRegisterStatus();
  }

  /**
   *qq
   */
  private initializeDepositForm(): void {
    this.updateViewModel({
      isLoading: true,
      isSubmitting: false,
      currentCashRegister: null,
      error: null
    });
  }

  /**
   * Loads the current status of the cash register and updates the ViewModel.
   * If there is no open cash register, shows a warning modal and redirects.
   */
  private loadCashRegisterStatus(): void {
    const session = this.sessionService.currentSession();

    if (!session) {
      this.updateViewModel({
        isLoading: false,
        error: 'No hay una caja abierta. Debe abrir una caja antes de registrar pagos.'
      });

      this.modalService
        .warning(
          'Caja cerrada',
          'No hay una caja abierta. Debe abrir una caja antes de registrar pagos.'
        )
        .subscribe(() => this.router.navigate(['/billing-collections']));
    } else {
      this.updateViewModel({
        isLoading: false,
        currentCashRegister: session,
        error: null
      });
    }
  }

  /**
   * qq
   */
  private updateViewModel(partial: Partial<{
    isLoading: boolean;
    isSubmitting: boolean;
    currentCashRegister: CashRegister | null;
    error: string | null;
  }>): void {
    this.depositViewModel.update(current => ({
      ...current,
      ...partial
    }));
  }

  /**
   * Muestra una modal de confirmación antes de registrar el depósito.
   * Si el usuario confirma, llama a `processDeposit()`.
   */
  onFormSubmit(formData: OperationFormData): void {
    const depositData: DepositOperationData = {
      amount: formData.amount,
      paymentMethod: formData.paymentMethod,
      concept: formData.concept,
      observations: formData.observations,
      patientInfo: formData.customer ? { id: '', name: formData.customer } : undefined
    };

    this.modalService
      .confirmWithDetails(
        'Confirmar Pago',
        '¿Confirma registrar este pago?',
        [
          { label: 'Monto', value: `$${depositData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` },
          { label: 'Método', value: depositData.paymentMethod },
          { label: 'Concepto', value: depositData.concept }
        ],
        'Confirmar Pago',
        'Cancelar',
        'primary'
      )
      .subscribe((confirmed: boolean) => {
        if (confirmed) this.processDeposit(depositData);
      });
  }

  /**
   * Pide confirmación antes de cancelar el registro del pago.
   */
  onFormCancel(): void {
    this.modalService
      .confirm(
        'Cancelar registro',
        '¿Está seguro que desea cancelar? Se perderán los datos ingresados.',
        'Sí, cancelar',
        'Continuar editando',
        'warn'
      )
      .subscribe((confirmed: boolean) => {
        if (confirmed) this.router.navigate(['/billing-collections/dashboard']);
      });
  }

  /**
   * Envía los datos del depósito al backend, muestra un modal de éxito
   * y redirige automáticamente al dashboard tras unos segundos.
   */
  private processDeposit(depositData: DepositOperationData): void {
    this.updateViewModel({ isSubmitting: true, error: null });

    // El servicio espera { paymentMethod, amount, concept }
    const backendData = {
      paymentMethod: depositData.paymentMethod,
      amount: depositData.amount,
      concept: depositData.concept
    };

    this.movementService.registerDeposit(backendData).subscribe({
      next: () => {
        this.updateViewModel({ isSubmitting: false, error: null });

        // Pequeño delay para evitar colisiones visuales con el modal anterior
        setTimeout(() => {
          this.modalService.success(
            '¡Pago registrado!',
            `El depósito de $${depositData.amount.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} ha sido registrado exitosamente.`,
            true, // auto-close
            2000 // 2 segundos
          ).subscribe({
            next: () => this.router.navigate(['/billing-collections/dashboard']),
            error: () => this.router.navigate(['/billing-collections/dashboard']) // fallback seguro
          });
        }, 150);
      },
      error: (error) => {
        const errorMessage =
          error?.error?.message ||
          'No se pudo registrar el pago. Por favor, intente nuevamente.';

        this.updateViewModel({ isSubmitting: false, error: errorMessage });

        this.modalService.error(
          'Error al registrar pago',
          errorMessage
        ).subscribe();
      }
    });
  }
}

