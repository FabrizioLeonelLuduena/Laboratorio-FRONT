import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { forkJoin } from 'rxjs';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import {
  SupplyDetailResponseDTO,
  SupplyUpdateDTO
} from '../../../models/supplies/supplies.model';
import { CategoryService } from '../../../services/supplies/category.service';
import { PackagingService } from '../../../services/supplies/packaging.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';

/**
 * Interface for supply form data from generic form component
 * Ensures type safety when handling form submissions
 *
 * NOTE: base_uom_id is not in form - backend manages it automatically from packaging
 */
interface SupplyFormData {
  name: string;
  sku?: string;
  note?: string;
  category_id: string;
  packaging_id: string;
}

const GRID_COLUMNS = 2;

/**
 * Component to edit supply information
 * Uses the generic shared form component
 */
@Component({
  selector: 'app-edit-supply',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent
  ],
  templateUrl: './edit-supply.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditSupplyComponent implements OnInit {
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
          required: 'La presentación es obligatoria'
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

  // Supply data
  supplyData?: SupplyDetailResponseDTO;

  // State
  supplyId!: number;
  loading = false;
  saving = false;
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  private suppliesService = inject(SuppliesService);
  private categoryService = inject(CategoryService);
  private packagingService = inject(PackagingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  /**
   * Component initialization
   * Loads supply data and populates form options
   */
  ngOnInit(): void {
    this.supplyId = +this.route.snapshot.paramMap.get('id')!;
    this.breadcrumbService.setFromString('Compras e inventario > Insumos > Editar', '/procurement-inventory/supplies');
    // Initialize form fields for this instance
    this.initializeFormFields();

    // Load categories and packagings in parallel, then load supply
    // NOTE: UOM is not loaded - it will be auto-completed by backend from packaging
    this.loading = true;
    this.cdr.markForCheck();

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

        // Now load the supply data
        this.loadSupply();
      },
      error: () => {
        this.alertMessage = 'Error loading form data. Please contact the system administrator.';
        this.alertType = 'error';
        this.showAlert = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load supply data
   */
  private loadSupply(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.suppliesService.getSupplyById(this.supplyId).subscribe({
      next: (supply) => {
        // Transform supply data to match form field names and types
        // NOTE: base_uom_id not included - backend manages it automatically
        this.supplyData = {
          ...supply,
          category_id: supply.categoryId?.toString() || '',
          packaging_id: supply.packaging?.id?.toString() || '',
          note: supply.notes || ''
        } as any;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlertMessage('Error loading supply', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle form submission
   */
  onFormSubmit(formData: SupplyFormData): void {
    this.saving = true;
    this.cdr.markForCheck();

    // Map form data to DTO
    const updateDTO: SupplyUpdateDTO = this.mapFormDataToDTO(formData);

    this.suppliesService.updateSupply(this.supplyId, updateDTO).subscribe({
      next: () => {
        this.showAlertMessage('Supply updated successfully', 'success');
        this.saving = false;
        this.cdr.markForCheck();

        // Navigate back to list after short delay
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/supplies']);
        }, 1500);
      },
      error: (error) => {
        this.showAlertMessage(
          error.error?.message || 'Error updating supply',
          'error'
        );
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map form data to DTO
   * Converts string IDs to numbers and includes optional fields
   *
   * NOTE: baseUomId is NOT sent - backend will auto-update it from packaging if packaging changes
   */
  private mapFormDataToDTO(formData: SupplyFormData): SupplyUpdateDTO {
    const dto: Partial<SupplyUpdateDTO> = {
      name: formData.name,
      sku: formData.sku,
      categoryId: parseInt(formData.category_id, 10),
      packagingId: parseInt(formData.packaging_id, 10)  // If changed, UOM auto-updates
    };

    // Add notes only if not empty
    if (formData.note && formData.note.trim()) {
      dto.notes = formData.note;
    }


    return dto as SupplyUpdateDTO;
  }

  /**
   * Handle form cancellation
   */
  onFormCancel(): void {
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
