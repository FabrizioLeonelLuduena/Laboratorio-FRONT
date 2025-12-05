import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  Output,
  EventEmitter
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { Textarea } from 'primeng/textarea';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { CashMovementService } from '../application/cash-movement.service';
import { CashRegisterService } from '../application/cash-register.service';
import { CashSessionService } from '../application/cash-session.service';
import { CashSummaryService } from '../application/cash-summary.service';

/**
 * Representa un detalle mostrado en el modal de confirmación.
 */
interface ConfirmModalDetail {
  label: string;
  value: string;
}

/**
 * Datos usados para mostrar el modal de confirmación.
 */
interface ConfirmModalData {
  title: string;
  message: string;
  details?: ConfirmModalDetail[];
  severity?: string;
}

/**
 * Data used to display the cancellation modal.
 */
interface CancelModalData {
  title: string;
  message: string;
  severity?: string;
}

/**
 * @component CashFormComponent
 * @description
 * Unified component for registering cash operations (withdrawals and deposits).
 * Uses @Input() type to switch behavior between 'extraction' and 'deposit'.
 *
 * Features:
 * - Full reactive form with validations.
 * - Confirmation via custom ConfirmationModal.
 * - Notifications via GenericAlertComponent.
 * - Active session and available balance validation.
 * - Automatic navigation after successful operation.
 */
@Component({
  selector: 'app-cash-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    AccordionModule,
    TabViewModule,
    GenericButtonComponent,
    ConfirmationModalComponent,
    GenericAlertComponent,
    Textarea
  ],
  templateUrl: './cash-form.component.html',
  styleUrl: './cash-form.component.css'
})
export class CashFormComponent implements OnInit {
  @Output() operationCompleted = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sessionService = inject(CashSessionService);
  private readonly movementService = inject(CashMovementService);
  private readonly registerService = inject(CashRegisterService);

  showConfirmModal = false;
  showCancelModal = false;
  fromMain = signal<boolean>(false);
  mainRegisterBalance = signal<number>(0);

