import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GenericAlertComponent, AlertType } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { Filter, FilterChangeEvent } from 'src/app/shared/models/filter.model';

import {
  RequestAreaDTO,
  ResponseAreaDTO
} from '../../../models/areas/areas.model';
import { WarehouseResponseDTO } from '../../../models/warehouses/warehouse.model';
import { AreasService } from '../../../services/areas.service';
import { WarehousesService } from '../../../services/warehouses.service';

import { AreaFormDialogComponent } from './area-form-dialog.component';


/**
 * Areas list component
 */
@Component({
  selector: 'app-areas-list',
  standalone: true,
  imports: [
    ButtonModule,
    DynamicDialogModule,
    GenericTableComponent,
    GenericAlertComponent
  ],
  providers: [DialogService],
  templateUrl: './list.component.html'
})
export class AreasListComponent implements OnInit {

  private areasService = inject(AreasService);
  private warehousesService = inject(WarehousesService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  areas: (ResponseAreaDTO & { warehouseName: string; activeStatus: string })[] = [];
  originalAreas: ResponseAreaDTO[] = [];
  warehouses: WarehouseResponseDTO[] = [];
  loading = false;
  dialogRef?: DynamicDialogRef;

  // Alerts
  showAlert = false;
  alertMessage = '';
  alertType: AlertType = 'info';

  // Filters configuration
  filters: Filter[] = [
    {
      id: 'isActive',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Activos', value: true, active: true },
        { label: 'Inactivos', value: false }
      ]
    }
  ];

  // Help content
  helpContent = `
    <div style="line-height: 1.6;">
       <p><strong>Welcome to Area Management</strong></p>
       <p>Organize the space within each warehouse by creating specific areas for different types of supplies.</p>

       <h4>What is an area?</h4>
       <p>Areas are subdivisions within a warehouse that allow for better inventory organization. For example:</p>
       <ul>
         <li>Controlled Medications Area</li>
         <li>Disposable Supplies Area</li>
         <li>Chemical Reagents Area</li>
         <li>Sterile Material Area</li>
       </ul>

       <h4>Available Actions:</h4>
       <ul style="list-style: none; padding-left: 0;">
         <li style="margin-bottom: 8px;"><i class="pi pi-plus" style="color: #4CAF50;"></i> <strong>New Area:</strong> Creates a new area within a warehouse</li>
         <li style="margin-bottom: 8px;"><i class="pi pi-pencil" style="color: #FF9800;"></i> <strong>Edit:</strong> Modifies the name, description, or associated warehouse</li>
         <li style="margin-bottom: 8px;"><i class="pi pi-times" style="color: #F44336;"></i> <strong>Deactivate:</strong> Disables an area (cannot be used in movements)</li>
       </ul>

       <h4>Form Fields:</h4>
       <ul>
         <li><strong>Name:</strong> Area identification (e.g., "Refrigerated Area")</li>
         <li><strong>Description:</strong> Details about what is stored or its characteristics</li>
         <li><strong>Warehouse:</strong> Warehouse to which the area belongs</li>
       </ul>

       <h4>Relationship with Warehouses:</h4>
       <p>Each area must be associated with a warehouse. You must first create warehouses before you can create areas.</p>

       <h4>Search:</h4>
       <p>Use the search bar to find areas by name or warehouse.</p>

       <h4>Export Data:</h4>
       <p>Click the download button to export the complete list to Excel.</p>
     </div>
  `;

