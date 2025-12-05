import { Component, OnInit, AfterViewInit, ViewChild, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

import { map, Observable, combineLatest, debounceTime, startWith } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';

import { AlertType, GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import {
  GenericFormComponent,
  GenericFormField
} from '../../../../shared/components/generic-form/generic-form.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { BranchService } from '../../../care-management/services/branch.service';
import { InternalUserRegisterRequestDTO } from '../../models/InternalUserRegisterRequestDTO';
import { RolesResponseDTO } from '../../models/RolesResponseDTO';
import { RolesService } from '../../services/role.service';

/**
 * Represents the structure of the internal user registration form.
 *
 * @interface UserRegisterForm
 *
 * @property {string} firstName - The user's first name.
 * @property {string} lastName - The user's last name.
 * @property {number} document - The user's ID or document number.
 * @property {string} email - The user's email address.
 * @property {string} username - The chosen username.
 * @property {number[]} roles - The selected role IDs assigned to the user.
 */
interface UserRegisterForm extends Omit<InternalUserRegisterRequestDTO, 'role'> {
  roles: number[];
}

/**
 * Component responsible for registering internal users.
 *
 * Uses the `GenericFormComponent` to dynamically render the registration form,
 * handle field validation, and manage form submissions.
 *
 * Fetches available roles from `RolesService` and sends registration data
 * to `AuthService` to create new internal users.
 *
 * Displays loading indicators and alert messages for success or error feedback.
 *
 * @export
 * @class InternalUserRegisterComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-internal-user-register',
  templateUrl: './internal-user-register.component.html',
  standalone: true,
  imports: [
    GenericFormComponent,
    SpinnerComponent,
    GenericAlertComponent
  ]
})
export class InternalUserRegisterComponent implements OnInit, AfterViewInit {
  /** Emits notifications about the result of the registration process. */
  @Output() notified = new EventEmitter<{ success: boolean; message: string }>();

  @Output() cancelled = new EventEmitter<void>();

  /** Injected RolesService to fetch available roles */
  rolesService = inject(RolesService);

  /** Injected BranchService to fetch available roles */
  branchService = inject(BranchService);

  /** Injected AuthService to handle user registration */
  authService = inject(AuthService);

  /** Reference to the generic form component */
  @ViewChild(GenericFormComponent, { static: false }) genericForm?: GenericFormComponent;

  /** Change detector for manual detection */
  private cdr = inject(ChangeDetectorRef);

  /** List of active alerts displayed in the component. */
  alerts: {
    type: AlertType;
    title: string;
    text: string;
  }[] = [];

  /** Observable emitting the list of roles */
  roles$: Observable<RolesResponseDTO[]> | undefined;

  /** Observable emitting the list of branches */
  branches$: Observable<any> | undefined;

  /** Configuration for the generic form fields */
  fields: GenericFormField[] = [];

  /** Initial values for the form */
  initialValue: Record<string, any> = {};

  /** Indicates whether the registration request is currently being processed. */
  isLoading: boolean = false;

  /** Tracks if user has manually edited the username field */
  private usernameManuallyEdited: boolean = false;

  /**
   * Angular lifecycle hook executed after component initialization.
   *
   * Loads available roles from the API and initializes the form field configuration.
   * Once roles are fetched, updates the `roles` field options dynamically.
   */
  ngOnInit(): void {
    // Fetch roles

    this.roles$ = this.rolesService.getAll();
    this.branches$ = this.branchService.getAllBranches({ estado: 'ACTIVE' }, 0, 100, 'description,asc');
    // Definimos campos
    this.fields = [
      {
        name: 'lastName',
        label: 'Apellido',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/,
        messages: {
          pattern: 'Solo letras y espacios'
        }
      },
      {
        name: 'firstName',
        label: 'Nombre',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/,
        messages: {
          pattern: 'Solo letras y espacios'
        }
      },
      { name: 'document', label: 'Documento', type: 'number', required: true, min: 1000000, max: 99999999, messages: { min: 'Mínimo 7 digitos', max: 'Maximo 8 digitos' }, colSpan: 2 },
      {
        name: 'username',
        label: 'Nombre de usuario',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: /^[A-Z]+$/,
        messages: {
          pattern: 'Solo letras mayúsculas'
        }
      },
      { name: 'email', label: 'Email', type: 'email', required: true, colSpan: 4 },
      {
        name: 'roles',
        label: 'Roles',
        type: 'multiselect',
        required: true,
        options: [], // Se llenará dinámicamente
        filter: true,
        filterBy: 'label',
        placeholder: 'Seleccione uno o mas roles',
        display: 'chip',
        colSpan: 2
      },
      {
        name: 'branch',
        label: 'Sucursal',
        type: 'select',
        required: false,
        options: [], // Se llenará dinámicamente
        filter: true,
        filterBy: 'description',
        placeholder: 'Seleccione una sucursal',
        colSpan: 2
      }
    ];

    // Cargar opciones de roles cuando estén disponibles
    this.roles$?.subscribe(list => {
      const roleField = this.fields.find(f => f.name === 'roles');
      if (roleField) {
        roleField.options = list.map(r => ({ label: r.description, value: r.id }));
      }
    });

    this.branches$?.pipe(
      map(response =>
        response.content.map((branch : any)=> ({
          id: branch.id,
          description: branch.description
        }))
      )
    ).subscribe(list => {
      const branchField = this.fields.find(f => f.name === 'branch');
      if (branchField) {
        branchField.options = list.map((b: any) => ({ label: b.description, value: b.id }));
      }
    });

  }

  /**
   * Angular lifecycle hook executed after view initialization.
   * Sets up subscriptions to auto-generate username when firstName or lastName change.
   */
  ngAfterViewInit(): void {
    // Use longer timeout to ensure form is fully initialized
    setTimeout(() => {
      this.setupUsernameAutoGeneration();
    }, 300);
  }

  /**
   * Sets up automatic username generation based on firstName and lastName changes.
   */
  private setupUsernameAutoGeneration(): void {
    if (!this.genericForm?.form) {
      return;
    }

    const form = this.genericForm.form;
    const firstNameControl = form.get('firstName');
    const lastNameControl = form.get('lastName');
    const usernameControl = form.get('username');

    if (!firstNameControl || !lastNameControl || !usernameControl) {
      return;
    }


    combineLatest([
      firstNameControl.valueChanges.pipe(startWith(firstNameControl.value)),
      lastNameControl.valueChanges.pipe(startWith(lastNameControl.value))
    ]).pipe(
      debounceTime(100)
    ).subscribe(([firstName, lastName]) => {
      if (!this.usernameManuallyEdited) {
        const suggested = this.generateUsername(firstName?.trim() || '', lastName?.trim() || '');
        if (suggested) {
          usernameControl.setValue(suggested, { emitEvent: false });
          this.cdr.detectChanges();
        }
      }
    });


    usernameControl.valueChanges.pipe(
      debounceTime(300)
    ).subscribe((value) => {
      const firstName = firstNameControl.value?.trim() || '';
      const lastName = lastNameControl.value?.trim() || '';
      const expectedUsername = this.generateUsername(firstName, lastName);


      if (value && value !== expectedUsername) {
        this.usernameManuallyEdited = true;
      }
    });
  }

  /**
   * Generates a username from firstName and lastName.
   * @param firstName - The user's first name
   * @param lastName - The user's last name
   * @returns The generated username
   */
  private generateUsername(firstName: string, lastName: string): string {
    if (!firstName || !lastName) return '';
    const firstLetter = firstName.charAt(0).toUpperCase();
    const lastNameLower = lastName.toUpperCase().replace(/\s+/g, '');
    return firstLetter + lastNameLower;
  }

  /**
   * Translates backend error codes to Spanish messages.
   * @param errorMessage - The error message from the backend
   * @returns The translated error message in Spanish
   */
  private translateErrorMessage(errorMessage: string): string {
    const errorTranslations: Record<string, string> = {
      'DOCUMENT_REQUIRED': 'El número de documento es requerido.',
      'DOCUMENT_INVALID_FORMAT': 'El documento debe contener solo dígitos.',
      'DOCUMENT_INVALID_LENGTH': 'El número de documento debe tener entre 7 y 8 dígitos.',
      'DOCUMENT_IN_USE': 'El documento ya está en uso para este tipo de usuario.',
      'EMAIL_REQUIRED': 'El email es requerido.',
      'EMAIL_INVALID_FORMAT': 'El formato del email es inválido.',
      'EMAIL_IN_USE': 'El email ya está en uso.',
      'USERNAME_REQUIRED': 'El nombre de usuario es requerido.',
      'USERNAME_INVALID_FORMAT': 'El nombre de usuario solo puede contener letras mayúsculas.',
      'USERNAME_IN_USE': 'El nombre de usuario ya está en uso.',
      'FIRST_NAME_REQUIRED': 'El nombre es requerido.',
      'LAST_NAME_REQUIRED': 'El apellido es requerido.',
      'ROLE_REQUIRED': 'Debe seleccionar al menos un rol.'
    };

    // Extract error code from message (format: "ERROR_CODE: Message")
    const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
    if (errorCodeMatch) {
      const errorCode = errorCodeMatch[1];
      return errorTranslations[errorCode] || errorMessage;
    }

    return errorMessage;
  }

  /**
   * Handles form submission event.
   *
   * Converts form data into an `InternalUserRegisterRequestDTO` object
   * and sends it to the backend through `AuthService`.
   *
   * Emits a notification with success or error feedback once the request completes.
   *
   * @param {UserRegisterForm} formValue - The current values of the registration form.
   */
  onSubmit(formValue: UserRegisterForm) {
    this.isLoading = true;
    const requestDto: InternalUserRegisterRequestDTO = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      document: formValue.document,
      email: formValue.email,
      username: formValue.username.toUpperCase(),
      role: formValue.roles,
      branch: formValue.branch
    };

    this.authService.registerUser(requestDto).subscribe({
      next: user => {
        this.isLoading = false;
        this.notified.emit({ success: true, message: user.message });
        this.initialValue = {};
      },
      error: (err) => {
        this.isLoading = false;
        const translatedMessage = this.translateErrorMessage(err.message || 'Ocurrió un error al registrar el usuario.');
        this.notified.emit({ success: false, message: translatedMessage });
      }
    });
  }
  /**
   * Maneja la acción de cancelación del formulario de registro.
   * Emite el evento `cancelled` para que el componente padre vuelva a la vista de tabla.
   */
  onCancel(): void {
    this.cancelled.emit();
  }
}