  confirmModalData: ConfirmModalData | null = null;
  cancelModalData: CancelModalData | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly summaryService = inject(CashSummaryService);
  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);

  readonly alert = signal<{
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    text: string
  } | null>(null);

  /** Active Tab: 0 = Extraction, 1 = Deposit */
  activeTabIndex = 0;

  readonly viewModel = signal<{
    isSubmitting: boolean
    currentSession: any
    isLoading: boolean
    error: string | null
  }>({
    isSubmitting: false,
    currentSession: null,
    isLoading: false,
    error: null
  });

  readonly isSubmitting = computed(() => this.viewModel().isSubmitting);
  readonly currentSession = computed(() => this.viewModel().currentSession);
  /*readonly availableBalance = computed(() => this.currentSession()?.initialCash ?? 0);*/
  readonly summary = this.summaryService.summary;
  readonly availableBalance = computed(() =>
    this.fromMain() ? this.mainRegisterBalance() : (this.summary()?.totalCash ?? 0)
  );

  /**
   * Details prepared for the confirmation modal template.
   */
  get confirmModalDetails(): ConfirmModalDetail[] {
    return this.confirmModalData?.details ?? [];
  }

  /** Reactive forms for each operation type */
  extractionForm!: FormGroup;
  depositForm!: FormGroup;

  /** Gets the active form based on the selected tab */
  get activeForm(): FormGroup {
    return this.activeTabIndex === 0 ? this.extractionForm : this.depositForm;
  }

  /** Gets the operation type based on the active tab */
  get currentOperationType(): 'extraction' | 'deposit' {
    return this.activeTabIndex === 0 ? 'extraction' : 'deposit';
  }

  /** Dynamic configuration based on operation type */
  get config() {
    return this.currentOperationType === 'extraction'
      ? {
        title: 'Registrar extracción',
        subtitle: 'Registre los egresos de dinero',
        icon: 'pi-minus-circle',
        iconColor: 'var(--brand-warn)',
        amountLabel: 'Monto de extracción',
        conceptLabel: 'Concepto de extracción',
        submitButtonText: 'Registrar extracción',
        submitButtonIcon: 'pi-check-circle',
        submitButtonSeverity: 'success' as const,
        chipLabel: 'Extracción',
        chipClass: 'chip-withdrawal',
        amountClass: 'amount-withdrawal-large',
        amountPrefix: '-',
        highlightClass: 'summary-item-highlighted-withdrawal',
        concepts: [
          { name: 'Gastos de oficina', value: 'Gastos de oficina' },
          { name: 'Compra de insumos', value: 'Compra de insumos' },
          { name: 'Pago a proveedores', value: 'Pago a proveedores' },
          { name: 'Servicios públicos', value: 'Servicios públicos' },
          { name: 'Mantenimiento', value: 'Mantenimiento' },
          { name: 'Otros gastos', value: 'Otros gastos' }
        ],
        confirmTitle: 'Confirmar extracción',
        confirmMessage: '¿Confirma realizar esta extracción?',
        confirmButton: 'Confirmar extracción',
        confirmSeverity: 'danger' as const,
        successTitle: '¡Extracción registrada!',
        errorTitle: 'Error al registrar extracción'
      }
      : {
        title: 'Registrar depósito',
        subtitle: 'Ingrese los datos del depósito',
        icon: 'pi-plus-circle',
        iconColor: 'var(--brand-success)',
        amountLabel: 'Monto del depósito',
        conceptLabel: 'Concepto del depósito',
        submitButtonText: 'Registrar depósito',
        submitButtonIcon: 'pi-check-circle',
        submitButtonSeverity: 'success' as const,
        chipLabel: 'Depósito',
        chipClass: 'chip-deposit',
        amountClass: 'amount-deposit-large',
        amountPrefix: '+',
        highlightClass: 'summary-item-highlighted-deposit',
        concepts: [
          { name: 'Consulta médica', value: 'Consulta médica' },
          { name: 'Tratamiento', value: 'Tratamiento' },
          { name: 'Medicamentos', value: 'Medicamentos' },
          {
            name: 'Estudios de laboratorio',
            value: 'Estudios de laboratorio'
          },
          { name: 'Otros servicios', value: 'Otros servicios' }
        ],
        confirmTitle: 'Confirmar depósito',
        confirmMessage: '¿Confirma registrar este depósito?',
        confirmButton: 'Confirmar depósito',
        confirmSeverity: 'success' as const,
        successTitle: '¡Depósito registrado!',
        errorTitle: 'Error al registrar depósito'
      };
  }

  /**
   * Payment method options for extractions
   */
  get extractionPaymentMethods() {
    return [{ label: 'Efectivo', value: 'cash' },
      { label: 'Tarjeta de débito', value: 'debit_card' },
      { label: 'Tarjeta de crédito', value: 'credit_card' },
      { label: 'Transferencia', value: 'bank_transfer' },
      { label: 'QR', value: 'qr' }];
  }

  /**
   * Payment method options for deposits
   */
  get depositPaymentMethods() {
    return [{ label: 'Efectivo', value: 'Efectivo' },
      { label: 'Tarjeta de débito', value: 'debit_card' },
      { label: 'Tarjeta de crédito', value: 'credit_card' },
      { label: 'Transferencia', value: 'bank_transfer' },
      { label: 'QR', value: 'qr' }];
  }

  readonly minAmount = 0.01;
  readonly maxAmount = 999999999999;

  /**
   * Initializes the component, loads forms and session data.
   */
  ngOnInit(): void {
    this.titleService.setTitle('Registro de movimientos');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Operaciones' }
    ]);
    this.initializeForm();
    const from = history.state?.from as string | undefined;
    this.fromMain.set(from === 'main');
    this.loadSessionFromBackend();
    this.loadTypeFromQueryParams();
  }

  /**
   * Initializes the base state of the component.
   */
  private initializeForm(): void {
    this.updateViewModel({
      isSubmitting: false,
      currentSession: null,
      isLoading: false,
      error: null
    });
    this.initForms();
  }

  /**
   * Loads the current session from backend and updates state without redirecting.
   */
  private loadSessionFromBackend(): void {
    // Si estamos operando sobre la caja general, cargamos su saldo
    if (this.fromMain()) {
      this.updateViewModel({ currentSession: null, isLoading: true, error: null });
      this.registerService.getMainRegister().subscribe({
        next: (mainRegister) => {
          this.mainRegisterBalance.set(mainRegister.currentAmount);
          this.updateViewModel({ isLoading: false, error: null });
        },
        error: (_error) => {
          this.updateViewModel({ isLoading: false });
          this.alert.set({
            type: 'error',
            title: 'Error',
            text: 'No se pudo cargar el saldo de la caja general.'
          });
          setTimeout(() => this.alert.set(null), 3000);
        }
      });
      return;
    }

    this.updateViewModel({ isLoading: true, error: null });
    this.sessionService.loadCurrentSession().subscribe({
      next: () => {
        const s = this.sessionService.currentSession();
        this.updateViewModel({ currentSession: s, isLoading: false });

        if (s) {
          this.summaryService.refresh(s.id);
        } else {
          this.alert.set({
            type: 'warning',
            title: 'Caja cerrada',
            text: 'No hay una caja abierta. Puede abrir una caja desde el Dashboard.'
          });
          setTimeout(() => this.alert.set(null), 5000);
        }
      },
      error: () => {
        this.updateViewModel({ currentSession: null, isLoading: false });
        this.alert.set({
          type: 'warning',
          title: 'Caja no disponible',
          text: 'No se pudo determinar la sesión de caja actual.'
        });
        setTimeout(() => this.alert.set(null), 5000);
      }
    });
  }

  /**
   * Loads the operation type from query parameters.
   */
  private loadTypeFromQueryParams(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['type']) {
        const type = params['type'];
        if (type === 'deposit') {
          this.activeTabIndex = 1; // Tab de Depósito
        } else if (type === 'extraction') {
          this.activeTabIndex = 0; // Tab de Extracción
        }
      }
    });
  }

  /**
   * Updates the internal state of the component.
   */
  private updateViewModel(
    partial: Partial<{
      isSubmitting: boolean
      currentSession: any
      isLoading: boolean
      error: string | null
    }>
  ): void {
    this.viewModel.update((current) => ({ ...current, ...partial }));
  }

  /**
   * Initializes both reactive forms and their validations.
   */
  private initForms(): void {
    // Formulario para extracciones
    this.extractionForm = this.fb.group({
      concept: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(this.minAmount), Validators.max(this.maxAmount)]],
      paymentMethod: ['cash', Validators.required],
      receiptNumber: [''],
      observations: ['', Validators.maxLength(250)]
    });

    // Formulario para depósitos
    this.depositForm = this.fb.group({
      concept: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(this.minAmount), Validators.max(this.maxAmount)]],
      paymentMethod: ['Efectivo', Validators.required],
      receiptNumber: [''],
      observations: ['', Validators.maxLength(250)]
    });
  }

  /** Returns `true` if available balance is low (<1000). */
  shouldShowBalanceWarning(): boolean {
    return (
      this.currentOperationType === 'extraction' &&
      this.availableBalance() < 1000
    );
  }

  /**
   * Switches the active tab.
   */
  onTabChange(newIndex: number): void {
    this.activeTabIndex = newIndex;

    const formToClear = newIndex === 0 ? this.depositForm : this.extractionForm;
    formToClear.markAsPristine();
    formToClear.markAsUntouched();
    if (newIndex === 0) {
      this.resetDepositForm();
    } else {
      this.resetExtractionForm();
    }
  }

  /**
   * Gets the payment method label for extractions.
   */
  getExtractionPaymentMethodLabel(): string {
    const value = this.extractionForm.get('paymentMethod')?.value;
    return (
      this.extractionPaymentMethods.find((p) => p.value === value)?.label ||
      'No seleccionado'
    );
  }

  /**
   * Gets the payment method label for deposits.
   */
  getDepositPaymentMethodLabel(): string {
    const value = this.depositForm.get('paymentMethod')?.value;
    return (
      this.depositPaymentMethods.find((p) => p.value === value)?.label ||
      'No seleccionado'
    );
  }

  /**
   * Gets the selected concept for extractions.
   */
  getExtractionConceptLabel(): string {
    return this.extractionForm.get('concept')?.value || 'No seleccionado';
  }

  /**
   * Gets the selected concept for deposits.
   */
  getDepositConceptLabel(): string {
    return this.depositForm.get('concept')?.value || 'No seleccionado';
  }

  /**
   * Gets the amount for extractions.
   */
  getExtractionAmount(): number {
    return this.extractionForm.get('amount')?.value || 0;
  }

  /**
   * Gets the amount for deposits.
   */
  getDepositAmount(): number {
    return this.depositForm.get('amount')?.value || 0;
  }

  /**
   * Gets the observations length for extractions.
   */
  getExtractionObservationsLength(): number {
    return this.extractionForm.get('observations')?.value?.length || 0;
  }

  /**
   * Obtiene la longitud de observaciones para depósitos
   */
  getDepositObservationsLength(): number {
    return this.depositForm.get('observations')?.value?.length || 0;
  }

  /** Método de pago seleccionado del formulario activo (para confirmación) */
  get selectedPaymentMethodLabel(): string {
    const value = this.activeForm.get('paymentMethod')?.value;
    const methods =
      this.currentOperationType === 'extraction'
        ? this.extractionPaymentMethods
        : this.depositPaymentMethods;
    return methods.find((m) => m.value === value)?.label || 'No seleccionado';
  }

  /**
   * Valida el formulario activo y solicita confirmación antes de enviar la operación
   */
  onSubmit(): void {
    if (!this.activeForm.valid) {
      this.activeForm.markAllAsTouched();
      this.alert.set({
        type: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos.'
      });
      setTimeout(() => this.alert.set(null), 5000);
      return;
    }

    const amount = this.activeForm.get('amount')?.value;
    const concept = this.activeForm.get('concept')?.value;
    const availableBalance = this.availableBalance();

    // Solo validar saldo suficiente para extracciones
    if (
      this.currentOperationType === 'extraction' &&
      amount > availableBalance
    ) {
      this.alert.set({
        type: 'warning',
        title: 'Saldo insuficiente',
        text: `No hay suficiente dinero en caja. Saldo disponible: $${availableBalance.toLocaleString(
          'es-AR',
          { minimumFractionDigits: 2 }
        )}`
      });
      setTimeout(() => this.alert.set(null), 5000);
      return;
    }

    const formattedAmount = `$${amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2
    })}`;

    const modalSeverity =
      this.config.confirmSeverity === 'danger' ? 'danger' : 'primary';

    // Use the generic confirmation modal and pass the details via projection
    this.confirmModalData = {
      title: this.config.confirmTitle,
      message: this.config.confirmMessage,
      details: [
        { label: 'Monto: ', value: formattedAmount },
        { label: 'Concepto: ', value: concept },
        { label: 'Método: ', value: this.selectedPaymentMethodLabel }
      ],
      severity: modalSeverity
    };
    this.showConfirmModal = true;
  }

  /**
   * Solicita confirmación antes de cancelar y volver al dashboard
   */
  onCancel(event?: Event): void {
    // Prevent any default form submit behavior that may trigger a page reload
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (event && typeof (event as Event).stopPropagation === 'function') {
      ;(event as Event).stopPropagation();
    }

    const hasChanges = this.extractionForm.dirty || this.depositForm.dirty;
    if (hasChanges) {
      this.cancelModalData = {
        title: 'Cancelar registro',
        message: '¿Está seguro que desea cancelar? Se perderán los datos ingresados.',
        severity: 'warn'
      };
      this.showCancelModal = true;
    } else {
      this.router.navigate(['/billing-collections/cash-general']);
    }
  }

  /**
   * Called when the generic confirm modal is accepted.
   */
  onConfirmModalConfirmed(): void {
    this.showConfirmModal = false;
    this.processOperation();
    this.confirmModalData = null;
  }

  /**
   * Called when the generic confirm modal is dismissed.
   */
  onConfirmModalDismissed(): void {
    this.showConfirmModal = false;
    this.confirmModalData = null;
  }

  /**
   * Called when the generic cancel modal is accepted.
   */
  onCancelConfirmed(): void {
    this.showCancelModal = false;
    this.router.navigate(['/billing-collections/cash-general']);
    this.cancelModalData = null;
  }

  /**
   * Called when the generic cancel modal is dismissed.
   */
  onCancelDismissed(): void {
    this.showCancelModal = false;
    this.cancelModalData = null;
  }

  /**
   * Envía la operación al backend, muestra notificación de éxito y redirige al dashboard
   */
  private processOperation(): void {
    this.updateViewModel({ isSubmitting: true, error: null });

    const formValue = this.activeForm.value;
    const session = this.currentSession();

    // Solo validar sesión si NO estamos operando sobre la caja general
    if (!session && !this.fromMain()) {
      this.alert.set({
        type: 'error',
        title: 'Error',
        text: 'No hay una sesión de caja activa.'
      });
      setTimeout(() => this.alert.set(null), 5000);
      this.updateViewModel({ isSubmitting: false });
      return;
    }


    const operation$ =
      this.currentOperationType === 'extraction'
        ? this.movementService.registerWithdrawal(formValue, this.fromMain())
        : this.movementService.registerDeposit(formValue, this.fromMain());

    operation$.subscribe({
      next: () => {
        this.updateViewModel({ isSubmitting: false, error: null });

        const s = this.currentSession();
        if (s) this.summaryService.refresh(s.id);

        this.alert.set({
          type: 'success',
          title: this.config.successTitle,
          text: `La operación de $${formValue.amount.toLocaleString(
            'es-AR',
            {
              minimumFractionDigits: 2
            }
          )} ha sido registrada exitosamente.`
        });

        setTimeout(() => {
          this.operationCompleted.emit();
          this.router.navigate(['/billing-collections/cash-general']);
        }, 2000);
      },
      error: (error) => {
        const message =
          error?.error?.message ||
          'No se pudo registrar la operación. Por favor intente nuevamente.';
        this.updateViewModel({ isSubmitting: false, error: message });

        this.alert.set({
          type: 'error',
          title: this.config.errorTitle,
          text: message
        });
        setTimeout(() => this.alert.set(null), 5000);
      }
    });
  }

  /**
   * Resetea el formulario de extracción a sus valores por defecto
   * y limpia su estado (dirty, touched).
   */
  private resetExtractionForm(): void {
    if (this.extractionForm) {
      this.extractionForm.reset({
        concept: '',
        amount: 0,
        paymentMethod: 'cash', // Valor por defecto de tu initForms
        receiptNumber: '',
        observations: ''
      });
    }
  }

  /**
   * Resetea el formulario de depósito a sus valores por defecto
   * y limpia su estado (dirty, touched).
   */
  private resetDepositForm(): void {
    if (this.depositForm) {
      this.depositForm.reset({
        concept: '',
        amount: 0,
        paymentMethod: 'Efectivo',
        receiptNumber: '',
        observations: ''
      });
    }
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
