import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
import { SupplierContact, SupplierUpdateDTO, ContactType } from '../../../models/suppliers/suppliers.model';
import { SuppliersService } from '../../../services/suppliers.service';

/**
 * Component for editing suppliers
 * Uses the same pattern as create-supplier component
 */
@Component({
  selector: 'app-edit-supplier',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericAlertComponent,
    GenericFormComponent,
    GenericButtonComponent,
    CollapsableFormComponent,
    PanelModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    InputNumber
  ],
  templateUrl: './edit-supplier.component.html',
  styleUrls: ['./edit-supplier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditSupplierComponent implements OnInit {
  basicFields: GenericFormField[] = [
    { name: 'companyName', label: 'Razón social', type: 'text', placeholder: 'Ingrese la razón social', required: true, colSpan: 2 },
    {
      name: 'cuit',
      label: 'CUIT',
      type: 'text',
      placeholder: 'XX-XXXXXXXX-X',
      required: true,
      colSpan: 2,
      disabled: true
    }
  ];

  contactFields = SUPPLIER_CONTACT_FIELDS;

  supplierId!: number;
  basicData: any = {};
  contacts: Array<SupplierContact & { id?: number; isActive?: boolean }> = [];
  loading = false;
  saving = false;
  formSize: 'sm' | 'md' | 'lg' = 'lg';

  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  // Supplier items state (same as create)
  supplierItems: SupplierItemRow[] = [];
  supplierItemsOptions: any[] = []; // Available supplier items for dropdown
  packagings: any[] = [];
  editingItemIndex = -1;

  private suppliersService = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  @ViewChild(CollapsableFormComponent) contactFormComponent?: CollapsableFormComponent;
  @ViewChild(GenericFormComponent) basicFormComponent?: GenericFormComponent;

  /**
   * Component initialization
   */
  ngOnInit(): void {
    this.supplierId = +this.route.snapshot.paramMap.get('id')!;
    this.breadcrumbService.setFromString('Compras e inventario > Proveedores > Editar', '/procurement-inventory/suppliers');
    // Load supplier data (which includes supplier items with supply and packaging info)
    this.loadSupplier();
  }

  /**
   * Loads supplier data from backend
   */
  private loadSupplier(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.suppliersService.getSupplierById(this.supplierId).subscribe({
      next: (supplier) => {
        this.basicData = {
          companyName: supplier.companyName,
          cuit: supplier.cuit
        };

        this.contacts = (supplier.contacts || []).map(c => ({
          id: c.id,
          contactType: c.contactType,
          description: c.label || '',
          contactValue: c.description,
          isActive: c.isActive !== undefined ? c.isActive : true
        }));

        // Extract supplier items options and packagings from supplier items
        this.extractSuppliesAndPackagings(supplier.supplierItems || []);

        // Load existing supplier items and coerce price to number
        this.supplierItems = (supplier.supplierItems || []).map((item: any) => {
          const itemId = item.id ?? null;
          const supply = item.supply_id ?? item.supplyId ?? null;
          const packaging = item.packaging_id ?? item.packagingId ?? null;
          const priceRaw = item.unit_price ?? item.unitPrice ?? null;
          const priceNum = priceRaw != null ? Number(priceRaw) : null;
          return {
            supplier_item_id: itemId !== null && itemId !== undefined ? Number(itemId) : null,
            supply_id: supply !== null && supply !== undefined ? Number(supply) : null,
            packaging_id: packaging !== null && packaging !== undefined ? Number(packaging) : null,
            description: item.description ?? '',
            unit_price: isNaN(Number(priceNum)) ? null : Number(priceNum)
          } as SupplierItemRow;
        });

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = this.extractErrorMessage(error, 'al cargar el proveedor');
        this.showAlertMessage(errorMessage, 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== SUPPLIER ITEMS MANAGEMENT (copied from create) ==========

  /**
   * Extract supplier items and packagings from supplier items
   * Uses the supplier items that come with the supplier GET response
   */
  private extractSuppliesAndPackagings(supplierItems: any[]): void {
    const supplierItemsMap = new Map();
    const packagingsMap = new Map();

    supplierItems.forEach(item => {
      const itemId = item.id;
      const packagingId = item.packaging_id ?? item.packagingId;

      // Add supplier item if not already in map
      if (itemId && !supplierItemsMap.has(itemId)) {
        supplierItemsMap.set(itemId, {
          id: itemId,
          description: item.description || 'Sin descripción',
          supply_id: item.supply_id ?? item.supplyId,
          packaging_id: item.packaging_id ?? item.packagingId,
          unit_price: item.unit_price ?? item.unitPrice,
          supply: item.supply,
          packaging: item.packaging
        });
      }

      // Add packaging if not already in map and has packaging info
      if (item.packaging && packagingId && !packagingsMap.has(packagingId)) {
        packagingsMap.set(packagingId, {
          id: packagingId,
          uomName: item.packaging.uomName,
          unitsPerPackage: item.packaging.unitsPerPackage,
          active: item.packaging.active
        });
      }
    });

    this.supplierItemsOptions = Array.from(supplierItemsMap.values());
    this.packagings = Array.from(packagingsMap.values());
  }

  /**
   * Handle supplier item selection change
   * Auto-fills supply_id, packaging_id, and unit_price from the selected supplier item
   */
  onSupplierItemChange(index: number, event: any): void {
    const selectedItemId = event.value;
    const selectedItem = this.supplierItemsOptions.find(item => item.id === selectedItemId);

    if (selectedItem && this.supplierItems[index]) {
      this.supplierItems[index].supply_id = selectedItem.supply_id;
      this.supplierItems[index].packaging_id = selectedItem.packaging_id;
      this.supplierItems[index].unit_price = selectedItem.unit_price ? Number(selectedItem.unit_price) : null;
      this.supplierItems[index].description = selectedItem.description;
      this.cdr.markForCheck();
    }
  }

  /**
   * Get packaging display name including UOM information
   * @param packagingId - The packaging ID
   * @returns Formatted packaging display text
   */
  getPackagingDisplay(packagingId: number | null): string {
    if (!packagingId) return '';
    const packaging = this.packagings.find(p => p.id === packagingId);
    if (!packaging) return '';
    return `${packaging.uomName}${packaging.unitsPerPackage !== 1 ? 's' : ''} X ${packaging.unitsPerPackage}`;
  }

  /**
   * Add a new empty row to supplier items table
   */
  addSupplierItem(): void {
    const newItem: SupplierItemRow = {
      supplier_item_id: null,
      supply_id: null,
      packaging_id: null,
      description: '',
      unit_price: null
    };
    this.supplierItems.push(newItem);
    this.editingItemIndex = this.supplierItems.length - 1;
    this.cdr.markForCheck();
  }

  /**
   * Delete supplier item at the specified index
   * @param index - Index of the item to delete
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
   * @param rowIndex - Index of the row being focused
   * @param _colName - Column name (unused parameter)
   */
  onItemCellFocus(rowIndex: number, _colName: string): void {
    this.editingItemIndex = rowIndex;
  }

  /**
   * Handle keyboard navigation in supplier items grid
   * @param event - Keyboard event
   * @param rowIndex - Current row index
   * @param colName - Current column name
   */
  onItemKeyDown(event: any, rowIndex: number, colName: string): void {
    const cols = ['supply_id', 'packaging_id', 'description', 'unit_price'];
    const currentColIndex = cols.indexOf(colName);
    if (event.key === 'Enter') {
      event.preventDefault();
      if (currentColIndex === cols.length - 1) {
        this.addSupplierItem();
      } else {
        const nextColIndex = (currentColIndex + 1) % cols.length;
        const nextRowIndex = nextColIndex === 0 ? rowIndex + 1 : rowIndex;
        this.editingItemIndex = nextRowIndex;
      }
    }
  }
  // ========== END SUPPLIER ITEMS MANAGEMENT ==========

  /**
   * Handle form submission
   * @param _formData - Form data (unused parameter)
   */
  onFormSubmit(_formData: any): void {
    // Use current basic form values if available
    if (this.basicFormComponent?.form) {
      this.basicData = this.basicFormComponent.form.value;
    }

    if (!this.basicData.companyName) {
      this.showError('Complete los datos básicos del proveedor.');
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

    // Build contacts payload
    const contactsPayload = this.contacts.map(c => ({
      id: c.id,
      label: c.description || null,
      description: c.contactValue,
      contactType: c.contactType,
      isActive: c.isActive !== undefined ? c.isActive : true
    } as any));

    // Map supplier items to DTO (packaging optional)
    const supplierItemsDTO = (this.supplierItems || [])
      .filter(i => i.supply_id && i.unit_price != null)
      .map(i => ({
        supply_id: Number(i.supply_id),
        packaging_id: i.packaging_id ? Number(i.packaging_id) : undefined as any,
        description: i.description || '',
        unit_price: Number(i.unit_price).toFixed(2)
      }));

    const updateDTO: SupplierUpdateDTO = {
      companyName: this.basicData.companyName,
      contacts: contactsPayload,
      supplierItems: supplierItemsDTO // always send array (can be empty) to allow deletions
    };

    this.suppliersService.updateSupplier(this.supplierId, updateDTO).subscribe({
      next: () => {
        const successMessage = 'Proveedor actualizado exitosamente';
        this.showSuccess(successMessage);
        this.saving = false;
        this.cdr.markForCheck();

        setTimeout(() => this.router.navigate(['/procurement-inventory/suppliers']), 1200);
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
   * Open dialog to edit contact
   * @param contact - Contact to edit
   */
  openContactDialog(contact: any): void {
    // Navigate to full screen contact editor
    if (!this.supplierId) return;
    const contactId = contact?.id ?? '';
    this.router.navigate([`/procurement-inventory/suppliers/${this.supplierId}/contacts/${contactId}/edit`]);
  }

  /**
   * Handle form cancellation
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
   * Navigate to create supplier item page
   */
  onCreateSupply(): void {
    this.router.navigate([`/procurement-inventory/suppliers/${this.supplierId}/items/create`]);
  }

  /**
   * Saves contact from CollapsableForm
   */
  onContactSave(contact: any): void {
    if (!contact.contactType) {
      this.showWarning('Debe seleccionar el tipo de contacto (Email o Teléfono).');
      return;
    }

    if (!contact.contactValue) {
      this.showWarning('Debe ingresar el valor del contacto.');
      return;
    }

    if (contact.contactType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.contactValue)) {
        this.showWarning('El email debe tener un formato válido (ejemplo@correo.com).');
        return;
      }
    } else if (contact.contactType === 'PHONE') {
      const phoneRegex = /^[\d\s\-()+]+$/;
      if (!phoneRegex.test(contact.contactValue)) {
        this.showWarning('El teléfono solo puede contener números, espacios, guiones y paréntesis.');
        return;
      }
      const digitsOnly = contact.contactValue.replace(/\D/g, '');
      if (digitsOnly.length < 6) {
        this.showWarning('El teléfono debe tener al menos 6 dígitos.');
        return;
      }
    }

    const newContact: SupplierContact & { id?: number } = {
      contactType: contact.contactType as ContactType,
      description: contact.description || '',
      contactValue: contact.contactValue
    };

    this.contacts.push(newContact);

    setTimeout(() => {
      if (this.contactFormComponent?.form) {
        this.contactFormComponent.form.reset();
        this.contactFormComponent.collapsed = false;
      }
    }, 100);
    this.cdr.markForCheck();
  }

  /**
   * Deletes contact at specified index
   */
  deleteContact(index: number): void {
    this.contacts.splice(index, 1);
    this.cdr.markForCheck();
  }

  /**
   * Extract error message from backend response
   * @param error - Backend error
   * @param context - Error context (optional)
   * @returns Formatted error message
   */
  private extractErrorMessage(error: any, context?: string): string {
    let errorMessage = context
      ? `Ocurrió un error inesperado ${context}.`
      : 'Ocurrió un error inesperado. Intente nuevamente o contacte al administrador.';

    if (error?.status) {
      switch (error.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifique su conexión a internet o contacte al administrador.';
      case 500:
        return context
          ? `Error en el servidor ${context}. Por favor, intente nuevamente más tarde o contacte al administrador.`
          : 'Error interno del servidor. Por favor, intente nuevamente más tarde o contacte al administrador.';
      case 503:
        return 'El servicio no está disponible temporalmente. Por favor, intente nuevamente más tarde.';
      case 404:
        return context
          ? `No se encontró el recurso solicitado ${context}.`
          : 'No se encontró el recurso solicitado.';
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
   * Show alert message
   * @param message - Message to display
   * @param type - Alert type
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
   * Shows info alert with auto-dismiss after 5 seconds
   * @param message - info message to display
   */
  private showInfo(message: string): void { this.showAlertMessage(message, 'info'); }
}

// Same row interface used in create
/**
 * Interface for supplier item rows in the editable grid
 */
interface SupplierItemRow {
  supplier_item_id: number | null; // ID of the selected supplier item
  supply_id: number | null;
  packaging_id: number | null;
  description: string;
  unit_price: number | null;
}
