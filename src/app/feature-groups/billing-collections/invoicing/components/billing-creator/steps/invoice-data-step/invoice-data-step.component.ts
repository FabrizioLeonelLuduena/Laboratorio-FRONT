import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';


import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, finalize, first, of } from 'rxjs';

import {
  GenericAlertComponent,
  AlertType
} from '../../../../../../../shared/components/generic-alert/generic-alert.component';
import {
  GenericDynamicFormComponent,
  DynamicFormField
} from '../../../../../../../shared/components/generic-dynamic-form/generic-dynamic-form.component';
import { GenericModalComponent } from '../../../../../../../shared/components/generic-modal/generic-modal.component';
import { ColppyService } from '../../../../../cash-management/application/colppy.service';
import { CustomerOption } from '../../../../../cash-management/view-models/colppy-customer.vm';
import { DEFAULT_COMPANY_ID, DEFAULT_CURRENCY_ID } from '../../../../constants/invoice-defaults';
import {
  Billing,
  VoucherType,
  VOUCHER_TYPE_LABELS,
  InvoiceType,
  INVOICE_TYPE_LABELS,
  InvoiceKind,
  INVOICE_KIND_LABELS,
  InvoiceStatus,
  INVOICE_STATUS_LABELS
} from '../../../../domain';

/**
 * InvoiceDataStepComponent - Step 1 of billing creator
 * Form for basic invoice data entry
 */
@Component({
  selector: 'app-invoice-data-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccordionModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    InputTextarea,
    CheckboxModule,
    ButtonModule,
    TooltipModule,
    GenericDynamicFormComponent,
    GenericModalComponent,
    GenericAlertComponent
  ],
  templateUrl: './invoice-data-step.component.html',
  styleUrls: ['./invoice-data-step.component.scss']
})
export class InvoiceDataStepComponent implements OnInit, OnChanges {
  @Input() billing?: Billing;
  @Output() dataChange = new EventEmitter<Partial<Billing>>();
  @Output() validChange = new EventEmitter<boolean>();

  invoiceDataForm!: FormGroup;

  showClientModal = false;
  selectedClient: any = null;

  /**
   * List of customers for the dropdown.
   */
  customers: CustomerOption[] = [];
  /**
   * Loading indicator for the customer dropdown.
   */
  loadingCustomers = false;
  /**
   * Error message if customers fail to load.
   */
  customersError: string | null = null;

  // Alert properties
  alertVisible = false;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  clientFormFields: DynamicFormField[] = [
    { name: 'NombreFantasia', label: 'Nombre Fantasía', type: 'text', required: true, placeholder: 'Ej: Farmacia Central', colSpan: 2 },
    { name: 'RazonSocial', label: 'Razón Social', type: 'text', required: true, placeholder: 'Ej: Farmacia Central S.A.', colSpan: 2 },
    { name: 'CUIT', label: 'CUIT', type: 'text', placeholder: '20-12345678-9', colSpan: 2, pattern: '^\\d{2}-\\d{8}-\\d$', messages: { pattern: 'Formato CUIT inválido (XX-XXXXXXXX-X)' } },
    { name: 'idCondicionIva', label: 'Condición IVA', type: 'select', required: true, options: [
      { label: 'Responsable Inscripto', value: '1' },
      { label: 'Monotributo', value: '2' },
      { label: 'No Gravado', value: '3' },
      { label: 'Exento', value: '4' }
    ], colSpan: 2 }
  ];

  invoiceKindOptions = [
    InvoiceKind.INVOICE_A,
    InvoiceKind.INVOICE_B,
    InvoiceKind.INVOICE_C,
    InvoiceKind.CREDIT_NOTE_A,
    InvoiceKind.CREDIT_NOTE_B,
    InvoiceKind.CREDIT_NOTE_C,
    InvoiceKind.DEBIT_NOTE_A,
    InvoiceKind.DEBIT_NOTE_B,
    InvoiceKind.DEBIT_NOTE_C
  ].map(kind => ({
    label: INVOICE_KIND_LABELS[kind],
    value: kind
  }));

