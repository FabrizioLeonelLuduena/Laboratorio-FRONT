import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { DatePickerModule } from 'primeng/datepicker';
import { forkJoin, of } from 'rxjs';

import { catchError, map } from 'rxjs/operators';

import { FilterComponent } from '../../../../../shared/components/filters/filter.component';
import { Filter, FilterChangeEvent, FilterOption } from '../../../../../shared/models/filter.model';
import { ResponseLocationDTO } from '../../../models/locations/locations.model';
import { ResponseSupplierDTO } from '../../../models/suppliers/suppliers.model';
import { SupplyDetailResponseDTO } from '../../../models/supplies/supplies.model';
import { LocationsService } from '../../../services/locations.service';
import { SuppliersService } from '../../../services/suppliers.service';
import { SuppliesService } from '../../../services/supplies/supplies.service';
import { ReportingFilters } from '../../models/reporting-metrics.model';

/**
 * Component for reporting filters.
 * Includes date range visible and provider, location, and supply filters in a popover.
 */
@Component({
  selector: 'app-reporting-filters',
  standalone: true,
  imports: [
    CommonModule,
    DatePickerModule,
    FilterComponent,
    FormsModule
  ],
  templateUrl: './reporting-filters.component.html'
})
export class ReportingFiltersComponent implements OnInit {
  /** Metric type to determine which filters to show */
  @Input() metricType: string | null = null;
  
  /** Emits when filters are applied */
  @Output() filtersApplied = new EventEmitter<ReportingFilters>();

  private readonly suppliersService = inject(SuppliersService);
  private readonly locationsService = inject(LocationsService);
  private readonly suppliesService = inject(SuppliesService);

  /** Current filter values */
  filters = signal<ReportingFilters>({
    dateFrom: null,
    dateTo: null,
    provider: null,
    location: null,
    supply: null
  });

  /** Maximum date (today) */
  readonly maxDate = new Date();

  /** All available filters */
  private readonly allFilters = signal<Filter[]>([
    {
      id: 'provider',
      label: 'Proveedor',
      type: 'select',
      options: [{ label: 'Todos', value: null, active: true }]
    },
    {
      id: 'location',
      label: 'Ubicación',
      type: 'select',
      options: [{ label: 'Todas', value: null, active: true }]
    },
    {
      id: 'supply',
      label: 'Insumo',
      type: 'select',
      options: [{ label: 'Todos', value: null, active: true }]
    }
  ]);

  /** Filters visible in popover based on metric type */
  readonly popoverFilters = computed(() => {
    const metric = this.metricType;
    const filters = this.allFilters();
    
    // KPIs con filtro de proveedor: purchase-volume, delivery-time, created-orders, return-rate
    if (metric === 'purchase-volume' || metric === 'delivery-time' || 
        metric === 'created-orders' || metric === 'return-rate') {
      return filters.filter(f => f.id === 'provider');
    }
    
    // KPIs con filtro de ubicación: transfers, outputs
    if (metric === 'transfers' || metric === 'outputs') {
      return filters.filter(f => f.id === 'location');
    }
    
    // KPI sin filtros adicionales: transfer-time
    if (metric === 'transfer-time') {
      return [];
    }
    
    // top-supplies tiene ubicación y proveedor
    if (metric === 'top-supplies') {
      return filters.filter(f => f.id === 'location' || f.id === 'provider');
    }
    
    // Por defecto, mostrar todos
    return filters;
  });

  /** Current date from value */
  get dateFrom(): Date | null {
    return this.filters().dateFrom ?? null;
  }

  /**
   * Sets the date from value and emits filters
   */
  set dateFrom(value: Date | null) {
    this.filters.set({ ...this.filters(), dateFrom: value });
    this.emitFilters();
  }

  /** Current date to value */
  get dateTo(): Date | null {
    return this.filters().dateTo ?? null;
  }

  /**
   * Sets the date to value and emits filters
   */
  set dateTo(value: Date | null) {
    this.filters.set({ ...this.filters(), dateTo: value });
    this.emitFilters();
  }

