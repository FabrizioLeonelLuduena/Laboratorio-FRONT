import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Step, StepList, Stepper } from 'primeng/stepper';
import {
  Subscription,
  delay,
  finalize,
  tap,
  of,
  switchMap
} from 'rxjs';
import { CollectorComponent } from 'src/app/feature-groups/billing-collections/components/collector/collector.component';
import { InvoiceComponent } from 'src/app/feature-groups/billing-collections/components/invoice/invoice.component';
import {
  QueueResponseDto,
  QueueStatusEnum,
  QueueUpdateDto
} from 'src/app/feature-groups/queue/models/queue.models';
import { QueueService } from 'src/app/feature-groups/queue/services/queue.service';

import { catchError } from 'rxjs/operators';

import type { AlertType } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import {
  ConfirmationModalComponent
} from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import {
  GenericFormComponent,
  GenericFormField
} from '../../../../../shared/components/generic-form/generic-form.component';
import { TutorialOverlayComponent } from '../../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { TutorialConfig } from '../../../../../shared/models/generic-tutorial';
import { AttentionNumberPipe } from '../../../../../shared/pipes/attention-number.pipe';
import { TutorialService } from '../../../../../shared/services/tutorial.service';
import { InvoicePdfService } from '../../../../billing-collections/invoicing/application/invoice-pdf.service';
import { PatientService } from '../../../../patients/services/PatientService';
import {
  AttentionBlankRequestDTO,
  AttentionFromShiftRequestDTO,
  AttentionShift
} from '../../../models/attention-shift';
import {
  AttentionResponse,
  CancelAttentionRequestDto,
  TicketDto
} from '../../../models/attention.models';
import { DoctorResponse } from '../../../models/doctors.model';
import { AttentionService } from '../../../services/attention.service';
import { ShiftService } from '../../../services/shift-service';
import { TicketBuilderService } from '../../../services/ticket-builder.service';
import { AnalysisListComponent } from '../analysis-list/analysis-list.component';
import { AttentionDetailComponent } from '../attention-detail/attention-detail.component';
import { DoctorAutocompleteComponent } from '../doctor-autocomplete/doctor-autocomplete.component';
import { InvoiceSummaryComponent } from '../invoice-summary/invoice-summary.component';
import { PatientGeneralDataComponent } from '../patient-general-data/patient-general-data.component';
import { PaymentSummaryComponent } from '../payment-summary/payment-summary.component';


/**
 * Component for managing the complete attention workflow
 */
@Component({
  selector: 'app-attention-workflow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Stepper,
    Step,
    StepList,
    AnalysisListComponent,
    DoctorAutocompleteComponent,
    AttentionDetailComponent,
    CollectorComponent,
    InvoiceComponent,
    InvoiceSummaryComponent,
    PatientGeneralDataComponent,
    PaymentSummaryComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    AttentionNumberPipe,
    SpinnerComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './attention-workflow.component.html',
  styleUrls: ['./attention-workflow.component.css']
})
export class AttentionWorkflowComponent implements OnInit, OnDestroy {
  attentionId?: number;
  attention!: AttentionResponse;
  ticketDto: TicketDto | null = null;
  patientDni: number | null = null; // Store patient DNI for step 1

  loading = false;
  saving = false;
  printed = false;

  /** Alert state */
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  @ViewChild(AnalysisListComponent)
    analysisListComponent?: AnalysisListComponent;
  @ViewChild(DoctorAutocompleteComponent)
    doctorAutocompleteComponent?: DoctorAutocompleteComponent;
  @ViewChild(GenericFormComponent) genericFormComponent?: GenericFormComponent;
  @ViewChild(InvoiceComponent) invoiceComponent?: InvoiceComponent;
  @ViewChild(CollectorComponent) collectorComponent?: CollectorComponent;
  @ViewChild(PatientGeneralDataComponent)
    patientGeneralData?: PatientGeneralDataComponent;
  /** Template reference for the tutorial overlay. */
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  selectedDoctorId: number | null = null;
  selectedDoctor: DoctorResponse | null = null;
  indicationsText: string = '';
  activeStep = signal(1);
  analysisIds = signal<number[]>([]);
  billingId?: number;
  billingDataFromCollection: any | null = null;
  paymentId?: number;

  // Flags to control payment/invoice display
  hasPayment = false;
  hasInvoice = false;
  hasShift = false; // Flag to indicate if attention was created from a shift/appointment
  skipAnalysisReload = false; // Flag to prevent reloading analyses when going back to step 2

