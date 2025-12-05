import { DatePipe, NgIf, CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { StepperModule } from 'primeng/stepper';
// RxJS
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  Subscription,
  switchMap,
  take,
  timer
} from 'rxjs';
// Generic UI
import type { AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { GenericAddressFormComponent } from 'src/app/shared/components/generic-direction-form/generic-address-form.component';
import {
  GenericFormComponent,
  GenericFormField
} from 'src/app/shared/components/generic-form/generic-form.component';
import { InsurerPlanSelectorComponent } from 'src/app/shared/components/insurer-plan-selector/insurer-plan-selector.component';

import { TutorialOverlayComponent as GenericTutorialComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { TutorialConfig, TutorialStep } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { AttentionShift } from '../../../care-management/models/attention-shift';
import { Patient } from '../../models/PatientModel';
import { PatientService } from '../../services/PatientService';
// Validators
import { ValidatorUtils } from '../../validators/ValidatorUtils';

/**
 * Component for editing and verifying patient data.
 * Handles a multistep form with basic information, addresses, and medical coverages.
 *
 * @component
 * @standalone
 * @example
 * ```html
 * <app-patients-edit-form></app-patients-edit-form>
 * ```
 */
@Component({
  selector: 'app-patients-edit-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    StepperModule,
    NgIf,
    DatePipe,
    GenericFormComponent,
    GenericBadgeComponent,
    GenericAddressFormComponent,
    GenericButtonComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    InsurerPlanSelectorComponent,
    GenericTutorialComponent,
    CommonModule
  ],
  providers: [],
  templateUrl: './patients-edit-form.component.html',
  styleUrls: ['./patients-edit-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsEditFormComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Main reactive form containing all patient data */
  patientForm!: FormGroup;

  /** Current step of the form (0: basic data, 1: addresses and coverages) */
  currentStep = 0;

  /** Indicates whether step 1 should be displayed */
  showStep1 = true;

  /** Indicates if component is in edit mode (true) or create mode (false) */
  isEditMode = signal(false);

  /** Controls the collapsed/expanded state of the addresses section */
  addressesCollapsed = true;

  /** Controls visibility of alert messages */
  alertVisible = false;

  /** Type of alert to display */
  alertType: AlertType | null = null;

  /** Title text for alert */
  alertTitle = '';

  /** Body text for alert */
  alertText = '';

  /** List of available coverage types */
  coverageTypes: { id: number; name: string }[] = [];

  /** Configuration fields for coverage form */
  coverageFields: GenericFormField[] = [];

  /** Tracks which item is being edited (by index) for coverages and addresses */
  editing = { coverages: -1, addresses: -1 };

  /** Maps plan IDs to their display names */
  selectedPlansMap: Map<number, string> = new Map();

  /** Map to track which coverages have PARTICULAR selected (index -> isParticular) */
  particularCoveragesMap: Map<number, boolean> = new Map();

  /** Label for patient verification status */
  patientStatusLabel: string = '';

  /** CSS class for patient verification status styling */
  patientStatusClass: string = '';

  /** Badge type for patient verification status */
  patientStatusBadgeType:
    | 'activo'
    | 'inactivo'
    | 'pendiente'
    | 'minimo'
    | 'completo'
    | 'verificado' = 'activo';

  readonly MAX_COVERAGES = 2;

  private addressInitials: any[] = []; // immutable cache by index
  private addressInitialLoaded: boolean[] = []; // mark "already injected and not reinjected"

  // up with the rest of prop
  private savedAddresses: any[] = [];

  private tutorialSub?: Subscription;

  /** Reference to coverage generic form component */
  @ViewChild('coverageGF') coverageGF?: any;

  /** Reference to address generic form component */
  @ViewChild('addressGF') addressGF?: any;

  /** Reference to basic info generic form component */
  @ViewChild('basicGF') basicGF?: GenericFormComponent;

  @ViewChild('guardianGF') guardianGF?: GenericFormComponent;

  /** Query list of all address form components */
  @ViewChildren('addressForm')
    addressForms!: QueryList<GenericAddressFormComponent>;
  @ViewChild('tutorialOverlay') tutorialOverlay?: GenericTutorialComponent;
  @ViewChild('tutorialOverlayStep2') tutorialOverlayStep2?: GenericTutorialComponent;
  @ViewChild('tutorialOverlayStep3') tutorialOverlayStep3?: GenericTutorialComponent;

  /**
   * Defines the tutorial configuration based on component state.
   */
  tutorialConfig = computed<TutorialConfig>(() => {
    const steps: TutorialStep[] = [
      {
        target: '.sec-basic',
        title: 'Datos básicos',
        message: 'Completá los datos personales del paciente. Los campos con (*) son obligatorios.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: '.sec-coverages-inline',
        title: 'Aseguradora',
        message: 'Seleccioná la aseguradora y el plan del paciente. Podés agregar más de una cobertura.',
        position: 'top',
        highlightPadding: 10
      },
      {
        target: '.sec-addresses-inline',
        title: 'Domicilio',
        message: 'Ingresá el domicilio del paciente. Este paso es opcional.',
        position: 'top',
        highlightPadding: 10
      }
    ];

    // Conditionally add 'Agregar tutor' step only in creation mode
    if (!this.isEditMode()) {
      steps.push({
        target: '.btn-tutor-toggle',
        title: 'Agregar Tutor',
        message: 'Si el paciente es menor de edad, puedes agregar un tutor aquí.',
        position: 'top',
        highlightPadding: 10
      });
    }

    steps.push({
      target: '.step-actions-right',
      title: 'Continuar',
      message: 'Una vez completados los datos, hacé clic en "Siguiente" para continuar.',
      position: 'left',
      highlightPadding: 10
    });

    return { steps: steps };
  });

  /**
   * Defines the tutorial configuration for step 2.
   */
  tutorialConfigStep2 = computed<TutorialConfig>(() => {
    const steps: TutorialStep[] = [
      {
        target: '.guardian-grid',
        title: 'Datos del tutor',
        message: 'Completá los datos personales del tutor. Los campos con (*) son obligatorios.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: '.verify-row',
        title: 'Verificación del tutor',
        message: 'Marcá esta casilla para verificar los datos del tutor.',
        position: 'top',
        highlightPadding: 10
      },
      {
        target: '.step-actions-2',
        title: 'Navegación',
        message: 'Utilizá los botones "Anterior" y "Siguiente" para moverte entre los pasos del formulario.',
        position: 'top',
        highlightPadding: 10
      }
    ];

    return { steps: steps };
  });

  /**
   * Defines the tutorial configuration for step 3.
   */
  tutorialConfigStep3 = computed<TutorialConfig>(() => {
    const steps: TutorialStep[] = [
      {
        target: '.summary-group-basic',
        title: 'Resumen de datos básicos',
        message: 'Revisá los datos personales del paciente.',
        position: 'top',
        highlightPadding: 5
      }
    ];

    if (this.guardians.length > 0) {
      steps.push({
        target: '.summary-group-guardian',
        title: 'Resumen del tutor',
        message: 'Revisá los datos del tutor.',
        position: 'top',
        highlightPadding: 5
      });
    }

    steps.push(
      {
        target: '.summary-group-coverages',
        title: 'Resumen de coberturas',
        message: 'Revisá las coberturas del paciente.',
        position: 'top',
        highlightPadding: 5
      },
      {
        target: '.summary-group-addresses',
        title: 'Resumen de domicilio',
        message: 'Revisá el domicilio del paciente.',
        position: 'top',
        highlightPadding: 5
      },
      {
        target: '.step-actions-3',
        title: 'Finalizar',
        message: 'Hacé clic en "Verificar" o "Guardar" para finalizar el proceso.',
        position: 'top',
        highlightPadding: 10
      }
    );

    return { steps: steps };
  });

  /**
   * Starts the tutorial for step 1.
   */
  startTutorialStep1(): void {
    this.tutorialOverlay?.start();
  }

  /**
   * Starts the tutorial for step 2.
   */
  startTutorialStep2(): void {
    this.tutorialOverlayStep2?.start();
  }

  /**
   * Starts the tutorial for step 3.
   */
  startTutorialStep3(): void {
    this.tutorialOverlayStep3?.start();
  }


  /** Initial values for basic patient information */
  basicInitial = {
    dni: '',
    firstName: '',
    lastName: '',
    birthDate: null as Date | string | null,
    sexAtBirth: null as string | null,
    gender: null as string | null,
    email: '',
    phone: ''
  };

  /** Configuration for basic patient information form fields */
  basicFields: GenericFormField[] = [
    {
      name: 'dni',
      label: 'Documento',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^\\d{7,8}$',
      minLength: 7,
      maxLength: 8,
      messages: {
        required: 'El documento es obligatorio',
        pattern: 'El documento debe tener entre 7 y 8 dígitos y solo números'
      }
    },
    {
      name: 'lastName',
      label: 'Apellido',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^[a-zA-ZÀ-ÿ\\s]{2,50}$',
      maxLength: 50,
      messages: {
        required: 'El apellido es obligatorio',
        pattern: 'El apellido debe tener entre 2 y 50 letras, sin símbolos'
      }
    },
    {
      name: 'firstName',
      label: 'Nombre',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^[a-zA-ZÀ-ÿ\\s]{2,50}$',
      maxLength: 50,
      messages: {
        required: 'El nombre es obligatorio',
        pattern: 'El nombre debe tener entre 2 y 50 letras, sin símbolos'
      }
    },
    {
      name: 'birthDate',
      label: 'Fecha de nacimiento',
      type: 'date',
      required: true,
      colSpan: 1,
      maxDate: new Date(),
      messages: {
        required: 'La fecha de nacimiento es obligatoria',
        dateMax: 'No puede ser una fecha futura'
      }
    },
    {
      name: 'sexAtBirth',
      label: 'Sexo al nacer',
      type: 'select',
      required: true,
      colSpan: 1,
      options: [
        { label: 'Masculino', value: 'MALE' },
        { label: 'Femenino', value: 'FEMALE' }
      ],
      messages: { required: 'El sexo al nacer es obligatorio' }
    },
    {
      name: 'gender',
      label: 'Género',
      type: 'select',
      required: true,
      colSpan: 1,
      options: [
        { label: 'Masculino', value: 'MALE' },
        { label: 'Femenino', value: 'FEMALE' },
        { label: 'Otro', value: 'OTHER' }
      ],
      messages: { required: 'El género es obligatorio' }
    },
    {
      name: 'phone',
      label: 'Teléfono',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^[0-9]{7,15}$',
      maxLength: 15,
      messages: {
        required: 'El teléfono es obligatorio',
        pattern: 'El teléfono debe tener entre 7 y 15 dígitos (solo números)'
      }
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: false,
      maxLength: 100,
      colSpan: 1,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      messages: {
        pattern: 'Ingrese un email válido (ej: usuario@ejemplo.com)'
      }
    }
  ];

  /** Original DNI value used to exclude current patient from uniqueness validation */
  private originalDni: string | null = null;

  /** ID of the patient being edited */
  private patientId!: number;

  /** Temporary storage for address data during async operations */
  private pendingAddressData: any[] = [];

  /** Maps coverage array index to member number values */
  public coverageMemberNumbers: Map<number, string> = new Map();

  PatientFromCare: boolean = false;

  /** Controls visibility of verification confirmation modal */
  verifyModalOpen = false;

  /** Indicates if patient came from backend already verified */
  alreadyVerified: boolean = false;
  private readonly CARE_ROUTE = '/care-management/attentions/workflow';
  private readonly PATIENTS_ROUTE = '/patients';

  /**
   * Creates an instance of PatientsEditFormComponent.
   *
   * @param fb - Angular FormBuilder service for creating reactive forms
   * @param route - ActivatedRoute service for accessing route parameters
   * @param patientService - Service for patient-related API operations
   * @param router - Router service for navigation
   * @param cdr - ChangeDetectorRef for manual change detection
   * @param breadcrumbService
   * @param tutorialService
   */
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private patientService: PatientService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrumbService: BreadcrumbService,
    private tutorialService: TutorialService
  ) {}

  /**
   * Lifecycle hook that initializes the component.
   * Builds the form, loads coverage types, retrieves patient ID from route,
   * and loads existing patient data if editing.
   */
  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    // Permitir tanto 'atencion' como 'workflow' para compatibilidad
    if (params['origen'] === 'atencion' || params['origen'] === 'workflow') {
      this.PatientFromCare = true;
    }

    this.buildForm();
    this.loadCoverageTypes();

    this.patientId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode.set(!!this.patientId); // Set edit mode if patientId exists
    this.initVerifyCheckboxGate();

    if (this.patientId) {
      this.loadPatientData(this.patientId);
    } else {
      // Modo creación: inicializar con una dirección vacía
      const emptyAddress = this.createAddress();
      emptyAddress.get('isPrimary')?.setValue(true, { emitEvent: false });
      this.addresses.push(emptyAddress);
    }

    if (this.coverages.length === 0) {
      const c = this.createCoverage();
      c.get('isPrimary')?.setValue(true, { emitEvent: false });
      this.coverages.push(c);
    }

    // Configurar breadcrumbs automáticamente desde route data
    this.breadcrumbService.buildFromRoute(this.route);

    // Subscribe to tutorial triggers
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      // Only trigger tutorial if the current route matches the patient edit form
      if (route.includes('patients/form') || route.includes('patients/edit-patient')) {
        // Use a small delay to ensure the view is updated after step change
        setTimeout(() => {
          if (this.currentStep === 0) {
            this.startTutorialStep1();
          } else if (this.currentStep === 1) {
            this.startTutorialStep2();
          } else if (this.currentStep === 2) {
            this.startTutorialStep3();
          }
        }, 200);
      }
    });
  }

  /**
   * Lifecycle hook called when the component is destroyed.
   * Cleans up the tutorial service subscription to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }


  /**
   * Lifecycle hook called after component view initialization.
   * Sets up value change subscriptions for the basic info form.
   */
  ngAfterViewInit(): void {
    if (this.basicGF?.form) {
      // Attach async DNI validator to the GenericForm's internal DNI control
      const dniCtrlChild = this.basicGF.form.get('dni');
      if (dniCtrlChild) {
        dniCtrlChild.clearAsyncValidators();
        dniCtrlChild.setAsyncValidators([
          this.dniUniqueValidator(this.originalDni)
        ]);
        dniCtrlChild.updateValueAndValidity({ emitEvent: false });
      }

      this.basicGF.form.valueChanges
        .pipe(
          debounceTime(150),
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          )
        )
        .subscribe((v) => {
          this.patientForm.patchValue(v, { emitEvent: false });

          // Sync DNI errors and touched state from child to parent for display
          const dniCtrlChild = this.basicGF?.form?.get('dni');
          const parentDni = this.patientForm.get('dni');

          if (dniCtrlChild && parentDni) {
            // Sync touched state
            if (dniCtrlChild.touched && !parentDni.touched) {
              parentDni.markAsTouched();
            }

            // Sync dniTaken error
            if (dniCtrlChild.errors?.['dniTaken']) {
              const currentErrors = parentDni.errors || {};
              parentDni.setErrors({ ...currentErrors, dniTaken: true });
            } else if (
              parentDni.errors?.['dniTaken'] &&
              !dniCtrlChild.errors?.['dniTaken']
            ) {
              // Remove only dniTaken error, preserve others
              const { dniTaken: _dniTaken, ...otherErrors } =
                parentDni.errors ?? {};
              parentDni.setErrors(
                Object.keys(otherErrors).length > 0 ? otherErrors : null
              );
            }
          }

          this.cdr.markForCheck();
        });
    }

    // If the patient was already verified when loaded, ensure the basic fields are
    // disabled after the child GenericForm is available (post view init).
    if (this.alreadyVerified) {
      this.toggleBasicFieldsDisabled(true);
    }
    // Also check the control value after a tick, in case the verified flag was set
    // with emitEvent:false during data load
    setTimeout(() => {
      const isVerified = !!this.patientForm.get('isVerified')?.value;
      if (isVerified) this.toggleBasicFieldsDisabled(true);
    }, 120);

    // Trigger the sync even if there are no 'changes' (in case they are already mounted)
    setTimeout(() => this.syncAddressesToGenericForms(), 120);

    // And also, when they change (e.g., if you collapse/expand), sync once
    this.addressForms?.changes?.pipe(take(1)).subscribe(() => {
      this.syncAddressesToGenericForms();
    });
  }

  /**
   * Builds the main patient form with all validators.
   * Creates FormGroups for basic info and FormArrays for addresses and coverages.
   *
   * @private
   */
  private buildForm(): void {
    this.patientForm = this.fb.group({
      dni: [
        '',
        {
          validators: [Validators.required, ValidatorUtils.dni()],
          asyncValidators: [this.dniUniqueValidator()],
          updateOn: 'blur'
        }
      ],
      firstName: [
        '',
        {
          validators: [Validators.required, ValidatorUtils.onlyLetters(), Validators.maxLength(50)],
          updateOn: 'blur'
        }
      ],
      lastName: [
        '',
        {
          validators: [Validators.required, ValidatorUtils.onlyLetters(), Validators.maxLength(50)],
          updateOn: 'blur'
        }
      ],
      birthDate: ['', [Validators.required, ValidatorUtils.notFutureDate()]],
      sexAtBirth: ['', Validators.required],
      gender: ['', Validators.required],
      email: [
        '',
        {
          validators: [Validators.pattern('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')],
          updateOn: 'blur'
        }
      ],
      phone: [
        '',
        {
          validators: [
            Validators.required,
            Validators.pattern('^[0-9]{7,15}$')
          ],
          updateOn: 'blur'
        }
      ],
      isVerified: [false],
      addresses: this.fb.array([]),
      coverages: this.fb.array([], {
        validators: [
          ValidatorUtils.coverageCount(1, 2),
          ValidatorUtils.uniquePrimaryCoverage()
        ]
      }),
      guardians: this.fb.array([])
    });
  }

  /**
   * Loads available coverage types from hardcoded list.
   * Also configures the form fields for coverage dialogs.
   *
   * @private
   */
  private loadCoverageTypes(): void {
    this.coverageTypes = [
      { id: 1, name: 'OSDE' },
      { id: 2, name: 'Swiss Medical' },
      { id: 3, name: 'Galeno' },
      { id: 4, name: 'Medifé' }
    ];

    this.coverageFields = [
      {
        name: 'planId',
        label: 'Tipo de cobertura',
        type: 'select',
        required: true,
        colSpan: 4,
        options: this.coverageTypes.map((c) => ({
          label: c.name,
          value: c.id
        }))
      },
      {
        name: 'memberNumber',
        label: 'Nro Afiliado',
        type: 'text',
        required: true,
        maxLength: 20,
        colSpan: 3
      },
      { name: 'isPrimary', label: 'Principal', type: 'checkbox', colSpan: 1 }
    ];
  }

  // ====== GUARDIAN (same as Alta) ======
  guardianInitial: any = {
    relation: '',
    dni: '',
    lastName: '',
    firstName: '',
    phone: '',
    email: ''
  };

  guardianFields: GenericFormField[] = [
    {
      name: 'relation',
      label: 'Relación',
      type: 'select',
      required: true,
      colSpan: 1,
      options: [
        { label: 'Padre', value: 'PADRE' },
        { label: 'Madre', value: 'MADRE' },
        { label: 'Tutor Legal', value: 'TUTOR' },
        { label: 'Abuelo/a', value: 'ABUELO' },
        { label: 'Tío/a', value: 'TIO' },
        { label: 'Otros', value: 'OTROS' }
      ],
      messages: { required: 'La relación es obligatoria' }
    },
    {
      name: 'dni',
      label: 'Documento',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^\\d{7,8}$',
      maxLength: 8,
      messages: {
        required: 'El DNI del tutor es obligatorio',
        pattern: 'El DNI debe tener entre 7 y 8 dígitos'
      }
    },
    {
      name: 'lastName',
      label: 'Apellido',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^[a-zA-ZÀ-ÿ\\s]{2,50}$',
      maxLength: 50,
      messages: {
        required: 'El apellido del tutor es obligatorio',
        pattern: 'El apellido debe tener entre 2 y 50 letras'
      }
    },
    {
      name: 'firstName',
      label: 'Nombre',
      type: 'text',
      required: true,
      colSpan: 1,
      pattern: '^[a-zA-ZÀ-ÿ\\s]{2,50}$',
      maxLength: 50,
      messages: {
        required: 'El nombre del tutor es obligatorio',
        pattern: 'El nombre debe tener entre 2 y 50 letras'
      }
    },
    {
      name: 'phone',
      label: 'Teléfono',
      type: 'text',
      required: true,
      colSpan: 2,
      pattern: '^[0-9]{7,15}$',
      maxLength: 15,
      messages: {
        required: 'El teléfono es obligatorio',
        pattern: 'El teléfono debe tener entre 7 y 15 dígitos'
      }
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: false,
      colSpan: 2,
      maxLength: 100,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      messages: {
        pattern: 'Ingrese un email válido (ej: usuario@ejemplo.com)'
      }
    }
  ];

  /**
   * Handles the submission of basic patient data from GenericForm.
   * Patches the form values and syncs DNI validation errors to the parent form.
   *
   * @param vals - The form values emitted from GenericForm
   */
  public onBasicFormSubmit = (vals: any) => {
    this.patientForm.patchValue(vals);

    // Sync DNI validation errors from child to parent
    const dniCtrlChild = this.basicGF?.form?.get('dni');
    const dniCtrlParent = this.patientForm.get('dni');

    if (dniCtrlChild && dniCtrlParent) {
      if (dniCtrlChild.errors?.['dniTaken']) {
        dniCtrlParent.setErrors({ dniTaken: true });
        dniCtrlParent.markAsTouched();
      }
    }

    this.cdr.markForCheck();
  };

  // Receives the GenericForm submit and uploads it to FormArray 'guardians' (position 0)
  public upsertGuardian = (vals: any) => {
    // Cleaning of numeric fields (in case the user puts dots or spaces)
    const clean = {
      ...vals,
      dni: (vals?.dni ?? '').toString().replace(/\D/g, ''),
      phone: (vals?.phone ?? '').toString().replace(/\D/g, '')
    };

    // We create or take the first tutor
    if (this.guardians.length === 0) {
      this.guardians.push(this.createGuardian());
      // the former as the main
      this.guardians
        .at(0)
        .get('isPrimary')
        ?.setValue(true, { emitEvent: false });
    }

    const g = this.guardians.at(0) as FormGroup;
    g.patchValue(
      {
        relation: clean.relation ?? '',
        firstName: clean.firstName ?? '',
        lastName: clean.lastName ?? '',
        dni: clean.dni ?? '',
        phone: clean.phone ?? '',
        email: clean.email ?? '',
        isPrimary: g.get('isPrimary')?.value ?? true
      },
      { emitEvent: false }
    );

    // refreshing validation
    g.markAllAsTouched();
    g.updateValueAndValidity({ emitEvent: false });

    // Force the FormArray to also recalculate state
    this.guardians.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  };

  /**
   * Adds a new empty guardian to the form.
   * Used when user wants to add a guardian (e.g., for a minor patient).
   */
  addGuardian(): void {
    if (this.guardians.length === 0) {
      this.guardians.push(this.createGuardian());
      this.guardians
        .at(0)
        .get('isPrimary')
        ?.setValue(true, { emitEvent: false });
      this.cdr.markForCheck();
    }
  }

  /**
   * Removes the guardian from the form.
   */
  removeGuardian(): void {
    if (this.guardians.length > 0) {
      this.guardians.clear();
      this.cdr.markForCheck();
    }
  }

  /**
   * Loads existing patient data from the backend by ID.
   * Populates the form with retrieved data and handles field mappings.
   *
   * @private
   * @param id - The patient ID to load
   */
  private loadPatientData(id: number): void {
    this.patientService.getPatientById(id).subscribe({
      next: (patient) => {
        // Normalize date
        const birthDate = this.parseApiDate(patient.birthDate);
        const verified = patient.status === 'VERIFIED';
        this.alreadyVerified = verified;

        const emailContact = (patient.contacts || []).find(
          (c: any) => c.contactType === 'EMAIL' && !!c.contactValue
        );
        const phoneContact = (patient.contacts || []).find(
          (c: any) =>
            (c.contactType === 'PHONE' || c.contactType === 'WHATSAPP') &&
            !!c.contactValue
        );

        const backendStatus = patient.status as
          | 'MIN'
          | 'COMPLETE'
          | 'VERIFIED'
          | undefined;
        if (backendStatus === 'VERIFIED') {
          this.patientStatusLabel = 'Verificado';
          this.patientStatusClass = 'status-verificado';
        } else if (backendStatus === 'COMPLETE') {
          this.patientStatusLabel = 'Completo';
          this.patientStatusClass = 'status-completo';
        } else {
          this.patientStatusLabel = 'Mínimo';
          this.patientStatusClass = 'status-minimo';
        }

        const sexAtBirthLabel =
          patient.sexAtBirth === 'M'
            ? 'Masculino'
            : patient.sexAtBirth === 'F'
              ? 'Femenino'
              : patient.sexAtBirth ?? null;

        // Patch the parent form
        this.patientForm.patchValue(
          {
            dni: patient.dni,
            firstName: patient.firstName,
            lastName: patient.lastName,
            birthDate,
            sexAtBirth: sexAtBirthLabel,
            gender: patient.gender,
            email: emailContact?.contactValue ?? '',
            phone: phoneContact?.contactValue ?? '',
            isVerified: verified
          },
          { emitEvent: false }
        );

        // Initial for the basic GenericForm
        this.basicInitial = {
          dni: patient.dni ?? '',
          firstName: patient.firstName ?? '',
          lastName: patient.lastName ?? '',
          birthDate,
          sexAtBirth: sexAtBirthLabel,
          gender: patient.gender ?? null,
          email: emailContact?.contactValue ?? '',
          phone: phoneContact?.contactValue ?? ''
        };

        // ====== GUARDIANS ======
        this.guardians.clear();
        (patient.guardians || []).forEach((t: any) => {
          const g = this.createGuardian();
          g.patchValue(
            {
              userId: t.userId ?? t.id ?? null, // ID of the guardian for update
              relation: t.bond ?? '', // backend use 'bond'
              firstName: t.firstName ?? '',
              lastName: t.lastName ?? '',
              dni: t.document ?? '', // backend use 'document'
              phone: t.phone ?? '',
              email: t.email ?? '',
              isPrimary: !!t.isPrimary,
              verify: t.status === 'VERIFIED' // Verified if status is VERIFIED
            },
            { emitEvent: false }
          );
          this.guardians.push(g);
        });

        // initial for the tutor’s GenericForm (if there is one, take the first)
        this.guardianInitial =
          this.guardians.length > 0
            ? { ...this.guardians.at(0).getRawValue() }
            : {
              relation: '',
              dni: '',
              lastName: '',
              firstName: '',
              phone: '',
              email: ''
            };

        // Single ID (exclude own)
        this.originalDni = (patient.dni ?? '').toString().trim();

        // Set up DNI validation on parent form
        const dniCtrl = this.patientForm.get('dni');
        if (dniCtrl) {
          dniCtrl.clearAsyncValidators();
          dniCtrl.setAsyncValidators([
            this.dniUniqueValidator(this.originalDni)
          ]);
          dniCtrl.updateValueAndValidity();
        }

        // Also set up on child form if it's ready
        setTimeout(() => {
          const dniCtrlChild = this.basicGF?.form?.get('dni');
          if (dniCtrlChild) {
            dniCtrlChild.clearAsyncValidators();
            dniCtrlChild.setAsyncValidators([
              this.dniUniqueValidator(this.originalDni)
            ]);
            dniCtrlChild.updateValueAndValidity();
          }
        }, 100);

        // ====== ADDRESSES ======
        this.addresses.clear();
        this.pendingAddressData = [];
        if (patient.addresses?.length) {
          patient.addresses.slice(0, 1).forEach((a: any) => {
            const addressGroup = this.fb.group({
              id: [a.id ?? null],
              street: [a.street ?? '', Validators.required],
              number: [a.streetNumber ?? '', Validators.required],
              floor: [a.apartment ?? ''],
              apartment: [a.apartment ?? ''],
              neighborhood: [a.neighborhood ?? ''],
              province: [a.province ?? '', Validators.required],
              city: [a.city ?? '', Validators.required],
              postalCode: [a.zipCode ?? '', Validators.required],
              isPrimary: [!!a.isPrimary]
            });

            this.pendingAddressData.push({
              id: a.id ?? null,
              street: a.street ?? '',
              number: a.streetNumber ?? '',
              floor: a.apartment ?? '',
              apartment: a.apartment ?? '',
              neighborhood: a.neighborhood ?? '',
              province: a.province ?? '',
              city: a.city ?? '',
              postalCode: a.zipCode ?? ''
            });

            this.addresses.push(addressGroup);
          });
        }
        if (this.addresses.length === 0) {
          this.addresses.push(this.createAddress());
        }

        // ====== COVERAGES ======
        this.coverages.clear();
        this.coverageMemberNumbers.clear();
        (patient.coverages || []).forEach((c: any, idx: number) => {
          // Normalizar datos del backend (snake_case -> camelCase)
          const planId = c.planId ?? c.plan_id ?? null;
          const insurerName = c.insurerName ?? c.insurer_name ?? '';
          const planName = c.planName ?? c.plan_name ?? '';
          const memberNumber = c.memberNumber ?? c.member_number ?? '';

          // Detectar SELF_PAY / PARTICULAR de forma robusta
          const insurerType = c.insurer_type ?? c.insurerType ?? null;
          const insurerCode =
            c.insurer_code ?? c.insurerCode ?? c.insurerAcronym ?? null;
          const planCode = c.plan_code ?? c.planCode ?? c.code ?? null;
          const isSelfPay =
            insurerType === 'SELF_PAY' ||
            String(insurerCode || '').toUpperCase() === 'AS074' ||
            String(insurerName || '')
              .toUpperCase()
              .includes('PARTICULAR') ||
            String(planCode || '').toUpperCase() === 'PARTICULAR' ||
            String(planName || '').toUpperCase() === 'PARTICULAR';

          const memberNumberValidators = isSelfPay
            ? []
            : [Validators.required, Validators.maxLength(20)];

          const coverageGroup = this.fb.group({
            insurerId: [c.insurerId],
            insurerName: [insurerName],
            planName: [planName],
            planId: [planId, Validators.required],
            memberNumber: [
              memberNumber?.toString() || '',
              memberNumberValidators
            ],
            isPrimary: [!!c.isPrimary || !!c.is_primary]
          });

          if (memberNumber) this.coverageMemberNumbers.set(idx, memberNumber);
          // Guardar estado PARTICULAR/SELF_PAY para la UI al cargar
          this.particularCoveragesMap.set(idx, isSelfPay);
          this.coverages.push(coverageGroup);
        });
        if (this.coverages.length === 0) {
          const c0 = this.createCoverage();
          c0.get('isPrimary')?.setValue(true, { emitEvent: false });
          this.coverages.push(c0);
        }

        // If checked, block basic
        if (verified) {
          this.toggleBasicFieldsDisabled(true);
          // Re-apply after view init in case basicGF wasn't ready yet
          setTimeout(() => {
            this.toggleBasicFieldsDisabled(true);
          }, 150);
        }

        this.cdr.markForCheck();

        // Force update of checkbox verify after load
        setTimeout(() => {
          if (this.guardians.length > 0) {
            const verifyControl = this.guardians.at(0).get('verify');
            if (verifyControl) {
              verifyControl.updateValueAndValidity({ emitEvent: false });
              this.cdr.detectChanges();
            }
          }
        }, 0);

        // Inject addresses in generic (once if they are not already)
        if (this.addressForms?.length) {
          this.syncAddressesToGenericForms();
        }
      }
    });
  }

  /**
   * Enables or disables basic patient information fields.
   * Used to prevent editing of verified patient core data.
   *
   * @private
   * @param disabled - Whether to disable the fields
   */
  private toggleBasicFieldsDisabled(disabled: boolean): void {
    const controls = [
      'dni',
      'firstName',
      'lastName',
      'birthDate',
      'sexAtBirth'
    ];
    controls.forEach((name) => {
      const ctrl = this.patientForm.get(name);
      if (ctrl)
        disabled
          ? ctrl.disable({ emitEvent: false })
          : ctrl.enable({ emitEvent: false });
    });

    if (this.basicGF) {
      controls.forEach((name) => {
        const gfCtrl = this.basicGF?.form?.get(name);
        if (gfCtrl)
          disabled
            ? gfCtrl.disable({ emitEvent: false })
            : gfCtrl.enable({ emitEvent: false });
      });
    }

    // Also update GenericForm fields metadata so they render as disabled (greyed out)
    this.setBasicFieldsDisabledFlag(controls, disabled);
    this.cdr.markForCheck();
  }

  /**
   * Updates `basicFields` metadata by setting the `disabled` property for given field names.
   * This triggers a UI rebuild in `GenericFormComponent`, causing controls to render as greyed out and read-only.
   */
  private setBasicFieldsDisabledFlag(fieldNames: string[], disabled: boolean) {
    const names = new Set(fieldNames);
    this.basicFields = this.basicFields.map((f) =>
      names.has(f.name) ? { ...f, disabled } : f
    );
  }

  /**
   * Synchronizes address data from the main form to generic address form components.
   * Includes retry logic to handle async view initialization.
   *
   * @private
   * @param retryCount - Current retry attempt number (default: 0)
   */
  private syncAddressesToGenericForms(retryCount: number = 0): void {
    const MAX_RETRIES = 50; // como antes
    if (!this.addressForms || this.addressForms.length === 0) {
      if (retryCount >= MAX_RETRIES) return;
      setTimeout(() => this.syncAddressesToGenericForms(retryCount + 1), 100);
      return;
    }

    const dataSource =
      this.pendingAddressData.length > 0
        ? this.pendingAddressData
        : this.addresses.controls.map((c) => c.value);

    this.addressForms.forEach((addressForm, idx) => {
      if (idx >= dataSource.length || !addressForm?.form) return;

      const d = dataSource[idx];
      const form = addressForm.form;

      // 1) Province with event (for the child to load cities)
      const currProv = form.get('province')?.value ?? '';
      if (d?.province && d.province !== currProv) {
        form.patchValue({ province: d.province }, { emitEvent: true });
      }

      // 2) Silent rest and 'city' with small delay to not step logic of the son
      setTimeout(() => {
        const cityCtrl = form.get('city');
        const currCity = cityCtrl?.value ?? '';
        const nextCity = d?.city ?? '';
        const shouldPatchCity =
          !cityCtrl?.dirty &&
          !cityCtrl?.touched &&
          !!nextCity &&
          currCity !== nextCity;

        const patch: any = {
          street: d?.street ?? '',
          number: d?.number ?? d?.streetNumber ?? '',
          floor: d?.floor ?? d?.apartment ?? '',
          apartment: d?.apartment ?? '',
          neighborhood: d?.neighborhood ?? '',
          postalCode: d?.postalCode ?? d?.zipCode ?? ''
        };
        if (shouldPatchCity) patch.city = nextCity;

        form.patchValue(patch, { emitEvent: false });

        if (cityCtrl?.disabled) cityCtrl.enable({ emitEvent: false });
        this.cdr.markForCheck();
      }, 150);
    });

    // one-shot
    this.pendingAddressData = [];
    this.cdr.markForCheck();
  }

  /**
   * Synchronizes address data from child generic address forms into the main addresses FormArray.
   * Maps field names between child forms and the parent model, ensuring consistency.
   * Marks the addresses array as dirty and updates its validity after synchronization.
   *
   * @private
   */
  private pullAddressChildrenIntoArray(): void {
    if (!this.addressForms || this.addressForms.length === 0) return;

    this.addressForms.forEach((addrForm, i) => {
      const v = addrForm.form?.getRawValue?.();
      if (!v) return;

      const mapped = {
        street: v.street || '',
        number: v.number || '',
        apartment: v.apartment || v.floor || '',
        neighborhood: v.neighborhood || '',
        city: v.city || '',
        province: v.province || '',
        postalCode: v.postalCode || '',
        isPrimary: this.addresses.at(i)?.get('isPrimary')?.value ?? i === 0
      };

      const g = this.addresses.at(i) as FormGroup;
      if (g) g.patchValue(mapped, { emitEvent: false });
    });

    this.addresses.markAsDirty();
    this.addresses.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Synchronizes address data from the savedAddresses array to each child generic address form.
   * Maps parent model field names to the generic form field names for consistency.
   * Retries initialization if addressForms are not yet available.
   *
   * @private
   */
  private syncAddressDataToForms(): void {
    if (!this.addressForms || this.addressForms.length === 0) {
      setTimeout(() => this.syncAddressDataToForms(), 100);
      return;
    }

    this.addressForms.forEach((addressForm, index) => {
      if (index < this.savedAddresses.length && addressForm.form) {
        const a = this.savedAddresses[index];

        // From the parent model -> generic names
        const formData = {
          street: a.street || '',
          number: a.number || a.streetNumber || '',
          floor: a.apartment || '',
          neighborhood: a.neighborhood || '',
          province: a.province || '',
          city: a.city || '',
          postalCode: a.postalCode || a.zipCode || ''
        };

        addressForm.form.patchValue(formData, { emitEvent: false });
      }
    });
  }

  /**
   * Displays an alert message to the user.
   *
   * @private
   * @param type - Type of alert ('success', 'error', or 'warning')
   * @param text - Alert message body
   * @param title - Optional alert title
   * @param autoHideMs - Milliseconds before auto-hiding (0 to disable, default: 4000)
   */
  private showAlert(
    type: AlertType,
    text: string,
    title?: string,
    autoHideMs = 4000
  ): void {
    this.alertType = type;
    this.alertText = text;
    this.alertTitle = title ?? '';
    this.alertVisible = true;
    this.cdr.markForCheck();
    if (autoHideMs > 0)
      setTimeout(() => {
        this.alertVisible = false;
        this.cdr.markForCheck();
      }, autoHideMs);
  }

  /**
   * Construye un resumen legible de los errores de validación por sección (editar).
   */
  private buildValidationSummary(): string {
    const lines: string[] = [];

    // Datos básicos
    const basicMap: Record<string, string> = {
      dni: 'Documento',
      lastName: 'Apellido',
      firstName: 'Nombre',
      birthDate: 'Fecha de nacimiento',
      sexAtBirth: 'Sexo al nacer',
      gender: 'Género',
      email: 'Email',
      phone: 'Teléfono'
    };
    const basicErrors: string[] = [];
    Object.keys(basicMap).forEach((key) => {
      const c = this.patientForm.get(key);
      if (c && c.invalid) basicErrors.push(basicMap[key]);
    });
    if (basicErrors.length)
      lines.push('• Datos Básicos: ' + basicErrors.join(', '));

    // Domicilios - solo validar si el usuario llenó algún campo
    const hasFilledAddress = this.addresses.controls.some(
      (ctrl: AbstractControl) => {
        const val = ctrl.value;
        return val.street || val.number || val.city || val.province;
      }
    );
    if (hasFilledAddress && this.addresses?.invalid)
      lines.push('• Domicilios: Hay datos incompletos o inválidos.');

    // Coberturas
    if (this.coverages?.length) {
      this.coverages.controls.forEach((ctrl, idx) => {
        const ce: string[] = [];
        if (ctrl.get('planId')?.invalid) ce.push('Tipo de cobertura');
        const m = ctrl.get('memberNumber');
        if (m && m.validator && m.invalid) ce.push('Nro Afiliado');
        if (ce.length) lines.push(`• Cobertura ${idx + 1}: ` + ce.join(', '));
      });
      if (this.coverages.hasError('uniquePrimary'))
        lines.push('• Coberturas: Solo puede haber una principal');
      if (this.coverages.hasError('minItems'))
        lines.push('• Coberturas: Debe agregar al menos una');
      if (this.coverages.hasError('maxItems'))
        lines.push('• Coberturas: Excede el máximo permitido');
    }

    if (!lines.length)
      return 'Por favor complete todos los campos requeridos correctamente.';
    return 'Revisá los siguientes campos:\n' + lines.join('\n');
  }

  /** Enfoca el primer control inválido visible. */
  private focusFirstInvalid(): void {
    setTimeout(() => {
      const el = document.querySelector(
        '.p-invalid, .ng-invalid input, .ng-invalid .p-inputtext'
      ) as HTMLElement | null;
      el?.focus?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  /**
   * Advances to the next step of the form after validating basic information.
   * Marks all basic fields as touched and displays errors if validation fails.
   */
  nextStep(): void {
    if (this.currentStep === 0) {
      // Sync all forms first
      if (this.basicGF && this.basicGF.form) {
        this.patientForm.patchValue(this.basicGF.form.value, {
          emitEvent: false
        });
      }
      this.pullAddressChildrenIntoArray();
      this.cleanEmptyAddresses();

      // Mark everything as touched to trigger UI validation messages
      this.patientForm.markAllAsTouched();
      this.basicGF?.form.markAllAsTouched(); // Also touch the child form

      const dniControl = this.patientForm.get('dni');
      const dniValue = dniControl?.value?.toString().trim();

      // If DNI has a value and no format errors, manually check for duplicates
      if (
        dniValue &&
        !dniControl?.hasError('required') &&
        !dniControl?.hasError('invalidDni')
      ) {
        // Skip validation if the DNI is the same as the original (editing same patient)
        if (this.originalDni && dniValue === this.originalDni) {
          this.continueToNextStepEdit();
          return;
        }

        // Show loading message
        this.showAlert(
          'info',
          'Validando DNI, por favor espere...',
          'Validación en curso',
          2000
        );

        // Manually check if DNI exists
        this.patientService.existsByDni(dniValue).subscribe({
          next: (exists) => {
            if (exists) {
              // DNI is duplicated - BLOCK navigation
              this.showAlert(
                'warning',
                'El DNI ingresado ya existe en el sistema.',
                'DNI duplicado',
                5000
              );
              // Set the error manually so UI shows it
              dniControl?.setErrors({ ...dniControl.errors, dniTaken: true });
              dniControl?.markAsTouched();
              dniControl?.markAsDirty();

              // Also mark in child form if exists
              if (this.basicGF?.form) {
                const childDniControl = this.basicGF.form.get('dni');
                if (childDniControl) {
                  childDniControl.setErrors({
                    ...childDniControl.errors,
                    dniTaken: true
                  });
                  childDniControl.markAsTouched();
                  childDniControl.markAsDirty();
                }
              }

              this.cdr.markForCheck();
            } else {
              // DNI is valid - continue with validation
              this.continueToNextStepEdit();
            }
          },
          error: (_err) => {
            // On error, allow to continue (fail gracefully)
            this.continueToNextStepEdit();
          }
        });
        return; // Wait for async check to complete
      }

      // If no DNI or has format errors, continue with normal validation
      this.continueToNextStepEdit();
      return;
    } else if (this.currentStep === 1) {
      // Return what is in the GenericForm from the tutor to the FormArray
      if (this.guardianGF?.form) {
        this.upsertGuardian(this.guardianGF.form.getRawValue());
        // Force error display of each control
        Object.values(this.guardianGF.form.controls).forEach((c) =>
          c.markAsTouched()
        );
      }

      // Validate all guardian FormGroup if there are any
      if (this.guardians.length > 0) {
        const anyInvalid = this.guardians.controls.some(
          (ctrl) => (ctrl as FormGroup).invalid
        );
        if (anyInvalid) {
          this.showAlert(
            'warning',
            'Datos del tutor incompletos',
            'Revisá los datos del tutor.'
          );
          return;
        }
      }

      this.currentStep = 2;
    }

    // Common post-step change refreshments
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Continue to next step after all validations pass (including DNI check)
   */
  private continueToNextStepEdit(): void {
    const errorMessages: string[] = [];

    // Validate basic fields from the child form directly
    if (this.basicGF?.form.invalid) {
      errorMessages.push('Datos básicos incompletos.');
    }

    // Validate coverages
    if (this.coverages.invalid) {
      errorMessages.push('Datos de cobertura incompletos o incorrectos.');
    }

    // Validate addresses only if there are addresses filled
    // Address is optional, so only validate if user started filling one
    const hasFilledAddress = this.addresses.controls.some(
      (ctrl: AbstractControl) => {
        const val = ctrl.value;
        return val.street || val.number || val.city || val.province;
      }
    );

    if (hasFilledAddress && this.addresses.invalid) {
      errorMessages.push('La dirección está incompleta.');
    }

    // If there are any errors, show them and stop
    if (errorMessages.length > 0) {
      this.showAlert(
        'warning',
        errorMessages.join(' '),
        'Formulario incompleto'
      );
      return;
    }

    // --- If all valid, proceed ---
    this.savedAddresses = this.addresses.getRawValue();

    // Ir al paso del tutor si hay tutores (tanto en creación como edición)
    // Si no hay tutores, ir directo al resumen
    this.currentStep = this.hasGuardians ? 1 : 1;

    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Returns to the previous step of the form.
   * Preserves current form values in basicInitial before navigating back.
   */
  previousStep(): void {
    if (
      this.currentStep === 2 ||
      (this.currentStep === 1 && !this.hasGuardians)
    ) {
      if (!this.hasGuardians) {
        this.basicInitial = {
          dni: this.patientForm.get('dni')?.value || '',
          firstName: this.patientForm.get('firstName')?.value || '',
          lastName: this.patientForm.get('lastName')?.value || '',
          birthDate: this.patientForm.get('birthDate')?.value || null,
          sexAtBirth: this.patientForm.get('sexAtBirth')?.value || null,
          gender: this.patientForm.get('gender')?.value || null,
          email: this.patientForm.get('email')?.value || '',
          phone: this.patientForm.get('phone')?.value || ''
        };

        if (this.savedAddresses?.length) {
          this.addresses.clear();
          for (const addr of this.savedAddresses) {
            const g = this.createAddress();
            g.patchValue(
              {
                id: addr.id ?? null,
                street: addr.street ?? '',
                number: addr.number ?? addr.streetNumber ?? '',
                apartment: addr.apartment ?? addr.floor ?? '',
                neighborhood: addr.neighborhood ?? '',
                province: addr.province ?? '',
                city: addr.city ?? '',
                postalCode: addr.postalCode ?? addr.zipCode ?? '',
                isPrimary: addr.isPrimary ?? false
              },
              { emitEvent: false }
            );
            this.addresses.push(g);
          }

          this.addressesCollapsed = false;
          this.cdr.markForCheck();

          setTimeout(() => {
            this.syncAddressDataToForms();
            this.pullAddressChildrenIntoArray();
            this.cdr.markForCheck();
          }, 250);
        }
      }

      this.currentStep = this.hasGuardians ? 1 : 0;
      this.cdr.markForCheck();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (this.currentStep === 1 && this.hasGuardians) {
      this.basicInitial = {
        dni: this.patientForm.get('dni')?.value || '',
        firstName: this.patientForm.get('firstName')?.value || '',
        lastName: this.patientForm.get('lastName')?.value || '',
        birthDate: this.patientForm.get('birthDate')?.value || null,
        sexAtBirth: this.patientForm.get('sexAtBirth')?.value || null,
        gender: this.patientForm.get('gender')?.value || null,
        email: this.patientForm.get('email')?.value || '',
        phone: this.patientForm.get('phone')?.value || ''
      };

      this.currentStep = 0;

      if (this.savedAddresses?.length) {
        this.addresses.clear();
        for (const addr of this.savedAddresses) {
          const g = this.createAddress();
          g.patchValue(
            {
              id: addr.id ?? null,
              street: addr.street ?? '',
              number: addr.number ?? addr.streetNumber ?? '',
              apartment: addr.apartment ?? addr.floor ?? '',
              neighborhood: addr.neighborhood ?? '',
              province: addr.province ?? '',
              city: addr.city ?? '',
              postalCode: addr.postalCode ?? addr.zipCode ?? '',
              isPrimary: addr.isPrimary ?? false
            },
            { emitEvent: false }
          );
          this.addresses.push(g);
        }

        this.addressesCollapsed = false;
        this.cdr.markForCheck();

        setTimeout(() => {
          this.syncAddressDataToForms();
          this.pullAddressChildrenIntoArray();
          this.cdr.markForCheck();
        }, 250);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Toggles the collapsed state of the addresses section.
   * Creates a default address if none exist when expanding.
   */
  toggleAddresses(): void {
    this.addressesCollapsed = !this.addressesCollapsed;

    if (!this.addressesCollapsed && this.addresses.length === 0) {
      const a = this.createAddress();
      a.get('isPrimary')?.setValue(true, { emitEvent: false });
      this.addresses.push(a);
      this.addresses.markAsDirty();
    }

    if (!this.addressesCollapsed && this.addresses.length > 0) {
      setTimeout(() => {
        this.syncAddressesToGenericForms();
        this.addresses.markAsDirty();
        this.addresses.updateValueAndValidity({ emitEvent: false });
        this.patientForm.updateValueAndValidity({ emitEvent: false });
        this.cdr.markForCheck();
      }, 100);
    } else {
      this.cdr.markForCheck();
    }
  }

  /**
   * Marks a specific coverage as primary and removes primary flag from others.
   *
   * @param i - Index of the coverage to mark as primary
   */
  markAsPrimary(i: number): void {
    const coverages = this.patientForm.get('coverages') as FormArray;
    coverages.controls.forEach((c, idx) => {
      const ctrl = c.get('isPrimary');
      if (ctrl) {
        ctrl.setValue(idx === i, { emitEvent: false });
      }
    });
  }

  /**
   * Gets the addresses FormArray from the patient form.
   *
   * @returns The addresses FormArray
   */
  get addresses(): FormArray {
    return this.patientForm.get('addresses') as FormArray;
  }

  /**
   * Gets the coverages FormArray from the patient form.
   *
   * @returns The coverages FormArray
   */
  get coverages(): FormArray {
    return this.patientForm.get('coverages') as FormArray;
  }

  /**
   * Determines whether a home is "empty" for validation/saving purposes.
   * Consider empty if all relevant fields are empty, null, '' or '0'/0.
   *
   * Clarifies alias names between the (generic) child and model:
   * - `streetNumber` ↔ `number`
   * - `zipCode` ↔ `postalCode`
   */
  private isAddressEmpty(addr: any): boolean {
    if (!addr) return true;
    const val = (x: any) =>
      x === undefined ||
      x === null ||
      String(x).trim() === '' ||
      String(x).trim() === '0';

    // Accepts both names according to where the data comes from
    const streetNumber = addr.streetNumber ?? addr.number;
    const zipCode = addr.zipCode ?? addr.postalCode;

    return (
      val(addr.street) &&
      val(streetNumber) &&
      val(addr.apartment) &&
      val(addr.neighborhood) &&
      val(addr.city) &&
      val(addr.province) &&
      val(zipCode)
    );
  }

  /**
   * Cleans empty homes and ensures at most one main home.
   * - Deletes from back to front to avoid unindexing.
   * - If none is marked as primary, marks the first one.
   */
  private cleanEmptyAddresses(): void {
    const arr = this.addresses;
    if (!arr) return;

    // Delete empty homes from back to front to avoid unindexing
    // BUT always keep at least one address
    for (let i = arr.length - 1; i >= 0; i--) {
      // Don't remove the last remaining address
      if (arr.length <= 1) break;

      const fg = arr.at(i) as FormGroup;
      if (!fg) continue;
      if (this.isAddressEmpty(fg.getRawValue())) {
        arr.removeAt(i);
      }
    }

    // If any remain, ensure at most one primary
    if (arr.length > 0) {
      let foundPrimary = false;
      arr.controls.forEach((ctrl) => {
        const current = !!ctrl.get('isPrimary')?.value;
        if (current && !foundPrimary) {
          foundPrimary = true;
        } else {
          ctrl.get('isPrimary')?.setValue(false, { emitEvent: false });
        }
      });
      if (!foundPrimary) {
        arr.at(0).get('isPrimary')?.setValue(true, { emitEvent: false });
      }
    }
  }

  /** Devuelve el nombre legible del plan a partir del planId */
  getPlanNameById(id: number | string | null | undefined): string {
    if (id == null) return '—';
    const num = Number(id);
    // si ya lo seleccionaste con el selector, uso ese nombre
    if (this.selectedPlansMap.has(num)) return this.selectedPlansMap.get(num)!;
    // fallback a la lista mock (por si vino del BE)
    return this.coverageTypes.find((c) => c.id === num)?.name ?? `Plan ${num}`;
  }

  /**
   * Gets the guardians FormArray from the patient form.
   *
   * @returns The guardians FormArray
   */
  get guardians(): FormArray {
    return this.patientForm.get('guardians') as FormArray;
  }

  /**
   * Indicates whether there are any guardians present in the form.
   *
   * @returns True if at least one guardian exists, otherwise false
   */
  get hasGuardians(): boolean {
    return (this.guardians?.length ?? 0) > 0;
  }

  /**
   * Handles address form changes and syncs to the main form.
   * Maps field names between generic form and main form (e.g., floor → apartment).
   *
   * @param g - The address FormGroup with updated values
   * @param index - Optional index of the address in the FormArray
   */
  onAddrChange(g: FormGroup, index?: number) {
    if (!g) return;

    if (index !== undefined && index >= 0 && index < this.addresses.length) {
      // from now on, the user "took control": forget about pending in that index
      this.pendingAddressData[index] = undefined;

      const v = g.getRawValue();
      const addressFG = this.addresses.at(index) as FormGroup;

      addressFG.patchValue(
        {
          street: v.street ?? '',
          number: v.number ?? v.streetNumber ?? '',
          apartment: v.floor ?? v.apartment ?? '',
          neighborhood: v.neighborhood ?? '',
          city: v.city ?? '',
          province: v.province ?? '',
          postalCode: v.postalCode ?? v.zipCode ?? '',
          // keep isPrimary if already in the form
          isPrimary: addressFG.get('isPrimary')?.value ?? false
        },
        { emitEvent: false }
      );

      addressFG.markAsDirty();
    }

    // dialogue mode remains the same if you use it...
  }

  /**
   * Checks if an address at a given index has meaningful data.
   */
  hasAddressData(index: number): boolean {
    const addr = this.addresses.at(index);
    if (!addr) return false;
    const v: any = addr.value || {};
    const fields = [
      v.street, v.number, v.streetNumber, v.apartment, v.floor,
      v.neighborhood, v.city, v.province, v.postalCode, v.zipCode
    ];
    return fields.some((f) => !!String(f ?? '').trim());
  }

  /**
   * Indicates if there is at least one address with data to display.
   */
  get hasAnyAddressData(): boolean {
    return this.addresses.controls.some((_c, idx) => this.hasAddressData(idx));
  }

  /**
   * Converts a FormGroup address to the format expected by app-generic-address-form.
   *
   * @param index - Index of the address in the FormArray
   * @returns Address data in generic format
   */
  getAddressInitialData(index: number): any {
    // If we already initialize that index, you will ALWAYS return the same reference
    if (this.addressInitialLoaded[index] && this.addressInitials[index]) {
      return this.addressInitials[index];
    }

    // Preferred the data that came from the backend (pendingAddressData) once
    const fromBackend = this.pendingAddressData[index];
    const snap = fromBackend
      ? {
        street: fromBackend.street ?? '',
        number: fromBackend.number ?? fromBackend.streetNumber ?? '',
        // the child is expecting 'floor': from backend comes in 'apartment' (2A)
        floor: fromBackend.floor ?? fromBackend.apartment ?? '',
        apartment: fromBackend.apartment ?? '',
        neighborhood: fromBackend.neighborhood ?? '',
        city: fromBackend.city ?? '',
        province: fromBackend.province ?? '',
        postalCode: fromBackend.postalCode ?? fromBackend.zipCode ?? ''
      }
      : {
        // fallback to the value of the FormArray if there is no backend
        street: this.addresses.at(index)?.get('street')?.value ?? '',
        number: this.addresses.at(index)?.get('number')?.value ?? '',
        floor: this.addresses.at(index)?.get('apartment')?.value ?? '',
        apartment: this.addresses.at(index)?.get('apartment')?.value ?? '',
        neighborhood:
            this.addresses.at(index)?.get('neighborhood')?.value ?? '',
        city: this.addresses.at(index)?.get('city')?.value ?? '',
        province: this.addresses.at(index)?.get('province')?.value ?? '',
        postalCode: this.addresses.at(index)?.get('postalCode')?.value ?? ''
      };

    // Memo: save the reference and mark as loaded
    this.addressInitials[index] = snap;
    this.addressInitialLoaded[index] = true;

    return this.addressInitials[index];
  }

  /**
   * Handles plan selection for a coverage at a specific index.
   * Updates the coverage FormGroup and stores the plan name in the map.
   * If the selected plan corresponds to "PARTICULAR" insurer and "PLAN-PARTICULAR",
   * removes the required validator from memberNumber field.
   *
   * @param index - Index of the coverage in the FormArray
   * @param plan - The selected plan object containing id and name
   */
  /**
   * Handles plan selection for a coverage at a specific index.
   * Updates the coverage FormGroup and stores the plan name in the map.
   * If the selected plan corresponds to "PARTICULAR", removes the required
   * validator from memberNumber field.
   *
   * @param index - Index of the coverage in the FormArray
   * @param plan - The selected plan object containing id and name
   */
  onPlanSelected(index: number, plan: any): void {
    if (!plan?.id) return;

    const fg = this.coverages.at(index) as FormGroup;

    // Normalizar nombres del plan (snake_case y camelCase)
    const planName =
      plan.name ?? plan.planName ?? plan.plan_name ?? `Plan ${plan.id}`;
    const insurerName =
      plan.insurerName ??
      plan.insurer_name ??
      plan.insurer ??
      plan.insurerAcronym ??
      '';

    fg.patchValue(
      {
        insurerId: +plan.insurerId,
        planId: +plan.id,
        planName,
        insurerName
      },
      { emitEvent: false }
    );
    fg.markAsDirty();

    // Keep using the map if you want
    this.selectedPlansMap.set(+plan.id, planName);

    // Detect SELF_PAY / PARTICULAR por insurer_type o códigos/nombres
    const nameUpper = String(
      plan?.insurer_name || plan?.insurerName || ''
    ).toUpperCase();
    const codeUpper = String(
      plan?.insurer_code || plan?.code || ''
    ).toUpperCase();
    const planNameUpper = String(
      plan?.name || plan?.planName || ''
    ).toUpperCase();
    const isSelfPay =
      plan?.insurer_type === 'SELF_PAY' ||
      codeUpper === 'AS074' ||
      nameUpper.includes('PARTICULAR') ||
      planNameUpper === 'PARTICULAR';

    // Update the map to track SELF_PAY status
    this.particularCoveragesMap.set(index, isSelfPay);

    const memberNumberControl = fg.get('memberNumber');
    if (!memberNumberControl) return;

    if (isSelfPay) {
      // Mode PARTICULAR: Remove all validations
      memberNumberControl.clearValidators();
      memberNumberControl.setValue('', { emitEvent: false });
      memberNumberControl.setErrors(null);
      memberNumberControl.markAsUntouched();
      memberNumberControl.markAsPristine();
    } else {
      // Mode NORMAL: Required + max length 20 (any characters allowed)
      memberNumberControl.setValidators([
        Validators.required,
        Validators.maxLength(20)
      ]);
    }

    memberNumberControl.updateValueAndValidity({ emitEvent: false });

    // Force UI update
    this.cdr.markForCheck();
  }

  /** Handles insurer selection to apply SELF_PAY rules. */
  onInsurerSelected(index: number, insurer: any): void {
    const insNameUpper = String(insurer?.name || '').toUpperCase();
    const insCodeUpper = String(insurer?.code || '').toUpperCase();
    const isSelfPay =
      insurer?.insurer_type === 'SELF_PAY' ||
      insCodeUpper === 'AS074' ||
      insNameUpper.includes('PARTICULAR');

    this.particularCoveragesMap.set(index, isSelfPay);

    const fg = this.coverages.at(index) as FormGroup;
    const memberNumberControl = fg?.get('memberNumber');
    if (!memberNumberControl) return;

    if (isSelfPay) {
      memberNumberControl.clearValidators();
      memberNumberControl.setValue('', { emitEvent: false });
      memberNumberControl.setErrors(null);
      memberNumberControl.markAsUntouched();
      memberNumberControl.markAsPristine();
    } else {
      memberNumberControl.setValidators([
        Validators.required,
        Validators.maxLength(20)
      ]);
    }
    memberNumberControl.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  /**
   * Marks the memberNumber control as touched to activate visual validations.
   * Called when the user leaves the field (blur event).
   *
   * @param index - Index of the coverage in the FormArray
   */
  markMemberNumberTouched(index: number): void {
    const coverageGroup = this.coverages.at(index) as FormGroup;
    const memberNumberControl = coverageGroup?.get('memberNumber');

    if (memberNumberControl && !memberNumberControl.touched) {
      memberNumberControl.markAsTouched();
    }
  }

  /**
   * Adds a new inline coverage row to the form.
   * Sets the first coverage as primary if none exist.
   */
  addCoverageInline(): void {
    const newCoverage = this.createCoverage();

    if (this.coverages.length >= this.MAX_COVERAGES) {
      this.showAlert(
        'warning',
        `Máximo ${this.MAX_COVERAGES} coberturas.`,
        'Límite alcanzado'
      );
      return;
    }
    if (this.coverages.length === 0) {
      newCoverage.get('isPrimary')?.setValue(true, { emitEvent: false });
    }

    this.coverages.push(newCoverage);
    this.coverages.markAsDirty();

    const newIndex = this.coverages.length - 1;
    this.coverageMemberNumbers.set(newIndex, '');

    this.cdr.markForCheck();
  }

  /**
   * Removes a coverage or address item from the form.
   * Prevents removal if only one item remains.
   *
   * @param kind - Type of item to remove ('coverages' or 'addresses')
   * @param index - Index of the item to remove
   */
  removeItem(
    kind: 'coverages' | 'addresses' | 'guardians',
    index: number
  ): void {
    const array = this.patientForm.get(kind) as FormArray;

    if (kind === 'addresses' && array.length <= 1) {
      this.showAlert(
        'warning',
        'Operación no permitida',
        'Debe mantener al menos un domicilio.'
      );
      return;
    }

    if (kind === 'coverages' && array.length <= 1) {
      this.showAlert(
        'warning',
        'Operación no permitida',
        'Debe mantener al menos una cobertura.'
      );
      return;
    }

    // Specific logic for coverages
    if (kind === 'coverages') {
      const wasPrimary = array.at(index)?.get('isPrimary')?.value;
      array.removeAt(index);

      if (wasPrimary && array.length > 0) {
        const hasPrimaryNow = array.controls.some(
          (c) => c.get('isPrimary')?.value
        );
        if (!hasPrimaryNow) {
          this.markAsPrimary(0); // Set the first one as primary
        }
      }

      // Update member numbers map
      this.coverageMemberNumbers.delete(index);
      const newMap = new Map<number, string>();
      this.coverageMemberNumbers.forEach((value, key) => {
        if (key > index) {
          newMap.set(key - 1, value);
        } else if (key < index) {
          newMap.set(key, value);
        }
      });
      this.coverageMemberNumbers = newMap;
    } else {
      // Generic removal for other types
      array.removeAt(index);
    }

    array.markAsDirty();
    this.cdr.markForCheck();
  }

  /**
   * Creates a new address FormGroup with default values and validators.
   *
   * @private
   * @returns A new FormGroup for an address
   */
  private createAddress(): FormGroup {
    return this.fb.group({
      id: [null],
      street: ['', Validators.required],
      number: ['', Validators.required],
      apartment: [''],
      neighborhood: [''],
      province: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      isPrimary: [true]
    });
  }

  /**
   * Creates a new coverage FormGroup with default values and validators.
   *
   * @private
   * @returns A new FormGroup for a medical coverage
   */
  private createCoverage(): FormGroup {
    return this.fb.group({
      insurerId: [null],
      insurerName: [''],
      planId: [null, Validators.required],
      planName: [''],
      memberNumber: ['', [Validators.required, Validators.maxLength(20)]],
      isPrimary: [false]
    });
  }

  /**
   * Creates a new guardian FormGroup with default values and validators.
   * Used for adding or editing guardian information in the patient form.
   *
   * @private
   * @returns A new FormGroup for a guardian
   */
  private createGuardian(): FormGroup {
    return this.fb.group({
      userId: [null], // Guardian ID for update
      relation: ['', Validators.required],
      firstName: ['', [Validators.required, ValidatorUtils.onlyLetters(), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, ValidatorUtils.onlyLetters(), Validators.maxLength(50)]],
      // Changed: simple pattern to 7-8 digits
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      // Telephone: 7 to 15 digits
      phone: ['', [Validators.pattern(/^\d{7,15}$/)]],
      email: ['', [Validators.pattern('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')]],
      isPrimary: [false],
      verify: [false] // Verified tutor checkbox
    });
  }

  /**
   * Opens the verification confirmation modal.
   */
  openVerifyModal() {
    this.verifyModalOpen = true;
  }

  /**
   * Handles verification confirmation.
   * Sets patient as verified and submits the form.
   */
  onVerifyConfirm() {
    this.verifyModalOpen = false;
    this.onSubmit({ verify: !this.alreadyVerified });
  }

  /**
   * Handles verification modal dismissal.
   */
  onVerifyDismiss() {
    this.verifyModalOpen = false;
  }

  /**
   * Initializes the verify checkbox gating logic.
   * Enables verification checkbox only when the entire form is valid.
   *
   * @private
   */
  private initVerifyCheckboxGate(): void {
    const verifyCtrl = this.patientForm.get('isVerified');
    if (!verifyCtrl) return;

    const apply = (ready: boolean) => {
      if (ready) verifyCtrl.enable({ emitEvent: false });
      else {
        verifyCtrl.disable({ emitEvent: false });
        verifyCtrl.setValue(false, { emitEvent: false });
      }
      this.cdr.markForCheck();
    };

    apply(this.patientForm.valid);

    this.patientForm.statusChanges
      .pipe(
        map(() => this.patientForm.valid),
        distinctUntilChanged()
      )
      .subscribe(apply);
  }

  /**
   * Parses a date value coming from the API into a valid Date (local time).
   * Supports:
   * - Date instance
   * - ISO strings: 'yyyy-MM-dd' or full ISO
   * - Day-first strings: 'dd-MM-yyyy' or 'dd/MM/yyyy'
   * Returns null on invalid input.
   */
  private parseApiDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    if (typeof value === 'string') {
      const v = value.trim();

      // dd-MM-yyyy or dd/MM/yyyy (requires separators)
      const ddmmyyyy = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/;
      const isoYmd = /^(\d{4})-(\d{2})-(\d{2})$/; // yyyy-MM-dd

      let d: Date | null = null;

      const m1 = v.match(ddmmyyyy);
      if (m1) {
        const day = parseInt(m1[1], 10);
        const month = parseInt(m1[2], 10) - 1;
        const year = parseInt(m1[3], 10);
        d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }

      const m2 = v.match(isoYmd);
      if (m2) {
        const year = parseInt(m2[1], 10);
        const month = parseInt(m2[2], 10) - 1;
        const day = parseInt(m2[3], 10);
        d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }

      // Fallback for full ISO or other parseable strings
      const tryDate = new Date(v);
      return isNaN(tryDate.getTime()) ? null : tryDate;
    }
    return null;
  }

  /**
   * Handles form submission.
   * Validates the form, builds the patient object, and sends create or update request to backend.
   */
  onSubmit(options: { verify?: boolean } = {}): void {
    const shouldVerify = !!options.verify;
    // Ensure final address status from children and clean up gaps
    this.pullAddressChildrenIntoArray(); // if there are children, consolidate to the FormArray
    this.cleanEmptyAddresses(); // eliminates gaps and normalizes main

    // Check if user filled any address
    const hasFilledAddress = this.addresses.controls.some(
      (ctrl: AbstractControl) => {
        const val = ctrl.value;
        return val.street || val.number || val.city || val.province;
      }
    );

    // Validate addresses only if user started filling one
    if (hasFilledAddress && this.addresses.invalid) {
      this.patientForm.markAllAsTouched();
      this.showAlert(
        'error',
        'La dirección está incompleta. Por favor completá todos los campos requeridos.',
        'Formulario incompleto',
        0
      );
      this.focusFirstInvalid();
      return;
    }

    // Validate the rest of the form (excluding addresses if empty)
    // NOTE: Disabled controls are considered invalid by Angular, but they're actually valid
    // We need to check both enabled AND disabled controls
    const dniControl = this.patientForm.get('dni');
    const firstNameControl = this.patientForm.get('firstName');
    const lastNameControl = this.patientForm.get('lastName');
    const birthDateControl = this.patientForm.get('birthDate');
    const sexAtBirthControl = this.patientForm.get('sexAtBirth');
    const genderControl = this.patientForm.get('gender');

    const basicDataValid =
      (dniControl?.valid || (dniControl?.disabled && !dniControl?.errors)) &&
      (firstNameControl?.valid || (firstNameControl?.disabled && !firstNameControl?.errors)) &&
      (lastNameControl?.valid || (lastNameControl?.disabled && !lastNameControl?.errors)) &&
      (birthDateControl?.valid || (birthDateControl?.disabled && !birthDateControl?.errors)) &&
      (sexAtBirthControl?.valid || (sexAtBirthControl?.disabled && !sexAtBirthControl?.errors)) &&
      (genderControl?.valid || (genderControl?.disabled && !genderControl?.errors));

    const coveragesValid = this.coverages.valid;

    // Only validate guardians if there are guardians added (need to validate their data)
    // Don't block the form if there are no guardians
    let guardiansValid = true;
    if (this.guardians.length > 0) {
      // If there are guardians, they must be valid
      guardiansValid = this.guardians.valid;
    }


    if (!basicDataValid || !coveragesValid || !guardiansValid) {
      this.patientForm.markAllAsTouched();
      this.showAlert(
        'error',
        this.buildValidationSummary(),
        'Formulario incompleto',
        0
      );
      this.focusFirstInvalid();
      return;
    }

    // Do NOT overwrite coverage member numbers from the legacy map here.
    // We now trust the reactive FormArray values (edited directly in the UI).

    const raw = this.patientForm.getRawValue();

    // Format contacts
    const contacts: any[] = [];
    if (raw.email)
      contacts.push({
        contactType: 'EMAIL',
        contactValue: raw.email,
        isPrimary: true
      });
    if (raw.phone)
      contacts.push({
        contactType: 'PHONE',
        contactValue: raw.phone,
        isPrimary: contacts.length === 0
      });

    // Format birthdate to ISO (yyyy-MM-dd)
    let formattedDate: string | null = null;
    if (raw.birthDate) {
      const date = new Date(raw.birthDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    }

    // Build clean patient object
    // Backend expects 'guardian' (singular object), not 'guardians' (array)
    const guardiansArray = raw.guardians || [];
    const hasGuardian = guardiansArray.length > 0;

    // Take the first guardian if exists (backend only accepts one)
    const guardian = hasGuardian ? {
      document: guardiansArray[0].dni, // backend expects 'document'
      firstName: guardiansArray[0].firstName,
      lastName: guardiansArray[0].lastName,
      phone: guardiansArray[0].phone || '',
      email: guardiansArray[0].email || '',
      bond: guardiansArray[0].relation, // backend expects 'bond'
      isOwner: false, // Default for creation/update
      status: guardiansArray[0].verify ? 'VERIFIED' : 'PENDING' // Status based on verify checkbox
    } : undefined;

    const shouldMarkVerified =
      shouldVerify || this.alreadyVerified || !!raw.isVerified;

    const patient: Patient = {
      id: this.patientId || undefined,
      dni: raw.dni,
      firstName: raw.firstName,
      lastName: raw.lastName,
      birthDate: formattedDate,
      gender: raw.gender,
      sexAtBirth: raw.sexAtBirth,
      isVerified: shouldMarkVerified,
      isActive: true,
      status: shouldMarkVerified ? 'VERIFIED' : 'PENDING',
      hasGuardian,
      guardian, // Single object, not array
      addresses: (raw.addresses || [])
        .filter((addr: any) => {
          // Filtrar domicilios vacíos - solo enviar si tiene al menos calle o ciudad
          return addr.street || addr.number || addr.city || addr.province;
        })
        .map((addr: any) => ({
          id: addr.id || null,
          street: addr.street,
          streetNumber: addr.number?.toString() || '', // backend wait string
          apartment: addr.apartment || '',
          neighborhood: addr.neighborhood || '',
          city: addr.city || '',
          province: addr.province || '',
          zipCode: addr.postalCode || '', // backend wait zipCode
          isPrimary: addr.isPrimary ?? false
        })),
      coverages: (raw.coverages || []).map((cov: any) => ({
        insurerId: Number(cov.insurerId),
        planId: Number(cov.planId),
        memberNumber: cov.memberNumber?.toString() || '',
        isPrimary: cov.isPrimary ?? false
      })),
      contacts
    } as any;

    // Determine if we're creating or updating
    const isCreating = !this.patientId;
    const operation$ = isCreating
      ? this.patientService.createPatient(patient)
      : this.patientService.updatePatient(this.patientId, patient);

    operation$.subscribe({
      next: (_res) => {
        const actionText = isCreating ? 'creado' : 'actualizado';
        const actionPastTense = isCreating ? 'creó' : 'editó';
        this.showAlert(
          'success',
          `Paciente ${actionText}`,
          'Los datos se guardaron correctamente'
        );
        if (shouldMarkVerified) {
          this.patientForm.get('isVerified')?.setValue(true, { emitEvent: false });
          this.alreadyVerified = true;
          this.toggleBasicFieldsDisabled(true);
        }
        if (this.PatientFromCare) {
          // Construir un turno en blanco para crear la atención en Workflow
          const dniValue = (this.patientForm.get('dni')?.value ?? '')
            .toString()
            .replace(/\D/g, '');
          const blankShift: AttentionShift = {
            nro: this.route.snapshot.queryParams['publicCode'] || `ST-${String(Math.floor(Math.random() * 10)).padStart(3, '0')}`,
            document: Number(dniValue),
            dateTime: new Date().toISOString(),
            appointmentId: 0,
            hasData: false,
            hasShift: false,
            branchId: Number(localStorage.getItem('branch_id')) || 1
          };

          this.router.navigate([this.CARE_ROUTE], {
            state: {
              shift: blankShift,
              flash: {
                type: 'success',
                title: `Paciente ${actionText}`,
                text: 'Se iniciará una atención en blanco.',
                duration: 2000
              }
            }
          });
        } else {
          this.router.navigate([this.PATIENTS_ROUTE], {
            state: {
              success: true,
              PatientCreated: _res,
              flash: {
                type: 'success',
                title: 'Éxito',
                text: `El paciente se ${actionPastTense} correctamente.`,
                duration: 2000
              }
            }
          });
        }
      },
      error: (err) => {
        const actionText = isCreating ? 'crear' : 'actualizar';
        // Mostrar detalles por campo si la API los envía
        let apiDetail = err?.error?.message || err?.message || '';
        const apiErrors = err?.error?.errors || err?.error?.fieldErrors;
        if (apiErrors && typeof apiErrors === 'object') {
          const parts: string[] = [];
          Object.keys(apiErrors).forEach((k) => {
            const v = apiErrors[k];
            const text = Array.isArray(v) ? v.join(', ') : String(v);
            parts.push(`- ${k}: ${text}`);
          });
          if (parts.length) {
            apiDetail = `${
              apiDetail ? apiDetail + '\n' : ''
            }Detalles:\n${parts.join('\n')}`;
          }
        }
        const detail = apiDetail || 'Intente nuevamente más tarde.';
        this.showAlert(
          'error',
          `No se pudo ${actionText} el paciente. ${detail}`,
          'Error',
          0
        );
        if (shouldVerify) {
          this.patientForm.get('isVerified')?.setValue(false, { emitEvent: false });
          this.toggleBasicFieldsDisabled(false);
          this.cdr.markForCheck();
        }
      }
    });
  }

  /**
   * Navigates back to the patients list.
   */
  goBack(): void {
    this.router.navigate(['/patients']);
  }

  /**
   * Creates an async validator to check if a DNI is already taken.
   * Excludes the original DNI when editing an existing patient.
   *
   * @private
   * @param originalDni - Optional original DNI to exclude from validation
   * @returns An AsyncValidatorFn that checks DNI uniqueness
   */
  private dniUniqueValidator(originalDni?: string | null): AsyncValidatorFn {
    let lastValidatedValue: string | null = null;

    return (control: AbstractControl) => {
      const value = (control.value ?? '').toString().trim();

      // Don't validate if value is empty or control has other validation errors
      if (!value || control.invalid) return of(null);

      // Don't validate if this is the original DNI (editing same patient)
      if (originalDni && value === originalDni) return of(null);

      // Don't validate if the value hasn't actually changed
      if (value === lastValidatedValue) {
        return of(null);
      }

      // Update last validated value
      lastValidatedValue = value;

      return timer(350).pipe(
        switchMap(() => this.patientService.existsByDni(value)),
        map((exists) => (exists ? { dniTaken: true } : null)),
        catchError(() => of(null))
      );
    };
  }
}
