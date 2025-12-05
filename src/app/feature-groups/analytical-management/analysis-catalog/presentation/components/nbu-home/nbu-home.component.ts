import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { GenericColumn } from 'src/app/shared/models/generic-table.models';
import { ExcelExportService } from 'src/app/shared/services/export/excel-export.service';
import { PdfExportService } from 'src/app/shared/services/export/pdf-export.service';

import { extractErrorMessage } from '../../../../../../shared/utils/error-message.util';
import { NbuVersionService } from '../../../application/nbu-version.service';
import { NbuVersion } from '../../../domain/nbu-version.model';
import { Nbu } from '../../../domain/nbu.model';
import { NbuMapper } from '../../../infrastructure/mappers/nbu.mapper';
import { NbuEditFormComponent } from '../nbu-edit-form/nbu-edit-form.component';

import { NBU_EXPORT_COLUMNS, NBU_PDF_COLUMNS } from './nbu-export-config';


/**
 *
 */
type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 *
 */
interface FlashMessage {
  type: AlertType;
  text: string;
  title?: string;
}


const FLASH_DURATION = 4500;

/**
 * Component for NBU management home page.
 * Displays NBUs in a table format with CRUD operations.
 * Loads NBUs from GET /api/v1/analysis/nbu/versions/nbu_detail endpoint.
 */
