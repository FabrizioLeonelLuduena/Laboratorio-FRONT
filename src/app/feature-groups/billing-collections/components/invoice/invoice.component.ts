import { CommonModule } from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  OnInit,
  inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef, signal, OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { catchError, finalize, first, of, Subscription } from 'rxjs';
import { InvoicePdfService } from 'src/app/feature-groups/billing-collections/invoicing/application/invoice-pdf.service';

import { BasicTableComponent } from '../../../../shared/components/basic-table/basic-table.component';
import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import {
  ConfirmationModalComponent
} from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import {
  DynamicFormField,
  GenericDynamicFormComponent
} from '../../../../shared/components/generic-dynamic-form/generic-dynamic-form.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { ColumnConfig } from '../../../../shared/models/column-config';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { ColppyService } from '../../cash-management/application/colppy.service';
import { CustomerOption } from '../../cash-management/view-models/colppy-customer.vm';
import { BillingService } from '../../invoicing/application/billing.service';
import {
  Billing,
  BillingItem,
  PaymentMethodDetail,
  VoucherType,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  FundDestination
} from '../../invoicing/domain';

/**
 * * InvoiceComponent - Generates invoices based on Collector data.
 */
@Component({
  selector: 'app-invoice',
  standalone: true,
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    FileUploadModule,
    CardModule,
    GenericModalComponent,
    BasicTableComponent,
    TableModule,
    GenericDynamicFormComponent,
    ConfirmationModalComponent,
    GenericAlertComponent,
    TutorialOverlayComponent
  ],
  providers: [DialogService]
})
export class InvoiceComponent implements OnInit, OnDestroy {
  @Input() attentionId: number | undefined = 0;
  @Input() paymentId!: number | undefined;
  @Output() invoiceCreatedId = new EventEmitter<number>();
  @Output() cancelAttention = new EventEmitter<void>();

  private _billingData: any = null;

  /**
   *jj
   */
  @Input()
  set billingData(value: any) {
    this._billingData = value;

    if (value) {
      this.loadDataFromCollector(value);
      this.cdr.detectChanges();
    }
  }

