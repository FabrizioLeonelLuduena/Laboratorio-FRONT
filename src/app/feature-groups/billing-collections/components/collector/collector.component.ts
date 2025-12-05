import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  TemplateRef,
  viewChild,
  inject,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';

import { map } from 'rxjs/operators';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { AnalysisService } from '../../../care-management/services/analysis.service';
import { AttentionService } from '../../../care-management/services/attention.service';
import { PricingService } from '../../../coverage-administration/services/pricing.service';
import { Coverage, PatientResponse } from '../../../patients/models/PatientModel';
import { PatientService } from '../../../patients/services/PatientService';
import { PaymentMethodDetail } from '../../invoicing/domain';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../invoicing/domain';

import { EditPaymentModalComponent } from './edit-payment-modal/edit-payment-modal.component';
import {
  AnalysisItem,
  PricingRequestDto,
  AtentionResponse,
  CalculateItemResultDTO,
  PaymentRequestDTO,
  PaymentDetailRequestDTO,
  CollectionRequestDTO,
  PaymentResponseDTO,
  PaymentMethod as BackendPaymentMethod,
  AnalysisResponse
} from './models/dtos';
import {
  PaymentStepperModalComponent,
  PaymentStep
} from './payment-stepper-modal/payment-stepper-modal.component';
import { CollectorService } from './services/collector.service';

/**
 * CollectorComponent - Component for handling payment collection
 * Designed to be used within a stepper for billing workflow
 */
@Component({
  selector: 'app-collector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AccordionModule,
    GenericTableComponent,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    DropdownModule,
    EditPaymentModalComponent,
    GenericButtonComponent,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    GenericAlertComponent,
    SpinnerComponent
  ],
  providers: [DialogService],
  templateUrl: './collector.component.html',
  styleUrls: ['./collector.component.css']
})
export class CollectorComponent implements OnInit, OnChanges {
  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<any>();
  @Output() patientClick = new EventEmitter<void>();
  @Output() coverageClick = new EventEmitter<void>();
  @Output() paymentCreated = new EventEmitter<number>();
  @Input() attentionId: number | undefined = 0;
  @Input() analysisIds: number[] = [];
  @Output() billingDataChange = new EventEmitter<any>();
  @Output() cancelAttention = new EventEmitter<void>();

  headerForm!: FormGroup;

  private titleService = inject(PageTitleService);
  private coverageService = inject(PricingService);
  private breadcrumbService = inject(BreadcrumbService);

  items = signal<AnalysisItem[]>([]);

  isLoading = signal<boolean>(true);

  patientData = signal<PatientResponse | null>(null);
  coverageData = signal<Coverage | null>(null);

  paymentMethods = signal<PaymentMethodDetail[]>([]);
  hasSubmitted = signal<boolean>(false);
  coinsuranceValue = signal<number>(0);

  selectedIVA = signal<number | null>(0);
  ivaOptions = [
    { label: '0%', value: 0 },
    { label: '10.5%', value: 10.5 },
    { label: '21%', value: 21 }
  ];

  readonly minAmount = 0;
  readonly maxAmount = 999999999999; // 999.999.999.999

  private paymentIdCounter = 1;

  private dialogRef: DynamicDialogRef | null = null;

  private atentionResponse: AtentionResponse | null = null;
  private calculationResults: CalculateItemResultDTO[] = [];

  isValidating = signal<boolean>(false);

  // Payment Modal State
  showPaymentModal = signal<boolean>(false);
  paymentModalData = signal<{
    payment: PaymentMethodDetail | null;
    totalAmount: number;
    remainingBalance: number;
  }>({
    payment: null,
    totalAmount: 0,
    remainingBalance: 0
  });

  checkboxTemplate = viewChild<TemplateRef<any>>('checkboxTemplate');
  totalAmountTemplate = viewChild<TemplateRef<any>>('totalAmountTemplate');
  coveredAmountTemplate = viewChild<TemplateRef<any>>('coveredAmountTemplate');
  patientAmountTemplate = viewChild<TemplateRef<any>>('patientAmountTemplate');

