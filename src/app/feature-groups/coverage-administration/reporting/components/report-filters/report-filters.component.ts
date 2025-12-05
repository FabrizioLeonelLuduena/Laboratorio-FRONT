import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';

/**
 * Interface for report filter values.
 */
export interface ReportFilterValues {
  insurerId?: number;
  dateStart?: Date;
  dateEnd?: Date;
  siteId?: number;
  coverageType?: 'Obra Social'|'Prepaga'|'Particular';
  coverageId?: number;
  areas?: string[];
}

/**
 * Component for selecting report filters.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-report-filters',
  standalone: true,
  templateUrl: './report-filters.component.html',
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule
  ],
  styleUrls: ['./report-filters.component.css']
})
export class ReportFiltersComponent {
  @Input() insurerOptions: { label: string; value: number }[] = [];
  @Input() siteOptions: { label: string; value: number }[] = [];
  @Input() minDate?: Date;
  @Input() maxDate: Date = new Date();

  @Output() filtersChanged = new EventEmitter<ReportFilterValues>();

  selectedInsurer?: number;
  dateStart?: Date;
  dateEnd?: Date;
  siteId?: number;
  coverageType?: 'Obra Social'|'Prepaga'|'Particular';
  coverageId?: number;
  areas?: string[];

  /**
   * Emit the selected filters.
   */
  emitFilters(): void {
    this.filtersChanged.emit({
      insurerId: this.selectedInsurer,
      dateStart: this.dateStart,
      dateEnd: this.dateEnd,
      siteId: this.siteId,
      coverageType: this.coverageType,
      coverageId: this.coverageId,
      areas: this.areas
    });
  }

  /** Clears all filters and emits an empty selection */
  clearFilters(): void {
    this.selectedInsurer = undefined;
    this.dateStart = undefined;
    this.dateEnd = undefined;
    this.siteId = undefined;
    this.coverageType = undefined;
    this.coverageId = undefined;
    this.areas = undefined;
    this.emitFilters();
  }
}