  private tutorialService = inject(TutorialService);
  private tutorialSubscription?: Subscription;

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: '#invoice-data-section',
        title: 'Datos de la Factura',
        message: 'Completa los datos principales de la factura incluyendo cliente, empresa, número y fecha de emisión.',
        position: 'bottom',
        onEnter: () => {
          if (this.dataFormCollapsed) {
            this.toggleDataSection();
            this.cdr.detectChanges();
          }
        }
      },
      {
        target: '#invoice-items-section',
        title: 'Items de Factura',
        message: 'Aqui se agregan los productos o servicios incluidos en esta factura.',
        position: 'top',
        onEnter: () => {
          if (this.itemsSectionCollapsed) {
            this.toggleItemsSection();
            this.cdr.detectChanges();
          }
        }
      },
      {
        target: '#invoice-items-section table',
        title: 'Tabla de Items',
        message: 'Aquí van los detalles de los productos: cantidad, descripción, precio unitario y total.',
        position: 'top'
      },
      {
        target: '#invoice-payments-section',
        title: 'Medios de Pago',
        message: 'Define los métodos de pago para esta factura.',
        position: 'top',
        onEnter: () => {
          if (this.paymentSectionCollapsed) {
            this.togglePaymentSection();
            this.cdr.detectChanges();
          }
        }
      },
      {
        target: '#invoice-payments-section table',
        title: 'Detalle de Pagos',
        message: 'Registra cada método de pago con su monto correspondiente.',
        position: 'top'
      }
    ],
    onComplete: () => {
      this.showAlert('success', 'Tutorial Completado', '🎉 Ahora conoces todas las funcionalidades del facturador!');
    },
    onSkip: () => {
      // Tutorial skipped by user
    }
  });


  customers: CustomerOption[] = [];
  loadingCustomers = false;
  customersError: string | null = null;

  private titleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private billingService = inject(BillingService);

  alertVisible = false;
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  @ViewChild('currencyTemplate', { static: true })
    currencyTemplate!: TemplateRef<any>;

  tableColumns: ColumnConfig[] = [];
  paymentColumns: ColumnConfig[] = [];

  previewVisible = false;
  showClientModal = false;
  dataFormCollapsed = false;
  itemsSectionCollapsed = false;
  paymentSectionCollapsed = false;
  showConfirmModal = false;

  selectedCustomerId: string | null = null;
  selectedCompanyId: string | null = null;
  selectedCurrencyId: string | null = null;

  invoicePrefix: string = '0001';
  invoiceNumber: string = '00000001';
  invoiceDate: Date = new Date();
  paymentDate: Date = new Date();
  invoiceDescription: string = '';
  invoiceType: string = 'FACTURA_B';
  paymentCondition: string = 'Contado';
  paymentType: string = 'Efectivo';

  invoiceItems: any[] = [];
  invoicePayments: any[] = [];
  invoiceTotals = {
    taxableSubtotal: 0,
    totalVat: 0,
    grandTotal: 0
  };

  voucherTypes = [{ label: 'Factura', value: 'FACTURA' }];
  invoiceTypes = [{ label: 'Factura B', value: 'FACTURA_B' }];
  statusOptions = [{ label: 'CONFIRMADO', value: 'CONFIRMADO' }];

  companies = [
    { label: 'Empresa Principal', value: '97405' },
    { label: 'Sucursal Centro', value: '97406' },
    { label: 'Sucursal Sur', value: '97407' }
  ];

  currencies = [
    { label: 'Peso Argentino (ARS)', value: '1' },
    { label: 'Dólar (USD)', value: '2' },
    { label: 'Euro (EUR)', value: '3' }
  ];

  paymentConditions = [
    { label: 'Contado', value: 'Contado' },
    { label: 'Crédito 30 días', value: 'Credito30' },
    { label: 'Crédito 60 días', value: 'Credito60' },
    { label: 'Crédito 90 días', value: 'Credito90' }
  ];

  paymentTypes = [
    { label: 'Efectivo', value: 'Efectivo' },
    { label: 'Tarjeta de Débito', value: 'TarjetaDebito' },
    { label: 'Tarjeta de Crédito', value: 'TarjetaCredito' },
    { label: 'Transferencia Bancaria', value: 'Transferencia' },
    { label: 'Cheque', value: 'Cheque' }
  ];

  clientFormFields: DynamicFormField[] = [
    { name: 'NombreFantasia', label: 'Nombre fantasía', type: 'text', required: true, placeholder: 'Ej: Farmacia Central', colSpan: 2 },
    { name: 'RazonSocial', label: 'Razón social', type: 'text', required: true, placeholder: 'Ej: Farmacia Central S.A.', colSpan: 2 },
    { name: 'CUIT', label: 'Cuit', type: 'text', placeholder: '20-12345678-9', colSpan: 2, pattern: '^\\d{2}-\\d{8}-\\d$', messages: { pattern: 'Formato CUIT inválido (XX-XXXXXXXX-X)' } },
    { name: 'idCondicionIva', label: 'Condición iva', type: 'select', required: true, options: [
      { label: 'Responsable Inscripto', value: '1' },
      { label: 'Monotributo', value: '2' },
      { label: 'No Gravado', value: '3' },
      { label: 'Exento', value: '4' }
    ], colSpan: 2 }
  ];

  /**
   * Creates an instance of the InvoiceComponent.
   * @param colppyService Service for fetching Colppy customers.
   * @param cdr Change detector reference for manual view updates.
   */
  constructor(
    private colppyService: ColppyService,
    private cdr: ChangeDetectorRef,
    private invoicePdfService: InvoicePdfService
  ) {}


  /**
   * Initializes the component by setting the page title, loading customers,
   * and preparing invoice data (from collector or navigation state).
   */
  ngOnInit(): void {
    this.titleService.setTitle('Facturación');
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Facturación y cobros', route: '/billing-collections/home' },
      { label: 'Generar' }
    ]);

    this.initializeTableColumns();
    this.loadCustomers();

    if (this.billingData) {
      this.loadDataFromCollector(this.billingData);
    } else {
      this.loadDataFromNavigation();
    }

    // Subscribe to tutorial triggers
    this.tutorialSubscription = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('invoice')) return;

      setTimeout(() => {
        if (this.tutorialOverlay) {
          this.tutorialOverlay.start();
        }
      }, 500);
    });
  }

  /**
   * Cleanup subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.tutorialSubscription?.unsubscribe();
    this.loadDataFromNavigation();
  }

  /**
   * Loads and maps invoice data received from the collector summary.
   * @param summary Summary object with items, payments, and totals.
   */
  private loadDataFromCollector(summary: any): void {
    if (!summary) return;

    this.invoiceItems = (summary.items || []).map((item: any, index: number) => {
      return {
        code: `LAB${String(index + 1).padStart(3, '0')}`,
        description: item.description || 'Sin descripción',
        warehouse: 'Central',
        vatRate: `${summary.ivaPercentage}%`,
        subtotal: this.formatCurrency(item.patientAmount),
        _subtotalRaw: item.patientAmount,
        _totalAmount: item.totalAmount,
        _coveredAmount: item.coveredAmount,
        _patientAmount: item.patientAmount
      };
    });

    const coinsuranceValue = summary.totals?.coinsurance ?? 0;

    if (coinsuranceValue > 0) {
      this.invoiceItems.push({
        code: 'COSEG',
        description: 'Coseguro',
        warehouse: '-',
        vatRate: `${summary.ivaPercentage}%`,
        subtotal: this.formatCurrency(coinsuranceValue),
        _subtotalRaw: coinsuranceValue,
        _totalAmount: coinsuranceValue,
        _patientAmount: coinsuranceValue,
        isCoinsurance: true
      });
    }

    this.invoicePayments = (summary.paymentMethods || []).map((pm: any) => {
      return {
        method: this.getPaymentMethodLabel(pm.paymentMethod) || 'Efectivo',
        bank: pm.bank || 'N/A',
        validityDate: pm.validityDate
          ? new Date(pm.validityDate).toLocaleDateString('es-AR')
          : new Date().toLocaleDateString('es-AR'),
        amount: this.formatCurrency(pm.amount),
        _amountRaw: pm.amount
      };
    });

    this.invoiceTotals.taxableSubtotal = summary.totals?.subtotal ?? 0;
    this.invoiceTotals.totalVat = summary.totals?.iva ?? 0;
    this.invoiceTotals.grandTotal = summary.totals?.total ?? 0;

    if (!this.invoiceType) {
      this.invoiceType = summary.ivaPercentage > 0 ? 'FACTURA_A' : 'FACTURA_B';
    }
  }



  /**
   *jj
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Loads invoice data from the navigation state if available.
   */
  private loadDataFromNavigation(): void {
    const state = history.state;
    if (state?.summary) {
      this.loadDataFromCollector(state.summary);
    }
  }

  /**
   * Initializes table column configurations for invoice and payments tables.
   */
  private initializeTableColumns(): void {
    this.tableColumns = [
      { columnDef: 'code', header: 'Código' },
      { columnDef: 'description', header: 'Descripción' },
      { columnDef: 'warehouse', header: 'Depósito' },
      { columnDef: 'vatRate', header: '% IVA' },
      { columnDef: 'subtotal', header: 'Subtotal' }
    ];

    this.paymentColumns = [
      { columnDef: 'method', header: 'Medio de Pago' },
      { columnDef: 'bank', header: 'Banco' },
      { columnDef: 'validityDate', header: 'Fecha pago' },
      { columnDef: 'amount', header: 'Importe' }
    ];
  }

  /**
   * Returns a readable label for a given payment method code.
   * @param paymentMethod Payment method code (e.g., 'EFECTIVO', 'TRANSFERENCIA').
   * @returns Corresponding label for display.
   */
  private getPaymentMethodLabel(paymentMethod: string): string {
    const labels: Record<string, string> = {
      'EFECTIVO': 'Efectivo',
      'TRANSFERENCIA': 'Transferencia Bancaria',
      'QR': 'QR',
      'TARJETA_DEBITO': 'Tarjeta de Débito',
      'TARJETA_CREDITO': 'Tarjeta de Crédito',
      'CHEQUE': 'Cheque',
      'MERCADO_PAGO': 'Mercado Pago',
      'OTRO': 'Otro'
    };
    return labels[paymentMethod] || paymentMethod;
  }

  /**
   * Toggles the visibility of the items section.
   */
  toggleItemsSection(): void { this.itemsSectionCollapsed = !this.itemsSectionCollapsed; }
  /**
   * Toggles the visibility of the payments section.
   */
  togglePaymentSection(): void { this.paymentSectionCollapsed = !this.paymentSectionCollapsed; }
  /**
   * Opens the client creation modal dialog.
   */
  openClientModal(): void { this.showClientModal = true;
  }
  /**
   * Closes the client creation modal dialog.
   */
  closeClientModal(): void { this.showClientModal = false; }

  /**
   * Toggles the visibility of the data section.
   */
  toggleDataSection(): void { this.dataFormCollapsed = !this.dataFormCollapsed; }

  /**
   * Saves a new client and updates the customers list (simulated mode).
   * @param payload Client form data to be saved.
   */
  saveClient(payload: any): void {
    const body = { ...payload, Activo: payload?.Activo === 'true' || payload?.Activo === true ? '1' : '0' };
    this.loadingCustomers = true;
    setTimeout(() => {
      this.loadingCustomers = false;
      const fakeId = Math.floor(10000000 + Math.random() * 9999999).toString();
      const fakeResponse = { colppyId: fakeId, message: 'Cliente creado correctamente (modo simulado)' };
      this.showAlert('success', 'Cliente creado (simulado)', fakeResponse.message);
      this.closeClientModal();
      this.customers.push({ label: body.RazonSocial || body.NombreFantasia || `Cliente ${fakeId}`, value: fakeId });
      this.customers.sort((a, b) => a.label.localeCompare(b.label));
      this.selectedCustomerId = fakeId;
    }, 1000);
  }

  /**
   * Maps the current invoice component data to a Billing object
   * @returns Billing object ready to be sent to the billing service
   */
  private mapToBillingObject(): Billing {
    const today = new Date().toISOString().split('T')[0];

    // Map invoice items from the component format to BillingItem format
    const billingItems: BillingItem[] = this.invoiceItems.map((item: any) => {
      const vatRateNumber = typeof item.vatRate === 'string'
        ? Number(item.vatRate.replace('%', ''))
        : item.vatRate || 0;

      const quantity = 1;
      const unitPrice = item._patientAmount || item._subtotalRaw || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = 0;
      const taxableAmount = subtotal - discountAmount;
      const vatAmount = (taxableAmount * vatRateNumber) / 100;
      const totalAmount = taxableAmount + vatAmount;

      return {
        code: item.code || '',
        description: item.description || '',
        warehouse: item.warehouse || 'Central',
        import: 0,
        local: 0,
        unitOfMeasure: 'unidad',
        quantity: quantity,
        unitPrice: unitPrice,
        discountPercentage: 0,
        vatRate: vatRateNumber,
        accountPlanId: '',
        enabled: true,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxableAmount: Number(taxableAmount.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2))
      };
    });

    const paymentMethods: PaymentMethodDetail[] = this.invoicePayments.map((pm: any) => {
      let paymentMethodEnum: PaymentMethod = PaymentMethod.EFECTIVO;
      const methodStr = (pm.method || '').toUpperCase();

      if (methodStr.includes('EFECTIVO')) {
        paymentMethodEnum = PaymentMethod.EFECTIVO;
      } else if (methodStr.includes('TRANSFERENCIA')) {
        paymentMethodEnum = PaymentMethod.TRANSFERENCIA;
      } else if (methodStr.includes('DÉBITO') || methodStr.includes('DEBITO')) {
        paymentMethodEnum = PaymentMethod.TARJETA_DEBITO;
      } else if (methodStr.includes('CRÉDITO') || methodStr.includes('CREDITO')) {
        paymentMethodEnum = PaymentMethod.TARJETA_CREDITO;
      } else if (methodStr.includes('CHEQUE')) {
        paymentMethodEnum = PaymentMethod.CHEQUE;
      } else if (methodStr.includes('MERCADO') || methodStr.includes('PAGO')) {
        paymentMethodEnum = PaymentMethod.MERCADO_PAGO;
      } else if (methodStr.includes('QR')) {
        paymentMethodEnum = PaymentMethod.QR;
      } else {
        paymentMethodEnum = PaymentMethod.OTRO;
      }

      return {
        paymentMethod: paymentMethodEnum,
        fundDestination: FundDestination.CAJA_GENERAL,
        bank: pm.bank || undefined,
        number: undefined,
        paymentDate: today,
        amount: pm._amountRaw || 0,
        observations: undefined,
        transactionReference: undefined
      };
    });

    let invoiceTypeEnum: InvoiceType = InvoiceType.TIPO_B;
    if (this.invoiceType.includes('A')) {
      invoiceTypeEnum = InvoiceType.TIPO_A;
    } else if (this.invoiceType.includes('B')) {
      invoiceTypeEnum = InvoiceType.TIPO_B;
    } else if (this.invoiceType.includes('C')) {
      invoiceTypeEnum = InvoiceType.TIPO_C;
    } else if (this.invoiceType.includes('E')) {
      invoiceTypeEnum = InvoiceType.TIPO_E;
    } else if (this.invoiceType.includes('M')) {
      invoiceTypeEnum = InvoiceType.TIPO_M;
    }

    const billing: Billing = {
      invoiceDate: today,
      voucherType: VoucherType.FACTURA,
      invoiceType: invoiceTypeEnum,
      invoiceNumberPrefix: this.invoicePrefix || '0001',
      invoiceNumber: this.invoiceNumber || '00000001',
      status: InvoiceStatus.SIN_COBRAR,
      description: this.invoiceDescription || 'Factura de atención médica',
      generateRemito: false,
      items: billingItems,
      netTaxable: this.invoiceTotals.taxableSubtotal || 0,
      netNonTaxable: 0,
      totalVat: this.invoiceTotals.totalVat || 0,
      vatPerception: 0,
      iibbPerception: 0,
      totalInvoice: this.invoiceTotals.grandTotal || 0,
      paymentMethods: paymentMethods,
      observations: this.invoiceDescription || '',
      customerId: this.selectedCustomerId || undefined,
      companyId: this.selectedCompanyId || undefined,
      currencyId: this.selectedCurrencyId || '1',
      paymentCondition: this.paymentCondition || 'Contado',
      paymentType: this.paymentType || 'Efectivo',
      paymentDate: today,
      grandTotal: this.invoiceTotals.grandTotal || 0
    };

    return billing;
  }

  /**
   * Finalizes the invoice creation process, shows a success alert,
   * emits the invoice ID, and hides the alert after a short delay.
   */
  finishInvoice(): void {
    this.showConfirmModal = false;
    try {
      const billingData: Billing = this.mapToBillingObject();

      this.billingService.createInvoiceReference(
        billingData,
        this.paymentId ? this.paymentId : 0,
        true
      ).pipe(
        first(),
        catchError((_error) => {
          this.showAlert('error', 'Error al crear factura', 'No se pudo crear la referencia de factura');
          return of(null);
        })
      ).subscribe((response) => {
        if (response) {
          const invoiceId = Math.floor(100000 + Math.random() * 900000);

          this.showAlert('success', 'Factura generada correctamente', `Nº: ${invoiceId}`);
          this.invoiceCreatedId.emit(invoiceId);

          setTimeout(() => {
            this.alertType = null;
          }, 3000);
        }
      });

    } catch {
      this.showAlert('error', 'Error al preparar factura', 'No se pudo preparar la factura');
    }
  }

  /**
   * Loads customer data from the Colppy service.
   * @param _selectId Optional customer ID to preselect.
   */
  loadCustomers(_selectId?: string): void {
    this.loadingCustomers = true;
    this.customersError = null;

    this.colppyService.getAllCustomers({ limit: 500 })
      .pipe(
        first(),
        catchError(() => {
          this.customersError = 'No se pudo cargar la lista de clientes.';
          return of([]);
        }),
        finalize(() => (this.loadingCustomers = false))
      )
      .subscribe((opts: CustomerOption[]) => {
        this.customers = [...opts].sort((a, b) => a.label.localeCompare(b.label));
        this.cdr.detectChanges();
      });
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
    setTimeout(() => {
      this.alertType = null;
    }, 5000);
  }

  /**
   * Emit cancel attention event
   */
  onCancelAttention(): void {
    this.cancelAttention.emit();
  }

  /**
   *jj
   */
  public buildBillingForPdf(): any {
    return {
      invoiceNumber: this.invoiceNumber,
      invoiceDate: this.invoiceDate,
      invoiceType: this.invoiceType,

      customerName: this.customers.find(c => c.value === this.selectedCustomerId)?.label || 'N/A',
      customerIdentification: '',
      customerAddress: '',
      observations: this.invoiceDescription || '',

      items: this.invoiceItems.map(item => ({
        description: item.description,
        quantity: 1,
        discountPercentage: 0,
        vatRate: Number(item.vatRate.replace('%', '')),
        totalAmount: item._totalAmount
      })),

      subtotalAmount: this.invoiceTotals.taxableSubtotal,
      taxableAmount: this.invoiceTotals.taxableSubtotal,
      vatAmount: this.invoiceTotals.totalVat,
      totalAmount: this.invoiceTotals.grandTotal,
      discountAmount: 0,


      paymentMethods: this.invoicePayments.map(pm => ({
        paymentMethod: pm.method.toUpperCase(),
        amount: pm._amountRaw
      }))
    };
  }

}