@Component({
  selector: 'app-nbu-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericModalComponent,
    NbuEditFormComponent,
    ButtonModule,
    TagModule,
    DividerModule,
    SelectModule
  ],
  templateUrl: './nbu-home.component.html',
  styleUrl: './nbu-home.component.css'
})
export class NbuHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly nbuVersionService = inject(NbuVersionService);

  @ViewChild('nbuCodeTpl', { static: true }) nbuCodeTpl!: TemplateRef<any>;
  @ViewChild('typeTpl', { static: true }) typeTpl!: TemplateRef<any>;
  @ViewChild('flagsTpl', { static: true }) flagsTpl!: TemplateRef<any>;

  // Version filter state
  availableVersions = signal<NbuVersion[]>([]);
  selectedVersionId = signal<number | null>(null);

  // All NBUs loaded from nbu_detail endpoint
  private allNbus = signal<Nbu[]>([]);

  // Filtered NBUs based on selected version
  nbus = computed(() => {
    const allNbus = this.allNbus();
    const versionId = this.selectedVersionId();

    // If no version selected or "all" selected, show all NBUs
    if (versionId === null) {
      return allNbus;
    }

    // Filter NBUs by selected version
    return allNbus.filter(nbu =>
      nbu.nbuVersionDetails?.some(detail =>
        detail.nbuVersion?.id === versionId
      )
    );
  });

  totalRecords = computed(() => this.nbus().length);
  loading = signal<boolean>(false);
  loadingVersions = signal<boolean>(false);
  flash = signal<FlashMessage | undefined>(undefined);

  // Version filter dropdown options
  versionFilterOptions = computed(() => {
    const versions = this.availableVersions();
    const options: Array<{ label: string; value: number | null }> = [
      { label: 'Todas las versiones', value: null }
    ];

    versions.forEach(version => {
      options.push({
        label: `${version.versionCode} (${version.publicationYear || 'N/A'})`,
        value: version.id
      });
    });

    return options;
  });

  showEditDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  selectedNbu = signal<Nbu | undefined>(undefined);
  selectedNbuForEdit = signal<Nbu | undefined>(undefined);

  columns: GenericColumn[] = [];
  getRowActions = (row: Nbu) => this.buildRowActions(row);

  /**
   * Initializes the component and sets up table configuration
   */
  ngOnInit(): void {
    this.buildColumns();
    this.loadNbus();
    this.loadVersions();
  }

  /**
   * Loads all NBUs from GET /api/v1/analysis/nbu/versions/nbu_detail endpoint.
   * Extracts unique NBUs from all versions and their nbuDetails.
   */
  private loadNbus(): void {
    this.loading.set(true);

    this.nbuVersionService.getNbuVersionsWithDetails().subscribe({
      next: (versionsWithDetails) => {
        // Extraer todos los NBUs únicos de todas las versiones
        const nbusMap = new Map<number, Nbu>();

        for (const version of versionsWithDetails) {
          if (version.nbuDetails) {
            for (const nbuDetail of version.nbuDetails) {
              if (nbuDetail.nbu && nbuDetail.nbu.id) {
                // Si el NBU ya existe, no lo sobrescribimos (mantenemos el primero encontrado)
                if (!nbusMap.has(nbuDetail.nbu.id)) {
                  // Mapear DTO a modelo de dominio
                  const nbu = NbuMapper.fromDTO(nbuDetail.nbu);
                  nbusMap.set(nbu.id, nbu);
                }
              }
            }
          }
        }

        this.allNbus.set(Array.from(nbusMap.values()));
        this.loading.set(false);
      },
      error: (error) => {
        // console.error('Error loading NBUs from nbu_detail:', error);
        this.allNbus.set([]);
        this.loading.set(false);
        const errorMessage = extractErrorMessage(error, 'al cargar los NBUs');
        this.notify('error', 'Error', errorMessage);
      }
    });
  }

  /**
   * Loads all available NBU versions for the filter.
   * Uses cached data from service for better performance.
   */
  private loadVersions(): void {
    this.loadingVersions.set(true);

    // Service now handles caching, multiple calls won't trigger multiple HTTP requests
    this.nbuVersionService.getNbuVersions().subscribe({
      next: (versions) => {
        this.availableVersions.set(versions);
        this.loadingVersions.set(false);
      },
      error: (error) => {
        // console.error('Error loading NBU versions:', error);
        this.availableVersions.set([]);
        this.loadingVersions.set(false);
        const errorMessage = extractErrorMessage(error, 'al cargar las versiones de NBU');
        this.notify('error', 'Error', errorMessage);
      }
    });
  }

  /**
   * Handles version filter change
   */
  onVersionFilterChange(event: any): void {
    this.selectedVersionId.set(event.value);
  }

  /**
   * Builds the table column configuration
   */
  private buildColumns(): void {
    this.columns = [
      { field: 'nbuCode', header: 'Código NBU', template: this.nbuCodeTpl, sortable: true },
      { field: 'nbuType', header: 'Tipo', template: this.typeTpl, sortable: true },
      { field: 'determination', header: 'Denominación', sortable: true },
      { field: 'flags', header: 'Características', template: this.flagsTpl }
    ];
  }

  /**
   * Builds row actions for each NBU
   */
  private buildRowActions(row: Nbu): any[] {
    return [
      { label: 'Ver Detalles', icon: 'pi pi-eye', command: () => this.onViewDetails(row) },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.onEditNbu(row) }
    ];
  }



  /**
   * Handles the edit NBU action
   */
  onEditNbu(nbu: Nbu): void {
    this.selectedNbuForEdit.set(nbu);
    this.showEditDialog.set(true);
  }

  /**
   * Handles the view details action for an NBU
   */
  onViewDetails(nbu: Nbu): void {
    this.selectedNbu.set(nbu);
    this.showDetailsDialog.set(true);
  }

  /**
   * Handles successful NBU save event
   * Reloads NBUs to reflect changes
   */
  onNbuSaved(_updatedNbu: Nbu): void {
    this.showEditDialog.set(false);
    this.selectedNbuForEdit.set(undefined);
    this.notify('success', 'Éxito', 'NBU actualizado correctamente.');

    // Recargar NBUs para reflejar los cambios
    this.loadNbus();
  }

  /**
   * Handles the cancel event from the edit dialog
   */
  onEditCancelled(): void {
    this.showEditDialog.set(false);
    this.selectedNbuForEdit.set(undefined);
  }

  /**
   * Handles the close event from the details dialog
   */
  onCloseDetails(): void {
    this.showDetailsDialog.set(false);
    this.selectedNbu.set(undefined);
  }


  /**
   * Displays a notification message to the user
   */
  private notify(type: AlertType, title: string, text: string): void {
    this.flash.set({ type, title, text });

    const timeoutId = setTimeout(() => this.flash.set(undefined), FLASH_DURATION);
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  /**
   * Handles export action from the table
   */
  async onNbuExport(filteredData: Nbu[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    const dataToExport = filteredData;

    if (dataToExport.length === 0) {
      this.notify('warning', 'Sin datos', 'No hay datos para exportar.');
      return;
    }

    try {
      const fileName = `nbu_${this.getFormattedDateForExport()}`;

      if (event.type === 'excel') {
        await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: NBU_EXPORT_COLUMNS,
          fileName: fileName,
          sheetName: 'NBU',
          includeTimestamp: true
        });
        this.notify('success', 'Éxito', 'Excel generado correctamente.');
      } else {
        await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: NBU_PDF_COLUMNS,
          fileName: fileName,
          title: 'NBU',
          includeTimestamp: true
        });
        this.notify('success', 'Éxito', 'PDF generado correctamente.');
      }
    } catch (_error) {
      // eslint-disable-next-line no-console -- Error log for export failure
      // console.error('Error during export:', _error);
      const errorMessage = extractErrorMessage(_error, `al generar el archivo ${event.type.toUpperCase()}`);
      this.notify('error', 'Error', errorMessage);
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