  /**
   * Initializes the component without default filters
   */
  ngOnInit(): void {
    this.loadFilterOptions();
    // Emit initial empty filters to trigger data load
    this.emitFilters();
  }


  /**
   * Handles filter changes from the popover component
   */
  onFilterChange(event: FilterChangeEvent): void {
    const updatedFilters: ReportingFilters = {
      ...this.filters(),
      provider: null,
      location: null,
      supply: null
    };

    event.filters.forEach((filter: { id: string; value: string | number | boolean | null }) => {
      if (filter.id === 'provider') {
        updatedFilters.provider = (filter.value as string | number | null) ?? null;
      } else if (filter.id === 'location') {
        updatedFilters.location = (filter.value as string | number | null) ?? null;
      } else if (filter.id === 'supply') {
        updatedFilters.supply = (filter.value as string | number | null) ?? null;
      }
    });

    // Si no hay filtros activos, resetear a null
    if (event.filters.length === 0) {
      updatedFilters.provider = null;
      updatedFilters.location = null;
      updatedFilters.supply = null;
      this.resetFilterSelections();
    }

    this.filters.set(updatedFilters);
    this.emitFilters();
  }

  /**
   * Emits the current filters
   */
  private emitFilters(): void {
    this.filtersApplied.emit(this.filters());
  }

  /**
   * Loads filter options from backend services.
   */
  private loadFilterOptions(): void {
    forkJoin({
      suppliers: this.suppliersService.getActiveSuppliers().pipe(
        catchError(() => of<ResponseSupplierDTO[]>([]))
      ),
      locations: this.locationsService.getActiveLocations().pipe(
        catchError(() => of<ResponseLocationDTO[]>([]))
      ),
      supplies: this.suppliesService.searchSupplies({ isActive: true, page: 0, size: 100 }).pipe(
        map((response) => response.content ?? []),
        catchError(() => of<SupplyDetailResponseDTO[]>([]))
      )
    }).subscribe(({ suppliers, locations, supplies }) => {
      this.updateFilterOptions(
        'provider',
        suppliers.map((supplier) => ({
          label: supplier.companyName,
          value: supplier.id
        })),
        'Todos'
      );
      this.updateFilterOptions(
        'location',
        locations.map((location) => ({
          label: location.name,
          value: location.id
        })),
        'Todas'
      );
      this.updateFilterOptions(
        'supply',
        supplies.map((supply) => ({
          label: supply.name,
          value: supply.id
        })),
        'Todos'
      );
    });
  }

  /**
   * Updates the available options for a specific filter while keeping the current selection.
   */
  private updateFilterOptions(filterId: string, options: FilterOption[], defaultLabel: string): void {
    const selectedValue = this.getSelectedValue(filterId);

    this.allFilters.update((filters) =>
      filters.map((filter) => {
        if (filter.id !== filterId) {
          return filter;
        }

        const optionList: FilterOption[] = [
          {
            label: defaultLabel,
            value: null,
            active: selectedValue === null || selectedValue === undefined
          },
          ...options.map((option) => ({
            ...option,
            active: selectedValue !== null && selectedValue !== undefined && option.value === selectedValue
          }))
        ];

        return {
          ...filter,
          options: optionList
        };
      })
    );
  }

  /**
   * Retrieves the currently selected value for the given filter.
   */
  private getSelectedValue(filterId: string): string | number | null | undefined {
    const currentFilters = this.filters();
    if (filterId === 'provider') return currentFilters.provider ?? null;
    if (filterId === 'location') return currentFilters.location ?? null;
    if (filterId === 'supply') return currentFilters.supply ?? null;
    return null;
  }

  /**
   * Resets filter options to their default ("Todos") state.
   */
  private resetFilterSelections(): void {
    this.allFilters.update((filters) =>
      filters.map((filter) => ({
        ...filter,
        options: filter.options?.map((option) => ({
          ...option,
          active: option.value === null
        }))
      }))
    );
  }
}

