import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, inject, OnDestroy, OnInit, signal, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { GenericColumn } from '../../../../shared/models/generic-table.models';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService } from '../../../../shared/services/export';
import { PdfExportService } from '../../../../shared/services/export';
import { HelpCenterService } from '../../../../shared/services/help-center.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { InvoicePdfService } from '../application/invoice-pdf.service';
import { InvoiceableService, PageResponse } from '../application/invoiceable.service';
import { INVOICE_LIST_HELP_CONTENT } from '../constants/invoice-list-help.config';
import { Billing } from '../domain';
import { InvoiceableFilter } from '../domain';
import { InvoiceableType, InvoiceableTypeLabels } from '../domain';
import { Invoiceable } from '../domain';

import { INVOICE_EXPORT_COLUMNS, INVOICE_PDF_COLUMNS } from './invoice-export-config';

/** Table row shape used to enrich invoiceable entities with UI metadata. */
type InvoiceableTableRow = Invoiceable & {
  typeLabel: string;
  invoiceStatus: string;
  invoiceNumber: string | null;
};

/**
 * Invoice list component displaying billable entities (transactions and payments).
 * Uses server-side pagination and filtering via generic-table component.
 */
@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericAlertComponent, GenericBadgeComponent, TutorialOverlayComponent,SpinnerComponent],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.css']
})
export class InvoiceListComponent implements OnInit, AfterViewInit, OnDestroy {
  private invoiceableService = inject(InvoiceableService);
  private breadcrumbService = inject(BreadcrumbService);
  private invoicePdfService = inject(InvoicePdfService);
  private helpService = inject(HelpCenterService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private tutorialService = inject(TutorialService);
  private messageService = inject(MessageService);

  /** Template references for custom column rendering */
  @ViewChild('amountTemplate', { static: false }) amountTemplate!: TemplateRef<any>;
  @ViewChild('invoiceNumberTemplate', { static: false }) invoiceNumberTemplate!: TemplateRef<any>;
  @ViewChild('invoiceStatusTemplate', { static: false }) invoiceStatusTemplate!: TemplateRef<any>;
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;

  private tutorialSub?: Subscription;

  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de facturas',
        message: 'Aquí puedes gestionar todas las facturas del sistema. Visualiza el tipo de movimiento, fecha, descripción, importe y estado de cada factura.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar facturas por tipo de movimiento (Transacción/Pago), estado (Con/Sin factura) y rango de fechas.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar facturas de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de facturas a formato Excel o PDF para análisis externo o reportes contables.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada factura.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes generar facturas, descargar PDFs y ver detalles de cada movimiento.',
        position: 'left',
        onEnter: () => {
          // Auto-open the actions menu
          if (!document.querySelector('.p-popover-content')) {
            const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
            if (firstMenuButton) {
              firstMenuButton.click();
            }
          }
        }
      }
    ],
    onComplete: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Tutorial completado',
        detail: '¡Ahora conoces todas las funcionalidades de gestión de facturas!'
      });
      this.cdr.markForCheck();
    },
    onSkip: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.cdr.markForCheck();
    }
  });

  /** Table data */
  invoiceables = signal<InvoiceableTableRow[]>([]);

  /** Global search term */
  searchTerm = signal<string>('');

  /** Filtered invoiceables based on global search */
  filteredInvoiceables = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const data = this.invoiceables();

    if (!term) {
      return data;
    }

    return data.filter(invoice => {
      // Search across all visible columns with null safety
      const searchableFields = [
        invoice.typeLabel ?? '',
        invoice.description ?? '',
        invoice.invoiceStatus ?? '',
        invoice.invoiceNumber ?? '',
        invoice.amount?.toString() ?? '',
        invoice.date ? new Date(invoice.date).toLocaleDateString('es-AR') : ''
      ];

      return searchableFields.some(field =>
        field.toLowerCase().includes(term)
      );
    });
  });

  /** Pagination state */
  currentPage = 0;
  pageSize = 10;
  totalRecords = 0;
  loading = signal<boolean>(false);

  /** Current sort configuration */
  currentSort = 'date,desc';

  /** Current filters */
  currentFilters: InvoiceableFilter = {};

  /** Alert state */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** Column definitions */
  columns: GenericColumn[] = [
    {
      field: 'typeLabel',
      header: 'Tipo',
      sortable: true
    },
    {
      field: 'date',
      header: 'Fecha',
      sortable: true,
      pipes: [{ name: 'date', args: ['dd/MM/yyyy'] }]
    },
    {
      field: 'description',
      header: 'Concepto',
      sortable: true
    },
    {
      field: 'amount',
      header: 'Importe',
      sortable: true,
      pipes: [{ name: 'currency', args: ['ARS', 'symbol-narrow'] }]
    },
    {
      field: 'invoiceStatus',
      header: 'Estado',
      sortable: false
    },
    {
      field: 'invoiceNumber',
      header: 'Número de factura',
      sortable: false,
      nullDisplay: '—'
    }
  ];

  /** Filter definitions for toolbar */
  filters: Filter[] = [
    {
      id: 'type',
      label: 'Tipo de movimiento',
      type: 'select',
      options: [
        { label: 'Todas', value: null, active: true },
        { label: InvoiceableTypeLabels[InvoiceableType.TRANSACTION], value: InvoiceableType.TRANSACTION },
        { label: InvoiceableTypeLabels[InvoiceableType.PAYMENT], value: InvoiceableType.PAYMENT }
      ]
    },
    {
      id: 'hasInvoiceReference',
      label: 'Estado de factura',
      type: 'select',
      options: [
        { label: 'Todas', value: null, active: true },
        { label: 'Con factura', value: true },
        { label: 'Sin factura', value: false }
      ]
    },
    {
      id: 'dateRange',
      label: 'Rango de fechas',
      type: 'dateRange'
    }
  ];

  /**
   * Initializes component and loads invoiceables.
   */
  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Facturación y cobros', route: '/billing-collections/home' },
      { label: 'Listado' }
    ]);
    this.helpService.show(INVOICE_LIST_HELP_CONTENT);
    this.loadInvoiceables();

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('invoicing')) return;

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });
  }

  /**
   * After view init - assign templates to columns for custom rendering.
   */
  ngAfterViewInit(): void {
    // Update amount column with template for right alignment
    const amountColumn = this.columns.find(col => col.field === 'amount');
    if (amountColumn) {
      amountColumn.template = this.amountTemplate;
      delete amountColumn.pipes;
    }

    // Update invoice number column with template for right alignment
    const invoiceNumberColumn = this.columns.find(col => col.field === 'invoiceNumber');
    if (invoiceNumberColumn) {
      invoiceNumberColumn.template = this.invoiceNumberTemplate;
      delete invoiceNumberColumn.nullDisplay;
    }

    // Update invoice status column with template for badge display
    const invoiceStatusColumn = this.columns.find(col => col.field === 'invoiceStatus');
    if (invoiceStatusColumn) {
      invoiceStatusColumn.template = this.invoiceStatusTemplate;
    }
  }

  /**
   * Cleanup when component is destroyed.
   */
  ngOnDestroy(): void {
    this.helpService.clear();
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Loads invoiceables from backend with current pagination, sort, and filters.
   */
  private loadInvoiceables(): void {
    this.loading.set(true);
    this.invoiceableService
      .getInvoiceables(this.currentPage, this.pageSize, this.currentSort, this.currentFilters)
      .subscribe({
        next: (response: PageResponse<Invoiceable>) => {
          // Enrich data with computed fields for display
          const enrichedData: InvoiceableTableRow[] = response.content.map(item => ({
            ...item,
            typeLabel: InvoiceableTypeLabels[item.type],
            invoiceStatus: this.getInvoiceStatusLabel(item),
            invoiceNumber: this.getInvoiceNumber(item)
          }));
          this.invoiceables.set(enrichedData);
          this.totalRecords = response.totalElements;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showAlert('error', 'No se pudieron cargar las facturas');
        }
      });
  }

  /**
   * Handles pagination changes from generic-table.
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;
    this.loadInvoiceables();
  }

  /**
   * Handles sort changes from generic-table.
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    if (sortArray.length > 0) {
      const sort = sortArray[0];
      // Map display fields to backend fields
      let field = sort.field;
      if (field === 'typeLabel') {
        field = 'type';
      } else if (field === 'invoiceReference.invoiceReference') {
        field = 'invoiceReference';
      }
      this.currentSort = `${field},${sort.order}`;
    } else {
      this.currentSort = 'date,desc';
    }
    this.currentPage = 0;
    this.loadInvoiceables();
  }

  /**
   * Handles filter changes from generic-table.
   */
  onFilterChange(event: FilterChangeEvent): void {
    const filters: InvoiceableFilter = {};

    event.filters.forEach(filter => {
      if (filter.id === 'type' && filter.value !== null) {
        filters.type = filter.value as InvoiceableType;
      }
      if (filter.id === 'hasInvoiceReference' && filter.value !== null) {
        filters.hasInvoiceReference = filter.value as boolean;
      }
      if (filter.id === 'dateRange') {
        if (filter.dateFrom) {
          filters.dateFrom = filter.dateFrom;
        }
        if (filter.dateTo) {
          filters.dateTo = filter.dateTo;
        }
      }
    });

    this.currentFilters = filters;
    this.currentPage = 0;
    this.loadInvoiceables();
  }

  /**
   * Handles global search changes from generic-table.
   * Filters the current page data based on the search term.
   */
  onGlobalSearchChange(searchValue: string): void {
    this.searchTerm.set(searchValue);
  }

  /**
   * Determines the invoice status label based on business logic.
   * - invoiceReference is null → "Not invoiced"
   * - invoiceReference exists but invoiceReference.invoiceReference is empty → "Pending"
   * - invoiceReference exists and invoiceReference.invoiceReference has value → "Invoiced"
   */
  private getInvoiceStatusLabel(item: Invoiceable): string {
    if (!item.invoiceReference) {
      return 'Sin facturar';
    }
    if (item.invoiceReference.invoiceReference === '') {
      return 'Pendiente';
    }
    return 'Facturada';
  }

  /**
   * Gets the invoice number for display.
   * Returns the invoice reference string or null if not available.
   */
  private getInvoiceNumber(item: Invoiceable): string | null {
    if (!item.invoiceReference || item.invoiceReference.invoiceReference === '') {
      return null;
    }
    return item.invoiceReference.invoiceReference;
  }

  /**
   * Returns available actions for each row based on invoice status.
   * Business logic:
   * - invoiceReference is null → Show "Generate invoice"
   * - invoiceReference exists but invoiceReference.invoiceReference is "" → Show "Retry invoice" + "Preview PDF"
   * - invoiceReference exists and invoiceReference.invoiceReference has value → Show "Download PDF"
   */
  getActions = (row: Invoiceable): MenuItem[] => {
    const actions: MenuItem[] = [];

    if (!row.invoiceReference) {
      // No invoice reference → Generate invoice
      actions.push({
        label: 'Generar factura',
        icon: 'pi pi-file',
        command: () => this.generateInvoice(row)
      });
    } else if (row.invoiceReference.invoiceReference === '') {
      // Invoice reference exists but no invoice number (Pendiente) → Retry + Preview PDF
      actions.push({
        label: 'Reintentar factura',
        icon: 'pi pi-refresh',
        command: () => this.retryInvoice(row)
      });

      // Add preview PDF option if invoiceData exists
      if (row.invoiceReference.invoiceData) {
        actions.push({
          label: 'Descargar PDF',
          icon: 'pi pi-file-pdf',
          command: () => this.previewInvoicePdf(row)
        });
      }
    } else {
      // Invoice reference exists with invoice number → Download PDF from backend
      actions.push({
        label: 'Descargar PDF',
        icon: 'pi pi-download',
        command: () => this.downloadPdf(row)
      });
    }

    return actions;
  };

  /**
   * Downloads PDF for an invoiceable entity.
   */
  private downloadPdf(invoiceable: Invoiceable): void {
    if (!invoiceable.invoiceReference?.invoiceReference) {
      this.showAlert('error', 'Número de factura no encontrado');
      return;
    }

    // Extract invoice ID from invoice reference
    const invoiceId = invoiceable.invoiceReference.invoiceReference;

    this.invoiceableService.downloadInvoicePdf(invoiceId).subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `factura-${invoiceId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showAlert('success', 'PDF descargado correctamente');
      },
      error: () => {
        this.showAlert('error', 'No se pudo descargar el PDF');
      }
    });
  }

  /**
   * Retries invoice generation for an invoiceable entity.
   */
  private retryInvoice(invoiceable: Invoiceable): void {
    if (!invoiceable.invoiceReference?.invoiceReferenceId) {
      this.showAlert('error', 'Referencia de factura no encontrada');
      return;
    }

    this.invoiceableService.retryInvoice(invoiceable.invoiceReference.invoiceReferenceId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showAlert('success', 'Factura reintentada con éxito');
          this.loadInvoiceables();
        } else {
          this.showAlert('warning', 'Colppy no está disponible ahora. Intente más tarde.');
        }
      },
      error: () => {
        this.showAlert('error', 'No se pudo reintentar la factura');
      }
    });
  }

  /**
   * Generates invoice for an invoiceable entity.
   * Navigate to invoice creation component when implemented.
   */
  private generateInvoice(invoiceable: Invoiceable): void {
    void this.router.navigate(['/billing-collections/invoicing/create'], {
      state: { invoiceable }
    });
  }

  /**
   * Previews PDF for a pending invoice using the stored invoiceData.
   * Maps the invoiceData from the invoice reference to a Billing object
   * and generates a PDF preview in a new tab.
   */
  private previewInvoicePdf(invoiceable: Invoiceable): void {
    if (!invoiceable.invoiceReference?.invoiceData) {
      this.showAlert('error', 'No se encontraron los datos de la factura');
      return;
    }

    try {
      // Map invoiceData (unknown type) to Billing
      const billing = invoiceable.invoiceReference.invoiceData as Billing;

      // Generate and preview the PDF
      this.invoicePdfService.previewInvoicePDF(billing);
    } catch {
      this.showAlert('error', 'Error al generar la vista previa del PDF');
    }
  }

  /**
   * Shows an alert message.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => {
      this.alert = null;
    }, 5000);
  }

  /**
   * Handles export to Excel or PDF.
   * @param filteredData - Filtered data from the table
   * @param event - Export event with type
   */
  async onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      // Get all invoiceables without pagination for export
      const allInvoiceables = filteredData.length > 0 ? filteredData : this.invoiceables();
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: allInvoiceables,
          columns: INVOICE_EXPORT_COLUMNS,
          fileName: 'facturacion',
          sheetName: 'Facturación',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: allInvoiceables,
          columns: INVOICE_PDF_COLUMNS,
          fileName: 'facturacion',
          title: 'Listado de Facturación',
          orientation: 'landscape',
          includeDate: true,
          includeTimestamp: true,
          logo: {
            path: '/lcc_negativo.png',
            width: 48,
            height: 14.4,
            x: 230,
            y: 8
          }
        });
      }

      if (result?.success) {
        this.showAlert('success', 'Los datos de facturación se exportaron correctamente.');
      } else {
        this.showAlert('error', result?.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
