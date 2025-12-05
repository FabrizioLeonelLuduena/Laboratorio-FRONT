import { ChangeDetectorRef, Component, Input, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { map, Subject, switchMap } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import {
  ConfirmationModalComponent
} from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import {
  GenericFormComponent,
  GenericFormField
} from '../../../../../shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { ExcelExportService, PdfExportService } from '../../../../../shared/services/export';
import {
  ContactTypeResponseDTO,
  InsurerContactInfoCreateRequestDTO,
  InsurerContactInfoResponseDTO, InsurerContactInfoUpdateRequestDTO
} from '../../../models/contact-info.model';
import { ContactInfoService } from '../../../services/contact-info.service';

import { CONTACTS_EXPORT_COLUMNS, CONTACTS_PDF_COLUMNS } from './insurer-contacts-export-config';


/**
 * InsurerContactsComponent.
 */
@Component({
  selector: 'app-insurer-contacts',
  imports: [
    ConfirmationModalComponent,
    GenericFormComponent,
    GenericTableComponent,
    GenericAlertComponent
  ],
  templateUrl: './insurer-contacts.component.html',
  styleUrls: ['./insurer-contacts.component.css']
})
export class InsurerContactsComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input({ required:true }) insurerId!: number;

  // ================== Contacts ==================

  /** Available contact types (Phone, Email, WhatsApp, etc). */
  contactTypes: ContactTypeResponseDTO[] = [];

  /** List of insurer contacts retrieved from API. */
  insurerContacts: InsurerContactInfoResponseDTO[] = [];

  /** Current contact being edited (null when creating a new one). */
  editingContact: InsurerContactInfoResponseDTO | null = null;

  /** Controls the delete confirmation modal visibility. */
  showDeleteModal = false;

  /** Stores the contact selected for deletion. */
  contactToDelete: InsurerContactInfoResponseDTO | null = null;

  /** Toggles the form visibility. */
  showForm = false;

  /** Indicates if the form is currently saving. */
  formSaving = false;

  contactFields: GenericFormField[] = [];
  contactInitialValue: { contactType: string | null; contact: string } = { contactType: null, contact: '' };
  private destroy$ = new Subject<void>();
  private originalFormValue: any = null;

  @ViewChild(GenericFormComponent) formComp!: GenericFormComponent;

  /** Controls component alerts */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** Loading state for exports */
  loading = false;

  // Reference to GenericTable component to access filtered data
  @ViewChild(GenericTableComponent) genericTableContacts!: GenericTableComponent;

  // ===============================================================וט

  /** Row actions for GenericTable */
  getActions = (row: any): MenuItem[] => [
    { id: 'editar', label: 'Editar', icon: 'pi pi-pencil', command: () => this.editContact(row) },
    { id: 'eliminar', label: 'Eliminar', icon: 'pi pi-trash', command: () => this.confirmDelete(row) }
  ];

  /**
   * ngOnInit.
   */
  ngOnInit(): void {
    this.loadContacts();
  }

  /**
   * Cleans up subscriptions on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Subscribe to value changes on the select field.
   */
  ngAfterViewInit(): void {
    setTimeout(() => this.bindContactTypeWatcher(), 0);
  }

  /**
   * Observe the changes in the "Contact Type" select and rebuild the dependent field.
   */
  private bindContactTypeWatcher(): void {
    queueMicrotask(() => {
      const form = this.formComp?.form;
      const contactTypeCtrl = form?.get('contactTypeId');
      if (!contactTypeCtrl) return;

      contactTypeCtrl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((selectedType: string | null) => {
          if (selectedType == null) return;

          const currentType = selectedType;

          this.contactFields = [
            this.buildTypeSelectField(),
            this.buildContactField(selectedType)
          ];

          setTimeout(() => {
            const f = this.formComp?.form;
            if (!f) return;

            f.get('contactTypeId')?.setValue(currentType, { emitEvent: false });
            f.get('contact')?.setValue('', { emitEvent: false });

            this.bindContactTypeWatcher();
          }, 0);
        });
    });
  }


  /**
   *consturctor
   */
  constructor(
    private contactService: ContactInfoService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private cd: ChangeDetectorRef
  ) {}

  /**
   * Loads contact types and existing insurer contacts.
   */
  loadContacts(showInactive = false): void {
    this.contactService.getTypes().pipe(
      map(types => {
        this.contactTypes = types;

        this.contactFields = [
          this.buildTypeSelectField(),
          this.buildContactField(null)
        ];

        return types;
      }),
      switchMap(() => this.contactService.search(this.insurerId, !showInactive)),
      map(contacts => contacts.map(c => ({
        ...c,
        contactTypeName: this.getContactTypeLabel(c.contactType)
      })))
    ).subscribe(list => {
      this.insurerContacts = list;
    });
  }

  /**
   * Select for contact type
   */
  private buildTypeSelectField(): GenericFormField {
    return {
      name: 'contactTypeId',
      label: 'Tipo de contacto',
      type: 'select',
      required: true,
      options: this.contactTypes.map((t) => ({
        label: t.description,
        value: t.name
      })),
      colSpan: 2,
      placeholder: 'Seleccioná una opción'
    };
  }


  /**
   * Contact field according to the type of contact
   */
  private buildContactField(type: string | null): GenericFormField {
    switch (type) {
    case 'PHONE': // Phone
      return {
        name: 'contact',
        label: 'Teléfono',
        type: 'tel',
        required: true,
        colSpan: 2,
        pattern: '^[0-9\\s()+-]{6,20}$',
        placeholder: 'Ej: 351-555-1234',
        messages: {
          required: 'El teléfono es obligatorio.',
          pattern: 'Solo se permiten números, espacios y + - ()'
        }
      };
    case 'EMAIL': // Email
      return {
        name: 'contact',
        label: 'Email',
        type: 'email',
        required: true,
        colSpan: 2,
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        placeholder: 'Ej: contacto@ejemplo.com',
        messages: {
          required: 'El email es obligatorio.',
          email: 'Ingresá un correo válido.',
          pattern: 'Falta un dominio válido'
        }
      };
    case 'WHATSAPP': // WhatsApp
      return {
        name: 'contact',
        label: 'WhatsApp',
        type: 'tel',
        required: true,
        colSpan: 2,
        pattern: '^[0-9\\s()+-]{6,20}$',
        placeholder: 'Ej: +54 9 351 555 1234',
        messages: {
          required: 'El número de WhatsApp es obligatorio.',
          pattern: 'Solo se permiten números, espacios y + - ()'
        }
      };
    case 'WEBSITE': // Web
      return {
        name: 'contact',
        label: 'Web',
        type: 'url',
        required: true,
        colSpan: 2,
        pattern: '^(https?:\\/\\/)([\\w.-]+)\\.[a-z]{2,}(\\/[\\w\\-._~:/?#[\\]@!$&\'()*+,;=]*)?$',
        placeholder: 'Ej: https://www.ejemplo.com',
        messages: {
          required: 'La URL es obligatoria.',
          pattern: 'La URL debe comenzar con http:// o https:// y tener un dominio válido'
        }
      };
    default:
      return {
        name: 'contact',
        label: 'Contacto',
        type: 'text',
        required: true,
        colSpan: 2,
        placeholder: 'Seleccioná el tipo de contacto.'
      };
    }
  }

  /**
   * Generate the select options for the type of contact.
   */
  get contactTypeOptions() {
    return this.contactTypes.map(t => ({ label: t.description, value: t.name }));
  }

  /**
   * Gets the readable label for a contact type ID.
   */
  getContactTypeLabel(name: string): string {
    return this.contactTypes.find(t => t.name === name)?.description ?? '—';
  }

  // ===============================================================וט
  // Generic form
  // ===============================================================וט

  /**
   * Called when form appears (after clicking "Add" or "Edit")
   */
  openCreateForm(): void {
    this.editingContact = null;
    this.contactInitialValue = { contactType: null, contact: '' };
    this.formComp?.form?.reset();

    this.contactFields = [
      this.buildTypeSelectField(),
      this.buildContactField(null)
    ];
    this.showForm = true;

    setTimeout(() => this.bindContactTypeWatcher(), 0);
  }

  /**
   * Preload the data in the form to edit an existing contact.
   */
  editContact(contact: InsurerContactInfoResponseDTO): void {
    this.editingContact = { ...contact };
    this.contactInitialValue = {
      contactType: this.editingContact.contactType ?? null,
      contact: this.editingContact.contact ?? ''
    };
    this.originalFormValue = {
      contactTypeId: this.editingContact.contactType,
      contact: this.editingContact.contact?.trim() ?? ''
    };

    this.contactFields = [
      {
        ...this.buildTypeSelectField(),
        disabled: true
      },
      this.buildContactField(this.editingContact.contactType ?? null)
    ];
    this.showForm = true;

    setTimeout(() => this.bindContactTypeWatcher(), 0);
  }


  /**
   * Cancels the form and resets the state.
   */
  onCancelForm(): void {
    this.editingContact = null;
    this.contactInitialValue = { contactType: null, contact: '' };
    this.showForm = false;
    this.formSaving = false;
    this.originalFormValue = null;

    this.destroy$.next();
    this.destroy$ = new Subject<void>();
  }

  /**
   * Handles table actions (edit/delete).
   */
  onTableAction(event: { type: string; row: any }): void {
    const { type, row } = event;
    if (type === 'editar') this.editContact(row);
    else if (type === 'eliminar') this.confirmDelete(row);
  }

  /**
   * Generic alert.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  /**
   * Submits the form to create or update a contact.
   */
  onSubmitContact(formValue: any): void {
    if (!this.showForm) return;
    if (!formValue || !this.insurerId) return;
    this.formSaving = true;

    // Update
    if (this.editingContact) {
      if (this.editingContact && formValue.contactTypeId !== this.editingContact.contactType) {
        formValue.contactTypeId = this.editingContact.contactType;
      }
      const currentValue = {
        contactTypeId: formValue.contactTypeId,
        contact: formValue.contact?.trim() ?? ''
      };

      if (JSON.stringify(currentValue) === JSON.stringify(this.originalFormValue)) {
        this.formSaving = false;
        this.showAlert('warning', 'No se detectaron cambios para guardar.');
        return;
      }

      const payload: InsurerContactInfoUpdateRequestDTO = {
        id: this.editingContact.id,
        insurerId: this.insurerId,
        contactType: formValue.contactTypeId,
        contact: formValue.contact
      };
      this.contactService.update(payload).subscribe({
        next: () => {
          this.afterMutationSuccess();
          this.showAlert('success', 'Contacto actualizado correctamente.');
        },
        error: () => {
          this.formSaving = false;
          this.showAlert('error', 'No se pudo actualizar el contacto.');
        }
      });
    }
    // Create
    else {
      const payload: InsurerContactInfoCreateRequestDTO = {
        insurerId: this.insurerId,
        contactType: formValue.contactTypeId,
        contact: formValue.contact
      };
      this.contactService.create(payload).subscribe({
        next: () => {
          this.afterMutationSuccess();
          this.showAlert('success', 'Contacto creado correctamente.');
        },
        error: () => {
          this.formSaving = false;
          this.showAlert('error', 'No se pudo crear el contacto.');
        }
      });
    }
  }

  /**
   * Refreshes the table and resets the component state after save/delete.
   */
  private afterMutationSuccess(): void {
    this.loadContacts();
    this.formSaving = false;
    this.showForm = false;
    this.editingContact = null;
    this.contactInitialValue = { contactType: null, contact: '' };
    this.originalFormValue = null;
  }

  // ===============================================================וט
  // Delete contact
  // ===============================================================וט

  /**
   * Opens the confirmation modal for deleting a contact.
   */
  confirmDelete(contact: InsurerContactInfoResponseDTO): void {
    this.contactToDelete = contact;
    this.showDeleteModal = true;
  }

  /**
   * Performs a soft delete after confirmation.
   */
  onConfirmDelete(): void {
    if (!this.contactToDelete) return;

    this.contactService.softDelete(this.contactToDelete.id).subscribe({
      next: () => {
        this.loadContacts();
        this.showDeleteModal = false;
        this.contactToDelete = null;
        this.showAlert('success', 'Contacto eliminado correctamente.');
      },
      error: () => {
        this.showDeleteModal = false;
        this.showAlert('error', 'No se pudo eliminar el contacto.');
      }
    });
  }


  /**
   * Cancels the delete operation.
   */
  onCancelDelete(): void {
    this.showDeleteModal = false;
    this.contactToDelete = null;
  }

  // ===============================================================וט
  // Export functionality
  // ===============================================================וט

  /** Get filtered data for export (from GenericTable's internal filtered data) */
  private getFilteredDataForExport(): InsurerContactInfoResponseDTO[] {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTableContacts) {
      return this.genericTableContacts.filteredData() as InsurerContactInfoResponseDTO[];
    }
    // Fallback to all contacts if table not available
    return this.insurerContacts;
  }

  /**
   * Export contacts to Excel
   */
  async onExportExcel(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: CONTACTS_EXPORT_COLUMNS,
        fileName: 'contactos-aseguradora',
        sheetName: 'Contactos',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('success', 'Los contactos se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  /**
   * Export contacts to PDF
   */
  async onExportPdf(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading = false;
        this.cd.markForCheck();
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: CONTACTS_PDF_COLUMNS,
        fileName: 'contactos-aseguradora',
        title: 'Contactos de Aseguradora',
        orientation: 'portrait',
        includeDate: true,
        includeTimestamp: true,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 80,
          y: 8
        }
      });

      if (result.success) {
        this.showAlert('success', 'Los contactos se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

}