  steps = [
    { label: 'Datos generales', icon: 'pi pi-user' },
    { label: 'Análisis', icon: 'pi pi-list' },
    { label: 'Cobranza', icon: 'pi pi-dollar' },
    { label: 'Facturación', icon: 'pi pi-file' },
    { label: 'Finalizar', icon: 'pi pi-check' }
  ];

  noteFormFields: GenericFormField[] = [
    {
      name: 'is_urgent',
      label: 'Urgente',
      type: 'checkbox',
      required: true,
      colSpan: 2
    }
  ];

  generalInfoInitialValue: Record<string, any> | null = null;
  noteInitialValue: Record<string, any> | null = null;
  protocolWorking: boolean = false;
  incomingShift?: AttentionShift;
  queuePatient?: QueueResponseDto;
  showPdfBillingModal = false;
  pendingPdfData: any = null;

  /** Key de localStorage para obtener usuario */
  private userKey = 'auth_user';
  /** Current branch ID */
  private currentBranchId: number = 1;

  /** Subscription to the global TutorialService trigger stream. */
  private tutorialSub?: Subscription;

  /** Configuration for the tutorial steps. */
  tutorialConfig = signal<TutorialConfig>({ steps: [] });

  /** Cancel modal state - using signals for reactive state management */
  showCancelModal = signal(false);

  /**
   * Constructor for AttentionWorkflowComponent
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private attentionService: AttentionService,
    private queueService: QueueService,
    private cdr: ChangeDetectorRef,
    private attentionShiftService: ShiftService,
    private patientService: PatientService,
    private ticketBuilderService: TicketBuilderService,
    private tutorialService: TutorialService,
    private invoicePdfService: InvoicePdfService
  ) {}

  /**
   * Initialize component and handle attention creation/loading
   */
  ngOnInit(): void {
    this.currentBranchId = this.getBranchId();

    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state as any) ?? history.state;
    this.incomingShift = state?.shift;
    this.queuePatient = state?.patient;

