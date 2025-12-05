import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

/**
 *
 */
@Component({
  selector: 'app-appointments-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, MultiSelectModule, DropdownModule],
  templateUrl: './appointments-filters.component.html'
})
export class AppointmentsFiltersComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<any>();

  date: string = new Date().toISOString().slice(0, 10);
  branchId?: number;
  status: string[] = [];
  searchCriteria: string = '';
  searchTimeout: any;

  branchOptions = [
    { id: 1, name: 'Sucursal Central Córdoba' },
    { id: 2, name: 'Sucursal Norte' }
  ];

  statusOptions = [
    { label: 'Re Agendado', value: 'SCHEDULED' },
    { label: 'Confirmado', value: 'CONFIRMED' },
    { label: 'En Progreso', value: 'IN_PROGRESS' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' }
  ];

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  ngOnInit(): void {
    this.applyFilters();
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  applyFilters(): void {
    this.filtersChanged.emit({
      date: this.date || undefined,
      branchId: this.branchId || undefined,
      status: this.status.length ? this.status : undefined,
      searchCriteria: this.searchCriteria || undefined
    });
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  clearFilters(): void {
    this.date = new Date().toISOString().slice(0, 10);
    this.branchId = undefined;
    this.status = [];
    this.searchCriteria = '';
    this.filtersChanged.emit({ date: this.date });
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  onSearchCriteriaChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      if (this.searchCriteria.length === 0) {
        this.applyFilters();
      } else if (this.searchCriteria.length >= 3) {
        this.applyFilters();
      }
    }, 300);
  }

  // eslint-disable-next-line jsdoc/require-description
  /**
   *
   */
  onAnyFilterChange(): void {
    this.applyFilters();
  }
}