  tableColumns = computed<any[]>(() => [
    {
      field: 'selected',
      header: '',
      template: this.checkboxTemplate()
    },
    {
      field: 'description',
      header: 'Descripción',
      sortable: true
    },
    {
      field: 'totalAmount',
      header: 'Total',
      template: this.totalAmountTemplate(),
      sortable: true
    },
    {
      field: 'coveredAmount',
      header: 'Cubierto',
      template: this.coveredAmountTemplate(),
      sortable: true
    },
    {
      field: 'patientAmount',
      header: 'A pagar',
      template: this.patientAmountTemplate(),
      sortable: true
    }
  ]);

  tableConfig = {
    scrollable: true,
    scrollHeight: '400px'
  };

  paymentMethodTemplate = viewChild<TemplateRef<any>>('paymentMethodTemplate');
  paymentAmountTemplate = viewChild<TemplateRef<any>>('paymentAmountTemplate');
  paymentActionsTemplate = viewChild<TemplateRef<any>>('paymentActionsTemplate');

  paymentTableColumns = computed<any[]>(() => [
    {
      field: 'paymentMethod',
      header: 'Forma',
      template: this.paymentMethodTemplate()
    },
    {
      field: 'amount',
      header: 'Monto',
      template: this.paymentAmountTemplate()
    },
    {
      field: 'actions',
      header: '',
      template: this.paymentActionsTemplate()
    }
  ]);

  paymentTableConfig = {
    scrollable: true,
    scrollHeight: '400px'
  };

