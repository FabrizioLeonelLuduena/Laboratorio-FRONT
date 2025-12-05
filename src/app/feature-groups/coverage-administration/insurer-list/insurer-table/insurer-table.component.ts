import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  signal,
  ChangeDetectorRef,
  ViewChild,
  OnDestroy,
  inject
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// Removed Joyride imports
// import { JoyrideModule, JoyrideService } from 'ngx-joyride';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import {
  ConfirmationModalComponent
} from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import {
  TutorialOverlayComponent as GenericTutorialComponent
} from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { CoverageMappers } from '../../mappers/mappers';
import { InsurerResponseDTO } from '../../models/insurer.model';
import { InsurerService } from '../../services/insurer.service';

import { INSURER_EXPORT_COLUMNS, INSURER_PDF_COLUMNS } from './insurer-export-config';

/**
 * Insurer table (coverage home) migrated to GenericTable.
 * - Client-side pagination and global search handled by GenericTable.
 * - Filters integrated via shared FilterComponent (Estado + Tipo de aseguradora [single-select]).
 * - Row actions through 3-dots menu (Ver detalle / Eliminar).
 */
@Component({
  selector: 'app-insurer-table',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericAlertComponent, ConfirmationModalComponent, GenericTutorialComponent,SpinnerComponent],
  templateUrl: './insurer-table.component.html',
  styleUrls: ['./insurer-table.component.css']
})
export class InsurerTableComponent implements OnInit, OnDestroy {
  /** Source data */
  private allInsurers: InsurerResponseDTO[] = [];
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /**
   * tutorialSubscription.
   * @private
   */
  private tutorialSubscription: Subscription | undefined;
  /** Total records from server. */
  totalRecords = 0;

  /** Table data source (signal for reactive updates). */
  data = signal<any[]>([]);

  /** Displayed rows (mapped for GenericTable) */
  insurers: Array<InsurerResponseDTO & { is_active?: boolean; insurerTypeName?: string }> = [];

  loading = signal<boolean>(false);
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  showDeleteModal = false;
  showActivateModal = false;
  selectedInsurer: InsurerResponseDTO | null = null;


  // Reference to the PrimeNG Menu component for tutorial interaction
  @ViewChild('menu') menu!: Menu;
  @ViewChild('menuTrigger') menuTrigger!: any; // Reference to the button that triggers the menu

  // Reference to GenericTable component to access filtered data
  @ViewChild(GenericTableComponent) genericTable!: GenericTableComponent;
  /** Reference to the generic tutorial overlay component */
  @ViewChild('tutorialOverlay') tutorialOverlay!: GenericTutorialComponent;

  /** Emits when the "+" button is clicked */
  @Output() createRequested = new EventEmitter<void>();

