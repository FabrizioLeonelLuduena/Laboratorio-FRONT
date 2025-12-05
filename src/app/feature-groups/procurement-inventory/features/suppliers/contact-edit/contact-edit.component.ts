import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { EDIT_SUPPLIER_FIELDS } from '../../../models/suppliers/supplier-generic-form.config';
import { SuppliersService } from '../../../services/suppliers.service';

/**
 * Full-screen contact editor for a supplier contact.
 * Uses the generic form but lives in the suppliers feature and navigates back to the supplier edit on success.
 */
@Component({
  selector: 'app-contact-edit',
  standalone: true,
  imports: [CommonModule, GenericFormComponent, GenericAlertComponent],
  templateUrl: './contact-edit.component.html',
  styleUrls: ['./contact-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactEditComponent implements OnInit {
  contactFormFields: GenericFormField[] = [];

  supplierId: string | null = null;
  contactId: string | null = null;
  supplierData: any | null = null;
  contact: any | null = null;

  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private suppliersService = inject(SuppliersService);
  private breadcrumbService = inject(BreadcrumbService);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Initialize component
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario > Proveedores > Editar contacto', '/procurement-inventory/suppliers');

    const contactsField = EDIT_SUPPLIER_FIELDS.find(f => f.name === 'contacts');
    if (contactsField && (contactsField as any).array && (contactsField as any).array.itemFields) {
      const items = (contactsField as any).array.itemFields as GenericFormField[];
      this.contactFormFields = items.filter(f => f.name !== 'id');
    }

    this.supplierId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('supplierId');
    this.contactId = this.route.snapshot.paramMap.get('contactId');

    if (this.supplierId) {
      this.loadSupplier(this.supplierId);
    } else {
      this.showError('No se pudo determinar el proveedor.');
    }
  }

  /**
   * Load supplier data from backend
   * @param id - Supplier ID
   */
  private loadSupplier(id: string): void {
    this.suppliersService.getSupplierById(Number(id)).subscribe({
      next: (data) => {
        this.supplierData = data;
        if (this.contactId) {
          this.contact = (this.supplierData?.contacts || []).find((c: any) => String(c.id) === String(this.contactId)) || null;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.showError(this.extractErrorMessage(err));
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle form submission
   * @param formData - Form data
   */
  onFormSubmit(formData: any): void {
    if (!this.supplierData) {
      this.showError('Proveedor no cargado');
      return;
    }

    const updatedContacts = [...(this.supplierData.contacts || [])];

    const contactId = this.contact?.id ?? formData.id;
    const idx = contactId !== undefined && contactId !== null
      ? updatedContacts.findIndex((c: any) => String(c.id) === String(contactId))
      : -1;

    if (idx >= 0) {
      updatedContacts[idx] = { ...updatedContacts[idx], ...formData, id: updatedContacts[idx].id };
    } else {
      const newContact = { ...formData };
      delete newContact.id;
      updatedContacts.push(newContact as any);
    }

    const contactsPayload: any[] = [];

    updatedContacts.forEach((contact: any) => {
      if (contact.email) {
        contactsPayload.push({
          id: contact.id,
          firstName: contact.firstName || contact.name?.split(' ')[0] || '',
          lastName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
          contactType: 'EMAIL',
          contactValue: contact.email,
          description: '',
          isActive: contact.isActive !== undefined ? contact.isActive : true
        });
      }
      if (contact.phone) {
        contactsPayload.push({
          firstName: contact.firstName || contact.name?.split(' ')[0] || '',
          lastName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
          contactType: 'PHONE',
          contactValue: contact.phone,
          description: '',
          isActive: contact.isActive !== undefined ? contact.isActive : true
        });
      }
    });

    this.suppliersService.updateSupplier(Number(this.supplierId), { contacts: contactsPayload as any }).subscribe({
      next: (_res) => {
        this.showSuccess('Contacto guardado.');
        this.router.navigate([`/procurement-inventory/suppliers/${this.supplierId}/edit`]);
      },
      error: (err) => {
        this.showError(this.extractErrorMessage(err));
      }
    });
  }

  /**
   * Handle form cancellation
   */
  onFormCancel(): void {
    if (this.supplierId) {
      this.router.navigate([`/procurement-inventory/suppliers/${this.supplierId}/edit`]);
    } else {
      this.router.navigate(['/procurement-inventory/suppliers']);
    }
  }

  /**
   * Extract error message from backend response
   * @param error - Backend error
   * @returns Formatted error message
   */
  private extractErrorMessage(error: any): string {
    let errorMessage = 'Ocurrió un error inesperado. Intente nuevamente o contacte al administrador.';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    return errorMessage;
  }

  /**
   * Show success alert
   * @param message - Message to display
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 3000);
  }

  /**
   * Show error alert
   * @param message - Message to display
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }
}
