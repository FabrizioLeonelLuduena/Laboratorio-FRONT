import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { forkJoin, Subscription } from 'rxjs';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { distinctUntilChanged } from 'rxjs/operators';

import {
  LocationUpdateDTO,
  ResponseLocationDTO,
  LocationTypeDTO
} from '../../../models/locations/locations.model';
import { LocationsService } from '../../../services/locations.service';

/**
 * Component for editing locations using generic form
 *
 * UPDATED BUSINESS RULES:
 * - Branch dropdown loads from locations/branch endpoint
 * - Address is optional (nullable)
 * - BRANCH type is hidden from user (client-side filter)
 * - Parent/type lists exclude BRANCH locations
 * - Fields use enable/disable based on type:
 *   - WAREHOUSE: enable address and parent (parent options = branches), can have both
 *   - EXTERNAL: enable address only, disable parent
 *   - Other types: disable address, enable parent if available
 */
@Component({
  selector: 'app-edit-location',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent
  ],
  templateUrl: './edit-location.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditLocationComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(GenericFormComponent) genericForm?: GenericFormComponent;

  formFields: GenericFormField[] = [];
  initialData: any;
  saving = false;
  loading = false;
  loadingParents = false;
  locationId!: number;
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  selectedLocationType: string | null = null;
  currentLocation: ResponseLocationDTO | null = null;
  allLocations: ResponseLocationDTO[] = [];
  branches: ResponseLocationDTO[] = [];
  locationTypes: LocationTypeDTO[] = [];

  private locationTypeSubscription?: Subscription;
  private addressSubscription?: Subscription;

  private locationsService = inject(LocationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Component initialization
   */
  ngOnInit(): void {
    this.locationId = +this.route.snapshot.paramMap.get('id')!;
    this.breadcrumbService.setFromString('Compras e inventario > Ubicaciones > Editar', '/procurement-inventory/locations');
    this.loadFormConfig();
  }

  /**
   * Setup listener for location type changes after view initialization
   */
  ngAfterViewInit(): void {
    this.setupLocationTypeListener();
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.locationTypeSubscription?.unsubscribe();
    this.addressSubscription?.unsubscribe();
  }

  /**
   * Load form configuration with location data
   * UPDATED: Loads branches and location types, filters BRANCH from parent options
   */
  private loadFormConfig(): void {
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      location: this.locationsService.getLocationById(this.locationId),
      locations: this.locationsService.getActiveLocations(),
      branches: this.locationsService.getBranchLocations(),
      locationTypes: this.locationsService.getLocationTypes()
    }).subscribe({
      next: ({ location, locations, branches, locationTypes }) => {
        // Store data for later use
        this.currentLocation = location;
        this.allLocations = locations.filter(loc => loc.locationType !== 'BRANCH' && loc.id !== location.id);
        this.branches = branches.filter(b => b.isActive);
        this.locationTypes = locationTypes;
        this.selectedLocationType = location.locationType;

        // Create a new object reference to force change detection
        this.initialData = { ...this.mapLocationToFormData(location) };

        this.formFields = this.buildFormFields(location);
        this.loading = false;
        this.cdr.markForCheck();

      },
      error: () => {
        this.showAlertMessage('Error al cargar la ubicación', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Build form fields with loaded data
   * UPDATED: Filters BRANCH from type dropdown, makes address optional
   */
  private buildFormFields(_currentLocation: ResponseLocationDTO): GenericFormField[] {
    // Filter out current location from parent options to prevent circular reference
    const parentLocationOptions = this.allLocations.map(loc => ({
      label: loc.name,
      value: loc.id
    }));

    // CLIENT-SIDE FILTER: Exclude BRANCH type from dropdown
    const locationTypeOptions = this.locationTypes
      .filter(type => type.code !== 'BRANCH')
      .map(type => ({
        label: type.label,
        value: type.code
      }));

    return [
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
        label: 'Tipo de ubicación',
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
        required: false,  // CHANGED: Address is now optional
        placeholder: 'Ingrese la dirección física',
        colSpan: 2,
        maxLength: 255,
        messages: {
          maxLength: 'La dirección no puede superar los 255 caracteres'
        }
      },
      {
        name: 'parentLocationId',
        label: 'Ubicación padre',
        type: 'select',
        required: false,
        placeholder: 'Seleccione la ubicación padre (opcional)',
        options: parentLocationOptions,
        filter: true,
        colSpan: 2,
        messages: {
          required: 'Debe seleccionar una ubicación padre'
        }
      }
    ];
  }

  /**
   * Map location response to form data
   */
  private mapLocationToFormData(location: ResponseLocationDTO): any {
    return {
      name: location.name,
      locationType: location.locationType,
      parentLocationId: location.parentLocationId,
      parentLocationName: location.parentLocationName,
      address: location.address
    };
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
   * Determines whether to enable/disable address and parent fields based on type
   * Implements dynamic loading with cache support
   */
  private onLocationTypeChange(locationType: string): void {
    if (!locationType) {
      this.allLocations = [];
      this.selectedLocationType = null;
      this.rebuildFormFields();
      return;
    }

    this.selectedLocationType = locationType;
    this.loadingParents = true;
    this.cdr.markForCheck();

    // If WAREHOUSE type, use branches as parent options
    if (locationType === 'WAREHOUSE') {
      this.allLocations = this.branches;
      this.loadingParents = false;
      this.rebuildFormFields();
      return;
    }

    // For other types, call backend to get valid parents (with cache support)
    this.locationsService.getValidParentsForType(locationType).subscribe({
      next: (parents) => {
        // CLIENT-SIDE FILTER: Exclude BRANCH-type locations and current location from parent options
        this.allLocations = parents.filter(p =>
          p.locationType !== 'BRANCH' &&
          p.id !== this.currentLocation?.id
        );
        this.loadingParents = false;
        this.rebuildFormFields();
      },
      error: () => {
        this.allLocations = [];
        this.loadingParents = false;
        this.rebuildFormFields();
      }
    });
  }

  /**
   * Rebuild form fields based on location type selection
   *
   * NEW LOGIC: Instead of adding/removing fields, we enable/disable them
   * - WAREHOUSE: enable address + parent (parent = branches), can have both
   * - EXTERNAL: enable address only, disable parent
   * - Other types: disable address, enable parent (if valid parents exist)
   */
  private rebuildFormFields(): void {
    if (!this.genericForm?.form) {
      return;
    }

    const isWarehouse = this.selectedLocationType === 'WAREHOUSE';
    const isExternal = this.selectedLocationType === 'EXTERNAL';
    const hasValidParents = isWarehouse ? this.branches.length > 0 : this.allLocations.length > 0;

    // Update parent location options based on type
    const parentOptions = isWarehouse
      ? this.branches.map(branch => ({
        label: branch.name,
        value: branch.id
      }))
      : this.allLocations.map(parent => ({
        label: parent.name,
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
        if (!this.initialData.parentLocationId) {
          parentControl?.setValue(null);
        }
      }

    } else if (isExternal) {
      // EXTERNAL: Enable address, disable parent
      addressControl?.enable();
      parentControl?.disable();
      if (!this.initialData.parentLocationId) {
        parentControl?.setValue(null);
      }

    } else {
      // Other types: Disable address, enable parent if available
      addressControl?.disable();
      if (!this.initialData.address) {
        addressControl?.setValue(null);
      }

      if (hasValidParents) {
        parentControl?.enable();
      } else {
        parentControl?.disable();
        if (!this.initialData.parentLocationId) {
          parentControl?.setValue(null);
        }
      }
    }

    this.cdr.detectChanges();
  }

  /**
   * Handle form submission
   * UPDATED: Handles address and parent fields according to location type
   */
  onFormSubmit(formData: any): void {
    this.saving = true;
    this.cdr.markForCheck();

    const locationData: LocationUpdateDTO = this.mapFormDataToDTO(formData);

    this.locationsService.updateLocation(this.locationId, locationData).subscribe({
      next: () => {
        this.showAlertMessage('Ubicación actualizada exitosamente', 'success');
        this.saving = false;
        this.cdr.markForCheck();

        // Navigate back to list after short delay
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/locations']);
        }, 1200);
      },
      error: (error) => {
        this.showAlertMessage(
          error.error?.message || 'Error al actualizar la ubicación',
          'error'
        );
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map form data to DTO (only changed fields)
   * UPDATED: Handles address and parent fields according to location type
   */
  private mapFormDataToDTO(formData: any): LocationUpdateDTO {
    const dto: LocationUpdateDTO = {};
    const isWarehouse = this.selectedLocationType === 'WAREHOUSE';
    const isExternal = this.selectedLocationType === 'EXTERNAL';

    // Always include name if changed
    if (formData.name !== this.initialData.name) {
      dto.name = formData.name;
    }

    // Always include locationType if changed
    if (formData.locationType !== this.initialData.locationType) {
      dto.locationType = formData.locationType;
    }

    // Handle address field (for WAREHOUSE and EXTERNAL types)
    if (isWarehouse || isExternal) {
      if (formData.address !== this.initialData.address) {
        dto.address = formData.address && formData.address.trim().length > 0
          ? formData.address.trim()
          : null;
      }
    } else {
      // For other types, clear address if it was previously set
      if (this.initialData.address) {
        dto.address = null;
      }
    }

    // Handle parent location (for WAREHOUSE and non-EXTERNAL types)
    if (isWarehouse || !isExternal) {
      if (formData.parentLocationId !== this.initialData.parentLocationId) {
        dto.parentLocationId = formData.parentLocationId || undefined;
      }
    } else {
      // For EXTERNAL type, clear parent if it was previously set
      if (this.initialData.parentLocationId) {
        dto.parentLocationId = undefined;
      }
    }

    return dto;
  }

  /**
   * Handle form cancellation
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
   * Show alert message
   */
  private showAlertMessage(message: string, type: AlertType): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    this.cdr.markForCheck();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }
}
