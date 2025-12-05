import { CommonModule } from '@angular/common';
import { Component, HostListener, output, signal, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { AnalysisService } from '../../../application/analysis.service';
import { Analysis } from '../../../domain/analysis.model';

/**
 * Advanced search component for analyses.
 * Provides multiple search criteria using GenericFormComponent pattern.
 *
 * Search Criteria:
 * - Name (text input)
 * - Family name (text input)
 * - Code (text input)
 * - Short code (number input)
 * - NBU code (number input)
 * - NBU determination (text input)
 * - NBU abbreviation (text input)
 * - Description (text input)
 *
 * @example
 * <app-analysis-advanced-search
 *   (searchResults)="onSearchResults($event)"
 *   (searchCleared)="onSearchCleared()" />
 */
@Component({
  selector: 'app-analysis-advanced-search',
  standalone: true,
  imports: [
    CommonModule,
    GenericFormComponent,
    ButtonModule,
    DividerModule,
    MessageModule
  ],
  templateUrl: './analysis-advanced-search.component.html',
  styleUrl: './analysis-advanced-search.component.css'
})
export class AnalysisAdvancedSearchComponent {
  private readonly analysisService = inject(AnalysisService);

  /** Emitted when search is executed with results */
  searchResults = output<Analysis[]>();

  /** Emitted when search is cleared */
  searchCleared = output<void>();

  /** Form fields for search criteria */
  formFields: GenericFormField[] = [];

  /** Initial empty values */
  initialValue: any = {};

  /** Loading state during search */
  searching = signal<boolean>(false);

  /** Current search results count */
  resultsCount = signal<number>(0);

  /** Flag to show results info */
  hasSearched = signal<boolean>(false);

  /** Error message to display */
  errorMessage = signal<string>('');

  /** Current form data for keyboard shortcuts */
  private currentFormData: any = {};

  /**
   * Initializes the component and builds the search fields
   */
  constructor() {
    this.buildSearchFields();
  }

  /**
   * Builds the search form fields
   */
  private buildSearchFields(): void {
    this.formFields = [
      {
        name: 'name',
        label: 'Nombre del Análisis',
        type: 'text',
        placeholder: 'Buscar por nombre...',
        colSpan: 1,
        hint: 'Coincidencia parcial'
      },
      {
        name: 'familyName',
        label: 'Nombre de Familia',
        type: 'text',
        placeholder: 'Buscar por familia...',
        colSpan: 1,
        hint: 'Coincidencia parcial'
      },
      {
        name: 'code',
        label: 'Código del Análisis',
        type: 'text',
        placeholder: 'Buscar por código...',
        colSpan: 1,
        hint: 'Coincidencia parcial'
      },
      {
        name: 'shortCode',
        label: 'Código Corto',
        type: 'number',
        placeholder: 'Ingresar código corto',
        colSpan: 1,
        hint: 'Coincidencia exacta'
      },
      {
        name: 'nbuCode',
        label: 'Código NBU',
        type: 'number',
        placeholder: 'Ingresar código NBU',
        colSpan: 1,
        hint: 'Coincidencia exacta'
      },
      {
        name: 'nbuDetermination',
        label: 'Determinación NBU',
        type: 'text',
        placeholder: 'Buscar por determinación...',
        colSpan: 1,
        hint: 'Coincidencia parcial'
      },
      {
        name: 'nbuAbbreviation',
        label: 'Abreviatura NBU',
        type: 'text',
        placeholder: 'Buscar por abreviatura...',
        colSpan: 1,
        hint: 'Coincidencia parcial'
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        placeholder: 'Buscar por descripción...',
        colSpan: 2,
        hint: 'Coincidencia parcial'
      }
    ];

    // Set initial empty values
    this.initialValue = {
      name: '',
      familyName: '',
      code: '',
      shortCode: null,
      nbuCode: null,
      nbuDetermination: '',
      nbuAbbreviation: '',
      description: ''
    };
  }

  /**
   * Handles search form submission
   */
  onSearch(formData: any): void {
    // Store form data for keyboard shortcuts
    this.currentFormData = formData;

    // Filter out empty values
    const searchParams: any = {};

    if (formData.name?.trim()) searchParams.name = formData.name.trim();
    if (formData.familyName?.trim()) searchParams.familyName = formData.familyName.trim();
    if (formData.code?.trim()) searchParams.code = formData.code.trim();
    if (formData.shortCode) searchParams.shortCode = formData.shortCode;
    if (formData.nbuCode) searchParams.nbuCode = formData.nbuCode;
    if (formData.nbuDetermination?.trim()) searchParams.nbuDetermination = formData.nbuDetermination.trim();
    if (formData.nbuAbbreviation?.trim()) searchParams.nbuAbbreviation = formData.nbuAbbreviation.trim();
    if (formData.description?.trim()) searchParams.description = formData.description.trim();

    // Check if at least one criterion is provided
    if (Object.keys(searchParams).length === 0) {
      // Don't proceed with empty search
      return;
    }

    this.searching.set(true);
    this.hasSearched.set(true);

    this.analysisService.searchAnalyses(searchParams).subscribe({
      next: (results) => {
        this.resultsCount.set(results.length);
        this.searching.set(false);
        this.errorMessage.set('');
        this.searchResults.emit(results);
      },
      error: (error) => {
        // console.error('Search error:', error);
        this.searching.set(false);
        this.resultsCount.set(0);
        this.errorMessage.set(extractErrorMessage(error, 'al realizar la búsqueda'));
        this.searchResults.emit([]);
      }
    });
  }

  /**
   * Validates if search form has at least one criterion filled
   */
  isSearchValid(formData: any): boolean {
    return !!(
      formData.name?.trim() ||
      formData.familyName?.trim() ||
      formData.code?.trim() ||
      formData.shortCode ||
      formData.nbuCode ||
      formData.nbuDetermination?.trim() ||
      formData.nbuAbbreviation?.trim() ||
      formData.description?.trim()
    );
  }

  /**
   * Handles clear button click
   */
  onClear(): void {
    this.hasSearched.set(false);
    this.resultsCount.set(0);
    this.errorMessage.set('');
    this.currentFormData = {};
    this.searchCleared.emit();
  }

  /**
   * Keyboard shortcut: Ctrl+Enter to trigger search
   */
  @HostListener('window:keydown.control.enter', ['$event'])
  handleCtrlEnter(event: KeyboardEvent): void {
    event.preventDefault();
    if (!this.searching() && this.isSearchValid(this.currentFormData)) {
      this.onSearch(this.currentFormData);
    }
  }

  /**
   * Keyboard shortcut: Escape to clear form
   */
  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    event.preventDefault();
    if (!this.searching()) {
      this.onClear();
    }
  }
}
