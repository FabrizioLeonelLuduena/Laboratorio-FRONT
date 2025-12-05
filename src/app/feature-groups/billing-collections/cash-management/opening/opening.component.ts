import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-AR';
import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import { InputNumber } from 'primeng/inputnumber';
import { Select, SelectChangeEvent } from 'primeng/select';
import { finalize, map, tap } from 'rxjs';
import { BranchOption } from 'src/app/feature-groups/care-management/models/branches';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

import { AuthService } from '../../../../core/authentication/auth.service';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { UserResponse } from '../../../user-management/models/login-model';
import { CashSessionService } from '../application/cash-session.service';
import { RegistersService } from '../application/registers-service.service';
import { CashRegister } from '../domain/cash-register.model';
import { CashRegisterOption } from '../dto/response/cashRegister';

registerLocaleData(localeEs, 'es-AR');

/**
 *
 */
@Component({
  selector: 'app-cash-opening',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    GenericAlertComponent,
    SpinnerComponent,
    FormsModule,
    DropdownModule,
    GenericButtonComponent,
    Select,
    InputNumber,
    ConfirmationModalComponent
  ],
  templateUrl: './opening.component.html',
  styleUrl: './opening.component.css'
})
export class CashOpeningComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sessionService = inject(CashSessionService);
  private branchesService = inject(BranchService);
  private registersService = inject(RegistersService);
  private authService = inject(AuthService);
  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);

  private userResponse : Partial<UserResponse> = {};

  readonly isLoading = this.sessionService.isLoading;
  readonly error = this.sessionService.error;

  isSubmitting = signal(false);
  formSubmitted = signal(false);
  displayInfoDialog = signal(false);
  showConfirmationModal = signal(false);
  showCancelConfirmationModal = signal(false);

  /** Signal for the current cash register session. */
  readonly currentSession = signal<CashRegister | null>(null);
  alert = signal<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; text: string } | null>(null);

  branches: BranchOption[] = [];
  selectedBranch: BranchOption | null = null;

  availableCashRegisters: CashRegisterOption[] = [];
  selectedCashRegisterId: number | null = null;

  form: FormGroup<{
    openingDate: FormControl<Date>;
    user: FormControl<string>;
    initialCashAmount: FormControl<number>;
    observations: FormControl<string>;
    branch: FormControl<BranchOption | null>;
    cashRegister: FormControl<number | null>;
  }>;

  private readonly initialCashAmountFromChanges = signal(0);
  readonly totalInitial = computed(() => this.initialCashAmountFromChanges());

  readonly canSubmit = computed(() => {
    return this.form.valid && !this.isSubmitting() && !this.isLoading();
  });

  readonly hasError = computed(() => this.error() !== null);

  /**
   * Constructor del componente.
   * Inicializa el formulario y configura las señales para manejar cambios en el monto inicial.
   */
  constructor() {
    this.form = this.fb.group({
      openingDate: this.fb.control(new Date(), {
        validators: [Validators.required],
        nonNullable: true
      }),
      user: this.fb.control(
        { value: '', disabled: true },
        {
          validators: [Validators.required, Validators.minLength(3)],
          nonNullable: true
        }
      ),
      initialCashAmount: this.fb.control(0, {
        validators: [Validators.required, Validators.min(0)],
        nonNullable: true
      }),
      observations: this.fb.control('', {
        validators: [Validators.maxLength(500)],
        nonNullable: true
      }),
      branch: this.fb.control<BranchOption | null>(null, Validators.required),
      cashRegister: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required)
    });

    const initialCashSignal = toSignal(
      this.form.controls.initialCashAmount.valueChanges.pipe(map(value => value ?? 0)),
      { initialValue: this.form.controls.initialCashAmount.value ?? 0 }
    );

    effect(() => {
      const value = initialCashSignal();
      this.initialCashAmountFromChanges.set(value);
      setTimeout(() => this.clearError(), 2000);
    });
  }

  /**
   * Método del ciclo de vida de Angular.
   * Carga los datos del usuario y establece valores iniciales en el formulario.
   */
  ngOnInit(): void {
    this.titleService.setTitle('Apertura de caja');
    this.breadcrumbService.setItems([
      { label: 'Facturación y cobros', routerLink: '/billing-collections/home' },
      { label: 'Apertura de caja' }
    ]);

    this.getUser();
    if (this.form.get('initialCashAmount')?.value == null) {
      this.form.get('initialCashAmount')?.setValue(0);
    }
    this.loadBranches();
  }


  /**
   * Cancela la apertura actual y redirige al dashboard.
   */
  cancel(): void {
    if (this.form.dirty) {
      this.showCancelConfirmationModal.set(true);
    } else {
      this.router.navigate(['/billing-collections/home']);
    }
  }

  /**
   * Dismisses the cancel confirmation modal and navigates to the billing-collections home.
   */
  onCancelConfirmed(): void {
    this.showCancelConfirmationModal.set(false);
    this.router.navigate(['/billing-collections/home']);
  }

  /**
   * Maneja la confirmación del formulario y llama a processOpening().
   */
  onSubmit(): void {
    this.closeConfirmationModal();
    if (this.form.invalid || this.isSubmitting() || this.isLoading()) {
      return;
    }

    this.formSubmitted.set(true);
    const formData = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.sessionService.openSession(formData, formData.cashRegister ?? undefined)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (session) => {
          const totalInitial = session.initialCash;
          this.alert.set({
            type: 'success',
            title: '¡Caja abierta exitosamente!',
            text: 'La caja ha sido abierta con éxito.'
          });
          setTimeout(() => {
            this.alert.set(null);
            this.router.navigate(['/billing-collections/dashboard']);
          }, 1500);
        },
        error: () => {
          this.alert.set({
            type: 'error',
            title: 'Error al abrir caja',
            text: 'No se pudo abrir la caja. Por favor intente nuevamente o contacte al administrador.'
          });
          setTimeout(() => this.alert.set(null), 2500);
        }
      });
  }

  /**
   * Opens confirmation modal
   */
  openConfirmationModal(): void {
    if (this.form.valid) {
      this.showConfirmationModal.set(true);
    }
  }

  /**
   * Closes confirmation modal
   */
  closeConfirmationModal(): void {
    this.showConfirmationModal.set(false);
  }


  /**
   * Computed para mostrar errores en el campo de monto inicial.
   */
  readonly initialCashAmountError = computed(() => {
    const field = this.form.get('initialCashAmount');
    if (field?.invalid && (field.touched || field.dirty || this.formSubmitted())) {
      if (field.hasError('required')) return 'Este campo es requerido';
      if (field.hasError('min')) return 'El valor debe ser mayor o igual a 0';
    }
    return '';
  });

  /**
   * Computed para mostrar errores en el campo de observaciones.
   */
  get observationsError(): string {
    const field = this.form.controls.observations;
    const show = field?.touched || field?.dirty || this.formSubmitted();
    if (field?.invalid && show) {
      if (field.hasError('maxlength')) return 'Máximo 500 caracteres';
    }
    return '';
  }

  /**
   * Limpia los errores almacenados en el servicio de sesión.
   */
  clearError(): void {
    this.sessionService.clearError();
  }

  /**
   * Getter para el campo de fecha de apertura.
   */
  get openingDate() {
    return this.form.get('openingDate')!;
  }

  /**
   * Carga las sucursales desde el backend y deja la selección vacía.
   */
  public isLoadingBranches = false;

  /**
   * Loads branch options from the BranchesService.
   */
  private loadBranches(): void {
    this.isLoadingBranches = true;

    this.branchesService.getBranchOptions()
      .pipe(
        tap(() => {
          this.form.controls['cashRegister'].disable();
          this.selectedCashRegisterId = null;
          this.availableCashRegisters = [];
        }),
        finalize(() => { this.isLoadingBranches = false; })
      )
      .subscribe({
        next: (list: BranchOption[]) => {
          this.branches = list ?? [];

          if (this.branches.length > 0) {
            this.selectedBranch = this.branches[0];

            this.form.controls['branch'].setValue(this.selectedBranch);

            this.form.controls['cashRegister'].disable();

            this.fetchRegistersByBranch(this.selectedBranch.id);
          } else {
            this.selectedBranch = null;
            this.form.controls['branch'].reset();
            this.form.controls['cashRegister'].disable();
          }
        },
        error: () => {

          this.branches = [];
          this.selectedBranch = null;
          this.form.controls['branch'].reset();
          this.form.controls['cashRegister'].disable();
          this.selectedCashRegisterId = null;
          this.availableCashRegisters = [];

          this.alert.set({
            type: 'error',
            title: 'Error al cargar sucursales',
            text: 'No se pudieron obtener las sucursales. Intente nuevamente.'
          });
        }
      });
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

  /**
   * Handles the event triggered when a branch is selected from the autocomplete.
   * Resets and disables the cash register field, then fetches available registers for the selected branch.
   * Once data is loaded, re-enables the field or displays an error modal if the request fails.
   * @param event - AutoComplete select event containing the selected branch option.
   */
  onBranchChanged(event: SelectChangeEvent): void {
    const branch = event.value as BranchOption;
    this.form.controls.cashRegister.reset();
    this.form.controls.cashRegister.disable();
    this.availableCashRegisters = [];
    if (!branch?.id) return;
    this.selectedBranch = branch;
    this.fetchRegistersByBranch(branch.id);
  }

  /**
   * Fetches the available cash registers for a specific branch.
   *
   * It subscribes to the `registersService.getByBranch` observable.
   * On success, it populates the `availableCashRegisters` array and enables the
   * `cashRegister` form control.
   * On error, it displays an error modal.
   *
   * @param {number} branchId The ID of the branch for which to fetch registers.
   * @private
   * @returns {void}
   */
  private fetchRegistersByBranch(branchId: number): void {
    this.registersService.getByBranch(branchId).subscribe({
      next: (registers) => {
        this.availableCashRegisters = registers;

        const ctrl = this.form.controls.cashRegister;

        if (!ctrl.value && registers.length > 0) {
          ctrl.setValue(registers[0].id, { emitEvent: true });
          this.selectedCashRegisterId = registers[0].id;
        }

        ctrl.enable();
      },
      error: () => {
        this.alert.set({
          type: 'error',
          title: 'Error al cargar cajas',
          text: 'No se pudieron obtener las cajas de la sucursal seleccionada.'
        });
      }
    });
  }

  /**
   * Gets the authenticated user's data from the `AuthService`.
   *
   * Populates the local `userResponse` property and sets the
   * `user` form control's value with the formatted full name.
   *
   * If no user is found in the service, it displays an error modal.
   *
   * @returns {void}
   */
  getUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userResponse = user;
      const fullName = `${this.userResponse.username}`;
      this.form.controls.user.setValue(fullName);
    }
  }
}
