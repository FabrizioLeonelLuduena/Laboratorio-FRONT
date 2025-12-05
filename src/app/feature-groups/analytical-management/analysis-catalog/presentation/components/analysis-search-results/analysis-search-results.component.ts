import { CommonModule } from '@angular/common';
import { Component, input, output, computed } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AdvancedTableComponent } from 'src/app/shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericTableColumn } from 'src/app/shared/models/advanced-table.models';

import { Analysis } from '../../../domain/analysis.model';

/**
 * Flattened analysis data for table display
 */
interface FlatAnalysis {
  id: number;
  shortCode: number | undefined;
  name: string;
  familyName: string | undefined;
  code: string | undefined;
  nbuCode: number | null;
  nbuDetermination: string;
  sampleTypeName: string;
  description: string;
  originalAnalysis: Analysis;
}

/**
 * Displays search results for analyses in a table.
 * Uses AdvancedTableComponent for consistent styling and features.
 * 
 * Features:
 * - Displays all analysis fields in structured table
 * - Shows NBU information (code, determination)
 * - Sortable and filterable columns
 * - Action buttons (Edit, View Details)
 * - Empty state when no results
 * 
 * @example
 * <app-analysis-search-results
 *   [results]="analyses"
 *   (editAnalysis)="onEdit($event)"
 *   (viewDetails)="onViewDetails($event)" />
 */
@Component({
  selector: 'app-analysis-search-results',
  standalone: true,
  imports: [
    CommonModule,
    AdvancedTableComponent,
    GenericAlertComponent,
    ButtonModule,
    TagModule,
    DividerModule
  ],
  templateUrl: './analysis-search-results.component.html',
  styleUrl: './analysis-search-results.component.css'
})
export class AnalysisSearchResultsComponent {
  /** Search results to display */
  results = input.required<Analysis[]>();

  /** Emitted when user clicks edit button */
  editAnalysis = output<number>();

  /** Emitted when user clicks view details button */
  viewDetails = output<number>();

  /** Flattened data for table display */
  flattenedResults = computed<FlatAnalysis[]>(() => {
    return this.results().map(analysis => ({
      id: analysis.id,
      shortCode: analysis.shortCode,
      name: analysis.name,
      familyName: analysis.familyName,
      code: analysis.code,
      nbuCode: analysis.nbu?.nbuCode || null,
      nbuDetermination: analysis.nbu?.determination || 'N/A',
      sampleTypeName: analysis.sampleType?.name || 'N/A',
      description: analysis.description || 'N/A',
      originalAnalysis: analysis
    }));
  });

  /** Table columns configuration */
  tableColumns: GenericTableColumn[] = [
    {
      key: 'shortCode',
      header: 'Short Code',
      type: 'number',
      filterType: 'number'
    },
    {
      key: 'name',
      header: 'Name',
      type: 'text',
      filterType: 'text'
    },
    {
      key: 'familyName',
      header: 'Family',
      type: 'text',
      filterType: 'text'
    },
    {
      key: 'code',
      header: 'Code',
      type: 'text',
      filterType: 'text'
    },
    {
      key: 'nbuCode',
      header: 'NBU Code',
      type: 'number',
      filterType: 'number'
    },
    {
      key: 'nbuDetermination',
      header: 'NBU Determination',
      type: 'text',
      filterType: 'text'
    },
    {
      key: 'sampleTypeName',
      header: 'Sample Type',
      type: 'text',
      filterType: 'text'
    },
    {
      key: 'description',
      header: 'Description',
      type: 'text',
      filterType: 'text'
    }
  ];

  /** Table configuration */
  tableConfig = {
    showGlobalFilter: true,
    showActions: true,
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    reorderableColumns: true,
    scrollable: false,
    exportCsv: true,
    showAddButton: false,
    showFilterButton: false,
    showPaginationControls: true,
    showRowsPerPageSelector: true
  };

  /**
   * Handles edit button click
   */
  onEdit(flatAnalysis: FlatAnalysis): void {
    if (flatAnalysis?.originalAnalysis?.id) {
      this.editAnalysis.emit(flatAnalysis.originalAnalysis.id);
    }
  }

  /**
   * Handles view details button click
   */
  onViewDetails(flatAnalysis: FlatAnalysis): void {
    if (flatAnalysis?.originalAnalysis?.id) {
      this.viewDetails.emit(flatAnalysis.originalAnalysis.id);
    }
  }
}
