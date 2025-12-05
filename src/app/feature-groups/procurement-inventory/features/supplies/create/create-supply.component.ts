import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { CreateSupplyRequestDTO } from '../../../models/supplies/supplies.model';
import { CategoryService } from '../../../services/supplies/category.service';
import { PackagingService } from '../../../services/supplies/packaging.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';

/**
 * Interface for supply form data from generic form component
 * Ensures type safety when handling form submissions
 *
 * NOTE: UOM is not included in form - backend auto-completes it from packaging
 */
interface SupplyFormData {
  name: string;
  sku?: string;
  note?: string;
  category_id: string;
  packaging_id: string;      // Required - UOM auto-completed from this
}

const GRID_COLUMNS = 2;

/**
 * Component for creating new supplies
 * Uses the shared generic form component
 */
@Component({
  selector: 'app-create-supply',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent
  ],
  templateUrl: './create-supply.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateSupplyComponent implements OnInit {
  @ViewChild(GenericFormComponent) genericForm?: GenericFormComponent;

  readonly gridColumns = GRID_COLUMNS;

  // Form fields configuration
  formFields: GenericFormField[] = [];

  // ...existing code...

  /**
   * Initialize form fields to avoid sharing between component instances
   */
  private initializeFormFields(): void {
    this.formFields = [
      {
        name: 'name',
        label: 'Nombre del insumo',
        type: 'text',
        required: true,
        placeholder: 'Papel A4',
        colSpan: 1
      },
      {
        name: 'sku',
        label: 'SKU',
        type: 'text',
        required: true,
        placeholder: 'SKU',
        colSpan: 1
      },
      {
        name: 'category_id',
        label: 'Categoría del insumo',
        type: 'select',
        required: true,
        placeholder: 'Selecciona una categoría',
        options: [],
        filter: true,
        filterPlaceholder: 'Buscar categoría',
        colSpan: 1
      },
      {
        name: 'packaging_id',
        label: 'Empaque',
        type: 'select',
        required: true,
        placeholder: 'Selecciona un empaque',
        options: [],
        filter: true,
        filterPlaceholder: 'Buscar empaque',
        colSpan: 1,
        hint: 'La unidad de medida se asignará automáticamente según el empaque',
        messages: {
          required: 'El empaque es obligatorio'
        }
      },
      {
        name: 'note',
        label: 'Notas',
        type: 'textarea',
        placeholder: 'Notas adicionales',
        rows: 3,
        colSpan: GRID_COLUMNS
      }
    ];
  }

  // State
  saving = false;
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  private suppliesService = inject(SuppliesService);
  private categoryService = inject(CategoryService);
  private packagingService = inject(PackagingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  /**
   * OnInit - Load categories and packagings in parallel
   * NOTE: UOM is not loaded - it will be auto-completed by backend from packaging
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario > Insumos > Crear', '/procurement-inventory/supplies');
    // Initialize form fields for this instance
    this.initializeFormFields();

    // Load categories and packagings in parallel
    forkJoin({
      categories: this.categoryService.getCategories(),
      packagings: this.packagingService.getAll()
    }).subscribe({
      next: ({ categories, packagings }) => {
        // Populate categories
        const categoryField = this.formFields.find(f => f.name === 'category_id');
        if (categoryField) {
          categoryField.options = categories.map(category => ({
            label: category.name,
            value: category.id.toString()
          }));
        }

        // Populate packagings
        const packagingField = this.formFields.find(f => f.name === 'packaging_id');
        if (packagingField) {
          packagingField.options = packagings.map(packaging => ({
            label: `${packaging.uomName} X ${packaging.unitsPerPackage}`,
            value: packaging.id.toString()
          }));
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.alertMessage = 'Error loading form data. Please contact the system administrator.';
        this.alertType = 'error';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle form submission
   * Converts form data to the format expected by the backend
   */
  onFormSubmit(formData: SupplyFormData): void {
    this.saving = true;
    this.cdr.markForCheck();

    // Map form data to backend DTO
    const createDTO: CreateSupplyRequestDTO = this.mapFormDataToDTO(formData);

    this.suppliesService.createSupply(createDTO).subscribe({
      next: (_response) => {
        this.saving = false;
        this.showSuccess('Insumo creado exitosamente');

        // Navigate back to list after a brief delay
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/supplies']);
        }, 1500);

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.showError(error?.error?.message || 'Error al crear el insumo');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map form data to backend DTO
   * Converts string IDs to numbers and includes optional fields
   *
   * NOTE: baseUomId is NOT sent - backend will auto-complete it from packaging
   */
  private mapFormDataToDTO(formData: SupplyFormData): CreateSupplyRequestDTO {
    const dto: Partial<CreateSupplyRequestDTO> = {
      name: formData.name,
      sku: formData.sku,
      categoryId: parseInt(formData.category_id, 10),
      packagingId: parseInt(formData.packaging_id, 10)  // Required - UOM auto-completed from this
    };

    // Add notes only if not empty
    if (formData.note && formData.note.trim()) {
      dto.notes = formData.note;
    }

    return dto as CreateSupplyRequestDTO;
  }

  /**
   * Handle form cancellation
   */
  onFormCancel(): void {
    // Navigate to list
    this.router.navigate(['/procurement-inventory/supplies']);
  }

  /**
   * Navigate back to supplies list
   */
  onBack(): void {
    this.router.navigate(['/procurement-inventory/supplies']);
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
   * Show success alert
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  /**
   * Show error alert
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 3000);
  }
}
