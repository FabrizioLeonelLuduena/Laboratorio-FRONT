import { CommonModule } from '@angular/common';
import { Component, signal, output } from '@angular/core';

import { DividerModule } from 'primeng/divider';

import { Analysis } from '../../../domain/analysis.model';
import { AnalysisAdvancedSearchComponent } from '../analysis-advanced-search/analysis-advanced-search.component';
import { AnalysisSearchResultsComponent } from '../analysis-search-results/analysis-search-results.component';


/**
 * Container component for analysis advanced search feature.
 * Combines search form and results display.
 * 
 * Features:
 * - Advanced search with multiple criteria
 * - Results table with pagination
 * - Edit and view detail actions
 * - Empty state handling
 * 
 * @example
 * Use in analytical-home or as standalone page:
 * <app-analysis-search-container 
 *   (searchCompleted)="onSearchResults($event)"
 *   (editAnalysis)="onEditAnalysis($event)"
 *   (viewDetails)="onViewDetails($event)" />
 */
@Component({
  selector: 'app-analysis-search-container',
  standalone: true,
  imports: [
    CommonModule,
    AnalysisAdvancedSearchComponent,
    AnalysisSearchResultsComponent,
    DividerModule
  ],
  templateUrl: './analysis-search-container.component.html',
  styleUrl: './analysis-search-container.component.css'
})
export class AnalysisSearchContainerComponent {
  /** Emitted when search completes with results */
  searchCompleted = output<Analysis[]>();

  /** Emitted when user clicks edit on a result */
  editAnalysis = output<number>();

  /** Emitted when user clicks view details on a result */
  viewDetails = output<number>();

  /** Current search results */
  searchResults = signal<Analysis[]>([]);

  /** Flag to show/hide results section */
  showResults = signal<boolean>(false);

  /**
   * Handles search results from search component
   */
  onSearchResults(results: Analysis[]): void {
    this.searchResults.set(results);
    this.showResults.set(true);
    // Emit to parent
    this.searchCompleted.emit(results);
  }

  /**
   * Handles clear action from search component
   */
  onSearchCleared(): void {
    this.searchResults.set([]);
    this.showResults.set(false);
  }

  /**
   * Handles edit analysis action from results
   */
  onEditAnalysis(analysisId: number): void {
    // Emit to parent
    this.editAnalysis.emit(analysisId);
  }

  /**
   * Handles view details action from results
   */
  onViewDetails(analysisId: number): void {
    // Emit to parent
    this.viewDetails.emit(analysisId);
  }
}
