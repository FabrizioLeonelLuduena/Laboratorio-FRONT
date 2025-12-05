import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';

import { ReportingFilters } from '../../models/post-analytical-reports.model';

/**
 * Componente de filtros para reportes post-analíticos.
 * Barra sticky con fecha desde/hasta + popover con edad y género.
 */
@Component({
  selector: 'app-reporting-filters',
  standalone: true,
  imports: [
    CommonModule,
    DatePickerModule,
    InputTextModule,
    PopoverModule,
    SelectModule,
    FormsModule
  ],
  templateUrl: './reporting-filters.component.html',
  styleUrl: './reporting-filters.component.css'
})
export class ReportingFiltersComponent implements OnInit {
  @Output() filtersApplied = new EventEmitter<ReportingFilters>();

  // Propiedades para las fechas principales
  private _dateFrom: Date | null = null;
  private _dateTo: Date | null = null;

  // Propiedades para filtros del popover
  minAge?: number;
  maxAge?: number;
  gender?: 'MALE' | 'FEMALE' | null = null;
  analysisId?: number; // ID del análisis para filtrar (screening)
  resultValue?: string | null = null; // Positivo/Negativo (screening)

  // Opciones de género
  readonly genderOptions = [
    { label: 'Todos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' }
  ];

  // Opciones de resultado (screening)
  readonly resultValueOptions = [
    { label: 'Todos', value: null },
    { label: 'Positivo', value: 'Positivo' },
    { label: 'Negativo', value: 'Negativo' }
  ];

  // Computed para contar filtros activos
  readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.minAge !== undefined && this.minAge !== null) count++;
    if (this.maxAge !== undefined && this.maxAge !== null) count++;
    if (this.gender) count++;
    if (this.analysisId !== undefined && this.analysisId !== null) count++;
    if (this.resultValue) count++;
    return count;
  });

  /**
   * Indica si hay filtros activos en el popover
   */
  readonly hasActiveFilters = computed(() => this.activeFiltersCount() > 0);

  /**
   * Gets current date from value.
   */
  get dateFrom(): Date | null {
    return this._dateFrom;
  }

  /**
   * Sets date from value.
   */
  set dateFrom(value: Date | null) {
    this._dateFrom = value;
    this.emitFilters();
  }

  /**
   * Gets current date to value.
   */
  get dateTo(): Date | null {
    return this._dateTo;
  }

  /**
   * Sets date to value.
   */
  set dateTo(value: Date | null) {
    this._dateTo = value;
    this.emitFilters();
  }

  /**
   * Initializes with default date range (today 00:00 to today 23:59).
   */
  ngOnInit(): void {
    const today = new Date();

    // From date: today at 00:00:00
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayStart.setHours(0, 0, 0, 0);

    // To date: today at 23:59:59
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayEnd.setHours(23, 59, 59, 999);

    this._dateFrom = todayStart;
    this._dateTo = todayEnd;
    this.emitFilters();
  }

  /**
   * Handles input changes from popover filters.
   */
  onFilterInputChange(): void {
    this.emitFilters();
  }

  /**
   * Clears all popover filters.
   */
  clearFilters(): void {
    this.minAge = undefined;
    this.maxAge = undefined;
    this.gender = null;
    this.analysisId = undefined;
    this.resultValue = null;
    this.emitFilters();
  }

  /**
   * Emits current filters.
   */
  private emitFilters(): void {
    this.filtersApplied.emit({
      startDate: this.dateFrom ?? undefined,
      endDate: this.dateTo ?? undefined,
      minAge: this.minAge,
      maxAge: this.maxAge,
      gender: this.gender || undefined,
      analysisId: this.analysisId,
      resultValue: this.resultValue || undefined
    });
  }
}

