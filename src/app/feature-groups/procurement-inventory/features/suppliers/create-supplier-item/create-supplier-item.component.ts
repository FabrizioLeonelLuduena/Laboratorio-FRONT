import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { SupplierItemsService } from '../../../services/supplier-items/supplier-items.service';
import { SuppliersService } from '../../../services/suppliers.service';
import { PackagingService } from '../../../services/supplies/packaging.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';

/**
 * Component for creating a supplier item
 * Accessible from create-supplier or edit-supplier views
 */
@Component({
  selector: 'app-create-supplier-item',
  standalone: true,
  imports: [
    CommonModule,
    GenericAlertComponent,
    GenericFormComponent
  ],
  templateUrl: './create-supplier-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateSupplierItemComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private breadcrumbService = inject(BreadcrumbService);
  private suppliersService = inject(SuppliersService);
  private supplierItemsService = inject(SupplierItemsService);
  private suppliesService = inject(SuppliesService);
  private packagingService = inject(PackagingService);
  private cdr = inject(ChangeDetectorRef);

  supplierId: number | null = null;
  supplierName: string = '';
  
  formFields: GenericFormField[] = [];
  
  // Alert state
  showAlert = false;
  alertMessage = '';
  alertType: AlertType = 'info';
  
  // Loading state
  saving = false;
  loading = true;

  /**
   * ngOnInit
   */
  ngOnInit(): void {
    // Get supplier ID from route
    const id = this.route.snapshot.paramMap.get('supplierId');
    this.supplierId = id ? parseInt(id, 10) : null;

    if (!this.supplierId) {
      this.showError('ID de proveedor no válido');
      this.goBack();
      return;
    }

    this.loadSupplierData();
    this.loadFormData();
  }

  /**
   * Load supplier data to get the name for breadcrumbs
   */
  private loadSupplierData(): void {
    if (!this.supplierId) return;

    this.suppliersService.getSupplierById(this.supplierId).subscribe({
      next: (supplier) => {
        this.supplierName = supplier.companyName;
        this.setBreadcrumbs();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Error al cargar datos del proveedor');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Set breadcrumbs with supplier context
   */
  private setBreadcrumbs(): void {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Proveedores', route: '/procurement-inventory/suppliers' },
      {
        label: `Editar: ${this.supplierName}`,
        route: `/procurement-inventory/suppliers/${this.supplierId}/edit`
      },
      { label: 'Crear Producto del Proveedor' }
    ]);
  }

  /**
   * Load supplies and packagings for form dropdowns
   */
  private loadFormData(): void {
    // Load supplies
    this.suppliesService.searchSupplies({ isActive: true, size: 100 }).subscribe({
      next: (response: any) => {
        const supplies = (response.content || []).map((s: any) => ({
          label: s.name,
          value: s.id
        }));

        // Load packagings
        this.packagingService.getAll().subscribe({
          next: (packagings: any[]) => {
            const packagingOptions = packagings.map((p: any) => ({
              label: p.uomName || p.name || p.description,
              value: p.id
            }));

            this.buildFormFields(supplies, packagingOptions);
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.showError('Error al cargar empaques');
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.showError('Error al cargar productos');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Build form fields configuration
   * Order: description, supply, packaging, price
   */
  private buildFormFields(supplies: any[], packagings: any[]): void {
    this.formFields = [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        required: false,
        placeholder: 'Descripción del producto del proveedor',
        colSpan: 4
      },
      {
        name: 'supply_id',
        label: 'Suministro',
        type: 'select',
        required: true,
        options: supplies,
        filter: true,
        filterBy: 'label',
        colSpan: 2
      },
      {
        name: 'packaging_id',
        label: 'Empaque',
        type: 'select',
        required: true,
        options: packagings,
        filter: true,
        filterBy: 'label',
        colSpan: 2
      },
      {
        name: 'unit_price',
        label: 'Precio Unitario',
        type: 'number',
        required: true,
        placeholder: '0.00',
        min: 0.01,
        colSpan: 2
      }
    ];
  }

  /**
   * Handle form submission
   */
  onFormSubmit(formData: any): void {
    if (!this.supplierId) {
      this.showError('ID de proveedor no válido');
      return;
    }

    this.saving = true;

    // Prepare supplier item data for POST endpoint
    const supplierItemData = {
      supplier_id: this.supplierId,
      supply_id: formData.supply_id,
      packaging_id: formData.packaging_id,
      description: formData.description || '',
      unit_price: formData.unit_price.toString()
    };

    // Create supplier item using the dedicated endpoint
    this.supplierItemsService.createSupplierItem(supplierItemData).subscribe({
      next: () => {
        this.showSuccess('Producto del proveedor creado exitosamente');
        this.saving = false;
        this.cdr.markForCheck();

        // Navigate back after 1.2 seconds
        setTimeout(() => this.goBack(), 1200);
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
   */
  onFormCancel(): void {
    this.goBack();
  }

  /**
   * Navigate back to previous view
   */
  private goBack(): void {
    this.location.back();
  }

  /**
   * Show success alert
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
  }

  /**
   * Show error alert
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
  }

  /**
   * Extract error message from HTTP error
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Error al crear el producto del proveedor';
  }
}