  readonly subtotalWithoutIVA = computed(() => {
    return this.items()
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.patientAmount, 0);
  });

  readonly totalIVA = computed(() => {
    const ivaPercentage = this.selectedIVA();
    if (ivaPercentage === null) {
      return 0;
    }

    const base = this.subtotalWithoutIVA() + this.coinsuranceValue();
    return base * (ivaPercentage / 100);
  });

  readonly selectedItemsCount = computed(() => {
    return this.items().filter((item) => item.selected).length;
  });

  readonly coinsurance = computed(() => {
    return this.coinsuranceValue() || 0;
  });

  readonly grandTotal = computed(() => {
    const subtotal = this.subtotalWithoutIVA();
    const coInsurance = this.coinsurance();
    const iva = this.totalIVA();
    return subtotal + coInsurance + iva;
  });

  readonly totalPaid = computed(() => {
    return this.paymentMethods().reduce((sum, pm) => sum + pm.amount, 0);
  });

  readonly subtotalWithCoinsurance = computed(() => {
    return this.subtotalWithoutIVA() + this.coinsuranceValue();
  });

  readonly remainingAmount = computed(() => {
    return this.grandTotal() - this.totalPaid();
  });

  readonly isPaymentComplete = computed(() => {
    return Math.abs(this.remainingAmount()) < 0.01;
  });

  readonly alert = signal<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    text: string;
  } | null>(null);

  private patientId: number | null = null;

  /** Map of custom column templates for GenericTable compatibility (opcional) */
  columnTemplatesMap: Map<string, TemplateRef<any>> = new Map();

  /**
   * Constructor of the component
   */
  constructor(
    private fb: FormBuilder,
    private dialogService: DialogService,
    private patientService: PatientService,
    private collectorService: CollectorService,
    private analysisService: AnalysisService,
    private attentionService: AttentionService
  ) {}

  /**
   * Method that initializes the component
   */
  ngOnInit(): void {
    this.titleService.setTitle('Cobros');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Registrar pago' }
    ]);

    this.initializeForms();
    this.setupFormValidation();
    this.loadData();
    this.savePatientId();
  }

  /**
   * Detect changes in analysisIds input and reload data
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analysisIds'] && !changes['analysisIds'].firstChange) {
      // analysisIds changed, reload data
      this.loadData();
    }
  }

  /**
   * Load data from services
   */
  private loadData(): void {
    this.isLoading.set(true);

    this.attentionService.get(this.attentionId!).subscribe({
      next: (atentionResponse) => {
        this.atentionResponse = atentionResponse;

        // WORKAROUND: Remove duplicate analysis authorizations
        // Backend's createAuthorizations doesn't delete old records, so we filter duplicates here
        const uniqueAuthorizations = atentionResponse.analysisAuthorizations.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.analysisId === item.analysisId)
        );

        const analysisRequests = uniqueAuthorizations.map(
          (item) =>
            this.analysisService
              .getAnalysisById(item.analysisId)
              .pipe(map((response) => response as AnalysisResponse))
        );

        forkJoin(analysisRequests).subscribe({
          next: (analysisResponses: AnalysisResponse[]) => {
            const pricingRequest: PricingRequestDto = {
              id_plan: atentionResponse.insurancePlanId,
              items: uniqueAuthorizations // Use filtered unique authorizations
            };

            this.coverageService.getCalc(pricingRequest).subscribe({
              next: (calcResults: any[]) => {
                const normalizedResults = calcResults.map((r) => ({
                  analysisId: r.analysis_id ?? r.analysisId,
                  totalAmount: r.total_amount ?? r.totalAmount,
                  coveredAmount: r.covered_amount ?? r.coveredAmount,
                  patientAmount: r.patient_amount ?? r.patientAmount,
                  coverageId: r.coverage_id ?? r.coverageId,
                  insurerName: r.insurer_name ?? r.insurerName,
                  planName: r.plan_name ?? r.planName,
                  ubValue: r.ub_value ?? r.ubValue,
                  ubUsed: r.ub_used ?? r.ubUsed,
                  ubSource: r.ub_source ?? r.ubSource,
                  nbuVersionId: r.nbu_version_id ?? r.nbuVersionId,
                  note: r.note
                }));

                this.calculationResults = normalizedResults;

                const analysisItems: AnalysisItem[] = normalizedResults.map((result, index) => {
                  const analysisResponse = analysisResponses[index];
                  return {
                    description: analysisResponse?.name || `Análisis ${result.analysisId}`,
                    totalAmount: result.totalAmount || 0,
                    coveredAmount: result.coveredAmount || 0,
                    patientAmount: result.patientAmount || 0,
                    selected: true
                  };
                });

                this.items.set(analysisItems);
                this.isLoading.set(false);
              },
              error: (_error) => {
                this.isLoading.set(false);
              }
            });
          },
          error: (_error) => {
            this.isLoading.set(false);
          }
        });
      },
      error: (_error) => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Load patient data using patient ID
   */
  private loadPatientData(id: number): void {
    this.patientService.getPatientById(id).subscribe({
      next: (result) => {
        this.patientData.set(result);
        this.coverageData.set(result.coverages[0] || null);
        this.headerForm.patchValue({
          patient: result.firstName,
          coverage: result.coverages[0] || ''
        });
      },
      error: (_error) => {}
    });
  }

  /**
   * Save patient ID from attention
   */
  private savePatientId(): void {
    this.attentionService.getAttentionById(this.attentionId!).subscribe({
      next: (attention) => {
        this.patientId = attention.patientId;
        this.loadPatientData(attention.patientId);
      }
    });
  }

  /**
   * Initialize reactive forms
   */
  private initializeForms(): void {
    this.headerForm = this.fb.group({
      patient: [''],
      coverage: [''],
      applyIVA: [true]
    });
  }

  /**
   * Setup form validation and change detection
   */
  private setupFormValidation(): void {
    this.headerForm.statusChanges.subscribe(() => {
      this.emitValidityStatus();
    });

    this.headerForm.valueChanges.subscribe(() => {
      this.emitDataChange();
    });
  }

  /**
   * Add a new payment method (called from modal result)
   */
  private addPaymentMethod(payment: PaymentMethodDetail): void {
    if (payment.paymentMethod === PaymentMethod.EFECTIVO) {
      const existingCashIndex = this.paymentMethods().findIndex(
        (pm) => pm.paymentMethod === PaymentMethod.EFECTIVO
      );

      if (existingCashIndex !== -1) {
        this.paymentMethods.update((methods) => {
          const updated = [...methods];
          updated[existingCashIndex] = {
            ...updated[existingCashIndex],
            amount: updated[existingCashIndex].amount + payment.amount
          };
          return updated;
        });

        this.alert.set({
          type: 'info',
          title: 'Pago actualizado',
          text: 'El monto del pago en efectivo ha sido actualizado'
        });
        setTimeout(() => this.alert.set(null), 3000);
      } else {
        const paymentWithId = { ...payment, id: this.paymentIdCounter++ };
        this.paymentMethods.update((methods) => [...methods, paymentWithId]);
      }
    } else {
      const paymentWithId = { ...payment, id: this.paymentIdCounter++ };
      this.paymentMethods.update((methods) => [...methods, paymentWithId]);
    }

    this.emitValidityStatus();
    this.emitDataChange();
  }

  /**
   * Remove a payment method
   */
  removePaymentMethod(id: number | undefined): void {
    this.paymentMethods.update((methods) => methods.filter((pm) => pm.id !== id));
    this.emitValidityStatus();
    this.emitDataChange();
  }

  /**
   * Handle item selection change
   */
  onItemSelectionChange(index: number, selected: boolean): void {
    this.items.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], selected };
      return updated;
    });
    this.emitValidityStatus();
    this.emitDataChange();
  }

  /**
   * Handle IVA selection change
   */
  onIVAChange(value: number | null): void {
    this.selectedIVA.set(value);
    this.emitValidityStatus();
    this.emitDataChange();
  }

  /**
   * Handle validation button click
   */
  onValidate(): void {
    if (this.isValidating() || this.hasSubmitted()) return;
    if (!this.validateForm()) return;

    this.isValidating.set(true);

    const paymentRequest = this.buildPaymentRequest();

    this.collectorService.createPayment(paymentRequest).subscribe({
      next: (paymentResponse) => {
        this.alert.set({
          type: 'success',
          title: 'Factura realizada con éxito',
          text: paymentResponse.message || 'La factura se ha generado correctamente'
        });

        this.hasSubmitted.set(true);
        this.isValidating.set(false);

        const _summary = {
          ivaPercentage: this.selectedIVA() || 0,
          items: this.items().filter((item) => item.selected),
          paymentMethods: this.paymentMethods(),
          totals: {
            subtotal: this.subtotalWithoutIVA(),
            coinsurance: this.coinsurance(),
            iva: this.totalIVA(),
            total: this.grandTotal()
          }
        };
        this.billingDataChange.emit(_summary);
        this.emitValidityStatus();
        this.emitDataChange();

        // Emit the payment ID to the parent component (attention workflow)
        this.paymentCreated.emit(paymentResponse.paymentId);
      },
      error: () => {
        this.isValidating.set(false);
        this.alert.set({
          type: 'error',
          title: 'Error',
          text: 'No se pudo crear el pago. Intente nuevamente.'
        });
        setTimeout(() => this.alert.set(null), 5000);
      }
    });
  }

  /**
   * Validate the entire form
   */
  validateForm(): boolean {
    const hasSelectedItems = this.selectedItemsCount() > 0;
    const paymentComplete = this.isPaymentComplete();
    const ivaSelected = this.selectedIVA() !== null;
    const notLoading = !this.isLoading();

    return hasSelectedItems && paymentComplete && ivaSelected && notLoading;
  }

  /**
   * Emit validity status to parent
   */
  private emitValidityStatus(): void {
    const isValid = this.validateForm();
    this.validChange.emit(isValid);
  }

  /**
   * Emit data changes to parent
   */
  emitDataChange(): void {
    const data = {
      patient: this.headerForm.value.patient,
      coverage: this.headerForm.value.coverage,
      applyIVA: this.headerForm.value.applyIVA,
      items: this.items(),
      paymentMethods: this.paymentMethods(),
      totals: {
        subtotal: this.subtotalWithoutIVA(),
        iva: this.totalIVA(),
        coinsurance: this.coinsurance(),
        total: this.grandTotal(),
        paid: this.totalPaid(),
        remaining: this.remainingAmount()
      }
    };

    this.dataChange.emit(data);
  }

  /**
   * Open payment modal using DynamicDialog
   */
  openPaymentModal(): void {
    this.paymentModalData.set({
      payment: null,
      totalAmount: this.grandTotal(),
      remainingBalance: this.remainingAmount()
    });
    this.showPaymentModal.set(true);
  }

  /**
   * Payment modal closed
   */
  onPaymentModalClosed(): void {
    this.showPaymentModal.set(false);
  }

  /**
   * Payment modal saved
   */
  onPaymentSaved(payment: PaymentMethodDetail): void {
    this.addPaymentMethod(payment);
  }

  /**
   * Build PaymentRequestDTO from current state
   */
  private buildPaymentRequest(): PaymentRequestDTO {
    if (!this.atentionResponse) {
      throw new Error('Attention response not loaded');
    }

    const selectedItems = this.items().filter((item) => item.selected);
    const selectedIVAValue = this.selectedIVA();

    const _ivaDecimal = selectedIVAValue !== null ? selectedIVAValue / 100 : 0;

    const details: PaymentDetailRequestDTO[] = selectedItems.map((item) => {
      const itemIndex = this.items().findIndex((i) => i === item);
      const analysisItem = this.atentionResponse!.analysisAuthorizations[itemIndex];

      const calcResult = this.calculationResults.find(
        (calc) => calc.analysisId === analysisItem.analysisId
      );

      return {
        analysisId: analysisItem.analysisId,
        isCovered: analysisItem.authorized,
        coverageId: calcResult?.coverageId || 0
      };
    });

    const collections: CollectionRequestDTO[] = this.paymentMethods().map((pm) => {
      let accountId: number;
      if (pm.paymentMethod === PaymentMethod.TRANSFERENCIA || pm.paymentMethod === PaymentMethod.QR) {
        accountId = 1;
      } else {
        accountId = 0;
      }

      const amountFixed = parseFloat(pm.amount.toFixed(2));

      return {
        amount: amountFixed,
        paymentMethod: this.mapToBackendPaymentMethod(pm.paymentMethod),
        receiptNumber: '',
        accountId: accountId
      };
    });

    return {
      attentionId: this.atentionResponse.attentionId,
      details,
      collections,
      iva: this.totalIVA(),
      copayment: this.coinsurance()
    };
  }

  /**
   * Map UI PaymentMethod enum to Backend PaymentMethod enum
   */
  private mapToBackendPaymentMethod(uiMethod: any): BackendPaymentMethod {
    if (!uiMethod) return BackendPaymentMethod.CASH;
    const normalized = uiMethod.toString().trim().toUpperCase().replace(/ /g, '_');
    const mapping: Record<string, BackendPaymentMethod> = {
      EFECTIVO: BackendPaymentMethod.CASH,
      CASH: BackendPaymentMethod.CASH,
      QR: BackendPaymentMethod.QR,
      MERCADO_PAGO: BackendPaymentMethod.QR,
      TRANSFERENCIA: BackendPaymentMethod.TRANSFER,
      TRANSFER: BackendPaymentMethod.TRANSFER,
      CHEQUE: BackendPaymentMethod.TRANSFER,
      TARJETA_DEBITO: BackendPaymentMethod.DEBIT_CARD,
      DEBIT_CARD: BackendPaymentMethod.DEBIT_CARD,
      TARJETA_CREDITO: BackendPaymentMethod.CREDIT_CARD,
      CREDIT_CARD: BackendPaymentMethod.CREDIT_CARD,
      POSNET: BackendPaymentMethod.POSNET,
      OTRO: BackendPaymentMethod.CASH
    };

    return mapping[normalized] || BackendPaymentMethod.CASH;
  }

  /**
   * Open payment stepper modal with configured steps
   */
  private openPaymentStepperModal(paymentResponses: PaymentResponseDTO[]): void {
    const steps: PaymentStep[] = paymentResponses.map((response, index) => {
      const paymentMethod = this.paymentMethods()[index];

      return {
        payment_id: response.paymentId,
        paymentMethod: paymentMethod.paymentMethod,
        amount: paymentMethod.amount,
        label: this.getPaymentMethodLabel(paymentMethod.paymentMethod),
        onStepLoad: () => {
          if (paymentMethod.paymentMethod === PaymentMethod.QR) {
            this.collectorService.completeCollection(response.paymentId).subscribe({
              next: (result) => {
                this.alert.set({
                  type: 'success',
                  title: 'Pago QR',
                  text: result.status
                });
                setTimeout(() => this.alert.set(null), 3000);
              },
              error: (_error) => {
                this.alert.set({
                  type: 'error',
                  title: 'Error',
                  text: 'Error al procesar pago QR'
                });
                setTimeout(() => this.alert.set(null), 5000);
              }
            });
          }
        },
        onStepComplete: () => {
          if (paymentMethod.paymentMethod !== PaymentMethod.QR) {
            this.collectorService.completeCollection(response.paymentId).subscribe({
              next: (result) => {
                this.alert.set({
                  type: 'success',
                  title: 'Pago confirmado',
                  text: result.status
                });
                setTimeout(() => this.alert.set(null), 3000);
              },
              error: (_error) => {
                this.alert.set({
                  type: 'error',
                  title: 'Error',
                  text: 'Error al completar el pago'
                });
                setTimeout(() => this.alert.set(null), 5000);
              }
            });
          }
        }
      };
    });

    this.dialogRef = this.dialogService.open(PaymentStepperModalComponent, {
      header: 'Procesamiento de Pagos',
      width: '700px',
      modal: true,
      dismissableMask: false,
      closable: false,
      data: {
        steps
      }
    });

    this.dialogRef.onClose.subscribe((_result: any) => {
      this.dialogRef = null;
    });
  }

  /**
   * Get payment method label from enum
   */
  getPaymentMethodLabel(paymentMethod: string): string {
    return (
      PAYMENT_METHOD_LABELS[paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || paymentMethod
    );
  }

  /**
   * Selects all text in an input field when focused.
   * @param event - The focus event from the input element.
   */
  selectAll(event: any): void {
    setTimeout(() => {
      event.target.select();
    });
  }

  /**
   * Handles the input event for the coinsurance amount.
   * @param event - The input event.
   */
  onCoinsuranceInput(event: any): void {
    if (!event) return;
    const raw = event?.value ?? event?.target?.value ?? event;
    if (raw == null || raw === '') return;

    let str = String(raw);
    if (typeof raw === 'number') {
      const clamped = Math.min(raw, this.maxAmount);
      const rounded = Math.round(clamped * 100) / 100;
      if (this.coinsuranceValue() !== rounded) {
        this.coinsuranceValue.set(rounded);
        this.emitDataChange();
      }
      return;
    }

    str = str.replace(/\./g, '');
    str = str.replace(/,/g, '.');

    const parts = str.split('.');
    let integerPart = parts[0].replace('-', '');
    const fractionPart = parts[1] ?? '';

    if (integerPart.length > 12) {
      integerPart = integerPart.substring(0, 12);
    }

    let truncatedFraction = fractionPart.substring(0, 2);
    str = integerPart + (truncatedFraction ? '.' + truncatedFraction : '');
    const num = Number(str);
    if (isNaN(num)) return;

    let clamped = Math.min(num, this.maxAmount);
    clamped = Math.round(clamped * 100) / 100;

    if (this.coinsuranceValue() !== clamped) {
      this.coinsuranceValue.set(clamped);
      this.emitDataChange();
    }
  }

  /**
   * Handles the blur event for the coinsurance input.
   */
  onCoinsuranceBlur(): void {
    const val = this.coinsuranceValue();
    if (val == null || val === 0) return;
    const str = String(val).replace(/\./g, '').replace(/,/g, '.');
    const num = Number(str);
    if (isNaN(num)) return;
    const clamped = Math.min(num, this.maxAmount);
    const rounded = Math.round(clamped * 100) / 100;
    if (this.coinsuranceValue() !== rounded) {
      this.coinsuranceValue.set(rounded);
      this.emitDataChange();
    }
  }

  /**
   * Handles keydown events on the coinsurance input to limit length.
   * @param event - The keyboard event.
   */
  onCoinsuranceKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const value = input.value ?? '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length >= 12 && /\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Emit cancel attention event
   */
  onCancelAttention(): void {
    this.cancelAttention.emit();
  }
}