  voucherTypeOptions = Object.keys(VoucherType).map(key => ({
    label: VOUCHER_TYPE_LABELS[key as VoucherType],
    value: key
  }));

  invoiceTypeOptions = [InvoiceType.TIPO_A, InvoiceType.TIPO_B, InvoiceType.TIPO_C].map(key => ({
    label: INVOICE_TYPE_LABELS[key],
    value: key
  }));

  statusOptions = Object.keys(InvoiceStatus).map(key => ({
    label: INVOICE_STATUS_LABELS[key as InvoiceStatus],
    value: key
  }));

  /**
   * Constructor for InvoiceDataStepComponent.
   * @param fb The FormBuilder service.
   * @param colppyService Service for fetching customer data.
   * @param cdr Change detector reference for manual view updates.
   */
  constructor(
    private readonly fb: FormBuilder,
    private colppyService: ColppyService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Angular lifecycle hook. Initializes the form, sets up listeners,
   * and loads initial data.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.loadCustomers();
  }

  /**
   * Angular lifecycle hook. Responds to changes in input properties.
   * @param changes Object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['billing'] && this.invoiceDataForm && this.billing) {
      this.updateFormFromBilling();
    }
  }

  /**
   * Initialize the form with validators
   */
  private initializeForm(): void {
    this.invoiceDataForm = this.fb.group({
      invoiceDate: [{ value: new Date(), disabled: true }, Validators.required],
      fullInvoiceNumber: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{8}$/)]],

      kind: [InvoiceKind.INVOICE_B],

      paymentDate: [new Date()],
      paymentCondition: ['Contado'],
      paymentType: ['Efectivo'],
      customerId: ['12345678', Validators.required],
      companyId: [DEFAULT_COMPANY_ID],
      currencyId: [DEFAULT_CURRENCY_ID],
      customerName: [''],
      customerIdentification: [''],
      customerAddress: [''],

      cliente: ['', Validators.required],
      observations: ['', Validators.required],

