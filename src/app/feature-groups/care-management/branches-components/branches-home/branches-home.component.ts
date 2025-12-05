import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit, AfterViewInit, TemplateRef, ViewChild, ChangeDetectorRef, signal, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { JoyrideModule, JoyrideService } from 'ngx-joyride';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import { BranchService } from '../../services/branch.service';

import { BRANCH_EXPORT_COLUMNS, BRANCH_PDF_COLUMNS } from './branches-export-config';

/**
 * @class BranchesHomeComponent
 * @description Manages the display and actions for branches.
 */
@Component({
  selector: 'app-branches-home',
  templateUrl: './branches-home.component.html',
  styleUrl: './branches-home.component.css',
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericBadgeComponent,
    NgIf,
    ReactiveFormsModule,
    ConfirmationModalComponent,
    JoyrideModule,
    MenuModule,
    GenericAlertComponent,
    GenericButtonComponent,
    TutorialOverlayComponent,
    SpinnerComponent
  ],
  providers: []
})
export class BranchesHomeComponent implements OnInit, AfterViewInit, OnDestroy {

  /** Table data source (signal for reactive updates). */
  data = signal<any[]>([]);

  /** Controls confirmation modal visibility. */
  showDeleteDialog = false;

  /** Delete dialog contextual data. */
  deleteDialogData: any = {};

  /** Confirmation modal title. */
  confirmTitle = '';

  /** Confirmation modal message. */
  confirmMessage = '';
  flash?: { type: 'success' | 'error' | 'warning' | 'info'; text: string; title?: string };

  /** Current backend filters. */
  private filters = {
    nombre: '',
    estado: 'ACTIVE'
  };

  /** Total records from server. */
  totalRecords = 0;

  /** Loading state. */
  loading = signal<boolean>(false);

  /** Current page index. */
  private currentPage = 0;

  /** Current page size. */
  private currentSize = 10;

  /** Current sort configuration. */
  private currentSort = 'lastUpdatedDatetime,desc';

  /** Global search term. */
  private globalSearchTerm = '';

  private tutorialSubscription: Subscription | undefined;
  private tourSubscription: Subscription | undefined;