  // Table configuration
  columns = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'description', header: 'Descripción', sortable: false },
    { field: 'warehouseName', header: 'Depósito', sortable: true },
    { field: 'activeStatus', header: 'Estado', sortable: true }
  ];

  /**
   * Obtiene las acciones disponibles para un área.
   *
   * IMPORTANT: Each `command` captures the current `row` using closure,
   * allowing the execution of the command in the GenericTableComponent
   * to access the correct area without needing to pass parameters.
   */
  getActionsForArea = (row: any): MenuItem[] => {
    // Capture the current area in the scope of this function
    const area = row;

    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          // El closure captura 'area' del scope externo
          this.openEditDialog(area);
        }
      },
      {
        id: 'deactivate',
        label: area.isActive ? 'Desactivar' : 'Activar',
        icon: area.isActive ? 'pi pi-times' : 'pi pi-check',
        command: () => {
          this.deactivateArea(area.id);
        }
      }
    ];
  };

  // Form configuration
  formFields: GenericFormField[] = [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      placeholder: 'Ingrese el nombre del área'
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea',
      required: true,
      placeholder: 'Ingrese la descripción del área',
      rows: 3
    },
    {
      name: 'warehouseId',
      label: 'Depósito',
      type: 'select',
      required: true,
      options: []
    }
  ];

  /**
   * On init
   * @returns void
   */
  ngOnInit(): void {
    this.loadWarehouses();
    this.loadAreas();
  }

  /**
   * Load all warehouses for the select
   * @returns void
   */
  loadWarehouses(): void {
    this.warehousesService.getAllWarehouses().subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses.filter(w => w.isActive);
        // Update form fields with warehouse options
        this.formFields = this.formFields.map(field => {
          if (field.name === 'warehouseId') {
            return {
              ...field,
              options: warehouses
                .filter(w => w.isActive)
                .map(warehouse => ({
                  label: warehouse.name,
                  value: warehouse.id
                }))
            };
          }
          return field;
        });
      }
    });
  }

  /**
   * Load all areas
   * @returns void
   */
  loadAreas(): void {
    this.loading = true;
    this.areasService.getAllAreas().subscribe({
      next: (areas) => {
        this.originalAreas = areas;
        this.areas = areas.map((area) => ({
          ...area,
          warehouseName: this.getWarehouseName(area.warehouseId),
          activeStatus: this.formatActiveStatus(area.isActive)
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Get warehouse name by id
   * @param warehouseId - The warehouse id
   * @returns The warehouse name
   */
  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Depósito no encontrado';
  }

  /**
   * Handle table actions
   * @param event - The event object
   * @returns void
   */
  onAction(event: { type: string; row: any }): void {
    const { type, row } = event;

    switch (type) {
    case 'edit':
      this.openEditDialog(row);
      break;
    case 'deactivate':
      this.deactivateArea(row.id);
      break;
    }
  }

  /**
   * Open create dialog
   * @returns void
   */
  openCreateDialog(): void {
    this.dialogRef = this.dialogService.open(AreaFormDialogComponent, {
      header: 'Crear Área',
      width: '50%',
      data: {
        fields: this.formFields,
        title: 'Crear Área'
      }
    });

    this.dialogRef.onClose.subscribe((result) => {
      if (result) {
        this.createArea(result);
      }
    });
  }

  /**
   * Open edit dialog
   * @param area - The area object
   * @returns void
   */
  openEditDialog(area: any): void {
    // Find original area data
    const originalArea = this.originalAreas.find(
      (a) => a.id === area.id
    );

    const initialValue = {
      name: originalArea?.name || area.name,
      description: originalArea?.description || area.description,
      warehouseId: originalArea?.warehouseId || area.warehouseId
    };

    this.dialogRef = this.dialogService.open(AreaFormDialogComponent, {
      header: 'Editar Área',
      width: '50%',
      data: {
        fields: this.formFields,
        title: 'Editar Área',
        initialValue
      }
    });

    this.dialogRef.onClose.subscribe((result) => {
      if (result) {
        this.updateArea(area.id, result);
      }
    });
  }

  /**
   * Create area
   * @param areaData - The area data
   * @returns void
   */
  createArea(areaData: RequestAreaDTO): void {
    this.loading = true;
    this.areasService.createArea(areaData).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Update area
   * @param id - The area id
   * @param areaData - The area data
   * @returns void
   */
  updateArea(id: string, areaData: RequestAreaDTO): void {
    this.loading = true;
    this.areasService.updateArea(id, areaData).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Deactivate area
   * @param id - The area id
   * @returns void
   */
  deactivateArea(id: string): void {
    this.loading = true;
    this.areasService.deactivateArea(id).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Format active status for display
   * @param isActive - The active status
   * @returns The formatted active status
   */
  formatActiveStatus(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  /**
   * Handle filter changes
   */
  onFilterChange(event: FilterChangeEvent): void {
    const activeFilter = event.filters.find(f => f.id === 'isActive');
    if (activeFilter) {
      if (activeFilter.value === null) {
        this.areas = this.originalAreas.map(a => ({
          ...a,
          warehouseName: this.getWarehouseName(a.warehouseId),
          activeStatus: this.formatActiveStatus(a.isActive)
        }));
      } else {
        const filtered = this.originalAreas.filter(
          a => a.isActive === activeFilter.value
        );
        this.areas = filtered.map(a => ({
          ...a,
          warehouseName: this.getWarehouseName(a.warehouseId),
          activeStatus: this.formatActiveStatus(a.isActive)
        }));
      }
    }
  }

  /**
   * Handle export to Excel
   */
  onExportExcel(): void {
    // TODO: Implement when backend endpoint is available
    this.showSuccess('Función de exportación a Excel en desarrollo');
  }

  /**
   * Handle export to PDF
   */
  onExportPdf(): void {
    // TODO: Implement when backend endpoint is available
    this.showSuccess('Función de exportación a PDF en desarrollo');
  }

  /**
   * Show success alert
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
   * Show error alert
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
}
