import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import {  GenericColumn } from '../../../../../../shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from '../../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../../../shared/services/breadcrumb.service';
import { ExcelExportService } from '../../../../../../shared/services/export/excel-export.service';
import { PdfExportService } from '../../../../../../shared/services/export/pdf-export.service';
import { PageTitleService } from '../../../../../../shared/services/page-title.service';
import { extractErrorMessage } from '../../../../../../shared/utils/error-message.util';
import { AnalysisService } from '../../../application';
import { Analysis } from '../../../domain';
import { AnalysisEditFormComponent } from '../../components/analysis-edit-form/analysis-edit-form.component';
import { AnalysisSearchContainerComponent } from '../../components/analysis-search-container/analysis-search-container.component';
import { DeterminationsHomeComponent } from '../../components/determinations-home/determinations-home.component';
import { NbuHomeComponent } from '../../components/nbu-home/nbu-home.component';

import { ANALYSIS_EXPORT_COLUMNS, ANALYSIS_PDF_COLUMNS } from './analysis-export-config';


/**
 * Tipo de vista disponible en la gestión analítica
 */
type AnalyticalViewType = 'analysis' | 'nbu' | 'determinations';

/**
 * Tipo de mensaje flash para notificaciones
 */
interface FlashMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
  title?: string;
}

/** Flash notification duration in milliseconds */
const FLASH_DURATION_MS = 4500;

/** Configuration of available views */
const VIEW_OPTIONS = [
  {
    label: 'Análisis',
    value: 'analysis' as AnalyticalViewType,
    icon: 'pi pi-chart-line'
  },
  {
    label: 'NBU',
    value: 'nbu' as AnalyticalViewType,
    icon: 'pi pi-database'
  },
  {
    label: 'Determinaciones',
    value: 'determinations' as AnalyticalViewType,
    icon: 'pi pi-flask'
  }
];

/** Analysis table configuration */
const TABLE_CONFIG = {
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [5, 10, 20, 50],
  showActions: true,
  lazy: false,
  showGlobalFilter: true,
  showFilterButton: false,
  showAddButton: false,
  exportCsv: true,
  scrollable: false,
  expandable: false
};

/**
 * Component for the Analytical Management home page.
 * Displays analyses in a table format with CRUD operations.
 */
@Component({
  selector: 'app-analytical-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericModalComponent,
    SpinnerComponent,
    AnalysisEditFormComponent,
    AnalysisSearchContainerComponent,
    NbuHomeComponent,
    DeterminationsHomeComponent,
    ButtonModule,
    TagModule,
    DividerModule,
    TabsModule
  ],
  templateUrl: './analytical-home.component.html',
  styleUrl: './analytical-home.component.css'
})
export class AnalyticalHomeConfigurationComponent implements OnInit {
  @ViewChild('nbuCodeTpl', { static: true }) nbuCodeTpl!: TemplateRef<any>;
  @ViewChild('familyTpl', { static: true }) familyTpl!: TemplateRef<any>;
  @ViewChild('sampleTypeTpl', { static: true }) sampleTypeTpl!: TemplateRef<any>;

  private analysisService = inject(AnalysisService);
  private cdr = inject(ChangeDetectorRef);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  // Tab selection state
  selectedView = signal<AnalyticalViewType>('analysis');

  // Tab options
  viewOptions = VIEW_OPTIONS;

  // Data and state - using signals
  analyses = signal<Analysis[]>([]);
  loading = signal<boolean>(false);
  totalRecords = signal<number>(0);

  // Pagination state
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  sortBy = signal<string>('id');
  isAscending = signal<boolean>(true);

  // Notificaciones - using signal
  flash = signal<FlashMessage | undefined>(undefined);

  // Table configuration
  columns: GenericColumn[] = [];

  tableConfig = TABLE_CONFIG;