  /** GenericTable columns */
  columns = [
    { field: 'code', header: 'Código', sortable: true },
    { field: 'acronym', header: 'Sigla', sortable: true },
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'insurerTypeName', header: 'Tipo', sortable: true },
    { field: 'is_active', header: 'Estado', sortable: true }
  ];

  /** Filters state for client-side filtering */
  private stateFilter: boolean | null = null; // null = Todos
  private typeFilter: string | null = null;   // null = Todos

  /** Filter definitions for toolbar filter component */
  filters: Filter[] = [
    {
      id: 'state',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Activos', value: true },
        { label: 'Inactivos', value: false }
      ]
    },
    {
      id: 'type',
      label: 'Tipo de aseguradora',
      type: 'select',
      options: [] // filled on init
    }
  ];

  /** Tutorial configuration signal consumed by the overlay. */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de coberturas',
        message: 'Visualizá código, sigla, nombre, tipo y estado de cada cobertura.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros',
        message: 'Usá los filtros para limitar por estado y tipo.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Buscá coberturas por nombre o código.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Descargá la tabla en Excel o PDF.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear cobertura',
        message: 'Agregá una nueva cobertura.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada cobertura.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes ver los detalles de la cobertura y sus planes para editar su información.',
        position: 'left',
        onEnter: () => {
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
      if (document.querySelector('.p-popover-content')) document.body.click();
      this.showAlert('success', 'Tutorial completado.');
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) document.body.click();
    }
  });

  /** Inject services */
  constructor(
    private insurerService: InsurerService,
    private router: Router,
    private cd: ChangeDetectorRef,
    // Removed joyrideService injection
    // private readonly joyrideService: JoyrideService,
    private readonly tutorialService: TutorialService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService
  ) {
  }

  /** Initial load */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Aseguradoras');
    this.breadcrumbService.buildFromRoute(this.route);
    this.stateFilter = true;
    this.filters = this.filters.map(f =>
      f.id === 'state' && Array.isArray(f.options)
        ? {
          ...f,
          options: f.options.map(o => ({
            ...o,
            active: o.value === true
          }))
        }
        : f
    );
    this.loadInsurers();
    this.loadInsurerTypes();
    this.tutorialSubscription = this.tutorialService.trigger$.subscribe((key: string) => {
      if (key.includes('coverage-administration')) {
        this.startInsurerTutorial();
      }
    });
  }

  /** Load insurers once and apply client filters */
  private loadInsurers(): void {
    this.loading.set(true);
    this.insurerService.getAllSimpleInsurers().subscribe({
      next: (data) => {
        this.allInsurers = data;
        this.applyClientFilters();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showAlert('error', 'Error al cargar las obras sociales.');
      }
    });
  }

  /** Load insurer types to populate select filter */
  private loadInsurerTypes(): void {
    this.insurerService.getAllInsurerTypes().subscribe({
      next: (types) => {
        const options = (types ?? []).map((t: any) => {
          const code = t?.code ?? t?.name ?? t?.type ?? '';
          return { label: CoverageMappers.humanizeInsurerType(code), value: code };
        });
        // Prepend "Todos"
        this.filters = this.filters.map(f => f.id === 'type' ? {
          ...f,
          options: [{ label: 'Todos', value: null, active: true }, ...options]
        } : f);
        // If we already had insurers, re-apply filters to sync names
        this.applyClientFilters();
      },
      error: () => {
        this.showAlert('error', 'No se pudieron cargar los tipos de aseguradora.');
      }
    });
  }

  /** Apply in-memory filters and enrich rows for GenericTable */
  private applyClientFilters(): void {
    let list = this.allInsurers.slice();

    // State filter
    if (this.stateFilter !== null) {
      list = list.filter(i => i.active === this.stateFilter);
    }

    // Type filter (single select)
    if (this.typeFilter) {
      list = list.filter(i => (i as any).insurerType === this.typeFilter || (i as any).insurerTypeName === this.typeFilter);
    }

    // Enrich rows with computed fields
    this.insurers = list.map(i => ({
      ...i,
      insurerTypeName: CoverageMappers.humanizeInsurerType((i as any).insurerType ?? (i as any).insurerTypeName),
      is_active: i.active
    }));
  }

  /** Get filtered data for export (from GenericTable's internal filtered data) */
  private getFilteredDataForExport(): Array<InsurerResponseDTO & { insurerTypeName?: string }> {
    // Access the GenericTable's filteredData signal which contains the data after global search
    if (this.genericTable) {
      return this.genericTable.filteredData() as Array<InsurerResponseDTO & { insurerTypeName?: string }>;
    }
    // Fallback to all insurers if table not available
    return this.insurers;
  }

  /** Handle toolbar filter changes */
  onFilterChange(evt: FilterChangeEvent): void {
    const map = new Map(evt.filters.map(f => [f.id, f.value] as const));
    this.stateFilter = (map.get('state') as boolean | null | undefined) ?? null;
    this.typeFilter = (map.get('type') as string | null | undefined) ?? null;
    this.applyClientFilters();
  }

  /** Row actions menu for GenericTable */
  getActions = (row: InsurerResponseDTO): MenuItem[] => {
    const actions: MenuItem[] = [
      {
        id: 'ver',
        label: 'Ver detalle',
        icon: 'pi pi-eye',
        command: () => this.router.navigate(['/care-management/coverage-administration/insurer', (row as any).id])
      }
    ];

    // Acción dinámica según estado
    const isActive = (row as any).active === true;
    if (isActive) {
      actions.push({
        id: 'eliminar',
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          this.selectedInsurer = row as any;
          this.showDeleteModal = true; // mantiene flujo existente de confirmación
        }
      });
    } else {
      actions.push({
        id: 'activar',
        label: 'Activar',
        icon: 'pi pi-check',
        command: () => {
          this.selectedInsurer = row as any;
          this.showActivateModal = true;
        }
      });
    }
    return actions;
  };


  /** Emits to parent when '+' is clicked */
  onAddClicked(): void {
    this.router.navigate(['/care-management/coverage-administration/new']);
  }

  /** Confirm deletion */
  confirmDelete(): void {
    if (!this.selectedInsurer) return;
    this.insurerService.deleteInsurer(this.selectedInsurer.id).subscribe({
      next: () => {
        this.showAlert('success', 'Obra social desactivada correctamente.');
        this.showDeleteModal = false;
        this.selectedInsurer = null;
        this.loadInsurers();
      },
      error: () => {
        this.showAlert('error', 'No se pudo desactivar la obra social.');
        this.showDeleteModal = false;
      }
    });
  }

  /** Confirm activation */
  confirmActivate(): void {
    if (!this.selectedInsurer) return;
    this.insurerService.activateInsurer(this.selectedInsurer.id).subscribe({
      next: () => {
        this.showAlert('success', 'Obra social activada correctamente.');
        this.showActivateModal = false;
        this.selectedInsurer = null;
        this.loadInsurers();
      },
      error: () => {
        this.showAlert('error', 'No se pudo activar la obra social.');
        this.showActivateModal = false;
      }
    });
  }

  /** Cancel deletion */
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedInsurer = null;
  }

  /** Cancel activation */
  cancelActivate(): void {
    this.showActivateModal = false;
    this.selectedInsurer = null;
  }

  /** Helper to display transient alerts */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }


  /**
   * Unsubscribes from all subscriptions on component destruction.
   */
  ngOnDestroy(): void {
    this.tutorialSubscription?.unsubscribe();
    // Removed tourSubscription unsubscribe
    // this.tourSubscription?.unsubscribe();
  }

  /**
   * Starts the insurers tutorial.
   */
  startInsurerTutorial() {
    // If table has no data, inject a mock row so selectors exist
    if (this.insurers.length === 0) {
      this.loadMockData();
    }
    // Delay to allow table render
    setTimeout(() => this.tutorialOverlay?.start(), 300);
  }

  /**
   * Loads mock data for the tutorial.
   */
  private loadMockData() {
    const mockInsurerRow: any = {
      id: -1,
      code: 'AS001',
      name: 'Cobertura de ejemplo',
      acronym: 'MOCK',
      active: true,
      insurerType: 'SOCIAL',
      insurerTypeName: 'SOCIAL',
      is_active: true
    };
    this.insurers = [mockInsurerRow];
    this.totalRecords = 1;
  }

  /**
   * Export insurers to Excel
   */
  async onExportExcel(): Promise<void> {
    this.loading.set(true);
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading.set(false);
        this.cd.markForCheck();
        return;
      }

      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: INSURER_EXPORT_COLUMNS,
        fileName: 'obras-sociales',
        sheetName: 'Obras Sociales',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlert('success', 'Las obras sociales se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }

  /**
   * Export insurers to PDF
   */
  async onExportPdf(): Promise<void> {
    this.loading.set(true);
    this.cd.markForCheck();

    try {
      const dataToExport = this.getFilteredDataForExport();

      if (dataToExport.length === 0) {
        this.showAlert('warning', 'No hay datos para exportar con los filtros aplicados.');
        this.loading.set(false);
        this.cd.markForCheck();
        return;
      }

      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: INSURER_PDF_COLUMNS,
        fileName: 'obras-sociales',
        title: 'Listado de Obras Sociales y Prepagas',
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

      if (result.success) {
        this.showAlert('success', 'Las obras sociales se exportaron correctamente.');
      } else {
        this.showAlert('error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }

}
