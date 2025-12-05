import { AfterViewInit, Component, inject, OnDestroy, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import { AlertType, GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { ConfirmationModalComponent } from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { CapitalizePipe } from '../../../../shared/pipes/capitalize.pipe';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { InternalUser } from '../../models/InternalUser';
import { RolesResponseDTO } from '../../models/RolesResponseDTO';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PasswordResetService } from '../../services/password-reset.service';
import { RolesService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { InternalUserEditingFormComponent } from '../internal-user-editing-form/internal-user-editing-form.component';
import { InternalUserRegisterComponent } from '../internal-user-register/internal-user-register.component';

/**
 * Component that displays a table of internal users.
 *
 * Uses `AdvancedTableComponent` to render user data, and provides
 * actions such as view, edit, delete, and password restore.
 * Supports dialogs for user registration and notifications via toast messages.
 *
 * @export
 * @class InternalUserTableComponent
 * @implements {AfterViewInit}
 */
@Component({
  selector: 'app-internal-user-table',
  imports: [
    FormsModule,
    GenericAlertComponent,
    GenericBadgeComponent,
    InternalUserRegisterComponent,
    InternalUserEditingFormComponent,
    ConfirmationModalComponent,
    GenericTableComponent,
    CapitalizePipe,
    TutorialOverlayComponent,
    SpinnerComponent
  ],
  templateUrl: './internal-user-table.component.html',
  styleUrl: './internal-user-table.component.css'
})
export class InternalUserTableComponent implements AfterViewInit, OnInit, OnDestroy {
  /** Template reference for rendering user roles as chips. */
  @ViewChild('rolesChipTemplate') rolesChipTemplate!: TemplateRef<any>;

  @ViewChild('lastNameTemplate') lastNameTemplate!: TemplateRef<unknown>;

  @ViewChild('firstNameTemplate') firstNameTemplate!: TemplateRef<unknown>;

  /** Template reference for the tutorial overlay. */
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  /** Subscription to the global TutorialService trigger stream. */
  private tutorialSub?: Subscription;

  /** Subject to handle the global search debounce. */
  private searchSubject = new Subject<string>();

  /** Subscription for the el search subject */
  private searchSubscription?: Subscription;

  /** Configuration for the tutorial steps. */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de usuarios',
        message: 'Aquí puedes ver y administrar todos los usuarios del sistema.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Registrar nuevo usuario',
        message: 'Haz clic aquí para abrir el formulario de registro de un nuevo usuario.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros avanzados',
        message: 'Usa este botón para filtrar usuarios por estado (Activo/Inactivo), tipo (Interno/Externo) y rol.',
        position: 'right',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table span',
        title: 'Búsqueda rápida',
        message: 'Escribe aquí para buscar usuarios por apellido, nombre, documento, email o nombre de usuario.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de Acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada usuario.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: '.p-popover-content',
        title: 'Acciones',
        message: 'Desde este menú puedes editar, habilitar/deshabilitar o reestablecer la contraseña de un usuario.',
        position: 'left',
        highlightPadding: 10,
        onEnter: () => {
          if(!document.querySelector('.p-popover-content')){
            const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
            if (firstMenuButton) {
              firstMenuButton.click();
            }
          }
        }
      }
    ],
    onComplete: () => {
      // You can add logic here for when the tutorial is completed
    },
    onSkip: () => {
      // You can add logic here for when the tutorial is skipped
    }
  });

  showRegisterForm = false;
  showEditModal = false;
  selectedUser: InternalUser | null = null;
  showConfirmationModal = false;
  confirmationModalData: {
    icon: string;
    title: string;
    message: string;
    inputField?: {
      label: string;
      placeholder: string;
      required: boolean;
      type?: 'text' | 'textarea';
    };
  } = {
      icon: 'pi pi-exclamation-triangle',
      title: '',
      message: ''
    };
  pendingAction: ((reason?: string) => void) | null = null;

  /** Service for managing internal users and fetching data. */
  userService = inject(UserService);

  rolesService = inject(RolesService);
  breadcrumbService = inject(BreadcrumbService);
  tutorialService = inject(TutorialService);

  /** Constructor */
  constructor() {

  }

  /** Service for handling errors */
  errorHandler = inject(ErrorHandlerService);

  /** Service for password reset */
  passwordResetService = inject(PasswordResetService);

  rolesList: RolesResponseDTO[] = [];

  filteredData = signal<InternalUser[]>([]);

  columns: any[] = [];

  totalElements: number = 0;

  loading = signal<boolean>(false);

  filtersFields: Filter[] = [
    {
      id: 'status',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Activo', value: true, active: true },
        { label: 'Inactivo', value: false, active: false },
        { label: 'Todos', value: null, active: false }
      ]
    },
    {
      id: 'type',
      label: 'Tipo',
      type: 'radio',
      options: [
        { label: 'Interno', value: false, active: true },
        { label: 'Externo', value: true, active: false },
        { label: 'Todos', value: null, active: false }
      ]
    },
    {
      id: 'roles',
      label: 'Roles',
      type: 'select',
      options: []
    }
  ];

  searchParams: {
    page: number;
    size: number;
    sortBy: string | string[];
    sortDirection: string;
    search: string;
    isActive: boolean | null;
    isExternal: boolean | null;
    roleId: number[] | null;
  } = {
      page: 0,
      size: 5,
      sortBy: 'lastUpdatedDatetime',
      sortDirection: 'DESC',
      search: '',
      isActive: true,
      isExternal: false,
      roleId: null
    };

  /**
   *
   */
  getActionsForRow(row: any) {
    const userRow = row as InternalUser;
    const toggleAction = userRow.isActive
      ? { label: 'Deshabilitar', icon: 'pi pi-times', command: () => this.confirmToggleUserStatus(row) }
      : { label: 'Habilitar', icon: 'pi pi-check', command: () => this.confirmToggleUserStatus(row) };

    return [
      {
        label: 'Editar', icon: 'pi pi-pencil', command: () => {
          this.startEditUser(userRow);
        }
      },
      toggleAction,
      { label: 'Reestablecer Contraseña', icon: 'pi pi-key', command: () => this.confirmRestorePassword(row) }
    ];
  }

  alerts: { type: AlertType; title: string; text: string; }[] = [];

  /**
   * Lifecycle hook that is called after the component's view has been fully initialized.
   * Sets up the table columns including custom templates for active status and roles.
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'document', header: 'Documento', sortable: true },
      { field: 'lastName', header: 'Apellido', sortable: true, template: this.lastNameTemplate },
      { field: 'firstName', header: 'Nombre', sortable: true, template: this.firstNameTemplate },
      { field: 'email', header: 'Email', sortable: true },
      { field: 'username', header: 'Usuario', sortable: true },
      { field: 'isActive', header: 'Estado', sortable: true },
      { field: 'roles', header: 'Roles', sortable: true, template: this.rolesChipTemplate }
    ];
  }

  /**
   * Initializes the component by loading the user table and fetching available roles.
   * Populates the roles filter with data retrieved from the RolesService.
   */
  ngOnInit(): void {
    this.setTableBreadcrumb();

    this.loadTable();


    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((searchValue: string) => {
        this.searchParams = {
          ...this.searchParams,
          search: searchValue,
          page: 0
        };
        this.loadTable();
      });
    this.rolesService.getAll().subscribe({
      next: (roles) => {
        this.rolesList = roles;
        this.filtersFields = this.filtersFields.map(f => {
          if (f.id === 'roles') {
            return {
              ...f,
              options: roles.map(r => ({ label: r.description, value: r.id }))
            };
          }
          return f;
        });
      },
      error: () => {
        this.showAlert({
          title: 'Error',
          text: 'Error al cargar roles',
          type: 'error'
        });
      }
    });

    // Subscribe to tutorial trigger
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      // Assuming a key like 'userManagement' for this tutorial
      if (!route.includes('user-management')) return;

      setTimeout(() => {
        if (this.tutorialOverlay) {
          this.tutorialOverlay.start();
        }
      }, 100);
    });
  }

  /**
   * Component cleanup.
   * Unsubscribes from the tutorial service to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  /**
   * Handles changes in filters emitted by the generic filter component.
   * Updates the search parameters and reloads the user table accordingly.
   *
   * @param event - Filter change event containing the active filters.
   */
  onFilterChange(event: FilterChangeEvent) {
    // First, map the active filters to an easy-to-use object
    const activeFiltersMap: Record<string, any> = {};
    event.filters.forEach(f => {
      activeFiltersMap[f.id] = f.value;
    });
    // TEMPORARY until multiselect is added to generic filters
    const roleId: number[] = activeFiltersMap['roles'] != null
      ? [activeFiltersMap['roles']]
      : [];


    // Update only the corresponding fields in searchParams
    this.searchParams = {
      ...this.searchParams,
      isActive: activeFiltersMap['status'] ?? null,   // si no vino, lo pongo en null
      isExternal: activeFiltersMap['type'] ?? null,
      roleId: roleId
    };

    this.loadTable();
  }

  /**
   * Handles changes to the global search input.
   * Updates the `search` parameter and reloads the table.
   *
   * @param value - The search string entered by the user.
   */
  onGlobalFilterChange(value: string) {
    this.searchSubject.next(value ?? '');
  }

  /**
   * Handles pagination events from the table component.
   * Updates the page and size parameters, then reloads the table.
   *
   * @param event - Object containing `first` (start index) and `rows` (page size).
   */
  onPageChange(event: { first: number, rows: number }) {
    const page = Math.floor(event.first / event.rows);
    const size = event.rows;

    this.searchParams = {
      ...this.searchParams,
      page: page,
      size: size
    };

    this.loadTable();
  }



  /**
   * Loads user data into the table based on the current search parameters.
   * Handles loading state and error reporting.
   *
   * @private
   */
  private loadTable() {
    this.loading.set(true);
    this.userService.searchUsers(this.searchParams).subscribe({
      next: (res) => {
        this.totalElements = res.totalElements;
        this.filteredData.set(res.content);
        this.loading.set(false);
      },
      error: () => {
        this.showAlert({
          title: 'Error',
          text: 'Error al cargar usuarios',
          type: 'error'
        });
        this.loading.set(false);
      }
    });
  }
  /**
   * Closes the edit modal and reloads the table if necessary.
   */
  closeEditModal(reload: boolean = false): void {
    this.showEditModal = false;
    this.selectedUser = null;
    if (reload) {
      this.loadTable();
    }
    this.setTableBreadcrumb();
  }

  /**
   * Displays a temporary alert in the component.
   *
   * @param alert Object containing type, title, and text of the message.
   */
  showAlert(alert: { type: AlertType; title: string; text: string; }) {
    this.alerts.push(alert);

    // Optional: automatically remove it after X seconds
    setTimeout(() => {
      this.alerts.shift();
    }, 5000);
  }

  /**
   * Handles the result of an operation from a child form component.
   * Shows an alert and reloads the table if the operation was successful.
   *
   * @param result Object with `success` boolean and `message` string.
   */
  onNotified(result: { success: boolean; message: string }) {
    const alertType = result.success ? 'success' : 'error';
    const alertTitle = result.success ? 'Éxito' : 'Error';

    this.showAlert({
      title: alertTitle,
      text: result.message,
      type: alertType as 'success' | 'error'
    });

    if (result.success) {
      this.loadTable();
      this.showRegisterForm = false;
      this.setTableBreadcrumb();
    }
  }

  /**
   * Establece el breadcrumb para la vista de tabla de usuarios.
   */
  private setTableBreadcrumb(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión de usuarios', routerLink: '/user-management' },
      { label: 'Usuarios', routerLink: '/user-management' }
    ]);
  }

  /**
   * Establece el breadcrumb para la vista de registro de usuario.
   */
  private setRegisterBreadcrumb(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión de usuarios', routerLink: '/user-management' },
      { label: 'Registrar usuario', routerLink: '/user-management' }
    ]);
  }

  /**
   * Establece el breadcrumb para la vista de edición de usuario.
   */
  private setEditBreadcrumb(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión de usuarios', routerLink: '/user-management' },
      { label: 'Editar usuario', routerLink: '/user-management' }
    ]);
  }

  /**
   * Maneja la acción de crear un nuevo usuario.
   * Muestra el formulario de registro y actualiza el breadcrumb.
   */
  onCreateUser(): void {
    this.showRegisterForm = true;
    this.setRegisterBreadcrumb();
  }

  /**
   * Maneja la cancelación del registro de usuario.
   * Vuelve a la vista de tabla y restaura el breadcrumb.
   */
  onCancelRegister(): void {
    this.showRegisterForm = false;
    this.setTableBreadcrumb();
  }

  /**
   * Inicia la edición de un usuario.
   * Muestra el formulario de edición y actualiza el breadcrumb.
   * @param user - Usuario a editar
   */
  private startEditUser(user: InternalUser): void {
    this.selectedUser = user;
    this.showEditModal = true;
    this.setEditBreadcrumb();
  }

  /**
   * Shows confirmation modal before toggling user status.
   * @param user - The user record to toggle status for
   */
  confirmToggleUserStatus(user: Record<string, any>): void {
    const currentStatus = user['isActive'] as boolean;
    const action = !currentStatus ? 'activar' : 'desactivar';

    this.confirmationModalData = {
      icon: currentStatus ? 'pi pi-times-circle' : 'pi pi-check-circle',
      title: `¿Seguro que deseas ${action} este usuario?`,
      message: '',
      inputField: {
        label: 'Motivo del cambio de estado',
        placeholder: 'Ingresa el motivo...',
        required: true,
        type: 'textarea'
      }
    };

    this.pendingAction = (reason?: string) => this.toggleUserStatus(user, reason || '');
    this.showConfirmationModal = true;
  }

  /**
   * Toggles the active status of a user (activate/deactivate).
   * Uses ErrorHandlerService for consistent error handling.
   *
   * @param user - The user record to toggle status for
   * @param reason - The reason for the status change
   */
  private toggleUserStatus(user: Record<string, any>, reason: string): void {
    const userId = user['id'] as number;
    const currentStatus = user['isActive'] as boolean;
    const newStatus = !currentStatus;
    const action = newStatus ? 'activar' : 'desactivar';
    this.userService.updateUserStatus(userId, newStatus, reason).subscribe({
      next: () => {
        this.showAlert({
          type: 'success',
          title: 'Estado actualizado',
          text: `Usuario ${action === 'activar' ? 'activado' : 'desactivado'} correctamente`
        });
        // Reload table to show updated status
        this.loadTable();
      },
      error: (err) => {
        const errorMessage = this.errorHandler.getErrorMessage(
          err,
          `No se pudo ${action} el usuario. Por favor, intenta nuevamente.`
        );
        this.showAlert({
          type: 'error',
          title: 'Error al actualizar estado',
          text: errorMessage
        });
      }
    });
  }

  /**
   * Shows confirmation modal before sending password reset email.
   * @param user - The user record to restore password for
   */
  confirmRestorePassword(user: Record<string, any>): void {
    const userName = `${user['firstName']} ${user['lastName']}`;
    const email = user['email'] as string;

    if (!email) {
      this.showAlert({
        type: 'error',
        title: 'Error',
        text: 'El usuario no tiene un correo electrónico asociado.'
      });
      return;
    }

    this.confirmationModalData = {
      icon: 'pi pi-key',
      title: '¿Enviar correo de recuperación?',
      message: `Se enviará un correo de recuperación de contraseña a "${userName}" (${email}).`
    };

    this.pendingAction = () => this.restorePassword(user);
    this.showConfirmationModal = true;
  }

  /**
   * Sends a password reset email to the user.
   * Uses PasswordResetService to trigger the forgot password flow.
   *
   * @param user - The user record to restore password for
   */
  private restorePassword(user: Record<string, any>): void {
    const email = user['email'] as string;

    this.passwordResetService.forgotPassword(email).subscribe({
      next: () => {
        this.showAlert({
          type: 'success',
          title: 'Correo enviado',
          text: `Se ha enviado un correo de recuperación a ${email}`
        });
      },
      error: (err) => {
        const errorMessage = this.errorHandler.getErrorMessage(
          err,
          'No se pudo enviar el correo de recuperación. Por favor, intenta nuevamente.'
        );
        this.showAlert({
          type: 'error',
          title: 'Error al enviar correo',
          text: errorMessage
        });
      }
    });
  }

  /**
   * Handles confirmation modal accept action.
   * Executes the pending action and closes the modal.
   * @param reason - Optional reason from input field
   */
  onConfirmationAccepted(reason?: string | void): void {
    if (this.pendingAction) {
      const reasonStr = typeof reason === 'string' ? reason : undefined;
      this.pendingAction(reasonStr);
      this.pendingAction = null;
    }
    this.showConfirmationModal = false;
  }

  /**
   * Handles confirmation modal dismissal.
   * Closes the modal without executing the pending action.
   */
  onConfirmationDismissed(): void {
    this.pendingAction = null;
    this.showConfirmationModal = false;
  }


}