      voucherType: [VoucherType.FACTURA, Validators.required],
      invoiceType: [InvoiceType.TIPO_B, Validators.required]
    });

    // Sync kind field when voucherType or invoiceType changes
    this.invoiceDataForm.get('voucherType')?.valueChanges.subscribe(() => {
      this.syncKindField();
    });

    this.invoiceDataForm.get('invoiceType')?.valueChanges.subscribe(() => {
      this.syncKindField();
    });

    // Initial sync
    this.syncKindField();

    // Update form if billing is already available
    if (this.billing) {
      this.updateFormFromBilling();
    }
  }

  /**
   * Sync the kind field from separate voucherType and invoiceType
   */
  private syncKindField(): void {
    const voucherType = this.invoiceDataForm.get('voucherType')?.value;
    const invoiceType = this.invoiceDataForm.get('invoiceType')?.value;

    if (voucherType && invoiceType) {
      // Convert TIPO_A to A, TIPO_B to B, etc.
      const type = invoiceType.replace('TIPO_', '');
      const kind = `${voucherType}_${type}` as InvoiceKind;
      this.invoiceDataForm.patchValue({ kind }, { emitEvent: false });
    }
  }

  /**
   * Setup form listeners to emit changes
   */
  private setupFormListeners(): void {
    // Emit validity changes
    this.invoiceDataForm.statusChanges.subscribe(() => {
      this.validChange.emit(this.invoiceDataForm.valid);
    });

    // Emit initial validity state
    setTimeout(() => {
      this.validChange.emit(this.invoiceDataForm.valid);
    });

    // Emit data changes
    this.invoiceDataForm.valueChanges.subscribe(value => {
      if (this.invoiceDataForm.valid) {
        const formattedData = this.formatFormData(value);
        this.dataChange.emit(formattedData);
      }
    });

    // Sync customer name (cliente) when customerId is selected from dropdown
    this.invoiceDataForm.get('customerId')?.valueChanges.subscribe((customerId: string) => {
      if (customerId) {
        const selectedCustomer = this.customers.find(c => c.value === customerId);
        if (selectedCustomer) {
          this.invoiceDataForm.patchValue(
            {
              cliente: selectedCustomer.label,
              customerName: selectedCustomer.label,
              customerIdentification: customerId
            },
            { emitEvent: false }
          );
          // Manually trigger validation update since we used emitEvent: false
          this.invoiceDataForm.get('cliente')?.updateValueAndValidity();
        }
      }
    });

    this.invoiceDataForm.get('cliente')?.valueChanges.subscribe((name: string) => {
      this.invoiceDataForm.patchValue({ customerName: name || '' }, { emitEvent: false });
    });

    this.invoiceDataForm.get('customerId')?.valueChanges.subscribe((id: string) => {
      if (id) {
        this.invoiceDataForm.patchValue({ customerIdentification: id }, { emitEvent: false });
      }
    });

    this.validChange.emit(this.invoiceDataForm.valid);
  }

  /**
   * Update form values from billing input
   */
  private updateFormFromBilling(): void {
    if (!this.billing) return;

    const invoiceDate = this.billing.invoiceDate
      ? new Date(this.billing.invoiceDate)
      : new Date();

    const paymentDate = this.billing.paymentDate
      ? new Date(this.billing.paymentDate)
      : new Date();

    const fullInvoiceNumber = this.billing.fullInvoiceNumber ||
      `${this.billing.invoiceNumberPrefix}-${this.billing.invoiceNumber}`;

    const currentObservations = this.invoiceDataForm.get('observations')?.value;
    const currentCliente = this.invoiceDataForm.get('cliente')?.value;
    const currentCustomerName = this.invoiceDataForm.get('customerName')?.value;
    const currentCustomerIdentification = this.invoiceDataForm.get('customerIdentification')?.value;
    const currentCustomerAddress = this.invoiceDataForm.get('customerAddress')?.value;

    const currentCustomerId = this.invoiceDataForm.get('customerId')?.value;

    this.invoiceDataForm.patchValue(
      {
        invoiceDate,
        fullInvoiceNumber,
        kind: this.billing.kind || InvoiceKind.INVOICE_B,
        paymentDate,
        paymentCondition: this.billing.paymentCondition || 'Contado',
        paymentType: this.billing.paymentType || 'Efectivo',
        customerId: this.billing.customerId || currentCustomerId || '',
        companyId: this.billing.companyId || DEFAULT_COMPANY_ID,
        currencyId: this.billing.currencyId || DEFAULT_CURRENCY_ID,
        customerName: this.billing.customerName || currentCustomerName || currentCliente || '',
        customerIdentification:
          this.billing.customerIdentification ||
          currentCustomerIdentification ||
          this.billing.customerId ||
          currentCustomerId ||
          '',
        customerAddress: this.billing.customerAddress || currentCustomerAddress || '',
        cliente: this.billing.customerName || currentCliente || '',
        observations: currentObservations || this.billing.observations || '',
        // LEGACY: Keep for backward compatibility
        voucherType: this.billing.voucherType,
        invoiceType: this.billing.invoiceType
      },
      { emitEvent: false }
    );
  }

  /**
   * Format form data for emission
   */
  private formatFormData(value: any): Partial<Billing> {
    const invoiceDate = this.invoiceDataForm.get('invoiceDate')?.value;
    const paymentDate = this.invoiceDataForm.get('paymentDate')?.value;
    const [prefix, number] = (value.fullInvoiceNumber || '-').split('-');

    return {
      invoiceDate:
        invoiceDate instanceof Date
          ? invoiceDate.toISOString().split('T')[0]
          : invoiceDate,
      paymentDate:
        paymentDate instanceof Date
          ? paymentDate.toISOString().split('T')[0]
          : paymentDate,
      kind: value.kind,
      paymentCondition: value.paymentCondition,
      paymentType: value.paymentType,
      customerId: value.customerId || this.selectedClient?.cuit,
      customerName: value.customerName || value.cliente || this.selectedClient?.razonSocial,
      customerIdentification:
        value.customerIdentification || value.customerId || this.selectedClient?.cuit,
      customerAddress: value.customerAddress || this.selectedClient?.direccion || '',
      companyId: value.companyId,
      currencyId: value.currencyId,
      invoiceNumberPrefix: prefix || '',
      invoiceNumber: number || '',
      fullInvoiceNumber: value.fullInvoiceNumber,
      observations: value.observations,
      voucherType: value.voucherType,
      invoiceType: value.invoiceType
    };
  }

  /**
   * Handle invoice number input with auto-format
   */
  onInvoiceNumberInput(event: any): void {
    let value = event.target.value.replace(/[^\d]/g, ''); // Only numbers

    // Apply automatic format: XXXX-XXXXXXXX
    if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 12);
    }

    this.invoiceDataForm.patchValue(
      {
        fullInvoiceNumber: value
      },
      { emitEvent: false }
    );

    event.target.value = value;
  }

  /**
   * Handle invoice number blur to ensure format
   */
  onInvoiceNumberBlur(): void {
    const value = this.invoiceDataForm.get('fullInvoiceNumber')?.value || '';

    if (value && value.length < 13) {
      const parts = value.split('-');
      const prefix = (parts[0] || '').padStart(4, '0');
      const number = (parts[1] || '').padStart(8, '0');

      this.invoiceDataForm.patchValue({
        fullInvoiceNumber: `${prefix}-${number}`
      });
    }
  }

  /**
   * Public method for parent component to validate
   */
  public validateForm(): boolean {
    if (this.invoiceDataForm.invalid) {
      Object.keys(this.invoiceDataForm.controls).forEach(key => {
        this.invoiceDataForm.get(key)?.markAsTouched();
      });
      return false;
    }
    return true;
  }

  /**
   * Check if field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.invoiceDataForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string {
    const field = this.invoiceDataForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['minlength'])
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength'])
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Formato inválido (debe ser 0001-00000001)';
    }
    return '';
  }

  /**
   * Loads customer data from the Colppy service.
   */
  loadCustomers(): void {
    this.loadingCustomers = true;
    this.customersError = null;

    this.colppyService
      .getAllCustomers({ limit: 500 })
      .pipe(
        first(),
        catchError(() => {
          this.customersError = '';
          return of([] as CustomerOption[]);
        }),
        finalize(() => (this.loadingCustomers = false))
      )
      .subscribe((opts: CustomerOption[]) => {
        const sorted = [...opts].sort((a, b) => a.label.localeCompare(b.label));

        const finalCustomer: CustomerOption = {
          label: 'Consumidor final',
          value: '12345678'
        };

        const hasFinal = sorted.some(c => c.value === finalCustomer.value);

        this.customers = hasFinal ? sorted : [...sorted, finalCustomer];

        const current = this.invoiceDataForm.get('customerId')?.value;

        if (!current) {
          this.invoiceDataForm.patchValue({ customerId: '12345678' }, { emitEvent: true });
        } else {
          // If customerId is already set, populate cliente field from customers list
          const selectedCustomer = this.customers.find(c => c.value === current);
          if (selectedCustomer && !this.invoiceDataForm.get('cliente')?.value) {
            this.invoiceDataForm.patchValue(
              {
                cliente: selectedCustomer.label,
                customerName: selectedCustomer.label,
                customerIdentification: current
              },
              { emitEvent: false }
            );
            // Trigger validation update
            this.invoiceDataForm.get('cliente')?.updateValueAndValidity();
          }
        }

        this.cdr.detectChanges();
      });
  }


  /**
   * Open client modal for adding new client
   */
  openClientModal(): void {
    this.showClientModal = true;
  }

  /**
   * Close client modal
   */
  closeClientModal(): void {
    this.showClientModal = false;
  }

  /**
   * Handle client form submission.
   * Posts the new client data to the backend service.
   * @param clientData The payload from the dynamic form.
   */
  onClientFormSubmit(clientData: any): void {
    // This is the payload to be sent to the API.
    const body = {
      NombreFantasia: clientData.NombreFantasia,
      RazonSocial: clientData.RazonSocial,
      CUIT: clientData.CUIT,
      idCondicionIva: clientData.idCondicionIva
    };

    this.loadingCustomers = true;

    // ---
    // NOTA: Debes reemplazar 'createCustomer' con el nombre real
    // del método en tu ColppyService que hace el POST.
    // ---
    this.colppyService.createCustomer(body)
      .pipe(
        first(),
        catchError(() => {
          this.showAlert('error', 'Error', 'No se pudo crear el cliente. Intente nuevamente.');
          return of(null); // Return a null observable to stop the pipe
        }),
        finalize(() => {
          this.loadingCustomers = false;
        })
      )
      .subscribe((newClientResponse: any) => {
        // Check if the request was successful and returned a response
        if (newClientResponse && newClientResponse.colppyId) {
          this.showAlert('success', 'Cliente Creado', 'El cliente ha sido guardado correctamente.');

          this.selectedClient = {
            id: newClientResponse.colppyId,
            cuit: body.CUIT,
            razonSocial: body.RazonSocial,
            email: '',
            telefono: '',
            direccion: ''
          };

          const newCustomerOption: CustomerOption = {
            label: body.RazonSocial || body.NombreFantasia,
            value: newClientResponse.colppyId
          };

          this.customers = [...this.customers, newCustomerOption].sort((a, b) =>
            a.label.localeCompare(b.label)
          );

          // Update form with client name and CUIT
          this.invoiceDataForm.patchValue(
            {
              cliente: newCustomerOption.label,
              customerId: newCustomerOption.value,
              customerName: newCustomerOption.label,
              customerIdentification: newCustomerOption.value,
              customerAddress: ''
            },
            { emitEvent: true }
          );

          this.closeClientModal();
        } else if (newClientResponse === null) {
          // This case is handled by catchError, do nothing here.
        } else {
          // API call succeeded but response was not in the expected format
          this.showAlert('error', 'Error', 'Respuesta inesperada del servidor.');
        }
      });
  }

  /**
   * Handle client form cancel
   */
  onClientFormCancel(): void {
    this.showClientModal = false;
  }

  /**
   * Helper method to display alert messages
   * @param type - Type of alert (success, error, warning, info)
   * @param title - Alert title
   * @param text - Alert message text
   */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.alertVisible = true;
    setTimeout(() => {
      this.alertVisible = false;
      this.alertType = null;
    }, 5000);
  }

  /**
   * Get formatted date for display
   */
  getFormattedDate(): string {
    const date = this.invoiceDataForm.get('invoiceDate')?.value;
    if (date instanceof Date) {
      return date.toLocaleDateString('es-AR');
    }
    return '24/10/2025';
  }

  /**
   * Get full invoice number
   */
  getFullInvoiceNumber(): string {
    return this.invoiceDataForm.get('fullInvoiceNumber')?.value || '1234-12345678';
  }

  /**
   * Get invoice type label (using new combined kind field)
   */
  getInvoiceTypeLabel(): string {
    const kind = this.invoiceDataForm.get('kind')?.value;
    return kind ? INVOICE_KIND_LABELS[kind as InvoiceKind] : 'Factura B';
  }

  /**
   * Get client name
   */
  getClientName(): string {
    return this.invoiceDataForm.get('cliente')?.value || 'Sin especificar';
  }

  /**
   * Get observations text
   */
  getObservations(): string {
    const obs = this.invoiceDataForm.get('observations')?.value;
    return obs || 'Sin observaciones';
  }
}