  // Función para obtener las acciones de cada fila
  getRowActions = (row: Analysis) => [
    {
      label: 'Ver Detalles',
      icon: 'pi pi-eye',
      command: () => this.onViewDetails(row)
    },
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.onEditAnalysis(row)
    }
  ];

  // Modals - using signals
  showEditDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  showConfirmModal = signal<boolean>(false);
  showAdvancedSearchDialog = signal<boolean>(false);

  selectedAnalysisForEdit = signal<Analysis | undefined>(undefined);
  selectedAnalysisForDetails = signal<Analysis | undefined>(undefined);

  /**
   * Initializes the component and sets up table configuration
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Gestión Analítica');
    this.breadcrumbService.buildFromRoute(this.route);
    this.buildColumns();
    this.loadAnalyses();
  }

  /**
   * Builds the table column configuration for analysis
   */
  private buildColumns(): void {
    this.columns = [
      { field: 'code', header: 'Código' },
      { field: 'name', header: 'Nombre del Análisis' },
      { field: 'shortCode', header: 'Código Corto' },
      { field: 'nbu.nbuCode', header: 'NBU', template: this.nbuCodeTpl },
      { field: 'familyName', header: 'Familia', template: this.familyTpl },
      { field: 'sampleType.name', header: 'Tipo de Muestra', template: this.sampleTypeTpl },
      { field: 'ub', header: 'UB' }
    ];
  }

  /** Load analyses with pagination */
  loadAnalyses(): void {
    this.loading.set(true);

    this.analysisService.getAnalysesPaginated(
      this.currentPage(),
      this.pageSize(),
      this.sortBy(),
      this.isAscending()
    ).subscribe({
      next: (page) => {
        this.analyses.set(page.content ?? []);
        this.totalRecords.set(page.totalElements ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        const errorMessage = extractErrorMessage(error, 'al cargar los análisis');
        this.notify('error', 'Error', errorMessage);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles page change event from GenericTable
   * @param event - Event with first (index) and rows (page size)
   */
  onPageChange(event: { first: number; rows: number }): void {
    const page = Math.floor(event.first / event.rows);
    this.currentPage.set(page);
    this.pageSize.set(event.rows);
    this.loadAnalyses();
  }

  /**
   * Handles sort change event from GenericTable
   * @param event - Array of sort configurations
   */
  onSortChange(event: { field: string; order: 'asc' | 'desc' }[]): void {
    if (event.length > 0) {
      this.sortBy.set(event[0].field);
      this.isAscending.set(event[0].order === 'asc');
      this.currentPage.set(0); // Reset to first page
      this.loadAnalyses();
    }
  }

  /** View analysis details */
  onViewDetails(analysis: Analysis): void {
    this.selectedAnalysisForDetails.set(analysis);
    this.showDetailsDialog.set(true);
  }

  /** Edit analysis */
  onEditAnalysis(analysis: Analysis): void {
    this.selectedAnalysisForEdit.set(analysis);
    this.showEditDialog.set(true);
  }

  /**
   * Handles the save event when an analysis is created or updated
   */
  onAnalysisSaved(_updatedAnalysis: Analysis): void {
    // Invalidate cache to ensure fresh data
    this.analysisService.invalidateCache();
    
    // Reload current page to get updated data
    this.loadAnalyses();

    this.showEditDialog.set(false);
    this.selectedAnalysisForEdit.set(undefined);
    this.notify('success', 'Éxito', 'Análisis actualizado correctamente.');
  }

  /**
   * Handles the cancel event from the edit dialog
   */
  onEditCancelled(): void {
    this.showEditDialog.set(false);
    this.selectedAnalysisForEdit.set(undefined);
  }

  /** Close details dialog */
  closeDetailsDialog(): void {
    this.showDetailsDialog.set(false);
    this.selectedAnalysisForDetails.set(undefined);
  }

  /** Handle tab change */
  onTabChange(_event: any): void {
    // Clear any active dialogs when switching tabs
    this.showEditDialog.set(false);
    this.showDetailsDialog.set(false);
    this.showAdvancedSearchDialog.set(false);
    this.selectedAnalysisForEdit.set(undefined);
    this.selectedAnalysisForDetails.set(undefined);
  }

  /** Toggle advanced search dialog */
  toggleAdvancedSearch(): void {
    this.showAdvancedSearchDialog.update(val => !val);
  }

  /** Close advanced search dialog */
  closeAdvancedSearch(): void {
    this.showAdvancedSearchDialog.set(false);
  }

  /**
   * Handles search results from advanced search component
   */
  onSearchResultsReceived(results: Analysis[]): void {
    // Update the table with search results
    this.analyses.set(results);
    this.totalRecords.set(results.length);

    // Show notification
    const message = results.length === 0
      ? 'No se encontraron análisis con los criterios especificados.'
      : `Se encontraron ${results.length} ${results.length === 1 ? 'análisis' : 'análisis'}.`;

    this.notify(results.length === 0 ? 'info' : 'success', 'Búsqueda completada', message);
  }

  /**
   * Handles edit action from search results
   */
  onSearchEditAnalysis(analysisId: number): void {
    const analysis = this.analyses().find(a => a.id === analysisId);
    if (analysis) {
      this.onEditAnalysis(analysis);
    }
  }

  /**
   * Handles view details action from search results
   */
  onSearchViewDetails(analysisId: number): void {
    const analysis = this.analyses().find(a => a.id === analysisId);
    if (analysis) {
      this.onViewDetails(analysis);
    }
  }

  /** Show notification */
  private notify(type: FlashMessage['type'], title: string, text: string): void {
    this.flash.set({ type, title, text });
    setTimeout(() => this.flash.set(undefined), FLASH_DURATION_MS);
  }

  /**
   * Handles export to Excel or PDF for the analysis tab
   */
  async onAnalysisExport(filteredData: Analysis[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const dataToExport = filteredData;
      let result;

      const fileName = `analisis_${this.getFormattedDateForExport()}`;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: ANALYSIS_EXPORT_COLUMNS,
          fileName: fileName,
          sheetName: 'Análisis',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: ANALYSIS_PDF_COLUMNS,
          fileName: fileName,
          title: 'Listado de Análisis',
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
        this.notify('success', 'Exportación exitosa', 'Los análisis se exportaron correctamente.');
      } else {
        const errorMessage = extractErrorMessage(result?.error || {}, 'al generar el archivo de exportación');
        this.notify('error', 'Error al exportar', errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'al generar el archivo de exportación');
      this.notify('error', 'Error al exportar', errorMessage);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
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
