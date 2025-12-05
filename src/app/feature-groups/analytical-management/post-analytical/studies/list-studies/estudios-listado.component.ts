import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';

import { TagModule } from 'primeng/tag';

import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { Filter, FilterChangeEvent } from '../../../../../shared/models/filter.model';
import { ExcelExportService } from '../../../../../shared/services/export/excel-export.service';
import { PdfExportService } from '../../../../../shared/services/export/pdf-export.service';
import { StudyListItemDto } from '../../models/models';
import { EstudiosService } from '../../services/estudios.service';

import { ESTUDIOS_EXPORT_COLUMNS, ESTUDIOS_PDF_COLUMNS } from './estudios-export-config';

/**
 * Minimum search text length required to trigger search
 */
const MIN_SEARCH_LENGTH = 3;

/**
 * Component for displaying the list of studies
 */
@Component({
  selector: 'app-studies-list',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, TagModule],
  templateUrl: './estudios-listado.component.html',
  styleUrls: ['./estudios-listado.component.css']
})
/**
 * StudiesListComponent displays a paginated list of studies
 */
export class StudiesListComponent implements AfterViewInit {
  @ViewChild('analysisStatusTemplate') analysisStatusTemplate!: TemplateRef<any>;
  @ViewChild('signatureStatusTemplate') signatureStatusTemplate!: TemplateRef<any>;

  /**
   * Sets the list of studies and transforms the data for table display
   */
  @Input()
  set studies(value: StudyListItemDto[]) {
    this._transformedStudies = value.map(study => ({
      ...study,
      patientName: study.patient ? `${study.patient.lastName} ${study.patient.firstName}` : '-',
      protocolCode: study.protocolCode || '-',
      patientDocument: study.patient?.documentNumber || '-',
      analysisStatusLabel: this.studiesService.getStatusLabel(study.currentStatus),
      analysisStatusSeverity: this.studiesService.getStatusSeverity(study.currentStatus),
      signatureStatusLabel: this.getSignatureStatusLabel(study.signedResultsCount, study.expectedResultsCount),
      signatureStatusSeverity: this.getSignatureStatusSeverity(study.signedResultsCount, study.expectedResultsCount),
      formattedDate: this.formatDatetime(study.createdDatetime)
    }));
  }

  @Input() totalRecords: number = 0;
  @Input() loading: boolean = false;

  @Output() viewDetail = new EventEmitter<StudyListItemDto>();
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();
  @Output() globalFilterChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

  _transformedStudies: any[] = [];

  /**
   * Column definitions for the generic table
   */
  columns: any[] = [];

  /**
   * Filter definitions for the generic table
   */
  filters: Filter[] = [
    {
      id: 'estadoFirma',
      label: 'Estado de Firma',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'No firmado', value: 'No firmada', active: false },
        { label: 'Parcialmente firmado', value: 'Firmada parcial', active: false },
        { label: 'Firmado total', value: 'Firmada total', active: false }
      ]
    },
    {
      id: 'fechaRango',
      label: 'Rango de Fechas',
      type: 'dateRange',
      dateFrom: new Date(),
      dateTo: new Date()
    }
  ];

  private cdr = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);

  /**
   * Constructor
   * @param studiesService - Service for managing studies
   */
  constructor(public studiesService: EstudiosService) {}

  /**
   * Initializes column templates after view is ready
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'formattedDate', header: 'Fecha', sortable: true },
      { field: 'protocolCode', header: 'Protocolo', sortable: true },
      { field: 'patientDocument', header: 'Documento', sortable: true },
      { field: 'patientName', header: 'Nombre', sortable: true },
      // { field: 'analysisStatusLabel', header: 'Estado Análisis', template: this.analysisStatusTemplate },
      { field: 'signatureStatusLabel', header: 'Estado Firma', template: this.signatureStatusTemplate, sortable: false }
    ];
  }

  /**
   * Handles global search filter change with validation
   * Only emits to backend when:
   * - Search text is empty (to clear filter), OR
   * - Search text has at least minimum required characters
   */
  onGlobalFilterChange(searchText: string): void {
    const trimmedText = searchText.trim();

    // Only emit if empty (clear filter) or has at least minimum characters
    if (trimmedText.length === 0 || trimmedText.length >= MIN_SEARCH_LENGTH) {
      this.globalFilterChange.emit(trimmedText);
    }
  }

  /**
   * Gets actions for each row in the table
   * @param row - Table row data
   * @returns Array of actions
   */
  getActions = (row: StudyListItemDto) => [
    {
      id: 'view',
      label: 'Ver Detalle',
      icon: 'pi pi-eye',
      command: () => this.onViewDetail(row)
    }
  ];

  /**
   * Handles view detail action
   * @param row - Selected row
   */
  private onViewDetail(row: StudyListItemDto): void {
    this.viewDetail.emit(row);
  }

  /**
   * Format datetime for display
   * @param datetime - ISO datetime string
   * @returns Formatted datetime string
   */
  private formatDatetime(datetime: string): string {
    return new Date(datetime).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Get signature status label based on signed and expected results count
   * @param signedResultsCount - Number of signed results
   * @param expectedResultsCount - Number of expected results
   * @returns Status label for signature
   */
  private getSignatureStatusLabel(signedResultsCount: number, expectedResultsCount: number): string {
    if (signedResultsCount === 0) {
      return 'NO FIRMADO';
    } else if (signedResultsCount < expectedResultsCount) {
      return 'PARCIALMENTE FIRMADO';
    } else {
      return 'FIRMADO TOTAL';
    }
  }

  /**
   * Get signature status severity based on signed and expected results count
   * @param signedResultsCount - Number of signed results
   * @param expectedResultsCount - Number of expected results
   * @returns Severity level for signature status
   */
  private getSignatureStatusSeverity(signedResultsCount: number, expectedResultsCount: number): string {
    if (signedResultsCount === 0) {
      return 'danger';
    } else if (signedResultsCount < expectedResultsCount) {
      return 'warning';
    } else {
      return 'success';
    }
  }

  /**
   * Handles export to Excel or PDF
   * @param filteredData - Filtered data from the table
   * @param event - Export event with type
   */
  async onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : this._transformedStudies;
      const fileName = `estudios_${this.getFormattedDateForExport()}`;

      if (event.type === 'excel') {
        await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: ESTUDIOS_EXPORT_COLUMNS,
          fileName: fileName,
          sheetName: 'Estudios',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: ESTUDIOS_PDF_COLUMNS,
          fileName: fileName,
          title: 'Listado de Estudios',
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

      // Note: Since this is a child component without its own alert system,
      // we rely on the parent component to handle success/error messages
      // The export services already handle file download automatically
    } catch {
      // Silently handle errors as this is a child component
    }
  }

  /**
   * Gets the current date formatted as dd-MM-yyyy for export file names
   * @returns Formatted date string
   */
  private getFormattedDateForExport(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
