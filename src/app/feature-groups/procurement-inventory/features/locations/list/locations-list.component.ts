import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import {
  GenericAlertComponent,
  AlertType
} from 'src/app/shared/components/generic-alert/generic-alert.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/generic-confirmation/confirmation-modal.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from 'src/app/shared/components/generic-tutorial/generic-tutorial.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';
import { TutorialConfig } from 'src/app/shared/models/generic-tutorial';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { ExcelExportService, PdfExportService } from '../../../../../shared/services/export';
import {
  ResponseLocationDTO,
  LocationFiltersDTO,
  LocationTypeDTO,
  LocationDeactivateDTO
} from '../../../models/locations/locations.model';
import { ValidationConstants } from '../../../models/suppliers/suppliers.model';
import { LocationsService } from '../../../services/locations.service';

import {
  LOCATION_EXPORT_COLUMNS,
  LOCATION_PDF_COLUMNS,
  LocationDisplayRow
} from './locations-export-config';

/**
 * Component for listing locations
 */
@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    GenericTableComponent,
    GenericAlertComponent,
    ConfirmationModalComponent,
    TutorialOverlayComponent
  ],
  templateUrl: './locations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationsListComponent implements OnInit, OnDestroy {

  // Tutorial overlay reference
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;

  // Data
  locations: any[] = [];
  totalRecords = 0;
  loading = false;

  // Location types para los filtros
  locationTypes: LocationTypeDTO[] = [];

  // LAZY pagination variables (server-side)
  currentPage = 0;
  pageSize: number = ValidationConstants.DEFAULT_PAGE_SIZE;
  currentSort = 'name,asc';

  locationFilters: LocationFiltersDTO & {
    isActive: boolean | undefined;
    locationTypes: LocationTypeDTO[]
  } = {
      page: 0,
      size: this.pageSize,
      sort: this.currentSort,
      isActive: true,
      locationTypes: []
    };

  searchTerm = '';

  // Los filtros se inicializarán después de cargar los tipos
  filters: Filter[] = [];

  // Configuración de columnas para GenericTableComponent
  columns = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'locationType', header: 'Tipo', sortable: true },
    { field: 'parentLocationName', header: 'Ubicación padre', sortable: false },
    { field: 'address', header: 'Dirección', sortable: true },
    { field: 'isActive', header: 'Estado', sortable: true }
  ];

  // Help content (in Spanish for users)
  helpContent = `
    <div style="line-height: 1.6;">
      <p><strong>Bienvenido a la Gestión de Ubicaciones</strong></p>
      <p>Administre todas las ubicaciones físicas donde se almacenan o gestionan los insumos del laboratorio.</p>

      <h4>Tipos de ubicación disponibles:</h4>
      <ul>
        <li><strong>Depósito Central:</strong> Almacenes principales de insumos</li>
        <li><strong>Sucursal:</strong> Sedes del laboratorio</li>
        <li><strong>Oficina:</strong> Espacios administrativos</li>
        <li><strong>Laboratorio:</strong> Áreas de análisis</li>
        <li><strong>Área Interna:</strong> Sectores específicos dentro de una ubicación</li>
        <li><strong>Ubicación Externa:</strong> Ubicaciones fuera del laboratorio</li>
        <li><strong>Sala de Almacenamiento:</strong> Espacios específicos para almacenaje</li>
        <li><strong>Refrigerador:</strong> Zonas de refrigeración</li>
        <li><strong>Congelador:</strong> Áreas de congelación</li>
        <li><strong>Estantería:</strong> Sistemas de almacenamiento organizados</li>
        <li><strong>Gabinete:</strong> Armarios o gabinetes</li>
        <li><strong>Cajón:</strong> Cajones dentro de gabinetes o muebles</li>
        <li><strong>Contenedor:</strong> Recipientes o contenedores de almacenamiento</li>
        <li><strong>Cuarentena:</strong> Zonas de aislamiento temporal</li>
        <li><strong>Archivo:</strong> Espacios de archivo</li>
      </ul>

      <h4>Acciones disponibles:</h4>
      <ul style="list-style: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><i class="pi pi-plus" style="color: #4CAF50;"></i> <strong>Agregar:</strong> Crea una nueva ubicación</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-eye" style="color: #2196F3;"></i> <strong>Ver:</strong> Consulta los detalles completos de la ubicación</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-pencil" style="color: #FF9800;"></i> <strong>Editar:</strong> Modifica la información de la ubicación</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-ban" style="color: #F44336;"></i> <strong>Desactivar:</strong> Deshabilita una ubicación (requiere motivo)</li>
        <li style="margin-bottom: 8px;"><i class="pi pi-check" style="color: #4CAF50;"></i> <strong>Reactivar:</strong> Vuelve a habilitar una ubicación inactiva</li>
      </ul>

      <h4>Jerarquía de ubicaciones:</h4>
      <p>Las ubicaciones pueden tener una <strong>ubicación padre</strong>, creando una estructura jerárquica (ej: Estantería → Sala de Almacenamiento → Depósito → Sucursal).</p>

      <h4>Filtros:</h4>
      <p>Usá el botón <i class="pi pi-filter" style="color: #2196F3;"></i> para filtrar por estado (Activos/Inactivos) y tipo de ubicación.</p>

      <h4>Búsqueda:</h4>
      <p>Usá la barra de búsqueda para encontrar ubicaciones por nombre o dirección.</p>

    </div>
  `;

  /**
   * Obtiene las acciones disponibles para una ubicación según su estado.
   */
  getActionsForLocation = (row: ResponseLocationDTO): MenuItem[] => {
    const location = row;

    // Si la ubicación está inactiva, solo mostrar Reactivar
    if (!location.isActive) {
      return [
        {
          id: 'reactivate',
          label: 'Reactivar',
          icon: 'pi pi-check',
          command: () => {
            this.reactivateLocation(location);
          }
        }
      ];
    }

    // Si la ubicación está activa, mostrar Editar y Desactivar
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          this.editLocation(location);
        }
      },
      {
        id: 'deactivate',
        label: 'Desactivar',
        icon: 'pi pi-ban',
        command: () => {
          this.deactivateLocation(location);
        }
      }
    ];
  };

  // Alerts
  alertMessage = '';
  alertType: AlertType = 'info';
  showAlert = false;

  // Deactivation modal
  showDeactivationModal = false;
  locationToDeactivate: ResponseLocationDTO | null = null;
  childLocations: ResponseLocationDTO[] = [];

  // Reactivation modal
  showReactivationModal = false;
  locationToReactivate: ResponseLocationDTO | null = null;
  childLocationsReactivate: ResponseLocationDTO[] = [];

  // Tutorial configuration
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        // Special selector to highlight table header + first data row
        target: 'app-generic-table:table-intro',
        title: 'Gestión de ubicaciones',
        message: 'Aquí puedes administrar todas las ubicaciones del laboratorio.',
        position: 'top'
      },
      {
        // Highlight the "Ubicación Padre" column header
        target: 'app-generic-table th:nth-child(3)',
        title: 'Jerarquía de ubicaciones',
        message: 'La columna "Ubicación Padre" muestra la estructura jerárquica. Una ubicación puede pertenecer a otra (ej: Estantería → Sala → Depósito → Sucursal).',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para alternar entre ubicaciones activas/inactivas y filtrar por tipo (Depósito, Sucursal, Estantería, etc.).',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar ubicaciones por nombre o dirección.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de ubicaciones a formato Excel para análisis externo o reportes.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nueva ubicación',
        message: 'Haz clic aquí para crear una nueva ubicación. Puedes definir jerarquías (ej: estantería dentro de una sala).',
        position: 'bottom'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de Acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada ubicaciones.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes ver detalles, editar, desactivar o reactivar ubicaciones según su estado.',
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

      this.showSuccess('Tutorial completado! Ya conoces todas las funcionalidades de gestión de ubicaciones.');
    },
    onSkip: () => {
      // Tutorial skipped by user
    }
  });

  /**
   * Subscription to the global TutorialService trigger stream.
   */
  private tutorialSub?: Subscription;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly locationsService = inject(LocationsService);
  private readonly router = inject(Router);
  readonly breadcrumbService = inject(BreadcrumbService);
  private readonly authService = inject(AuthService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly tutorialService = inject(TutorialService);

  /**
   * OnInit - Cargar tipos de ubicación y ubicaciones
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Compras e inventario > Ubicaciones',
      '/procurement-inventory/locations'
    );

    // Primero cargar los tipos para los filtros
    this.loadLocationTypes();

    // Subscribe to tutorial trigger
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      // Check if the triggered route matches this component's route
      if (!route.includes('locations')) return;

      setTimeout(() => {
        if (this.tutorialOverlay) {
          this.tutorialOverlay.start();
        }
      }, 100);
    });
  }

  /**
   * Component cleanup
   * Unsubscribes from tutorial service
   */
  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Cargar tipos de ubicación desde el backend
   */
  loadLocationTypes(): void {
    this.locationsService.getLocationTypes().subscribe({
      next: (types) => {
        this.locationTypes = types;

        // Inicializar los filtros después de cargar los tipos
        this.filters = [
          {
            id: 'isActive',
            label: 'Estado',
            type: 'radio',
            options: [
              { label: 'Activos', value: true, active: true },
              { label: 'Inactivos', value: false }
            ]
          },
          {
            id: 'locationType',
            label: 'Tipo de Ubicación',
            type: 'select',
            options: types
              .map(type => ({
                label: type.label,
                value: type.code
              }))
              .sort((a, b) => a.label.localeCompare(b.label))
          }
        ];

        this.loadLocations();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Error al cargar los tipos de ubicación');
      }
    });
  }

  /**
   * Load locations with current filters (SERVER-SIDE)
   */
  loadLocations(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const searchFilters = this.buildBackendFilters();

    // Llamar al servicio que retorna Page<ResponseLocationDTO>
    this.locationsService.getAllLocations(searchFilters).subscribe({
      next: (response) => {
        // Mapear los datos para la tabla
        this.locations = response.content.map(location => ({
          ...location,
          locationType: this.getLocationTypeLabel(location.locationType),
          address: this.getDisplayAddress(location, response.content)
        }));

        // Actualizar el total de registros para el paginador
        this.totalRecords = response.totalElements;

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (_error) => {
        this.showError('Error al cargar las ubicaciones');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Obtener el label de un tipo de ubicación desde el array cargado
   */
  getLocationTypeLabel(code: string): string {
    const type = this.locationTypes.find(t => t.code === code);
    return type ? type.label : code;
  }

  /**
   * Gets the address to display in the table.
   * If the location has no address, it traverses up the parent hierarchy to find one.
   * @param location - The current location.
   * @param allLocations - All locations loaded on the current page.
   * @returns The address to display (own or inherited from a parent).
   */
  getDisplayAddress(location: ResponseLocationDTO, allLocations: ResponseLocationDTO[]): string {
    // Si la ubicación tiene dirección, devolverla
    if (location.address && location.address.trim() !== '') {
      return location.address;
    }

    // Si no tiene dirección, buscar en la jerarquía de padres
    let currentParentId = location.parentLocationId;
    const visited = new Set<number>(); // Para evitar ciclos infinitos

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);

      // Buscar el padre en las ubicaciones cargadas
      const parent = allLocations.find(loc => loc.id === currentParentId);

      if (parent) {
        // Si el padre tiene dirección, devolverla
        if (parent.address && parent.address.trim() !== '') {
          return parent.address;
        }
        // Si no, continuar con el siguiente padre
        currentParentId = parent.parentLocationId;
      } else {
        // Si el padre no está en la lista cargada, no podemos continuar
        break;
      }
    }

    // Si no se encontró ninguna dirección en la jerarquía, devolver string vacío
    return '';
  }

  /**
   * Maneja el cambio de página desde GenericTableComponent
   * Handles page changes from GenericTableComponent
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;

    this.locationFilters.page = this.currentPage;
    this.locationFilters.size = this.pageSize;

    this.loadLocations();
  }

  /**
   * Maneja el cambio de ordenamiento desde GenericTableComponent
   */
  onSortChange(sortData: { field: string; order: 'asc' | 'desc' }[]): void {
    if (sortData && sortData.length > 0) {
      const sort = sortData[0];
      // Convertir field de la tabla al field del backend
      let backendField = sort.field;

      // Mapear campos de visualización a campos del backend si es necesario
      if (sort.field === 'locationType') {
        backendField = 'locationType';
      } else if (sort.field === 'isActive') {
        backendField = 'isActive';
      }

      // Formato esperado por Spring: "field,direction"
      this.currentSort = `${backendField},${sort.order}`;
      this.locationFilters.sort = this.currentSort;

      // Reset a primera página y recargar
      this.currentPage = 0;
      this.locationFilters.page = 0;
      this.loadLocations();
    }
  }

  /**
   * Filtro global de búsqueda (SERVER-SIDE)
   */
  onGlobalFilter(searchTerm: string): void {
    this.searchTerm = searchTerm;

    // Reset a primera página
    this.currentPage = 0;
    this.locationFilters.page = 0;

    // Recargar con el nuevo término de búsqueda
    this.loadLocations();
  }

  /**
   * Maneja los cambios de filtros
   */
  onFilterChange(event: FilterChangeEvent): void {
    // Si no hay filtros activos (se limpiaron), restablecer todos los filtros
    if (event.filters.length === 0) {
      this.locationFilters.isActive = undefined;
      this.locationFilters.locationTypes = [];
    } else {
      event.filters.forEach(f => {
        switch (f.id) {
        case 'isActive':
          this.locationFilters.isActive =
              f.value === null || f.value === ''
                ? undefined
                : (f.value as boolean);
          break;

        case 'locationType':
          if (f.value === null || f.value === '') {
            this.locationFilters.locationTypes = [];
          } else {
            // Buscar el LocationTypeDTO completo por el code
            const selectedType = this.locationTypes.find(t => t.code === f.value);
            this.locationFilters.locationTypes = selectedType ? [selectedType] : [];
          }
          break;
        }
      });
    }

    // Reset a primera página
    this.currentPage = 0;
    this.locationFilters.page = 0;

    this.loadLocations();
  }

  /**
   * Ver ubicación
   */
  viewLocation(location: ResponseLocationDTO): void {
    this.router.navigate([
      '/procurement-inventory/locations',
      location.id,
      'view'
    ]);
  }

  /**
   * Editar ubicación
   */
  editLocation(location: ResponseLocationDTO): void {
    this.router.navigate([
      '/procurement-inventory/locations',
      location.id,
      'edit'
    ]);
  }

  /**
   * Desactivar ubicación - Primero verifica si tiene ubicaciones hijas
   */
  deactivateLocation(location: ResponseLocationDTO): void {
    this.locationToDeactivate = location;

    // Fetch child locations to validate deactivation
    this.locationsService.getChildLocations(location.id).subscribe({
      next: (children) => {
        // Only store children, not the parent
        this.childLocations = children;
        this.showDeactivationModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        // If error fetching children, show error and don't proceed
        const errorMessage = error?.error?.message ||
                            'Error al verificar ubicaciones hijas';
        this.showError(errorMessage);
        this.locationToDeactivate = null;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Reactivar ubicación - Primero verifica si tiene ubicaciones padre inactivas
   */
  reactivateLocation(location: ResponseLocationDTO): void {
    this.locationToReactivate = location;
    // Fetch inactive parent locations to validate reactivation
    this.locationsService.getParentLocations(location.id).subscribe({
      next: (parents) => {
        // Store inactive parent locations
        this.childLocationsReactivate = parents;
        this.showReactivationModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        // If error fetching parents, show error and don't proceed
        const errorMessage = error?.error?.message ||
                            'Error al verificar ubicaciones padre';
        this.showError(errorMessage);
        this.locationToReactivate = null;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Confirmar reactivación de la ubicación
   */
  confirmReactivation(): void {
    if (!this.locationToReactivate) {
      return;
    }

    this.locationsService
      .reactivateLocation(this.locationToReactivate.id)
      .subscribe({
        next: () => {
          this.showSuccess('Ubicación reactivada correctamente');
          this.closeReactivationModal();
          this.loadLocations();
        },
        error: (error) => {
          const errorMessage = error?.error?.message ||
                              'Error al reactivar la ubicación';
          this.showError(errorMessage);
          this.closeReactivationModal();
        }
      });
  }

  /**
   * Cerrar modal de reactivación
   */
  closeReactivationModal(): void {
    this.showReactivationModal = false;
    this.locationToReactivate = null;
    this.childLocationsReactivate = [];
    this.cdr.markForCheck();
  }

  /**
   * Obtener mensaje del modal de reactivación
   */
  get reactivationModalMessage(): string {
    const locationName = this.locationToReactivate?.name || '';

    // If there are inactive parent locations, show warning
    if (this.childLocationsReactivate.length > 1) {
      const parentNames = this.childLocationsReactivate
        .map(loc => `• ${loc.name}`)
        .join('\n');

      return `La ubicación "${locationName}" tiene ubicaciones padre inactivas.\n` +
             'Si continúa, se reactivarán también las siguientes ubicaciones padre:\n' +
             `${parentNames}\n` +
             '¿Desea continuar?';
    }

    // If no inactive parents, show simple confirmation
    return `¿Está seguro que desea reactivar la ubicación "${locationName}"?`;
  }

  /**
   * Confirmar desactivación de la ubicación
   */
  confirmDeactivation(): void {
    if (!this.locationToDeactivate) {
      this.closeDeactivationModal();
      return;
    }

    // Obtener el userId del JWT
    const token = this.authService.getToken();
    if (!token) {
      this.showError('No hay sesión activa');
      this.closeDeactivationModal();
      return;
    }

    let userId: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.id;
    } catch {
      this.showError('Error al obtener la información del usuario');
      this.closeDeactivationModal();
      return;
    }

    // Crear el objeto según el DTO del backend
    const deactivateData: LocationDeactivateDTO = {
      userId
    };

    this.locationsService
      .deactivateLocation(this.locationToDeactivate.id, deactivateData)
      .subscribe({
        next: () => {
          this.showSuccess('Ubicación desactivada correctamente');
          this.closeDeactivationModal();
          this.loadLocations();
        },
        error: (error) => {
          const errorMessage = error?.error?.message ||
                              'Error al desactivar la ubicación';
          this.showError(errorMessage);
          this.closeDeactivationModal();
        }
      });
  }

  /**
   * Cerrar modal de desactivación
   */
  closeDeactivationModal(): void {
    this.showDeactivationModal = false;
    this.locationToDeactivate = null;
    this.childLocations = [];
    this.cdr.markForCheck();
  }

  /**
   * Obtener mensaje del modal de desactivación
   */
  get deactivationModalMessage(): string {
    const locationName = this.locationToDeactivate?.name || '';

    // If there are children (not counting parent), show warning
    if (this.childLocations.length > 1) {
      return `La ubicación "${locationName}" tiene ubicaciones hijas asociadas.`;
    }

    // If no children, show simple confirmation
    return `¿Está seguro que desea desactivar la ubicación "${locationName}"?`;
  }

  /**
   * Crear nueva ubicación (navega a página)
   */
  createLocation(): void {
    this.router.navigate(['/procurement-inventory/locations/create']);
  }

  /**
   * Mostrar alerta de éxito
   */
  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Mostrar alerta de error
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Volver a la página anterior
   */
  goBack(): void {
    this.router.navigate(['/procurement-inventory']);
  }

  /**
   * Exportar ubicaciones a Excel
   * Downloads file with current date in filename
   *
   * @param event - Export event with type (excel or pdf)
   */
  onExportLegacy(event: { type: 'excel' | 'pdf' }): void {
    if (event.type === 'excel') {
      const exportFilters = this.buildBackendFilters(false);

      this.locationsService.exportLocationsToExcel(exportFilters).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ubicaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showSuccess('Ubicaciones exportadas exitosamente');
        },
        error: (error) => {
          const errorMessage = error?.error?.message ||
                              'Error al exportar las ubicaciones';
          this.showError(errorMessage);
        }
      });
    }
  }

  /**
   * Exportar ubicaciones usando servicios genéricos (Excel/PDF).
   */
  async onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    const dataToExport = (filteredData.length > 0 ? filteredData : this.locations) as LocationDisplayRow[];

    if (!dataToExport.length) {
      this.showError('No hay datos para exportar con los filtros aplicados.');
      return;
    }

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: dataToExport,
          columns: LOCATION_EXPORT_COLUMNS,
          fileName: 'ubicaciones',
          sheetName: 'Ubicaciones',
          includeTimestamp: true
        });
      } else {
        result = await this.pdfExportService.exportToPdf({
          data: dataToExport,
          columns: LOCATION_PDF_COLUMNS,
          fileName: 'ubicaciones',
          title: 'Listado de Ubicaciones',
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
        this.showSuccess('Ubicaciones exportadas exitosamente');
      } else {
        this.showError(result?.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showError('No se pudo generar el archivo de exportación.');
    }
  }

  /**
   * Construye el objeto de filtros esperado por el backend.
   * Permite reutilizar la lógica tanto para la carga de la tabla como para la exportación.
   *
   * @param includePagination Indica si debe incluir datos de paginación.
   * @returns LocationFiltersDTO con los filtros actuales.
   */
  private buildBackendFilters(includePagination: boolean = true): LocationFiltersDTO {
    const filters: LocationFiltersDTO = {};

    if (this.searchTerm && this.searchTerm.trim()) {
      filters.term = this.searchTerm.trim();
    }

    if (this.locationFilters.isActive !== undefined) {
      filters.isActive = this.locationFilters.isActive;
    }

    if (this.locationFilters.locationTypes && this.locationFilters.locationTypes.length > 0) {
      filters.locationType = this.locationFilters.locationTypes[0].code;
    }

    if (includePagination) {
      filters.page = this.currentPage;
      filters.size = this.pageSize;
    }

    if (this.currentSort) {
      filters.sort = this.currentSort;
    }

    return filters;
  }
}

