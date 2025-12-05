import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { AdvancedTableComponent, GenericColumn, TableAction } from 'src/app/shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';

import { Analysis } from '../../../domain/analysis.model';
import { SampleType } from '../../../domain/sample-type.model';
import { SampleTypeEditFormComponent } from '../sample-type-edit-form/sample-type-edit-form.component';

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
  globalFilterFields: ['name']
};

const ACTION_ITEMS: TableAction[] = [
  { type: 'edit', label: 'Editar', icon: 'pi pi-pencil' },
  { type: 'details', label: 'Ver Detalles', icon: 'pi pi-eye' }
];

const FLASH_DURATION = 4500;

/**
 * Component for SampleType management home page.
 * Displays sample types in a table format with CRUD operations.
 * Receives analyses from parent to avoid duplicate HTTP calls.
 */
@Component({
  selector: 'app-sample-type-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    GenericAlertComponent,
    GenericModalComponent,
    AdvancedTableComponent,
    SampleTypeEditFormComponent
  ],
  templateUrl: './sample-type-home.component.html',
  styleUrl: './sample-type-home.component.css'
})
export class SampleTypeHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  analyses = input<Analysis[]>([]);
  readonly = input<boolean>(false);

  sampleTypes = computed(() => this.extractSampleTypesFromAnalyses(this.analyses()));
  selectedSampleType = signal<SampleType | null>(null);
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
      { field: 'name', header: 'Nombre' }
    ];
  }

  /**
   * Extracts unique sample types from analyses
   */
  private extractSampleTypesFromAnalyses(analyses: Analysis[]): SampleType[] {
    const typesMap = new Map<number, SampleType>();

    for (const analysis of analyses) {
      if (analysis.sampleType?.id && !typesMap.has(analysis.sampleType.id)) {
        typesMap.set(analysis.sampleType.id, analysis.sampleType);
      }
    }

    return Array.from(typesMap.values());
  }

  /**
   * Handles table action events
   */
  onTableAction(event: { type: string; row: Record<string, any> }): void {
    const { type, row } = event;
    this.selectedSampleType.set(row as SampleType);

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
   * Opens edit dialog for selected sample type
   */
  private handleEdit(): void {
    this.showEditDialog.set(true);
  }

  /**
   * Opens details dialog for selected sample type
   */
  private handleDetails(): void {
    this.showDetailsDialog.set(true);
  }

  /**
   * Opens edit dialog for creating new sample type
   */
  private handleAdd(): void {
    this.selectedSampleType.set(null);
    this.showEditDialog.set(true);
  }

  /**
   * Handles form save event
   */
  onSave(_sampleType: SampleType): void {
    const isNew = !this.selectedSampleType()?.id;
    const message = isNew 
      ? 'Tipo de muestra creado exitosamente' 
      : 'Tipo de muestra actualizado exitosamente';

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
