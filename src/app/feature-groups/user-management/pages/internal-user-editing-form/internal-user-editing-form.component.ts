import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, SimpleChanges, Output, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { combineLatest } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField, GenericSelectOption } from 'src/app/shared/components/generic-form/generic-form.component';

import { map } from 'rxjs/operators';

import { InternalUser } from '../../models/InternalUser';
import { UpdatedUserResponseDTO } from '../../models/UpdatedUserResponseDTO';
import { UpdateUserRequestDTO } from '../../models/UpdateUserRequestDTO';
import { RolesService } from '../../services/role.service';
import { UserService } from '../../services/user.service';

/**
 *  Component for editing internal user details.
 */
@Component({
  selector: 'app-internal-user-editing-form',
  imports: [
    CommonModule,
    FormsModule,
    GenericFormComponent,
    GenericAlertComponent,
    ReactiveFormsModule
  ],
  templateUrl: './internal-user-editing-form.component.html',
  styleUrl: './internal-user-editing-form.component.css'
})

export class InternalUserEditingFormComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) user!: InternalUser;     // user to be edited (from table)

  @Output() updated = new EventEmitter<InternalUser>(); // for notifying parent component of successful update

  @Output() cancelled = new EventEmitter<void>();

  private userService = inject(UserService);
  private rolesService = inject(RolesService);
  private branchService = inject(BranchService);
  private authService = inject(AuthService);

  // alert control
  alertVisible = false;
  alertType: 'success' | 'error' | 'warning' | 'info' = 'success';
  alertText = '';

  saving = false;
  private successTimer: any = null;

  // for roles select (label/value which GenericForm expects)
  rolesOptions: GenericSelectOption[] = [];
  // for branches select (label/value which GenericForm expects)
  branchOptions: GenericSelectOption[] = [];


  fields: GenericFormField[] = [];
  initialValue: any = {};

  private currentUserId: number | null = null;

  /**
 *  Initial values for the form fields, populated when the user input changes.
 */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      const currentUser = this.authService.getUser();
      this.currentUserId = currentUser?.id ?? null;

      if (this.currentUserId === this.user.id) {
        this.alertType = 'warning';
        this.alertText = 'Estás editando tu propio usuario. Ten en cuenta que debes volver a iniciar sesión tras guardar los cambios.';
        this.alertVisible = true;
      } else {
        this.alertVisible = false;
      }
      this.loadRolesAndBranches();
    }
  }

  /**
   *  Loads available roles and branches in parallel and builds the form when both are ready.
   *  If branches service is down, continues with empty branches and shows a warning instead of blocking.
   */
  private loadRolesAndBranches(): void {
    const roles$ = this.rolesService.getAll().pipe(
      map(roles => roles.map(r => ({
        label: r.description.replace(/_/g, ' '),
        value: r.id
      })))
    );

    // branches$ se resuelve de forma tolerante: si falla, devuelve [] y muestra advertencia
    const branches$ = this.branchService.getAllBranches({ estado: 'ACTIVE' }, 0, 100, 'description,asc').pipe(
      map(res => res.content.map(b => ({
        label: b.description,
        value: b.id
      })))
    );

    combineLatest([roles$, branches$]).subscribe({
      next: ([roles, branches]) => {
        this.rolesOptions = roles;
        this.branchOptions = branches;

        // Si no hay branches cargadas, dejamos el placeholder y deshabilitamos el select.
        // Set initial form values based on the user being edited
        this.initialValue = {
          firstName: this.user.firstName,
          lastName: this.user.lastName,
          username: this.user.username,
          email: this.user.email,
          document: this.user.document,
          branch: this.user.branchId != null ? Number(this.user.branchId) : null,
          roles: this.user.roles?.map(r => Number(r.id)) || []
        };

        // Build the form fields after loading options
        this.buildFields();
      },
      error: err => {
        this.alertType = 'error';
        this.alertText = `Error al cargar datos: ${err.message}`;
        this.alertVisible = true;
      }
    });
  }

  /**
   * Builds the form fields dynamically based on available roles.
   */
  private buildFields(): void {
    // Determine username validation based on user type
    // External users: numbers only (e.g., DNI)
    // Internal users: uppercase letters only
    const usernamePattern = this.user.isExternal ? /^[0-9]+$/ : /^[A-Z]+$/;
    const usernamePatternMessage = this.user.isExternal
      ? 'Solo números'
      : 'Solo letras mayúsculas';

    this.fields = [
      {
        name: 'lastName',
        label: 'Apellido',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/,
        messages: { pattern: 'Solo letras y espacios' }
      },
      {
        name: 'firstName',
        label: 'Nombre',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/,
        messages: { pattern: 'Solo letras y espacios' }
      },
      { name: 'document', label: 'Documento', type: 'number', required: true, min: 1000000, max: 99999999, messages: { min: 'Mínimo 7 digitos', max: 'Maximo 8 digitos' }, colSpan: 2 },
      {
        name: 'username',
        label: 'Nombre de usuario',
        type: 'text',
        required: true,
        colSpan: 2,
        pattern: usernamePattern,
        messages: { pattern: usernamePatternMessage }
      },
      { name: 'email', label: 'Email', type: 'email', required: true, colSpan: 4 },
      {
        name: 'branch',
        label: 'Sucursal',
        type: 'select',
        required: false,
        options: this.branchOptions,
        filter: true,
        filterBy: 'label',
        placeholder: this.branchOptions.length ? 'Seleccione una sucursal' : 'Sucursales no disponibles',
        colSpan: 2,
        disabled: !this.branchOptions.length
      },
      {
        name: 'roles',
        label: 'Roles',
        type: 'multiselect',
        required: true,
        options: this.rolesOptions,
        filter: true,
        filterBy: 'label',
        placeholder: this.rolesOptions.length ? 'Seleccione uno o mas roles' : 'Roles no disponibles',
        display: 'chip',
        colSpan: 2,
        disabled: !this.rolesOptions.length
      }
    ];
  }

  /**
 *  Handles form submission to update user details.
 */
  onSubmit(updatedData: Partial<UpdatedUserResponseDTO>): void {
    if (!this.user) return;

    // normalizar username
    if (updatedData.username) {
      updatedData.username = updatedData.username.toUpperCase();
    }

    // asegurar conversión de types y shape requerido por el backend
    const payload: UpdateUserRequestDTO = {
      firstName: updatedData.firstName ?? this.user.firstName,
      lastName: updatedData.lastName ?? this.user.lastName,
      username: updatedData.username ?? this.user.username,
      email: updatedData.email ?? this.user.email,
      document: String(updatedData.document ?? this.user.document),
      roleId: Array.isArray(updatedData.roles) && updatedData.roles.length > 0
        ? updatedData.roles.map(r => Number(r))
        : (this.user.roles?.map(r => Number(r.id)) ?? []),
      branchId: updatedData.branchId != null ? Number(updatedData.branchId) : this.user.branchId
    };

    if (!payload.roleId || payload.roleId.length === 0) {
      this.alertType = 'error';
      this.alertText = 'Debe seleccionar al menos un rol';
      this.alertVisible = true;
      return;
    }

    this.alertVisible = false;
    this.saving = true;
    this.userService.updateUser(this.user.id, payload).subscribe({
      next: (res) => {
        this.alertType = 'success';
        this.alertText = 'Usuario actualizado con éxito';
        this.alertVisible = true;

        this.successTimer = setTimeout(() => {
          if (this.currentUserId === this.user.id) {
            this.alertType = 'info';
            this.alertText = 'Serás dirigido al login para reingresar con los nuevos datos...';
            this.alertVisible = true;
            setTimeout(() => {
              this.authService.logout();
            }, 3000);
          } else {
            this.updated.emit(res);
          }

          this.saving = false;
          this.successTimer = null;
        }, 2000);
      },
      error: () => {
        this.saving = false;
        this.alertType = 'error';
        this.alertText = 'Ocurrió un error al actualizar el usuario';
        this.alertVisible = true;
      }
    });
  }

  /**
   *Cleanup function, unsubscribes from all subscriptions to prevent memory leaks.
   **/
  ngOnDestroy(): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
  }
  /**
   * Maneja la acción de cancelación del formulario de edición.
   * Emite el evento `cancelled` para que el componente padre vuelva a la tabla.
   */
  onCancel(): void {
    this.cancelled.emit();
  }
}
