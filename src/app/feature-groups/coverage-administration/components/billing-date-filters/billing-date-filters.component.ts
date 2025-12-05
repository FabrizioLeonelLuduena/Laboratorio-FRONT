import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';

/** Filters payload for billing reports. */
export interface BillingDateFilters {
  dateFrom: Date;
  dateTo: Date;
}

/** Date filter component for billing reports with automatic requery. */
@Component({
  selector: 'app-billing-date-filters',
  imports: [CommonModule, DatePickerModule, FormsModule],
  templateUrl: './billing-date-filters.component.html',
  styleUrl: './billing-date-filters.component.css'
})
export class BillingDateFiltersComponent {
  @Output() filtersChanged = new EventEmitter<BillingDateFilters>();

  // Filter signals for reactive updates
  dateFrom = signal<Date>(this.getOneMonthAgo());
  dateTo = signal<Date>(new Date());

  readonly maxDate = new Date();

  /**
   * Constructor - sets up reactive filter changes
   */
  constructor() {
    // Emit filter changes whenever dates change
    effect(() => {
      const from = this.dateFrom();
      const to = this.dateTo();
      this.filtersChanged.emit({ dateFrom: from, dateTo: to });
    });
  }

  /**
   * Handle dateFrom change
   */
  onDateFromChange(date: Date | null): void {
    if (date) {
      this.dateFrom.set(date);
    }
  }

  /**
   * Handle dateTo change
   */
  onDateToChange(date: Date | null): void {
    if (date) {
      this.dateTo.set(date);
    }
  }

  /**
   * Gets the date one month ago from today
   */
  private getOneMonthAgo(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  }
}