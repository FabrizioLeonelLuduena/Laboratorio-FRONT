import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';

/** Filters payload for reporting. */
export interface CareReportingFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  insurerId?: number | null;
  coverageType?: 'Obra Social' | 'Prepaga' | 'Particular' | null;
  siteId?: number | null;
}

/** Filter component for reporting. */
@Component({
  selector: 'app-care-reporting-filters',
  imports: [CommonModule, DatePickerModule, FormsModule, DropdownModule, ButtonModule],
  templateUrl: './care-reporting-filters.component.html'
})
export class CareReportingFiltersComponent implements OnInit {
  @Output() filtersApplied = new EventEmitter<CareReportingFilters>();

  // Filter properties
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  insurerId: number | null = null;
  coverageType: 'Obra Social' | 'Prepaga' | 'Particular' | null = null;
  siteId: number | null = null;

  readonly maxDate = new Date();
  readonly coverageTypeOptions = [
    { label: 'Todos', value: null },
    { label: 'Obra Social', value: 'Obra Social' },
    { label: 'Prepaga', value: 'Prepaga' },
    { label: 'Particular', value: 'Particular' }
  ];

  insurerOptions: { label: string; value: number }[] = [];
  siteOptions: { label: string; value: number }[] = [];

  /** Sets default range and loads dropdown options. */
  ngOnInit(): void {
    this.setDefaultDates();
    this.loadFilterOptions();
    this.applyFilters();
  }

  /**
   * Loads filter options for insurers and sites dropdowns.
   */
  loadFilterOptions(): void {
    // Mock options - replace with actual service calls if available
    this.insurerOptions = [
      { label: 'OSDE', value: 1 },
      { label: 'Swiss Medical', value: 2 },
      { label: 'Galeno', value: 3 }
    ];
    this.siteOptions = [
      { label: 'Sede Central', value: 1 },
      { label: 'Anexo Belgrano', value: 2 }
    ];
  }

  /** Emits the current filter object. */
  applyFilters(): void {
    this.filtersApplied.emit({
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      insurerId: this.insurerId,
      coverageType: this.coverageType,
      siteId: this.siteId
    });
  }

  /** Clears all filters and emits. */
  clearFilters(): void {
    this.setDefaultDates();
    this.insurerId = null;
    this.coverageType = null;
    this.siteId = null;
    this.applyFilters();
  }

  /**
   * Sets default date range to current year start until today.
   */
  private setDefaultDates(): void {
    const today = new Date();
    this.dateFrom = new Date(today.getFullYear(), 0, 1);
    this.dateTo = today;
  }
}
