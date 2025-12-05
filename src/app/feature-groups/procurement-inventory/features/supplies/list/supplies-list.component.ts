import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  signal,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from 'src/app/shared/services/export';
import { TutorialService } from 'src/app/shared/services/tutorial.service';


import { ResponseCategoryDTO } from '../../../models/categories/category.model';
import {
  SupplyDetailResponseDTO,
  SupplyFiltersDTO
} from '../../../models/supplies/supplies.model';
import { CategoryService } from '../../../services/supplies/category.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';
import { ThresholdsModalComponent } from '../thresholds-modal/thresholds-modal.component';

import {
  SUPPLY_EXPORT_COLUMNS,
  SUPPLY_PDF_COLUMNS
} from './supplies-export-config';

/**
 * Column interface for table configuration
 */
interface Column {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Supply list component with pagination and filtering capabilities
 *
 * Features:
 * - Displays supplies in paginated table using PrimeNG Table component
 * - Fetches data from GET /api/supplies endpoint (Spring Boot Page<T> response)
 * - Category-based tag coloring for visual distinction
 * - Navigation to supply creation and detail views
 * - Lazy loading pagination with configurable page size
 */
@Component({
  selector: 'app-supplies-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DropdownModule,
    DynamicDialogModule,
    InputTextModule,
    TagModule,
    GenericTableComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    TutorialOverlayComponent
  ],
  providers: [DialogService],
  templateUrl: './supplies-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliesListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Template references
  @ViewChild('packaging', { static: false }) packagingTemplate!: TemplateRef<any>;
  @ViewChild('filterTemplate', { static: false }) filterTemplate!: TemplateRef<any>;
  @ViewChild('suppliesDetailTemplate', { static: true }) suppliesDetailTemplate!: TemplateRef<any>;

  // Tutorial overlay reference
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;

  // Map of column templates for generic-table
  columnTemplates = new Map<string, TemplateRef<any>>();
  // Signals para el modal de confirmación
  showConfirmation = signal(false);
  confirmationTitle = signal('Confirmar');
  confirmationMessage = signal('');
  private confirmationCallback?: () => void;

  // Signals para alertas
  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning'>('success');
  alertTitle = signal('');
  alertText = signal('');
  private alertTimeout?: ReturnType<typeof setTimeout> | undefined;

  // Contenido de ayuda
  helpContent = `
    <div style="line-height: 1.6;">
      <p><strong>Bienvenido a la Gestión de Insumos</strong></p>
      <p>Desde aquí podés administrar todos los productos del inventario: medicamentos, insumos médicos y consumibles.</p>

      <h4>Acciones disponibles:</h4>
      <ul style="list-style: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><i class="pi pi-plus" style="color: #4CAF50;"></i> <strong>Agregar:</strong> Crea un nuevo insumo en el sistema</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-ban" style="color: #FF9800;"></i> <strong>Desactivar:</strong> Deshabilita un insumo activo (no se eliminan, solo se ocultan)</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-check" style="color: #4CAF50;"></i> <strong>Reactivar:</strong> Vuelve a habilitar un insumo inactivo</li>
      </ul>

      <h4>Filtros:</h4>
      <p>Usá el botón <i class="pi pi-filter" style="color: #2196F3;"></i> para filtrar por:</p>
      <ul>
        <li><strong>Categoría:</strong> Medicamentos, Insumos Médicos, Consumibles</li>
        <li><strong>Tipo de Insumo:</strong> Clasificación específica dentro de cada categoría</li>
        <li><strong>Estado:</strong> Activos o Inactivos</li>
      </ul>

      <h4>Búsqueda:</h4>
      <p>Usá la barra de búsqueda para encontrar insumos por nombre de forma rápida.</p>

      <h4>Exportar datos:</h4>
      <p>Hacé clic en el botón de descarga para exportar la lista completa de insumos a Excel.</p>
    </div>
  `;

  // Table configuration
  columns = signal<Column[]>([
    { field: 'name', header: 'Nombre', sortable: true, filterable: true },
    { field: 'categoryName', header: 'Categoría', sortable: true, filterable: true },
    { field: 'packaging', header: 'Empaque', sortable: false, filterable: false },
    { field: 'isActive', header: 'Estado', sortable: true, filterable: false }
  ]);

  // Signals para la tabla
  suppliesData = signal<SupplyDetailResponseDTO[]>([]);
  loadingTable = signal(false);

  // Campos para filtro global
  globalFilterFields = ['name', 'categoryName', 'sku'];

  /**
   * Obtiene las acciones disponibles para un insumo según su estado.
   *
   * IMPORTANTE: Cada `command` captura el `row` actual mediante closure,
   * permitiendo que la ejecución del comando en GenericTableComponent
   * acceda al supply correcto sin necesidad de pasar parámetros.
   */
  getActions = (row: SupplyDetailResponseDTO) => {
    // Capturar el supply actual en el scope de esta función
    const supply = row;

    const baseActions = [];

    if (supply.isActive) {
      baseActions.push({
        id: 'edit',
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          this.editSupply(supply);
        }
      });
      baseActions.push({
        id: 'thresholds',
        label: 'Umbrales',
        icon: 'pi pi-chart-bar',
        command: () => {
          this.openThresholdsModal(supply);
        }
      });
      baseActions.push({
        id: 'deactivate',
        label: 'Desactivar',
        icon: 'pi pi-ban',
        command: () => {
          this.deactivateSupply(supply);
        }
      });
    } else {
      baseActions.push({
        id: 'reactivate',
        label: 'Reactivar',
        icon: 'pi pi-check',
        command: () => {
          this.reactivateSupply(supply);
        }
      });
    }

    return baseActions;
  };