  /** Table column definitions for GenericTableComponent. */
  columns = [
    { field: 'code', header: 'Código', sortable: true },
    { field: 'description', header: 'Descripción', sortable: true },
    { field: 'responsibleName', header: 'Nombre de responsable', sortable: false },
    { field: 'fullAddress', header: 'Dirección', sortable: false },
    { field: 'status', header: 'Estado', sortable: true }
  ];

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;

  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de sucursales',
        message: 'Aquí puedes gestionar todas las sucursales del laboratorio. Visualiza el código, descripción, responsable, dirección y estado.',
        position: 'top'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar sucursales por estado (Activo/Inactivo/Mantenimiento) y refinar tu búsqueda.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar sucursales de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de sucursales a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nueva sucursal',
        message: 'Haz clic aquí para registrar una nueva sucursal.',
        position: 'left'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada sucursal.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes ver o editar la información de la sucursal y desactivarla del sistema.',
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
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.showFlashMessage('success', 'Tutorial completado! Ya conoces todas las funcionalidades de gestión de sucursales.', 'Tutorial Completado');
      this.cd.detectChanges();
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.cd.detectChanges();
    }
  });

  /** Filter definitions for the generic table. */
  tableFilters: Filter[] = [
    {
      id: 'estado',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null },
        { label: 'Activo', value: 'ACTIVE', active: true },
        { label: 'Inactivo', value: 'INACTIVE' },
        { label: 'Mantenimiento', value: 'MAINTENANCE' }
      ]
    }
  ];

  /** Map of column field -> TemplateRef for custom cell rendering */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();
  /** TemplateRef for the status column (defined in the HTML template) */
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  /** TemplateRef for the actions column (defined in the HTML template) */
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  // Reference to the PrimeNG Menu component for tutorial interaction
  @ViewChild('menu') menu!: Menu;
  @ViewChild('menuTrigger') menuTrigger!: any; // Reference to the button that triggers the menu


  /**
   * DI constructor.
   */
  constructor(
    private branchService: BranchService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private readonly joyrideService: JoyrideService,
    private readonly tutorialService: TutorialService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private breadcrumbService: BreadcrumbService
  ) {}

  /**
   * Initializes component, loads data, and subscribes to tutorial trigger.
   */
  ngOnInit() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Gestión interna', route: '/care-management' },
      { label: 'Sucursales', route: '/care-management/branches' }
    ]);
    this.loadBranches();
    this.tutorialSubscription = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('branches')) return;

      this.startBranchTutorial();
    });
  }

  /**
   * Sets up column templates after the view has been initialized.
   */
  ngAfterViewInit(): void {
    if (this.statusTemplate) {
      this.columnTemplates.set('status', this.statusTemplate);
    }
    if (this.actionsTemplate) {
      this.columnTemplates.set('actions', this.actionsTemplate);
    }
    this.cd.detectChanges();
  }

  /**
   * Unsubscribes from all subscriptions on component destruction.
   */
  ngOnDestroy(): void {
    this.tutorialSubscription?.unsubscribe();
    this.tourSubscription?.unsubscribe();
  }

  /**
   * Displays a flash message for a short duration.
   * @param type - The type of the message.
   * @param text - The main text of the message.
   * @param title - An optional title for the message.
   */
  private showFlashMessage(type: 'success' | 'error' | 'warning' | 'info', text: string, title?: string) {
    this.flash = { type, text, title };
    setTimeout(() => {
      this.flash = undefined;
      this.cd.markForCheck();
    }, 5000);
  }

  /**
   * Starts the branches tutorial.
   */
  startBranchTutorial() {
    setTimeout(() => {
      if (this.tutorialOverlay) {
        this.tutorialOverlay.start();
      }
    }, 500);
  }

  /**
   * Fetches branches from the API and shows a toast on error.
   */
  private loadBranches() {
    this.loading.set(true);
    this.branchService
      .getAllBranches(this.filters, this.currentPage, this.currentSize, this.currentSort)
      .subscribe({
        next: (res) => {
          this.data.set(res.content);
          this.totalRecords = res.totalElements;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showFlashMessage('error', 'No se pudo cargar la lista de sucursales.', 'Error');
        }
      });
  }

  /**
   * Handles filter changes from the generic table.
   * @param event Filter change payload
   */
  onFilterChange(event: FilterChangeEvent): void {
    const activeFilters = event.filters;
    this.filters.estado = '';
    activeFilters.forEach(filter => {
      if (filter.id === 'estado' && filter.value !== null) {
        this.filters.estado = filter.value as string;
      }
    });
    this.currentPage = 0;
    this.loadBranches();
  }

  /**
   * Handles global search changes.
   * @param searchTerm Search term from input
   */
  onGlobalFilterChange(searchTerm: string): void {
    this.globalSearchTerm = searchTerm;
    this.filters.nombre = searchTerm;
    this.currentPage = 0;
    this.loadBranches();
  }

  /**
   * Handles pagination changes.
   * @param event Pagination event with first and rows
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.currentSize = event.rows;
    this.loadBranches();
  }

  /**
   * Handles sorting changes.
   * @param sortArray Array of sort configurations
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    if (sortArray.length > 0) {
      const sort = sortArray[0];
      this.currentSort = `${sort.field},${sort.order}`;
    } else {
      this.currentSort = 'id,asc';
    }
    this.loadBranches();
  }

  /**
   * Returns available actions for a given branch row.
   * @param row Branch data
   */
  getActionsForRow(row: any): MenuItem[] {
    const actions: MenuItem[] = [
      {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => void this.router.navigate(['/care-management/branches/detail', row.id])
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => void this.router.navigate(['/care-management/update-branch', row.id])
      }
    ];

    // Only show delete action if branch is not inactive
    if (row.status !== 'Inactivo') {
      actions.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => void this.deleteItem(row)
      });
    }
    return actions;
  }

  /**
   * Opens delete confirmation. Shows a warning toast if the branch is already inactive.
   * @param branch Selected branch
   */
  private deleteItem(branch: any): void {
    if (branch.status === 'Inactivo') {
      this.showFlashMessage('warning', 'No se puede borrar una sucursal inactiva.', 'Acción no permitida');
      return;
    }
    this.confirmTitle = '¿Dar de baja sucursal?';
    this.confirmMessage = `¿Estás seguro que queres dar de baja la sucursal ${branch.code}?`;
    this.showDeleteDialog = true;
    this.deleteDialogData = { branchId: branch.id };
  }

  /**
   * Confirms deletion and shows a success/error toast accordingly.
   * @param branchId Identifier of the branch to delete
   */
  onDeleteConfirmed(branchId: number) {
    this.branchService.deleteBranch(branchId).subscribe({
      next: () => {
        this.loadBranches();
        this.showFlashMessage('success', 'La sucursal fue dada de baja exitosamente.', 'Sucursal desactivada');
      },
      error: () => {
        this.showFlashMessage('error', 'Ocurrió un error al dar de baja la sucursal.', 'Error al dar de baja');
      }
    });
    this.showDeleteDialog = false;
  }

  /**
   * Dismisses the confirmation modal.
   */
  cancelDelete(): void {
    this.showDeleteDialog = false;
  }

  /**
   * Navigate to the branch creation page.
   */
  onCreate(): void {
    this.router.navigate(['/care-management/create-branch']);
  }

  /**
   * Export branches to Excel
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportExcel(filteredData: any[]): Promise<void> {
    this.loading.set(true);
    this.cd.markForCheck();

    try {
      const result = await this.excelExportService.exportToExcel({
        data: filteredData,
        columns: BRANCH_EXPORT_COLUMNS,
        fileName: 'sucursales',
        sheetName: 'Sucursales',
        includeTimestamp: true
      });

      if (result.success) {
        this.showFlashMessage('success', 'Las sucursales se exportaron correctamente.', 'Exportación exitosa');
      } else {
        this.showFlashMessage('error', result.error || 'No se pudo generar el archivo de exportación.', 'Error al exportar');
      }
    } catch {
      this.showFlashMessage('error', 'No se pudo generar el archivo de exportación.', 'Error al exportar');
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }

  /**
   * Export branches to PDF
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportPdf(filteredData: any[]): Promise<void> {
    this.loading.set(true);
    this.cd.markForCheck();

    try {
      const result = await this.pdfExportService.exportToPdf({
        data: filteredData,
        columns: BRANCH_PDF_COLUMNS,
        fileName: 'sucursales',
        title: 'Listado de Sucursales',
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
        this.showFlashMessage('success', 'Las sucursales se exportaron correctamente.', 'Exportación exitosa');
      } else {
        this.showFlashMessage('error', result.error || 'No se pudo generar el archivo de exportación.', 'Error al exportar');
      }
    } catch {
      this.showFlashMessage('error', 'No se pudo generar el archivo de exportación.', 'Error al exportar');
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }
}
