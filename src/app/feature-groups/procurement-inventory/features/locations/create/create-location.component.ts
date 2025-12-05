import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';

import { Subscription } from 'rxjs';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import {
  GenericFormComponent,
  GenericFormField
} from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { distinctUntilChanged } from 'rxjs/operators';

import {
  ResponseLocationDTO,
  RequestLocationDTO,
  LocationTypeDTO
} from '../../../models/locations/locations.model';
import { LocationsService } from '../../../services/locations.service';

/**
 * Component for creating locations using generic form
 *
 * UPDATED BUSINESS RULES:
 * - Branch field removed - branches are loaded as parent options for WAREHOUSE type
 * - Address is optional (nullable)
 * - BRANCH type is hidden from user (client-side filter)
 * - Parent/type lists exclude BRANCH locations
 * - Fields use enable/disable instead of show/hide:
 *   - WAREHOUSE: enable address and parent (parent options = branches), can have both
 *   - EXTERNAL: enable address only, disable parent
 *   - Other types: disable address, enable parent if available
 */
@Component({
  selector: 'app-create-location',
  standalone: true,
  imports: [
    CommonModule,
    GenericFormComponent,
    GenericAlertComponent,
    GenericButtonComponent
  ],
  templateUrl: './create-location.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateLocationComponent implements OnInit, OnDestroy, AfterViewInit {
  private _genericForm?: GenericFormComponent;

  /**
   * Setter for GenericFormComponent reference
   * Automatically configures location type listener when form is available
   */
  set genericForm(form: GenericFormComponent | undefined) {
    if (form && !this._genericForm) {
      this._genericForm = form;
      this.setupLocationTypeListener();
    }
  }

  /**
   * Getter for GenericFormComponent reference
   */
  get genericForm(): GenericFormComponent | undefined {
    return this._genericForm;
  }

  formFields: GenericFormField[] = [];
  saving = false;
  loadingParents = false;

  branches = signal<ResponseLocationDTO[]>([]);  // Changed from BranchResponseDTO[]
  locationTypes = signal<LocationTypeDTO[]>([]);
  validParents = signal<ResponseLocationDTO[]>([]);

  selectedLocationType: string | null = null;

  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  private locationsService = inject(LocationsService);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private cdr = inject(ChangeDetectorRef);

  private locationTypeSubscription?: Subscription;
  private addressSubscription?: Subscription;

  /**
   * Initialize the component
   * Sets up breadcrumb and loads initial data
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Ubicaciones > Crear',
      '/procurement-inventory/locations'
    );
    this.loadInitialData();
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.locationTypeSubscription?.unsubscribe();
    this.addressSubscription?.unsubscribe();
  }

  /**
   * Load initial data (branches and location types)
   */
  private loadInitialData(): void {
    this.locationsService.getLocationTypes().subscribe({
      next: (types) => {
        this.locationTypes.set(types);
        this.loadBranches();
      },
      error: () => {
        this.locationTypes.set([]);
        this.buildInitialFormFields();
      }
    });
  }

  /**
   * Load branch locations from locations service
   * CHANGED: Now uses locations/branch endpoint instead of branches microservice
   */
  private loadBranches(): void {
    this.locationsService.getBranchLocations().subscribe({
      next: (branchLocations) => {
        // Filter only active branches
        const activeBranches = branchLocations.filter(b => b.isActive);
        this.branches.set(activeBranches);
        this.buildInitialFormFields();
      },
      error: () => {
        this.branches.set([]);
        this.buildInitialFormFields();
      }
    });
  }

  /**
   * Reference to the generic form component
   */
  @ViewChild(GenericFormComponent)
  set genericFormSetter(form: GenericFormComponent | undefined) {
    if (form && this.genericForm !== form) {
      this.genericForm = form;
    }
  }

  /**
   * Setup location type listener after view is fully initialized
   * This ensures the form and all its controls are ready
   * Uses a retry mechanism to handle async form field initialization
   */
  ngAfterViewInit(): void {
    this.setupLocationTypeListener();
  }

  /**
   * Setup listener for location type changes
   * Triggers parent location loading when type is selected
   * Retries if form is not ready yet (up to 10 attempts)
   */
  private setupLocationTypeListener(attempt = 0): void {
    if (this.locationTypeSubscription) {
      return;
    }

    // If form or control not ready, retry up to 10 times
    if (!this.genericForm?.form) {
      if (attempt < 10) {
        setTimeout(() => this.setupLocationTypeListener(attempt + 1), 50);
      }
      return;
    }

    const locationTypeControl = this.genericForm.form.get('locationType');

    if (locationTypeControl) {
      this.locationTypeSubscription = locationTypeControl.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((locationType: string) => {
          this.onLocationTypeChange(locationType);
        });
    } else if (attempt < 10) {
      // Control doesn't exist yet, retry
      setTimeout(() => this.setupLocationTypeListener(attempt + 1), 50);
    }
  }

  /**
   * Handle location type change
   *
   * UPDATED: Filters out BRANCH locations from valid parents (client-side)
   * Determines whether to show branch/address or parent fields based on type
   */
  private onLocationTypeChange(locationType: string): void {
    
    if (!locationType) {
      this.validParents.set([]);
      this.selectedLocationType = null;
      this.rebuildFormFields();
      return;
    }

    this.selectedLocationType = locationType;
    this.loadingParents = true;
    this.cdr.markForCheck();

    // If WAREHOUSE type, use branches as parent options
    if (locationType === 'WAREHOUSE') {
      this.validParents.set(this.branches());
      this.loadingParents = false;
      this.rebuildFormFields();
      return;
    }

    // For other types, call backend to get valid parents
    this.locationsService.getValidParentsForType(locationType).subscribe({
      next: (parents) => {
        // CLIENT-SIDE FILTER: Exclude BRANCH-type locations from parent options
        const filteredParents = parents.filter(p => p.locationType !== 'BRANCH');
        this.validParents.set(filteredParents);
        this.loadingParents = false;
        this.rebuildFormFields();
      },
      error: () => {
        this.validParents.set([]);
        this.loadingParents = false;
        this.rebuildFormFields();
      }
    });
  }

  /**
   * Build initial form fields (before location type is selected)
   * Shows name, location type, and the 3 conditional fields (all disabled initially)
   *
   * UPDATED: Filters out BRANCH from location type options
   */
  private buildInitialFormFields(): void {
    // CLIENT-SIDE FILTER: Exclude BRANCH type from dropdown
    const locationTypeOptions = this.locationTypes()
      .filter(type => type.code !== 'BRANCH')
      .map(type => ({
        label: type.label,
        value: type.code
      }));

    this.formFields = [
      {
        name: 'name',
        label: 'Nombre',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el nombre de la ubicación',
        colSpan: 2,
        maxLength: 100,
        messages: {
          required: 'El nombre es obligatorio',
          maxLength: 'El nombre no puede superar los 100 caracteres'
        }
      },
      {
        name: 'locationType',
        label: 'Tipo de Ubicación',
        type: 'select',
        required: true,
        placeholder: 'Seleccione el tipo',
        options: locationTypeOptions,
        filter: true,
        colSpan: 2,
        messages: {
          required: 'Debe seleccionar un tipo de ubicación'
        }
      },
      {
        name: 'address',
        label: 'Dirección',
        type: 'text',
        required: false,
        placeholder: 'Ingrese la dirección física',
        colSpan: 2,
        maxLength: 255,
        messages: {
          maxLength: 'La dirección no puede superar los 255 caracteres'
        }
      },
      {
        name: 'parentLocationId',
        label: 'Ubicación Padre',
        type: 'select',
        required: false,
        placeholder: 'Seleccione la ubicación padre',
        options: [],
        filter: true,
        colSpan: 2,
        messages: {
          required: 'Debe seleccionar una ubicación padre'
        }
      }
    ];

    this.cdr.markForCheck();
  }

  /**
   * Rebuild form fields based on location type selection
   *
   * NEW LOGIC: Instead of adding/removing fields, we enable/disable them
   * - WAREHOUSE: enable address + branch (mutual exclusion), disable parent
   * - Other types: disable address + branch, enable parent (if valid parents exist)
   */
  private rebuildFormFields(): void {
    if (!this.genericForm?.form) {
      return;
    }

    const isWarehouse = this.selectedLocationType === 'WAREHOUSE';
    const isExternal = this.selectedLocationType === 'EXTERNAL';
    const hasValidParents = this.validParents().length > 0;

    // Update parent location options
    const NO_PARENT_LABEL = 'NO_PARENT';
    const parentOptions = this.validParents().map(parent => ({
      label: parent.parentLocationName && parent.parentLocationName !== NO_PARENT_LABEL
        ? `${parent.name} (${parent.parentLocationName})`
        : parent.name,
      value: parent.id
    }));

    const parentField = this.formFields.find(f => f.name === 'parentLocationId');
    if (parentField) {
      parentField.options = parentOptions;
      parentField.placeholder = this.loadingParents
        ? 'Cargando ubicaciones...'
        : (parentOptions.length === 0
          ? 'No hay ubicaciones disponibles'
          : isWarehouse ? 'Seleccione la sucursal' : 'Seleccione la ubicación padre');
    }

    // Get form controls
    const addressControl = this.genericForm.form.get('address');
    const parentControl = this.genericForm.form.get('parentLocationId');

    // Clear any existing subscriptions
    this.addressSubscription?.unsubscribe();

    if (isWarehouse) {
      // WAREHOUSE: Enable address and parent (parent = branches)
      addressControl?.enable();
      if (hasValidParents) {
        parentControl?.enable();
      } else {
        parentControl?.disable();
        parentControl?.setValue(null);
      }

    } else if (isExternal) {
      // EXTERNAL: Enable address, disable parent
      addressControl?.enable();
      parentControl?.disable();
      parentControl?.setValue(null);

    } else {
      // Other types: Disable address, enable parent if available
      addressControl?.disable();
      addressControl?.setValue(null);

      if (hasValidParents) {
        parentControl?.enable();
      } else {
        parentControl?.disable();
        parentControl?.setValue(null);
      }
    }

    this.cdr.detectChanges();
  }

  /**
   * Handle form submission
   *
   * UPDATED LOGIC:
   * - WAREHOUSE: can include address and/or parentLocationId (where parent = branch)
   * - EXTERNAL: includes address only
   * - Other types: includes parentLocationId, excludes address
   * - Address is nullable
   */
  onFormSubmit(formData: any): void {
    this.saving = true;

    const isWarehouse = this.selectedLocationType === 'WAREHOUSE';
    const isExternal = this.selectedLocationType === 'EXTERNAL';

    const locationData: RequestLocationDTO = {
      name: formData.name,
      locationType: formData.locationType
    };

    // Handle address field (for WAREHOUSE and EXTERNAL types)
    if (isWarehouse || isExternal) {
      if (formData.address && typeof formData.address === 'string' && formData.address.trim().length > 0) {
        locationData.address = formData.address.trim();
      }
    }

    // Handle parent location (for WAREHOUSE and non-EXTERNAL types)
    if (isWarehouse || (!isExternal && formData.parentLocationId)) {
      if (formData.parentLocationId) {
        locationData.parentLocationId = formData.parentLocationId;
      }
    }

    this.locationsService.createLocation(locationData).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Ubicación creada exitosamente');
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/locations']);
        }, 1200);
      },
      error: (error) => {
        this.saving = false;
        const errorMessage = this.extractErrorMessage(error);
        this.showError(errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle form cancellation
   * Navigates back to locations list
   */
  onFormCancel(): void {
    this.router.navigate(['/procurement-inventory/locations']);
  }

  /**
   * Navigate back to locations list
   */
  onBack(): void {
    this.router.navigate(['/procurement-inventory/locations']);
  }

  /**
   * Trigger form submission programmatically
   */
  triggerSubmit(): void {
    if (this.genericForm?.form.valid) {
      this.onFormSubmit(this.genericForm.form.getRawValue());
    } else {
      this.genericForm?.form.markAllAsTouched();
    }
  }

  /**
   * Extract error message from backend response
   */
  private extractErrorMessage(error: any): string {
    let errorMessage = 'Ocurrió un error inesperado. Intente nuevamente o contacte al administrador.';

    // Handle HTTP status codes with user-friendly messages
    if (error?.status) {
      switch (error.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifique su conexión a internet o contacte al administrador.';
      case 500:
        return 'Error interno del servidor. Por favor, intente nuevamente más tarde o contacte al administrador.';
      case 503:
        return 'El servicio no está disponible temporalmente. Por favor, intente nuevamente más tarde.';
      case 404:
        return 'No se encontró el recurso solicitado.';
      case 403:
        return 'No tiene permisos para realizar esta acción.';
      case 401:
        return 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
      }
    }

    if (error?.error?.validationErrors && typeof error.error.validationErrors === 'object') {
      const validationErrors = error.error.validationErrors;
      const fieldErrors = Object.values(validationErrors).join(', ');
      const mainMessage = error.error.message || 'Error de validación en los campos';
      errorMessage = `${mainMessage}: ${fieldErrors}`;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error?.message && !error.message.includes('Http failure response')) {
      errorMessage = error.message;
    }

    return errorMessage;
  }

  /**
   * Shows alert message with auto-dismiss after 5 seconds
   * @param message - message to display
   * @param type - alert type
   */
  private showAlertMessage(message: string, type: AlertType): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Shows success alert with auto-dismiss after 5 seconds
   * @param message - success message to display
   */
  private showSuccess(message: string): void {
    this.showAlertMessage(message, 'success');
  }

  /**
   * Shows error alert with auto-dismiss after 5 seconds
   * @param message - error message to display
   */
  private showError(message: string): void {
    this.showAlertMessage(message, 'error');
  }

}
