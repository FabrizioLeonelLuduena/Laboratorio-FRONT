import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';

import { BranchService } from '../../../care-management/services/branch.service';
import { InsurerService } from '../../services/insurer.service';

/** Filters payload for coverage reports and dashboard. */
export interface CoverageDateFilters {
  dateFrom: Date;
  dateTo: Date;
  branchId?: number | null;
  insurerId?: number | null;
  insurerType?: string | null;
}

/** Date and coverage filter component with automatic requery and backend data. */
@Component({
  selector: 'app-coverage-date-filters',
  imports: [CommonModule, DatePickerModule, DropdownModule, FormsModule],
  templateUrl: './coverage-date-filters.component.html',
  styleUrl: './coverage-date-filters.component.css'
})
export class CoverageDateFiltersComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<CoverageDateFilters>();

  // Services
  private branchService = inject(BranchService);
  private insurerService = inject(InsurerService);

  // Filter signals for reactive updates
  dateFrom = signal<Date>(this.getOneMonthAgo());
  dateTo = signal<Date>(new Date());
  branchId = signal<number | null>(null);
  insurerId = signal<number | null>(null);
  insurerType = signal<string | null>(null);

  // Dropdown options
  branchOptions: { label: string; value: number }[] = [];
  insurerOptions: { label: string; value: number }[] = [];
  insurerTypeOptions: { label: string; value: string }[] = [];

  readonly maxDate = new Date();

  /**
   * Constructor - sets up reactive filter changes
   */
  constructor() {
    // Emit filter changes whenever any filter changes
    effect(() => {
      const from = this.dateFrom();
      const to = this.dateTo();
      const branch = this.branchId();
      const insurer = this.insurerId();
      const insurerType = this.insurerType();

      this.filtersChanged.emit({
        dateFrom: from,
        dateTo: to,
        branchId: branch,
        insurerId: insurer,
        insurerType: insurerType
      });
    });
  }

  /**
   * On init - load dropdown options
   */
  ngOnInit(): void {
    this.loadBranchOptions();
    this.loadInsurerOptions();
    this.loadInsurerTypeOptions();
  }

  /**
   * Load branch options from backend
   */
  private loadBranchOptions(): void {
    this.branchService.getBranchOptions().subscribe({
      next: (branches) => {
        this.branchOptions = [
          { label: 'Todas las sucursales', value: null as any },
          ...branches.map(b => ({ label: b.description, value: b.id }))
        ];
      },
      error: () => {
        this.branchOptions = [{ label: 'Todas las sucursales', value: null as any }];
      }
    });
  }

  /**
   * Load insurer options from backend
   */
  private loadInsurerOptions(): void {
    this.insurerService.getActiveInsurers().subscribe({
      next: (insurers) => {
        this.insurerOptions = [
          { label: 'Todas las aseguradoras', value: null as any },
          ...insurers.map(i => ({ label: i.name, value: i.id }))
        ];
      },
      error: () => {
        this.insurerOptions = [{ label: 'Todas las aseguradoras', value: null as any }];
      }
    });
  }

  /**
   * Load insurer type options from backend
   */
  private loadInsurerTypeOptions(): void {
    this.insurerService.getAllInsurerTypes().subscribe({
      next: (types) => {
        this.insurerTypeOptions = [
          { label: 'Todos los tipos', value: null as any },
          ...types.map(t => ({ label: t.description, value: t.name }))
        ];
      },
      error: () => {
        this.insurerTypeOptions = [{ label: 'Todos los tipos', value: null as any }];
      }
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
   * Handle branch change
   */
  onBranchChange(branchId: number | null): void {
    this.branchId.set(branchId);
  }

  /**
   * Handle insurer change
   */
  onInsurerChange(insurerId: number | null): void {
    this.insurerId.set(insurerId);
  }

  /**
   * Handle insurer type change
   */
  onInsurerTypeChange(insurerType: string | null): void {
    this.insurerType.set(insurerType);
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
