import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { AdvancedTableComponent, GenericColumn, TableAction } from 'src/app/shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';

import { Analysis } from '../../../domain/analysis.model';
import { WorksheetSetting } from '../../../domain/worksheet-setting.model';
import { WorksheetSettingEditFormComponent } from '../worksheet-setting-edit-form/worksheet-setting-edit-form.component';

/**
 * Alert type for notifications
 */
type AlertType = 'success' | 'error' | 'warning' | 'info';

const TABLE_CONFIG = {
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [5, 10, 20, 50],
  showActions: true,
  lazy: false,
  showGlobalFilter: true,
  showFilterButton: false,
  showAddButton: true,
  exportCsv: false,
  scrollable: true,
  expandable: false,
  globalFilterFields: ['name', 'description']
};

const ACTION_ITEMS: TableAction[] = [
  { type: 'edit', label: 'Editar', icon: 'pi pi-pencil' },
  { type: 'details', label: 'Ver Detalles', icon: 'pi pi-eye'  }
];

const FLASH_DURATION = 4500;

/**
 * Component for WorksheetSetting management home page.
 * Displays worksheet settings in a table format with CRUD operations.
 * Receives analyses from parent to avoid duplicate HTTP calls.
 */
@Component({
  selector: 'app-worksheet-setting-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    GenericAlertComponent,
    GenericModalComponent,
    AdvancedTableComponent,
    WorksheetSettingEditFormComponent
  ],
  templateUrl: './worksheet-setting-home.component.html',
  styleUrl: './worksheet-setting-home.component.css'
})
export class WorksheetSettingHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  analyses = input<Analysis[]>([]);
  readonly = input<boolean>(false);

  worksheetSettings = computed(() => this.extractWorksheetSettingsFromAnalyses(this.analyses()));
  selectedWorksheetSetting = signal<WorksheetSetting | null>(null);
  loading = signal<boolean>(false);
  
  // Computed config based on readonly mode
  effectiveTableConfig = computed(() => {
    if (this.readonly()) {
      return { ...TABLE_CONFIG, showAddButton: false, showActions: false };
    }
    return TABLE_CONFIG;
  });
  
  effectiveActionItems = computed(() => this.readonly() ? [] : ACTION_ITEMS);

  showEditDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);

  showAlert = signal<boolean>(false);
  alertType = signal<AlertType>('info');
  alertTitle = signal<string>('');
  alertText = signal<string>('');

  columns: GenericColumn[] = [];
  tableConfig = TABLE_CONFIG;
  actionItems = ACTION_ITEMS;

  /**
   * Initializes the component and sets up table configuration
   */
  ngOnInit(): void {
    this.buildColumns();
  }

  /**
   * Builds the table column configuration
   */
  private buildColumns(): void {
    this.columns = [
      { field: 'name', header: 'Nombre' },
      { field: 'description', header: 'Descripción' }
    ];
  }

  /**
   * Extracts unique worksheet settings from analyses
   */
  private extractWorksheetSettingsFromAnalyses(analyses: Analysis[]): WorksheetSetting[] {
    const settingsMap = new Map<number, WorksheetSetting>();

    for (const analysis of analyses) {
      if (analysis.worksheetSetting?.id && !settingsMap.has(analysis.worksheetSetting.id)) {
        settingsMap.set(analysis.worksheetSetting.id, analysis.worksheetSetting);
      }
    }

    return Array.from(settingsMap.values());
  }

  /**
   * Handles table action events
   */
  onTableAction(event: { type: string; row: Record<string, any> }): void {
    const { type, row } = event;
    this.selectedWorksheetSetting.set(row as WorksheetSetting);

    const actionMap: Record<string, () => void> = {
      'edit': () => this.handleEdit(),
      'details': () => this.handleDetails(),
      'add': () => this.handleAdd()
    };

    const action = actionMap[type];
    if (action) {
      action();
    } else {
      // console.warn(`Unknown action type: ${type}`);
    }
  }

  /**
   * Opens edit dialog for selected worksheet setting
   */
  private handleEdit(): void {
    this.showEditDialog.set(true);
  }

  /**
   * Opens details dialog for selected worksheet setting
   */
  private handleDetails(): void {
    this.showDetailsDialog.set(true);
  }

  /**
   * Opens edit dialog for creating new worksheet setting
   */
  private handleAdd(): void {
    this.selectedWorksheetSetting.set(null);
    this.showEditDialog.set(true);
  }

  /**
   * Handles form save event
   */
  onSave(_worksheetSetting: WorksheetSetting): void {
    const isNew = !this.selectedWorksheetSetting()?.id;
    const message = isNew 
      ? 'Configuración de hoja de trabajo creada exitosamente' 
      : 'Configuración de hoja de trabajo actualizada exitosamente';

    this.displayAlert('success', 'Éxito', message);
    this.showEditDialog.set(false);
  }

  /**
   * Handles form cancel event
   */
  onCancel(): void {
    this.showEditDialog.set(false);
  }

  /**
   * Displays an alert message
   */
  private displayAlert(type: AlertType, title: string, text: string): void {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    setTimeout(() => {
      this.showAlert.set(false);
    }, FLASH_DURATION);
  }
}