  // Data state
  supplies: SupplyDetailResponseDTO[] = [];
  totalRecords = 0;
  loading = false;

  searchTerm = '';

  supplyFilters: SupplyFiltersDTO = {
    page: 0,
    size: 10,
    sort: 'id,desc',
    isActive: true,
    categoryId: undefined
  };

  // Categories loaded from backend
  categories: ResponseCategoryDTO[] = [];

  filters: Filter[] = [
    {
      id: 'is_active',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Activos', value: 'true', active: true },
        { label: 'Inactivos', value: 'false', active: false }
      ]
    },
    {
      id: 'category',
      label: 'Categoría',
      type: 'select',
      options: [] // Will be populated after loading categories
    }
  ];

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        // Special selector to highlight table header + first data row
        target: 'app-generic-table:table-intro',
        title: 'Gestión de insumos',
        message: 'Aquí puedes administrar todos los insumos del laboratorio',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar por categoría y estado (Activos/Inactivos).',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar insumos por nombre de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta la lista completa de insumos a formato Excel para análisis externo o reportes.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nuevo insumo',
        message: 'Haz clic aquí para registrar un nuevo insumo en el sistema.',
        position: 'left'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de Acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada insumo.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes desactivar insumos activos o reactivar insumos inactivos.',
        position: 'left',
        onEnter: () => {
          // Auto-open the actions menu in this step
          // The popover closes when clicking elsewhere, so we open it here right before highlighting
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
      // Close the actions popover if it's open to leave UI clean
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }

      this.showAlertMessage('success', '¡Tutorial completado!', ' Ya conoces todas las funcionalidades de gestión de insumos.');
    },
    onSkip: () => {
      // Tutorial skipped by user
    }
  });

  /**
   * Subscription to the global TutorialService trigger stream.
   */
  private tutorialSub?: Subscription;

  private breadcrumbService = inject(BreadcrumbService);
  private excelExportService = inject(ExcelExportService);
  private pdfExportService = inject(PdfExportService);
  private tutorialService = inject(TutorialService);
  private dialogService = inject(DialogService);

  /**
   * Constructor
   * @param suppliesService - Service to manage supplies
   * @param categoryService - Service to load categories
   * @param router - Angular router for navigation
   * @param cdr - Change detector reference
   */
  constructor(
    private suppliesService: SuppliesService,
    private categoryService: CategoryService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Component initialization lifecycle hook
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Compras e inventario > Insumos', '/procurement-inventory/supplies');
    this.loadCategories();
    this.loadSupplies();

    // Tutorial subscription
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('supplies')) return;

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });
  }

  /**
   * Load categories from backend and populate filter options
   */
  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;

        // Filter out ROOT category and create options
        const categoryOptions = categories
          .filter(cat => cat.name !== 'ROOT') // Exclude ROOT category
          .map(cat => ({
            label: cat.name,
            value: cat.id.toString(),
            active: false
          }));

        // Update category filter options in an immutable way to avoid redefining other filters
        this.filters = this.filters.map(filter => {
          if (filter.id === 'category') {
            return { ...filter, options: categoryOptions };
          }
          return filter;
        });

        this.cdr.markForCheck();
      },
      error: (_error) => {
        // If categories fail to load, show alert
        this.showAlertMessage('error', 'Error', 'No se pudieron cargar las categorías');
        this.cdr.markForCheck();
      }
    });
  }


  /**
   * After view init lifecycle hook
   * Assigns templates to columns after view initialization
   */
  ngAfterViewInit(): void {
    // Update columns with template references
    // Usar nombres de campo en camelCase que vienen del interceptor
    this.columns.set([
      { field: 'name', header: 'Nombre', sortable: true, filterable: true },
      { field: 'categoryName', header: 'Categoría', sortable: true, filterable: true },
      { field: 'packaging', header: 'Empaque', sortable: false, filterable: false },
      { field: 'isActive', header: 'Estado', sortable: true, filterable: false }
    ]);

    // Assign custom templates to the map (solo packaging, isActive usa el default del generic-table)
    this.columnTemplates.set('packaging', this.packagingTemplate);

    this.cdr.markForCheck();

    this.loadSupplies();
  }


  /**
   * Fetches paginated supply list from backend with optional filters
   * Extracts content[] from Spring Boot Page<T> response structure
   */
  loadSupplies(): void {
    this.loading = true;
    this.loadingTable.set(true);
    this.cdr.markForCheck();

    const searchFilters: SupplyFiltersDTO = {
      ...this.supplyFilters,
      name: this.searchTerm || undefined
    };

    this.suppliesService.searchSupplies(searchFilters).subscribe({
      next: (response) => {
        // Extract 'content' array from Spring Boot paginated response
        const content = response.content || [];

        // Map backend field names to frontend model using field mapping

        this.supplies = content;
        this.suppliesData.set(content);
        this.totalRecords = response.totalElements;
        this.loading = false;
        this.loadingTable.set(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.loadingTable.set(false);

        // Mostrar mensaje específico para error 500 de Hibernate
        let errorTitle = 'Error';
        let errorMessage = 'Error al cargar los insumos';

        if (error.status === 500 && error.error?.message?.includes('CategoryEntity')) {
          errorTitle = 'Error del Backend (Hibernate)';
          errorMessage = 'El backend tiene un problema de Hibernate Lazy Loading. ' +
                        'El equipo de backend debe agregar @Transactional al servicio de supplies. ' +
                        'Contacte al administrador del sistema.';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Contacte al administrador.';
        } else if (error.status === 404) {
          errorMessage = 'No se encontró el endpoint. Verifique la configuración del backend.';
        } else if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el backend. Verifique que el servidor esté ejecutándose.';
        }

        this.showAlertMessage('error', errorTitle, errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handles integrated filter changes
   */
  onFilterChange(event: FilterChangeEvent): void {
    // If there are no active filters (they were cleared), reset all filters
    if (event.filters.length === 0) {
      this.supplyFilters.isActive = undefined;
      this.supplyFilters.categoryId = undefined;
    } else {
      event.filters.forEach(filter => {
        switch (filter.id) {
        case 'is_active':
          // Convert string 'true'/'false' to boolean, or null to undefined
          if (filter.value === null) {
            this.supplyFilters.isActive = undefined;
          } else if (typeof filter.value === 'string') {
            this.supplyFilters.isActive = filter.value === 'true' ? true : (filter.value === 'false' ? false : undefined);
          } else {
            this.supplyFilters.isActive = filter.value as boolean;
          }
          break;
        case 'category':
          // Use the category ID directly from the filter value
          if (filter.value === null) {
            this.supplyFilters.categoryId = undefined;
          } else {
            // The filter value is the category ID as string, convert to number
            const categoryId = parseInt(filter.value as string, 10);
            this.supplyFilters.categoryId = !isNaN(categoryId) ? categoryId : undefined;
          }
          break;
        }
      });
    }

    this.resetTableAndReload();
  }

  /**
   * Reset table pagination and reload data
   * Necessary when applying filters to return to page 1
   */
  private resetTableAndReload(): void {
    this.supplyFilters.page = 0;
    this.loadSupplies();
  }

  /**
   * Handle page change event from table
   * @param event - Page change event with first index and rows per page
   */
  onPageChange(event: { first: number; rows: number }): void {
    // Calculate page number (0-based)
    this.supplyFilters.page = Math.floor(event.first / event.rows);
    this.supplyFilters.size = event.rows;
    this.loadSupplies();
  }

  /**
   * Clear all filters and reload data
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.supplyFilters = {
      page: 0,
      size: 10,
      sort: 'id,desc',
      isActive: undefined,
      categoryId: undefined
    };
  }

  /**
   * Navega a la pantalla de crear nuevo insumo
   */
  onCreateSupply(): void {
    this.router.navigate(['/procurement-inventory/supplies/create']);
  }

  /**
   * Exporta los datos a Excel
   * @param event - Export event with type (excel or pdf)
   */
  onExportExcelLegacy(event: { type: 'excel' | 'pdf' }): void {
    if (event.type === 'excel') {
      this.suppliesService.exportSuppliesToExcel(this.supplyFilters).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `insumos_${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showAlertMessage('success', 'Éxito', 'Insumos exportados a Excel correctamente');
        },
        error: (error) => {
          const errorMessage = error?.error?.message ||
                              'Error al exportar los insumos';
          this.showAlertMessage('error', 'Error', errorMessage);
        }
      });
    }
  }

  /**
   * Exporta los datos a PDF
   */
  onExportPdfLegacy(): void {
    // Implementar exportación a PDF
    this.showAlertMessage('success', 'Éxito', 'Datos exportados a PDF correctamente');
  }

  /**
   * Exporta los datos a Excel usando el servicio genórico.
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportExcel(filteredData: any[]): Promise<void> {
    const dataToExport = filteredData;

    if (dataToExport.length === 0) {
      this.showAlertMessage('warning', 'Sin datos', 'No hay datos para exportar con los filtros aplicados.');
      return;
    }

    try {
      const result = await this.excelExportService.exportToExcel({
        data: dataToExport,
        columns: SUPPLY_EXPORT_COLUMNS,
        fileName: 'insumos',
        sheetName: 'Insumos',
        includeTimestamp: true
      });

      if (result.success) {
        this.showAlertMessage('success', 'Éxito', 'Insumos exportados a Excel correctamente');
      } else {
        this.showAlertMessage('error', 'Error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlertMessage('error', 'Error', 'No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Exporta los datos a PDF usando el servicio genérico.
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportPdf(filteredData: any[]): Promise<void> {
    const dataToExport = filteredData;

    if (dataToExport.length === 0) {
      this.showAlertMessage('warning', 'Sin datos', 'No hay datos para exportar con los filtros aplicados.');
      return;
    }

    try {
      const result = await this.pdfExportService.exportToPdf({
        data: dataToExport,
        columns: SUPPLY_PDF_COLUMNS,
        fileName: 'insumos',
        title: 'Listado de Insumos',
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
        this.showAlertMessage('success', 'Éxito', 'Insumos exportados a PDF correctamente');
      } else {
        this.showAlertMessage('error', 'Error', result.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlertMessage('error', 'Error', 'No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Maneja la limpieza de filtros
   */
  onGlobalSearch(term: string): void {
    this.searchTerm = term ?? '';
    if (this.searchTerm.trim().length >= 3 || this.searchTerm.trim().length === 0) {
      this.supplyFilters.page = 0;
      this.loadSupplies();
    }
  }

  /**
   * Edit supply details
   * @param supply - Supply entity to edit
   */
  editSupply(supply: SupplyDetailResponseDTO): void {
    this.router.navigate(['/procurement-inventory/supplies', supply.id, 'edit']);
  }

  /**
   * Abre el modal para gestionar umbrales por ubicación
   * @param supply - Supply entity para el cual se gestionarán los umbrales
   */
  openThresholdsModal(supply: SupplyDetailResponseDTO): void {
    const ref = this.dialogService.open(ThresholdsModalComponent, {
      header: 'Gestionar umbrales de stock',
      width: '750px',
      modal: true,
      closable: true,
      data: {
        supply
      }
    });

    if (ref && ref.onClose) {
      ref.onClose.subscribe((result) => {
        if (result && result.success) {
          this.showAlertMessage(
            'success',
            'Éxito',
            result.message || 'El umbral se guardó correctamente'
          );
          this.loadSupplies();
        } else if (result && result.error) {
          this.showAlertMessage(
            'error',
            'Error',
            result.error || 'No se pudo guardar el umbral'
          );
        }
        this.cdr.detectChanges();
      });
    } else {
      // eslint-disable-next-line no-console -- Error log for dialog service failure
      console.error('DialogService.open returned null or ref.onClose is undefined');
      this.showAlertMessage(
        'error',
        'Error',
        'No se pudo abrir el modal de umbrales'
      );
    }
  }

  /**
   * Opens deactivation confirmation modal for supply
   * @param supply - Supply entity to deactivate
   */
  deactivateSupply(supply: SupplyDetailResponseDTO): void {
    this.confirmationTitle.set('Desactivar insumo');
    this.confirmationMessage.set(
      `¿Está seguro que desea desactivar el insumo "${supply.name}"?`
    );
    this.confirmationCallback = () => {
      this.suppliesService.deactivateSupply(supply.id).subscribe({
        next: () => {
          this.showAlertMessage('success', 'Éxito', 'Insumo desactivado correctamente');
          this.loadSupplies();
        },
        error: () => {
          this.showAlertMessage('error', 'Error', 'Error al desactivar el insumo');
        }
      });
    };
    this.showConfirmation.set(true);
  }

  /**
   * Opens reactivation confirmation modal for supply
   * @param supply - Supply entity to reactivate
   */
  reactivateSupply(supply: SupplyDetailResponseDTO): void {
    this.confirmationTitle.set('Reactivar insumo');
    this.confirmationMessage.set(
      `¿Está seguro que desea reactivar el insumo "${supply.name}"?`
    );
    this.confirmationCallback = () => {
      this.suppliesService.reactivateSupply(supply.id).subscribe({
        next: () => {
          this.showAlertMessage('success', 'Éxito', 'Insumo reactivado correctamente');
          this.loadSupplies();
        },
        error: () => {
          this.showAlertMessage('error', 'Error', 'Error al reactivar el insumo');
        }
      });
    };
    this.showConfirmation.set(true);
  }

  /**
   * Maneja la aceptación del modal de confirmación
   */
  onConfirmationAccepted(): void {
    this.showConfirmation.set(false);
    if (this.confirmationCallback) {
      this.confirmationCallback();
      this.confirmationCallback = undefined;
    }
  }

  /**
   * Maneja el rechazo del modal de confirmación
   */
  onConfirmationDismissed(): void {
    this.showConfirmation.set(false);
    this.confirmationCallback = undefined;
  }


  /**
   * Muestra un mensaje de alerta al usuario
   * @param type - Tipo de alerta
   * @param title - Título de la alerta
   * @param text - Texto descriptivo de la alerta
   */
  private showAlertMessage(
    type: 'success' | 'error' | 'warning',
    title: string,
    text: string
  ): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    // Auto-cerrar después de 3 segundos
    clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.showAlert.set(false);
    }, 3000);
  }

  /**
   * Volver a la página anterior
   */
  goBack(): void {
    this.router.navigate(['/procurement-inventory']);
  }

  /**
   * Limpia recursos al destruir el componente
   */
  ngOnDestroy(): void {
    clearTimeout(this.alertTimeout);
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Maneja la expansión de una fila
   * @param _supply - Supply entity that was expanded
   */
  onRowExpand(_supply: SupplyDetailResponseDTO): void {
  }

  /**
   * Maneja la colapsación de una fila
   * @param _supply - Supply entity that was collapsed
   */
  onRowCollapse(_supply: SupplyDetailResponseDTO): void {
    // Aquí puedes agregar lógica adicional cuando se colapsa una fila
    // Por ejemplo, limpiar datos temporales, actualizar UI, etc.
  }
}