    // First priority: Check if attentionId is already set (from previous creation or route)
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.attentionId = Number(id);
      this.loadAttention();
      return;
    }

    // Second priority: Check if attentionId comes in state
    if (state?.attentionId) {
      this.attentionId = state.attentionId;
      this.loadAttention();
      return;
    }

    // Third priority: Check sessionStorage for existing attentionId (prevents duplicates on reload)
    const sessionAttentionId = sessionStorage.getItem('current_attention_id');
    if (sessionAttentionId) {
      this.attentionId = Number(sessionAttentionId);
      this.loadAttention();
      sessionStorage.removeItem('current_attention_id'); // Clean up after use
      return;
    }

    // Fourth priority: Create blank attention
    if (state?.createBlank) {
      this.showAlert(
        'info',
        'Nueva atención',
        'Complete los datos para crear una nueva atención'
      );
      return;
    }

    // Fifth priority: Create from shift (only if no existing attentionId)
    if (this.incomingShift) {
      if (this.incomingShift.hasShift) {
        this.createAttentionFromShift(this.incomingShift);
      } else {
        this.createAttentionEmptyFromShift(this.incomingShift);
      }
      return;
    }

    // No valid entry point - redirect to attention list
    this.showAlert(
      'error',
      'Error',
      'No se especificó información para cargar la atención'
    );
    this.router.navigate(['/care-management/attentions']);

    this.setupTutorial();
  }

  /**
   * Component cleanup.
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Sets up the tutorial by subscribing to the tutorial service and defining the steps.
   * Uses `onEnter` to navigate between the workflow steps.
   */
  private setupTutorial(): void {
    this.tutorialSub = this.tutorialService.trigger$.subscribe(
      (route: string) => {
        if (!route.includes('attention-workflow')) return;

        const steps: TutorialConfig['steps'] = [
          {
            target: '.workflow-header',
            title: 'Gestión de Atención',
            message:
              'Esta pantalla te guiará para registrar y procesar una atención completa, desde los datos del paciente hasta la facturación.',
            position: 'bottom'
          },
          {
            target: '.workflow-stepper',
            title: 'Pasos del Proceso',
            message:
              'Estos son los 5 pasos para completar la atención. El tutorial te guiará a través de cada uno.',
            position: 'bottom'
          },
          {
            target: 'app-patient-general-data',
            title: 'Paso 1: Datos Generales',
            message:
              'Primero, busca y confirma los datos del paciente. El sistema precargará la información si viene de un turno.',
            position: 'top',
            onEnter: () => {
              this.activeStep.set(1);
            }
          },
          {
            target: '.doctor-autocomplete-container',
            title: 'Asignar Médico',
            message:
              'Busca y selecciona el médico solicitante para esta atención.',
            position: 'bottom',
            onEnter: () => {
              this.activeStep.set(1);
            }
          },
          {
            target: '.indications-field',
            title: 'Indicaciones Adicionales',
            message:
              'Si es necesario, puedes añadir indicaciones o comentarios para esta atención.',
            position: 'top'
          },
          {
            target: 'app-analysis-list',
            title: 'Paso 2: Selección de Análisis',
            message:
              'En este paso, debes buscar y agregar todos los análisis que corresponden a la orden médica.',
            position: 'top',
            onEnter: () => {
              this.activeStep.set(2);
            }
          },
          {
            target: 'app-collector',
            title: 'Paso 3: Cobranza',
            message:
              'Aquí se gestiona el cobro al paciente, registrando los pagos y los métodos utilizados.',
            position: 'top',
            onEnter: () => {
              this.activeStep.set(3);
            }
          },
          {
            target: 'app-invoice',
            title: 'Paso 4: Facturación',
            message:
              'En este paso se genera la factura correspondiente a la atención, utilizando los datos de la cobranza.',
            position: 'top',
            onEnter: () => {
              this.activeStep.set(4);
            }
          },
          {
            target: 'app-attention-detail',
            title: 'Paso 5: Finalizar y Confirmar',
            message:
              'Revisa el resumen completo de la atención. Desde aquí puedes confirmar para finalizar el proceso o imprimir el ticket.',
            position: 'top',
            onEnter: () => {
              this.activeStep.set(5);
            }
          }
        ];

        this.tutorialConfig.set({ steps });

        // Use a timeout to ensure the view is updated before starting
        setTimeout(() => {
          this.tutorialOverlay?.start();
        }, 100);
      }
    );
  }

  /**
   * Creates attention from shift with appointment
   */
  private createAttentionFromShift(shift: AttentionShift): void {
    const dto: AttentionFromShiftRequestDTO = {
      appointmentId: shift.appointmentId,
      attentionNumber: String(shift.nro),
      deskAttentionBox: shift.boxNumber || 1
    };

    this.loading = true;
    this.attentionShiftService.createAttentionPrefilled(dto).subscribe({
      next: (resp) => {
        this.attentionId = resp.attentionId;
        this.hasShift = true; // Mark that this attention was created from a shift
        // Save attentionId and hasShift to sessionStorage to prevent duplicate creation on reload
        sessionStorage.setItem(
          'current_attention_id',
          String(this.attentionId)
        );
        sessionStorage.setItem(`has_shift_${this.attentionId}`, 'true');
        this.loadAttention();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.showAlert(
          'error',
          'Error',
          'No se pudo crear la atención desde el turno'
        );
        this.router.navigate(['/care-management/attentions']);
      }
    });
  }

  /**
   * Creates blank attention from shift
   */
  private createAttentionEmptyFromShift(shift: AttentionShift): void {
    this.loading = true;

    // First, fetch the patient by DNI to get the patient ID
    this.patientService.findByDNI(shift.document).subscribe({
      next: (patient) => {
        const userAuthString = localStorage.getItem('auth_user');
        let branchValue = 1; // Valor por defecto

        if (userAuthString) {
          try {
            const userAuthObject = JSON.parse(userAuthString);
            branchValue = userAuthObject?.branch ?? 1;
          } catch {
            this.showAlert(
              'warning',
              'Error',
              'Error al recuperar información de la sesión actual.'
            );
            // Se mantiene el valor por defecto de 1
          }
        }
        const dto: AttentionBlankRequestDTO = {
          branchId: branchValue,
          patientId: patient.id,
          attentionNumber: String(shift.nro),
          deskAttentionBox: shift.boxNumber || 1
        };

        this.attentionShiftService.createAttentionEmpty(dto).subscribe({
          next: (resp) => {
            this.attentionId = resp.attentionId;
            this.hasShift = false; // Mark that this attention was created WITHOUT a shift
            // Save attentionId and hasShift to sessionStorage to prevent duplicate creation on reload
            sessionStorage.setItem(
              'current_attention_id',
              String(this.attentionId)
            );
            sessionStorage.setItem(`has_shift_${this.attentionId}`, 'false');
            this.loadAttention();
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.showAlert(
              'error',
              'Error',
              'No se pudo crear la atención en blanco'
            );
            this.router.navigate(['/care-management']);
          }
        });
      },
      error: () => {
        this.loading = false;

        this.router.navigate(['/patients/form'], {
          queryParams: {
            origen: 'atencion',
            dni: shift.document
          }
        });
      }
    });
  }

  /**
   * Loads attention data by ID and fetches patient DNI if needed
   */
  loadAttention(): void {
    if (!this.attentionId) return;

    this.loading = true;
    this.attentionService.getAttentionById(this.attentionId).pipe(
      switchMap((response) => {
        this.attention = response;

        // If attention has a patientId and we don't have the DNI yet, fetch it
        if (response.patientId && !this.patientDni) {
          return this.patientService.getPatientById(response.patientId).pipe(
            tap((patient) => {
              this.patientDni = Number(patient.dni);
            }),
            switchMap(() => of(response)),
            catchError(() => {
              // If patient fetch fails, continue without DNI
              return of(response);
            })
          );
        }
        return of(response);
      })
    ).subscribe({
      next: (response) => {
        this.attention = response;

        // Check if attention is in a terminal state (CANCELED, FINISHED, FAILED)
        if (this.isAttentionInTerminalState()) {
          this.loading = false;
          const stateMessage = this.getTerminalStateMessage();
          this.showAlert('warning', 'Atención no editable', stateMessage);
          this.router.navigate(['/care-management/attentions']);
          return;
        }

        this.initializeForms();

        // Update analysisIds signal (unless we're skipping reload)
        if (!this.skipAnalysisReload && response.analysisIds) {
          this.analysisIds.set(response.analysisIds);
        }

        // Reset the skip flag after use
        this.skipAnalysisReload = false;

        // Restore billingId from sessionStorage if available
        const storedBillingId = sessionStorage.getItem(
          `billing_id_${this.attentionId}`
        );
        if (storedBillingId) {
          this.billingId = Number(storedBillingId);
        }

        // Restore hasShift from sessionStorage if available
        const storedHasShift = sessionStorage.getItem(
          `has_shift_${this.attentionId}`
        );
        if (storedHasShift !== null) {
          this.hasShift = storedHasShift === 'true';
        }

        this.determineWorkflowState();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar la atención');
        this.loading = false;
        this.router.navigate(['/care-management']);
      }
    });
  }

  /**
   * Determines the workflow state based on attention data
   * Sets the appropriate activeStep and flags for payment/invoice
   */
  private determineWorkflowState(): void {
    if (!this.attention) return;

    // Check if payment exists
    this.hasPayment =
      !!this.attention.paymentId && this.attention.paymentId > 0;

    // Check if billing/invoice exists (using billingId from component state)
    this.hasInvoice = !!this.billingId && this.billingId > 0;

    // Determine the correct step based on completed stages
    // Step 0: General data (patient, doctor, coverage)
    const hasGeneralData =
      this.attention.patientId &&
      this.attention.doctorId &&
      this.attention.insurancePlanId;

    // Step 1: Analysis
    const hasAnalysis =
      this.attention.analysisIds && this.attention.analysisIds.length > 0;

    // Calculate what the step SHOULD be based on data
    let calculatedStep = 1;
    if (!hasGeneralData) {
      calculatedStep = 1;
    } else if (!hasAnalysis) {
      calculatedStep = 2;
    } else if (!this.hasPayment) {
      calculatedStep = 3;
    } else if (!this.hasInvoice) {
      calculatedStep = 4;
    } else {
      calculatedStep = 5;
    }

    // Only update activeStep if:
    // 1. activeStep is 1 (initial load), OR
    // 2. Current step is beyond what data supports (e.g., on step 4 but no payment exists)
    if (this.activeStep() === 1 || this.activeStep() > calculatedStep) {
      this.activeStep.set(calculatedStep);
    }
  }

  /**
   * Initializes forms with existing attention data
   */
  initializeForms(): void {
    if (!this.attention) return;

    const pendingPatientDNI = sessionStorage.getItem('pendingPatientDNI');
    let patientId = this.attention.patientId;

    if (pendingPatientDNI && !this.attention.patientId) {
      patientId = Number(pendingPatientDNI);
      sessionStorage.removeItem('pendingPatientDNI');
      this.showAlert(
        'info',
        'Paciente precargado',
        `Documento ${pendingPatientDNI} listo para asignar`
      );
    }

    this.generalInfoInitialValue = {
      patientId: patientId || null,
      coverageId: this.attention.insurancePlanId || null,
      doctorId: this.attention.doctorId || null
    };

    this.noteInitialValue = {
      isUrgent: this.attention.isUrgent || false
    };
  }

  /**
   * Handles general information form submission
   */
  onGeneralInformationSubmit(): void {
    if (!this.attentionId) return;

    const patientId =
      this.patientGeneralData?.patient.id ?? this.attention?.patientId;
    const coverageId =
      this.patientGeneralData?.selectedCoverageId ??
      this.attention?.insurancePlanId;

    const doctorCtrlValue = this.doctorAutocompleteComponent?.getSelectedDoctor();

    const doctorId =
      this.selectedDoctor?.id ??
      this.selectedDoctorId ??
      doctorCtrlValue?.id ??
      this.attention?.doctorId ??
      null;

    if (!patientId || !coverageId || !doctorId) {
      this.showAlert(
        'warning',
        'Validación',
        'Por favor complete todos los campos requeridos'
      );
      return;
    }

    this.saving = true;
    const generalInformation = {
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      coverageId: Number(coverageId),
      indications: this.indicationsText || ''
    };

    this.attentionService
      .assignGeneralDataToAttention(this.attentionId, generalInformation)
      .subscribe({
        next: () => {
          this.saving = false;
          this.showAlert(
            'success',
            'Éxito',
            'Información general asignada correctamente'
          );
          this.activeStep.set(2);
          this.loadAttention();
        },
        error: () => {
          this.saving = false;
          this.showAlert(
            'error',
            'Error',
            'No se pudo asignar la información general'
          );
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handles analyses form submission
   */
  onAnalysesSubmit(formValue: any): void {
    this.saveAnalyses(formValue);
  }

  /**
   * Saves analyses and notes
   */
  private async saveAnalyses(formValue: any): Promise<void> {
    if (!this.attentionId) return;

    try {
      const isUrgent = formValue.isUrgent || false;
      const authorizationNumberStr =
        this.analysisListComponent?.getAuthorizationNumber() || '0';
      const authorizationNumber = parseInt(authorizationNumberStr, 10) || 0;

      let savedAnalysisIds: number[] = [];
      if (this.analysisListComponent) {
        savedAnalysisIds = await this.analysisListComponent.saveAnalyses(
          isUrgent,
          authorizationNumber
        );

        if (this.attention) {
          this.attention.analysisIds = savedAnalysisIds;
          this.attention.isUrgent = isUrgent;
          this.attention.authorizationNumber = authorizationNumber;
        }

        // Update the signal to trigger reactivity in collector component
        this.analysisIds.set(savedAnalysisIds);
      }

      this.attentionService
        .getPaymentInfoForAttention(this.attentionId)
        .subscribe({
          next: () => {
            this.saving = false;
            this.activeStep.set(3);
            this.showAlert('success', 'Éxito', 'Análisis guardados correctamente');
            this.loadAttention();
          },
          error: () => {
            this.saving = false;
            this.showAlert(
              'error',
              'Error',
              'No se pudo obtener la información de pago'
            );
            this.cdr.markForCheck();
          }
        });
    } catch {
      this.saving = false;
      this.showAlert('error', 'Error', 'No se pudieron guardar los análisis');
      this.cdr.markForCheck();
    }
  }

  /**
   * Adds payment to attention
   */
  addPayment(paymentId: number): void {
    if (!this.attentionId) return;

    this.paymentId = paymentId;

    this.saving = true;
    this.attentionService
      .addPaymentToAttention(this.attentionId, { paymentId: paymentId })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.hasPayment = true; // Set flag to indicate payment exists
          this.showAlert('success', 'Éxito', 'Pago agregado correctamente');
          this.activeStep.set(4);
          this.loadAttention();
        },
        error: () => {
          this.showAlert('error', 'Error', 'No se pudo agregar el pago');
        }
      });
  }

  /**
   * Stores billing ID from invoice component and completes the billing phase
   * This is called after the invoice is successfully created
   */
  storeBillingId(billingId: number): void {
    this.billingId = billingId;
    this.hasInvoice = true; // Set flag to indicate invoice exists

    // Persist billingId in sessionStorage
    if (this.attentionId) {
      sessionStorage.setItem(
        `billing_id_${this.attentionId}`,
        String(billingId)
      );
    }

    // Now that invoice is created, complete the billing phase
    this.completeBillingPhase();
  }

  /**
   * Processes billing and advances to next step
   */
  billAttention(): void {
    if (!this.attentionId) return;

    this.pendingPdfData = this.invoiceComponent?.buildBillingForPdf();

    this.showPdfBillingModal = true;
  }

  /**
   * Initiates the invoice creation process
   * The invoice component will emit invoiceCreatedId when done,
   * which triggers storeBillingId() -> completeBillingPhase()
   */
  private finalizeBillingStep(): void {
    this.saving = true;
    this.invoiceComponent?.finishInvoice();
  }

  /**
   * Completes the billing phase after invoice is created
   * Called from storeBillingId() after the invoice is successfully created
   */
  private completeBillingPhase(): void {
    this.attentionService.endBillingPhase(this.attentionId!).subscribe({
      next: () => {
        this.saving = false;
        this.showAlert('success', 'Éxito', 'Facturación completada correctamente.');
        this.activeStep.set(5);
        this.loadAttention();
      },
      error: () => {
        this.saving = false;
        this.showAlert('error', 'Error', 'No se pudo completar la facturación');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handles PDF billing confirmation
   */
  onPdfBillingConfirm() {
    if (this.pendingPdfData) {
      this.invoicePdfService.downloadInvoicePDF(
        this.pendingPdfData,
        `Factura_${new Date().toISOString()}.pdf`
      );
    }

    this.showPdfBillingModal = false;
    this.finalizeBillingStep();
  }

  /**
   * Handles PDF billing dismissal
   */
  onPdfBillingDismiss() {
    this.showPdfBillingModal = false;
    this.finalizeBillingStep();
  }


  /**
   * Finishes the attention workflow and updates queue status
   */
  finishWorkflow(): void {
    if (!this.attentionId) return;

    this.saving = true;

    this.attentionService
      .endAttentionBySecretaryProcess(this.attentionId)
      .subscribe({
        next: () => {
          this.saving = false;
          this.showAlert(
            'success',
            'Éxito',
            'Atención finalizada correctamente'
          );

          // Clean up sessionStorage when finishing attention
          sessionStorage.removeItem('current_attention_id');
          if (this.attentionId) {
            sessionStorage.removeItem(`billing_id_${this.attentionId}`);
            sessionStorage.removeItem(`has_shift_${this.attentionId}`);
          }

          // Update queue status to COMPLETED if patient came from queue
          if (
            this.queuePatient &&
            this.queuePatient.publicCode &&
            !this.queuePatient.publicCode.startsWith('BLANK-')
          ) {
          } else {
            // Navigate directly if not from queue
            setTimeout(() => {
              this.router.navigate(['/care-management/attentions']);
            }, 1500);
          }
        },
        error: () => {
          this.saving = false;
          this.showAlert('error', 'Error', 'No se pudo finalizar la atención');
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Builds a Ticket DTO
   */
  private buildTicketDto(): void {
    if (!this.attention) return;

    this.ticketBuilderService.buildTicket(this.attention).subscribe({
      next: (ticket) => {
        this.ticketDto = ticket;
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo generar el ticket');
      }
    });
  }

  /**
   * Prints attention
   * It always tries to print, but even if it fails or there's no ticket,
   * Finally, it allows you to continue with the completion of the workflow.
   */
  printAttention(): void {
    if (!this.attentionId || !this.attention) return;

    if (this.ticketDto) {
      this.doPrint(this.ticketDto);
      return;
    }

    this.saving = true;
    this.ticketBuilderService.buildTicket(this.attention).subscribe({
      next: (ticket) => {
        this.ticketDto = ticket;
        this.doPrint(ticket);
      },
      error: () => {
        this.saving = false;
        this.showAlert('error', 'Error', 'No se pudo generar el ticket');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * print method
   */
  private doPrint(ticket: TicketDto): void {
    this.attentionService
      .printAttention(this.attentionId!, ticket)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);

          iframe.onload = () => {
            iframe.contentWindow?.print();
            URL.revokeObjectURL(url);
          };

          this.saving = false;
          this.printed = true;
          this.showAlert('success', 'Éxito', 'Ticket generado correctamente');
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.showAlert('error', 'Error', 'No se pudo generar el ticket');
          this.cdr.markForCheck();
        }
      });
  }

  /** Navigate to previous step */
  previousStep(): void {
    if (this.activeStep() > 1) {
      const targetStep = this.activeStep() - 1;

      this.saving = true;

      // First revert the backend state, then update UI
      this.attentionService.reverseAttention(this.attentionId!).subscribe({
        next: () => {
          this.saving = false;
          // Only update UI step after backend confirms state change
          this.activeStep.set(targetStep);

          // WORKAROUND: Clear analysisIds when going back to step 2
          // This prevents duplicate authorization records in the backend
          // because the backend's createAuthorizations doesn't delete old records
          if (targetStep === 2) {
            // Set flag to skip reloading analyses from backend
            this.skipAnalysisReload = true;

            // Clear the signal and the attention object
            this.analysisIds.set([]);
            if (this.attention) {
              this.attention.analysisIds = [];
            }
          }

          this.loadAttention();
        },
        error: () => {
          this.saving = false;
          // If reverse fails, still allow UI navigation but reload to sync with backend state
          this.activeStep.set(targetStep);
          this.loadAttention();
          this.cdr.markForCheck();
        }
      });
    }
  }

  /** Navigate to next step */
  nextStep(): void {
    if (this.activeStep() < this.steps.length) {
      this.activeStep.update(step => step + 1);
    }
  }

  /**
   * Advances from step 4 (billing) to step 5 (confirmation)
   * When invoice already exists, we need to call endBillingPhase to advance backend state
   * This is needed when user goes back from step 5 and then forward again
   */
  advanceToConfirmation(): void {
    if (!this.attentionId) return;

    // If already in AWAITING_CONFIRMATION state, just advance the UI step
    if (this.attention?.attentionState === 'AWAITING_CONFIRMATION') {
      this.activeStep.set(5);
      return;
    }

    this.saving = true;

    // Call backend to advance state from ON_BILLING_PROCESS to AWAITING_CONFIRMATION
    this.attentionService.endBillingPhase(this.attentionId).subscribe({
      next: () => {
        this.saving = false;
        this.activeStep.set(5);
        this.loadAttention();
      },
      error: () => {
        this.saving = false;
        // If end-billing fails, it might be because we're already past that state
        // Try to just advance the UI and reload attention to sync state
        this.activeStep.set(5);
        this.loadAttention();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Navigate to a specific step (used by stepper buttons)
   * Only allows navigation to completed steps
   */
  goToStep(stepIndex: number): void {
    if (!this.attention) return;

    // Determine which steps are accessible
    const hasGeneralData =
      this.attention.patientId &&
      this.attention.doctorId &&
      this.attention.insurancePlanId;
    const hasAnalysis =
      this.attention.analysisIds && this.attention.analysisIds.length > 0;

    // Define max accessible step based on completed stages
    let maxAccessibleStep = 1;

    if (hasGeneralData) maxAccessibleStep = 2;
    if (hasAnalysis) maxAccessibleStep = 3;
    if (this.hasPayment) maxAccessibleStep = 4;
    if (this.hasInvoice) maxAccessibleStep = 5;

    // Only allow navigation to accessible steps
    if (stepIndex <= maxAccessibleStep) {
      this.activeStep.set(stepIndex);
    } else {
      this.showAlert(
        'warning',
        'Paso no disponible',
        'Debe completar los pasos anteriores primero'
      );
    }
  }

  /** Cancel and go back */
  cancel(): void {
    if (!this.queuePatient?.publicCode) {
      this.clearSessionAndExit();
      return;
    }

    if (this.queuePatient.publicCode.startsWith('BLANK-')) {
      this.clearSessionAndExit();
      return;
    }

    const updateDto: QueueUpdateDto = {
      publicCode: this.queuePatient.publicCode,
      nationalId: this.queuePatient.nationalId,
      status: QueueStatusEnum.PENDING,
      branchId: this.currentBranchId,
      boxNumber: this.queuePatient.boxNumber || 1
    };

    this.queueService.updateQueueStatus(updateDto).pipe(
      finalize(() => this.cdr.markForCheck())
    ).subscribe({
      next: () => {
        this.showAlert('success', 'Turno devuelto a la cola', 'La atención fue revertida y el paciente volvió al estado pendiente.');
        this.clearSessionAndExit();
      },
      error: () => {
        this.showAlert('warning', 'Aviso', 'Volvimos a la pantalla de cola, pero no se pudo actualizar el turno.');
        this.clearSessionAndExit();
      }
    });
  }

  /** Limpia sessionStorage y navega a la cola */
  private clearSessionAndExit() {
    sessionStorage.removeItem('current_attention_id');
    if (this.attentionId) {
      sessionStorage.removeItem(`billing_id_${this.attentionId}`);
      sessionStorage.removeItem(`has_shift_${this.attentionId}`);
    }

    this.router.navigate(['/care-management/attentions']);
  }

  /**
   * Updates loading state from child components.
   * @param $event Loading flag emitted by child components.
   */
  setIsLoading($event: boolean) {
    this.loading = $event;
  }

  /**
   * Updates the billing data when changes are received from the collector component.
   * @param data Data emitted by the collector component.
   */
  onCollectorDataChange(data: any): void {
    this.billingDataFromCollection = data;
  }

  /**
   * Display an alert message with auto-hide after 5 seconds
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }

  /**
   * Opens the cancel attention modal
   */
  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  /**
   * Closes the cancel attention modal
   */
  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  /**
   * Checks if the attention is in a terminal state (CANCELED, FINISHED, FAILED)
   * @returns true if attention is in a terminal state, false otherwise
   */
  private isAttentionInTerminalState(): boolean {
    if (!this.attention?.attentionState) return false;
    const terminalStates = ['CANCELED', 'FINISHED', 'FAILED'];
    return terminalStates.includes(this.attention.attentionState);
  }

  /**
   * Gets a user-friendly message for the terminal state
   * @returns Message describing why the attention cannot be edited
   */
  private getTerminalStateMessage(): string {
    if (!this.attention?.attentionState) return 'Esta atención no puede ser editada.';

    switch (this.attention.attentionState) {
    case 'CANCELED':
      return 'Esta atención fue cancelada y no puede ser editada.';
    case 'FINISHED':
      return 'Esta atención ya fue finalizada y no puede ser editada.';
    case 'FAILED':
      return 'Esta atención falló y no puede ser editada.';
    default:
      return 'Esta atención no puede ser editada.';
    }
  }

  /**
   * Checks if cancel button should be visible
   * Cancel is available on steps 1-4 (before final confirmation)
   * Backend will validate terminal states
   */
  get canCancelAttention(): boolean {
    return this.activeStep() < 6;
  }

  /**
   * Confirms and executes the attention cancellation
   * Refactored to use RxJS operators for better readability and maintainability
   * @param reason Cancellation reason from the confirmation modal
   */
  confirmCancelAttention(reason: string | void): void {
    const cancellationReason = typeof reason === 'string' ? reason.trim() : '';
    if (!this.attentionId || !cancellationReason) return;

    this.saving = true;

    const dto: CancelAttentionRequestDto = { cancellationReason };
    const NAVIGATION_DELAY = 1500;

    this.attentionService
      .cancelAttention(this.attentionId, dto)
      .pipe(
        tap(() => {
          this.showCancelModal.set(false);
          this.showAlert(
            'success',
            'Atención cancelada',
            'La atención fue cancelada correctamente.'
          );

          // Clean up sessionStorage when canceling attention
          sessionStorage.removeItem('current_attention_id');
          if (this.attentionId) {
            sessionStorage.removeItem(`billing_id_${this.attentionId}`);
            sessionStorage.removeItem(`has_shift_${this.attentionId}`);
          }
        }),

        delay(NAVIGATION_DELAY),

        switchMap(() => {
          const shouldUpdateQueue =
            this.queuePatient &&
            this.queuePatient.publicCode &&
            !this.queuePatient.publicCode.startsWith('BLANK-');

          if (!shouldUpdateQueue) {
            return of(null);
          }

          const updateDto: QueueUpdateDto = {
            publicCode: this.queuePatient!.publicCode,
            nationalId: this.queuePatient!.nationalId,
            status: QueueStatusEnum.CANCELED,
            branchId: this.currentBranchId,
            boxNumber: this.queuePatient!.boxNumber | 1
          };

          return this.queueService.updateQueueStatus(updateDto).pipe(
            catchError((err) => {
              const queueMsg =
                err?.error?.message || 'No se pudo actualizar la cola';
              this.showAlert('warning', 'Aviso', `Atención cancelada, pero: ${queueMsg}`);

              return of(null);
            })
          );
        }),

        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/care-management/attentions']);
        },
        error: (err) => {
          const errorMessage =
            err?.error?.message || 'No se pudo cancelar la atención';
          this.showAlert('error', 'Error', errorMessage);
        }
      });
  }

  /**
   * Obtiene el branchId desde localStorage usando la estructura auth_user.branch
   * @returns ID de la sucursal
   */
  private getBranchId(): number {
    const userDataRaw = localStorage.getItem(this.userKey);

    if (!userDataRaw) {
      throw new Error(`No se encontró '${this.userKey}' en localStorage`);
    }

    let userData: any;
    try {
      userData = JSON.parse(userDataRaw);
    } catch (e) {
      throw new Error(`Error al parsear '${this.userKey}': ${e}`);
    }

    const branchId = Number(userData?.branch);

    if (Number.isNaN(branchId) || !Number.isFinite(branchId)) {
      throw new Error(`El valor 'branch' del usuario no es válido: ${userData?.branch}`);
    }

    return branchId;
  }
}
