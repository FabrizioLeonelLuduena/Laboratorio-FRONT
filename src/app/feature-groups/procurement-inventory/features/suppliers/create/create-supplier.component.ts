import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumber } from 'primeng/inputnumber';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { CollapsableFormComponent } from 'src/app/shared/components/collapsable-form/collapsable-form.component';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { SUPPLIER_CONTACT_FIELDS } from '../../../models/suppliers/supplier-contact-form.config';
import { SupplierContact, ContactType, RequestSupplierItemDTO } from '../../../models/suppliers/suppliers.model';
import { SupplyFiltersDTO } from '../../../models/supplies/supplies.model';
import { SuppliersService } from '../../../services/suppliers.service';
import { PackagingService } from '../../../services/supplies/packaging.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';

/**
 * Component for creating suppliers
 * Uses the global generic form from shared and a collapsable contact form
 */
@Component({
  selector: 'app-create-supplier',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericFormComponent,
    CollapsableFormComponent,
    PanelModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    InputNumber
  ],
  templateUrl: './create-supplier.component.html',
  styleUrls: ['./create-supplier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateSupplierComponent implements OnInit {
  // Generic form configuration (datos básicos)
  basicFields: GenericFormField[] = [
    { name: 'companyName', label: 'Razón social', type: 'text', placeholder: 'Ingrese la razón social', required: true, colSpan: 2 },
    {
      name: 'cuit',
      label: 'CUIT',
      type: 'cuit',
      placeholder: 'XX-XXXXXXXX-X',
      required: true,
      colSpan: 2,
      pattern: /^\d{2}-\d{8}-\d{1}$/,
      messages: {
        required: 'El CUIT es obligatorio.',
        pattern: 'El CUIT debe tener el formato XX-XXXXXXXX-X (11 dígitos).'
      }
    }
  ];

  // Contact form fields (CollapsableForm)
  contactFields = SUPPLIER_CONTACT_FIELDS;

  // State
  basicData: any = {};
  contacts: SupplierContact[] = [];
  saving = false;

  // Supplier items state
  supplierItems: SupplierItemRow[] = [];
  supplies: any[] = [];
  packagings: any[] = [];
  editingItemIndex = -1;

  supplyFilters: SupplyFiltersDTO = {
    sort: 'id,desc',
    isActive: true,
    size: 100,
    categoryId: undefined
  };
  searchTerm = '';


  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  private suppliersService = inject(SuppliersService);
  private suppliesService = inject(SuppliesService);
  private packagingService = inject(PackagingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private document = inject(DOCUMENT);

  @ViewChild(CollapsableFormComponent) contactFormComponent?: CollapsableFormComponent;
  @ViewChild(GenericFormComponent) basicFormComponent?: GenericFormComponent;

  /**
   * Lifecycle hook: initializes breadcrumb on component load
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario > Proveedores > Crear', '/procurement-inventory/suppliers');
    this.loadSupplies();
    this.loadPackagings();
  }

  /**
   * Legacy hook kept for compatibility with existing templates. New flow uses onSubmit().
   * @param _formData - form data (unused)
   */
  onFormSubmit(_formData: any): void {
    this.showWarning('Use el botón Guardar al pie para crear el proveedor con contactos.');
  }

  /**
   * Saves basic data emitted by GenericForm
   * This method is kept for compatibility but is not necessary
   * since we use ViewChild to access the form directly
   *
   * @param data - Basic supplier data
   */
  onBasicDataSave(data: any): void {
    this.basicData = data;
    this.cdr.markForCheck();
  }

  /**
   * Saves a contact sent from CollapsableForm
   * Validates contact type, value, and format before adding to list
   *
   * @param contact - Contact data to save
   */
  onContactSave(contact: any): void {
    // Validate contact type is provided
    if (!contact.contactType) {
      this.showWarning('Debe seleccionar el tipo de contacto (Email o Teléfono).');
      return;
    }

    // Validate contact value is provided
    if (!contact.contactValue) {
      this.showWarning('Debe ingresar el valor del contacto.');
      return;
    }

    // Validate format based on type
    if (contact.contactType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.contactValue)) {
        this.showWarning('El email debe tener un formato válido (ejemplo@correo.com).');
        return;
      }
    } else if (contact.contactType === 'PHONE') {
      // Validate phone contains only numbers, spaces, hyphens, parentheses, and plus sign
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(contact.contactValue)) {
        this.showWarning('El teléfono solo puede contener números, espacios, guiones y paréntesis.');
        return;
      }
      // Validate phone has at least 6 digits
      const digitsOnly = contact.contactValue.replace(/\D/g, '');
      if (digitsOnly.length < 6) {
        this.showWarning('El teléfono debe tener al menos 6 dígitos.');
        return;
      }
    }

    const newContact: SupplierContact = {
      contactType: contact.contactType as ContactType,
      description: contact.description || '',
      contactValue: contact.contactValue
    };

    this.contacts.push(newContact);

    // Reset form to add another contact
    setTimeout(() => {
      if (this.contactFormComponent?.form) {
        this.contactFormComponent.form.reset();
        this.contactFormComponent.collapsed = false; // Keep expanded to add more
      }
    }, 100);

    this.cdr.markForCheck();
  }

  /**
   * Deletes a contact from the list at the specified index
   * @param index - index of contact to remove
   */
  deleteContact(index: number): void {
    this.contacts.splice(index, 1);
    this.cdr.markForCheck();
  }

  // ========== SUPPLIER ITEMS MANAGEMENT ==========

  /**
   * Load all supplies from the backend
   */
  private loadSupplies(): void {
    const searchFilters: SupplyFiltersDTO = {
      ...this.supplyFilters,
      name: this.searchTerm || undefined
    };
    this.suppliesService.searchSupplies(searchFilters).subscribe({
      next: (response) => {
        this.supplies = response.content || [];
        this.cdr.markForCheck();
      },
      error: (_err) => {
        this.showError('Error al cargar los insumos. Intente nuevamente.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load all packagings from the backend
   */
  private loadPackagings(): void {
    this.packagingService.getAll().subscribe({
      next: (packagings) => {
        // Add displayName property to each packaging for the dropdown
        this.packagings = packagings.map(p => ({
          ...p,
          displayName: `${p.uomName}${p.unitsPerPackage !== 1 ? 's' : ''} X ${p.unitsPerPackage}`
        }));
        this.cdr.markForCheck();
      },
      error: (_err) => {
        this.showError('Error al cargar los empaques. Intente nuevamente.');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Add a new empty row to supplier items table
   */
  addSupplierItem(): void {
    const newItem: SupplierItemRow = {
      supply_id: null,
      packaging_id: null,
      description: '',
      unit_price: null
    };
    this.supplierItems.push(newItem);
    this.editingItemIndex = this.supplierItems.length - 1;
    this.cdr.markForCheck();

    // Focus the first cell of the new row
    setTimeout(() => {
      const lastRow = this.supplierItems.length - 1;
      const selector = `select[data-row="${lastRow}"][data-col="supply_id"]`;
      const el = this.document.querySelector<any>(selector);
      if (el) el.focus();
    }, 100);
  }

  /**
   * Delete supplier item at the specified index
   */
  deleteSupplierItem(index: number): void {
    this.supplierItems.splice(index, 1);
    if (this.editingItemIndex === index) {
      this.editingItemIndex = -1;
    } else if (this.editingItemIndex > index) {
      this.editingItemIndex--;
    }
    this.cdr.markForCheck();
  }

  /**
   * Handle cell focus for supplier items
   */
  onItemCellFocus(rowIndex: number, _colName: string): void {
    this.editingItemIndex = rowIndex;
  }

  /**
   * Handle keyboard navigation in supplier items grid
   */
  onItemKeyDown(event: any, rowIndex: number, colName: string): void {
    const cols = ['supply_id', 'packaging_id', 'description', 'unit_price'];
    const currentColIndex = cols.indexOf(colName);

    if (event.key === 'Enter') {
      event.preventDefault();

      // If it is the last editable column, append a new row
      if (currentColIndex === cols.length - 1) {
        this.addSupplierItem();
      } else {
        // Move focus to the next field in the row
        const nextCol = cols[currentColIndex + 1];
        const selector = `[data-row="${rowIndex}"][data-col="${nextCol}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < this.supplierItems.length) {
        const selector = `[data-row="${nextRow}"][data-col="${colName}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevRow = rowIndex - 1;
      if (prevRow >= 0) {
        const selector = `[data-row="${prevRow}"][data-col="${colName}"]`;
        const el = this.document.querySelector<any>(selector);
        if (el) el.focus();
      }
    }
  }

  // ========== END SUPPLIER ITEMS MANAGEMENT ==========

  /**
   * Maps UI contacts to RequestContactDTO expected by backend
   * Final submission: combines basicData + contacts and calls service
   * Validates required fields and CUIT format before submitting
   */
  onSubmit(): void {
    // Get current values from basic form
    if (this.basicFormComponent?.form) {
      this.basicData = this.basicFormComponent.form.value;
    }

    if (!this.basicData.companyName || !this.basicData.cuit) {
      this.showError('Complete los datos básicos del proveedor (Razón social y CUIT).');
      return;
    }

    // Validate CUIT format (XX-XXXXXXXX-X)
    const cuitDigitsOnly = this.basicData.cuit.replace(/\D/g, '');
    if (cuitDigitsOnly.length !== 11) {
      this.showError('El CUIT debe tener exactamente 11 dígitos (formato: XX-XXXXXXXX-X).');
      return;
    }

    // Validate supplier items: only Supply and Price are mandatory (alert-only)
    let hasInvalid = false;
    if (this.supplierItems.length > 0) {
      this.supplierItems.forEach((item) => {
        const priceNumber = typeof item.unit_price === 'number' ? item.unit_price : Number(item.unit_price);
        const missingSupply = !item.supply_id;
        const invalidPrice = priceNumber == null || isNaN(priceNumber) || priceNumber <= 0;
        if (missingSupply || invalidPrice) {
          hasInvalid = true;
        }
      });
      if (hasInvalid) {
        this.showError('Los campos producto y precio son obligatorios.');
        this.cdr.markForCheck();
        return;
      }
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Clean CUIT: remove hyphens to send only digits
    const cuitSinGuiones = this.basicData.cuit.replace(/\D/g, '');

    // Map supplier items to DTO (packaging is optional)
    const supplierItemsDTO: RequestSupplierItemDTO[] = this.supplierItems
      .filter(item => item.supply_id && item.unit_price != null)
      .map(item => ({
        supply_id: Number(item.supply_id),
        packaging_id: item.packaging_id ? Number(item.packaging_id) : undefined as any,
        description: item.description || '',
        // Ensure dot as decimal separator string for backend
        unit_price: Number(item.unit_price).toFixed(2)
      }));

    const dto = {
      companyName: this.basicData.companyName,
      cuit: cuitSinGuiones,
      contacts: this.contacts.map(c => ({
        label: c.description || undefined,
        description: c.contactValue,
        contactType: c.contactType,
        isActive: true
      })),
      ...(supplierItemsDTO.length > 0 && { supplierItems: supplierItemsDTO })
    };

    this.suppliersService.createSupplier(dto).subscribe({
      next: (res) => {
        this.saving = false;
        this.showSuccess(res?.message || 'Proveedor creado exitosamente');
        setTimeout(() => this.router.navigate(['/procurement-inventory/suppliers']), 1200);
        this.cdr.markForCheck();
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
   * Cancel and navigate back to suppliers list
   */
  onFormCancel(): void {
    this.router.navigate(['/procurement-inventory/suppliers']);
  }

  /**
   * Navigate back to suppliers list
   */
  onBack(): void {
    this.router.navigate(['/procurement-inventory/suppliers']);
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

  /**
   * Shows warning alert with auto-dismiss after 5 seconds
   * @param message - warning message to display
   */
  private showWarning(message: string): void {
    this.showAlertMessage(message, 'warning');
  }

  /**
   * Get packaging display name including UOM information (reintroduced)
   */
  getPackagingDisplay(packagingId: number | null): string {
    if (!packagingId) return '';
    const packaging = this.packagings.find(p => p.id === packagingId);
    if (!packaging) return '';
    return `${packaging.uomName}${packaging.unitsPerPackage !== 1 ? 's' : ''} X ${packaging.unitsPerPackage}`;
  }
}

/**
 * Interface for supplier item rows in the editable grid
 */
interface SupplierItemRow {
  supply_id: number | null;
  packaging_id: number | null;
  description: string;
  unit_price: number | null;
}
