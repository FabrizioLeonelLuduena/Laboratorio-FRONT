import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessagesModule } from 'primeng/messages';

import { PrimeModalService } from '../../../../shared/components/modal/prime-modal.service';
import { CashMovementService } from '../application/cash-movement.service';
import { CashSessionService } from '../application/cash-session.service';
import {
  WithdrawalOperationConfig,
  WithdrawalOperationData,
  WithdrawalValidation,
  WithdrawalConfirmationData
} from '../view-models/cash-withdrawal.vm';

/**
 * @component CashWithdrawalComponent
 * @description
 * Componente responsable de registrar **extracciones de dinero (egresos)** desde la caja.
 * Permite al usuario ingresar el monto, concepto y observaciones, valida la sesión activa,
 * muestra un **modal de confirmación**, y si se aprueba, registra el movimiento vía backend.
 *
 * Flujo:
 * 1. Usuario completa el formulario.
 * 2. Se muestra modal de confirmación.
 * 3. Si confirma, se envía la extracción al backend.
 * 4. Se muestra modal de éxito y se redirige al dashboard.
 */
@Component({
  selector: 'app-cash-withdrawal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    AccordionModule,
    MessagesModule
  ],
  templateUrl: './withdrawal.component.html',
  styleUrl: './withdrawal.component.css'
})
export class CashWithdrawalComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly sessionService = inject(CashSessionService);
  private readonly movementService = inject(CashMovementService);
  private readonly modalService = inject(PrimeModalService);
  private readonly fb = inject(FormBuilder);

  readonly withdrawalViewModel = signal<{
    isSubmitting: boolean
    currentSession: any
    isSessionOpen: boolean
    isLoading: boolean
    error: string | null
    formConfig: WithdrawalOperationConfig
  }>({
    isSubmitting: false,
    currentSession: null,
    isSessionOpen: false,
    isLoading: false,
    error: null,
    formConfig: {
      type: 'withdrawal',
      title: 'Extraer Dinero',
      subtitle: 'Registre la extracción de dinero de la caja',
      amountLabel: 'Monto a Extraer',
      conceptLabel: 'Concepto de la Extracción',
      observationsLabel: 'Observaciones',
      submitButtonText: 'Extraer Dinero',
      cancelButtonText: 'Cancelar'
    }
  });

  readonly isSubmitting = computed(
    () => this.withdrawalViewModel().isSubmitting
  );
  readonly currentSession = computed(
    () => this.withdrawalViewModel().currentSession
  );
  readonly isSessionOpen = computed(
    () => this.withdrawalViewModel().isSessionOpen
  );
  readonly availableBalance = computed(
    () => this.currentSession()?.initialCash ?? 0
  );

  /** Formulario reactivo principal */
  withdrawalForm!: FormGroup;

  /** Opciones de formulario (catálogo de conceptos y métodos de pago) */
  formConfig = {
    type: 'withdrawal' as const,
    concepts: [
      { name: 'Gastos de oficina', value: 'Gastos de oficina' },
      { name: 'Compra de insumos', value: 'Compra de insumos' },
      { name: 'Pago a proveedores', value: 'Pago a proveedores' },
      { name: 'Servicios públicos', value: 'Servicios públicos' },
      { name: 'Mantenimiento', value: 'Mantenimiento' },
      { name: 'Otros gastos', value: 'Otros gastos' }
    ],
    paymentMethods: [{ label: 'Efectivo', value: 'cash' }],
    minAmount: 0.01
  };

  /**
   * Inicializa el formulario, verifica sesión activa y carga datos de la caja.
   */
  ngOnInit(): void {
    this.initializeWithdrawalForm();
    this.loadSessionData();
    this.initForm();
  }

  /**
   * Inicializa el estado base del componente.
   */
  private initializeWithdrawalForm(): void {
    this.updateViewModel({
      isSubmitting: false,
      currentSession: null,
      isSessionOpen: false,
      isLoading: false,
      error: null
    });
  }

  /**
   * Carga la sesión actual y verifica si está abierta.
   */
  private loadSessionData(): void {
    const session = this.sessionService.currentSession();
    const isOpen = this.sessionService.isSessionOpen();

    this.updateViewModel({
      currentSession: session,
      isSessionOpen: isOpen
    });
  }

  /**
   * Actualiza el estado interno del componente.
   * @param partial Objeto parcial con los nuevos valores del estado.
   */
  private updateViewModel(
    partial: Partial<{
      isSubmitting: boolean
      currentSession: any
      isSessionOpen: boolean
      isLoading: boolean
      error: string | null
    }>
  ): void {
    this.withdrawalViewModel.update((current) => ({ ...current, ...partial }));
  }

  /**
   * Inicializa el formulario reactivo y sus validaciones.
   */
  private initForm(): void {
    this.withdrawalForm = this.fb.group({
      concept: ['', Validators.required],
      amount: [
        0,
        [Validators.required, Validators.min(this.formConfig.minAmount)]
      ],
      paymentMethod: ['cash', Validators.required],
      receiptNumber: [''],
      beneficiary: [''],
      observations: ['', Validators.maxLength(250)]
    });
  }

  /** Retorna `true` si el saldo disponible es bajo (<1000). */
  shouldShowBalanceWarning(): boolean {
    return this.availableBalance() < 1000;
  }

  /** Longitud actual del campo "observaciones". */
  get observationsLength(): number {
    return this.withdrawalForm.get('observations')?.value?.length || 0;
  }

  /** Concepto seleccionado (para mostrar en el resumen). */
  get selectedConceptLabel(): string {
    return this.withdrawalForm.get('concept')?.value || 'No seleccionado';
  }

  /** Método de pago seleccionado. */
  get selectedPaymentMethodLabel(): string {
    const value = this.withdrawalForm.get('paymentMethod')?.value;
    return (
      this.formConfig.paymentMethods.find((p) => p.value === value)?.label ||
      'No seleccionado'
    );
  }

  /** Monto ingresado en el formulario. */
  get withdrawalAmount(): number {
    return this.withdrawalForm.get('amount')?.value || 0;
  }

  /**
   * Valida el formulario y solicita confirmación antes de enviar la extracción.
   * Si el usuario confirma, llama al método `processWithdrawal()`.
   */
  onSubmit(): void {
    if (!this.withdrawalForm.valid) {
      this.withdrawalForm.markAllAsTouched();
      this.modalService
        .warning(
          'Formulario incompleto',
          'Por favor complete todos los campos requeridos.'
        )
        .subscribe();
      return;
    }

    const amount = this.withdrawalForm.get('amount')?.value;
    const concept = this.withdrawalForm.get('concept')?.value;
    const availableBalance = this.availableBalance();

    if (amount > availableBalance) {
      const errorMessage = `No hay suficiente dinero en caja. Saldo disponible: $${availableBalance.toLocaleString(
        'es-AR',
        { minimumFractionDigits: 2 }
      )}`;
      this.modalService.warning('Saldo insuficiente', errorMessage).subscribe();
      return;
    }

    this.modalService
      .confirmWithDetails(
        'Confirmar Extracción',
        '¿Confirma realizar esta extracción?',
        [
          {
            label: 'Monto',
            value: `$${amount.toLocaleString('es-AR', {
              minimumFractionDigits: 2
            })}`
          },
          { label: 'Concepto', value: concept }
        ],
        'Confirmar Extracción',
        'Cancelar',
        'danger'
      )
      .subscribe({
        next: (confirmed: boolean) => {
          if (confirmed) this.processWithdrawal();
        }
      });
  }

  /**
   * Solicita confirmación antes de cancelar y volver al dashboard.
   */
  onCancel(): void {
    if (this.withdrawalForm.dirty) {
      this.modalService
        .confirm(
          'Cancelar Registro',
          '¿Está seguro que desea cancelar? Se perderán los datos ingresados.',
          'Sí, cancelar',
          'Continuar editando',
          'warn'
        )
        .subscribe({
          next: (confirmed: boolean) => {
            if (confirmed)
              this.router.navigate(['/billing-collections/dashboard']);
          }
        });
    } else {
      this.router.navigate(['/billing-collections/dashboard']);
    }
  }

  /**
   * Envía la extracción al backend, muestra un modal de éxito y redirige al dashboard.
   */
  private processWithdrawal(): void {
    this.updateViewModel({ isSubmitting: true, error: null });

    const formValue = this.withdrawalForm.value;
    const session = this.currentSession();

    if (!session) {
      this.modalService
        .error('Error', 'No hay una sesión de caja activa.')
        .subscribe();
      return;
    }

    const withdrawalData: WithdrawalOperationData = {
      amount: formValue.amount,
      concept: formValue.concept,
      observations: formValue.observations
    };

    this.movementService
      .registerWithdrawal({
        amount: withdrawalData.amount,
        concept: withdrawalData.concept
      })
      .subscribe({
        next: () => {
          this.updateViewModel({ isSubmitting: false, error: null });

          setTimeout(() => {
            this.modalService
              .success(
                '¡Extracción registrada!',
                `La extracción de $${withdrawalData.amount.toLocaleString(
                  'es-AR',
                  {
                    minimumFractionDigits: 2
                  }
                )} ha sido registrada exitosamente.`,
                true,
                2000
              )
              .subscribe({
                next: () =>
                  this.router.navigate(['/billing-collections/dashboard']),
                error: () =>
                  this.router.navigate(['/billing-collections/dashboard']) // fallback por seguridad
              });
          }, 150);
        },
        error: (error) => {
          const message =
            error?.error?.message ||
            'No se pudo registrar la extracción. Por favor intente nuevamente.';
          this.updateViewModel({ isSubmitting: false, error: message });
          this.modalService
            .error('Error al registrar extracción', message)
            .subscribe();
        }
      });
  }

  /**
   * Retorna el estado de validación del monto y el mensaje correspondiente.
   */
  getWithdrawalValidation(): WithdrawalValidation {
    const amount = this.withdrawalForm.get('amount')?.value;
    const availableBalance = this.availableBalance();

    if (!amount || amount <= 0) {
      return { isValid: false, message: 'El monto debe ser mayor a 0' };
    }
    if (amount > availableBalance) {
      return {
        isValid: false,
        message: `No hay suficiente dinero en caja. Saldo disponible: $${availableBalance.toLocaleString(
          'es-AR',
          { minimumFractionDigits: 2 }
        )}`
      };
    }
    return { isValid: true };
  }

  /**
   * Devuelve los datos principales para el modal de confirmación.
   */
  getWithdrawalConfirmationData(): WithdrawalConfirmationData | null {
    const amount = this.withdrawalForm.get('amount')?.value;
    const concept = this.withdrawalForm.get('concept')?.value;
    return amount && concept ? { amount, concept } : null;
  }

  /**
   * Limpia el mensaje de error actual.
   */
  clearError(): void {
    this.updateViewModel({ error: null });
  }

  /**
   * Selects all text in an input field when focused.
   * @param event - The focus event from the input element.
   */
  selectAll(event: any) {
    setTimeout(() => {
      event.target.select();
    });
  }
}
