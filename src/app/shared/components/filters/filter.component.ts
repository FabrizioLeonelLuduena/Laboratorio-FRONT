import { CommonModule } from '@angular/common';
import { Component, input, output, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { PopoverModule } from 'primeng/popover';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Select } from 'primeng/select';

import { Filter, FilterChangeEvent, FilterOption } from '../../models/filter.model';
import { GenericButtonComponent } from '../generic-button/generic-button.component';

/**
 *  Componente genérico de filtros
 * - Puede aplicar filtros automáticamente o manualmente con botón "Filtrar"
 * - Muestra contador rojo con la cantidad de filtros activos.
 * - Incluye botón "Limpiar" con fondo blanco y borde
 */
@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    CommonModule,
    GenericButtonComponent,
    DividerModule,
    PopoverModule,
    RadioButtonModule,
    DropdownModule,
    FormsModule,
    DatePickerModule,
    Select
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent {
  /** Filtros disponibles */
  filters = input<Filter[]>([]);

  /**
   * Modo de aplicación de filtros:
   * - true: los filtros se aplican automáticamente al cambiar (default)
   * - false: los filtros se aplican solo al presionar el botón "Filtrar"
   */
  autoApply = input<boolean>(true);

  /** Estado local interno */
  localFilters = signal<Filter[]>([]);

  /** Emisor de cambios */
  filterChange = output<FilterChangeEvent>();

  /** Contador de filtros activos (excluye opciones con value null como "Todos") */
  filtersCount = computed(() =>
    this.localFilters().reduce((count, f) => {
      if (f.type === 'dateRange') {
        // Cuenta como activo si tiene al menos una fecha
        return count + (f.dateFrom || f.dateTo ? 1 : 0);
      }
      const activeOption = f.options?.find((opt) => opt.active);
      const hasRealFilter = activeOption && activeOption.value !== null && activeOption.value !== undefined;
      return count + (hasRealFilter ? 1 : 0);
    }, 0)
  );

  /**
   * Constructor
   */
  constructor() {
    effect(() => {
      const data = this.filters();
      if (data && data.length > 0) {
        this.localFilters.set(structuredClone(data));
      }
    });
  }

  /**
   * Obtiene el valor de la opción activa para un filtro (usado en dropdowns y radio buttons)
   */
  getActiveOptionValue(filter: Filter): string | number | boolean | null {
    const opt = filter.options?.find(o => o.active);
    return (opt?.value ?? null) as any;
  }

  /**
   * Obtiene la opción activa completa para radio buttons
   */
  getActiveOption(filter: Filter): FilterOption | undefined {
    return filter.options?.find(o => o.active);
  }

  /**
   * Maneja cambio de opción (radio)
   */
  onFilterChange(filterId: string, value: string | number | boolean | null): void {
    const updated = this.localFilters().map((f) => {
      if (f.id === filterId && f.options) {
        return {
          ...f,
          options: f.options.map((opt) => ({
            ...opt,
            active: opt.value === value
          }))
        };
      }
      return f;
    });

    this.localFilters.set(updated);
    if (this.autoApply()) {
      this.emitFilterChange(updated);
    }
  }

  /**
   * Maneja cambio de opción (dropdown)
   */
  onSelectChange(filter: Filter, event: { value: string | number | boolean | null }): void {
    const selectedValue = event.value;

    const updated = this.localFilters().map((f) => {
      if (f.id === filter.id && f.options) {
        return {
          ...f,
          options: f.options.map((opt) => ({
            ...opt,
            active: opt.value === selectedValue
          }))
        };
      }
      return f;
    });

    this.localFilters.set(updated);
    if (this.autoApply()) {
      this.emitFilterChange(updated);
    }
  }

  /**
   * Maneja cambio de fecha desde
   */
  onDateFromChange(filter: Filter, value: Date | null): void {
    const updated = this.localFilters().map((f) => {
      if (f.id === filter.id) {
        return { ...f, dateFrom: value };
      }
      return f;
    });

    this.localFilters.set(updated);
    if (this.autoApply()) {
      this.emitFilterChange(updated);
    }
  }

  /**
   * Maneja cambio de fecha hasta
   */
  onDateToChange(filter: Filter, value: Date | null): void {
    const updated = this.localFilters().map((f) => {
      if (f.id === filter.id) {
        return { ...f, dateTo: value };
      }
      return f;
    });

    this.localFilters.set(updated);
    if (this.autoApply()) {
      this.emitFilterChange(updated);
    }
  }

  /**
   * Aplica los filtros manualmente (usado cuando autoApply es false)
   */
  applyFilters(): void {
    this.emitFilterChange(this.localFilters());
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    const cleared = this.localFilters().map((f) => ({
      ...f,
      options: f.options?.map((o) => ({ ...o, active: false })),
      dateFrom: null,
      dateTo: null
    }));
    this.localFilters.set(cleared);
    this.filterChange.emit({ filters: [], activeCount: 0 });
  }

  /**
   * Emite el evento con todos los filtros activos
   */
  private emitFilterChange(updated: Filter[]): void {
    const activeFilters = updated
      .map((f) => {
        if (f.type === 'dateRange') {
          return {
            id: f.id,
            value: null,
            dateFrom: f.dateFrom ?? null,
            dateTo: f.dateTo ?? null
          };
        }
        return {
          id: f.id,
          value: f.options?.find((o) => o.active)?.value ?? null
        };
      })
      .filter((f) => {
        if (f.dateFrom || f.dateTo) return true;
        return f.value !== null && f.value !== undefined;
      });

    this.filterChange.emit({
      filters: activeFilters,
      activeCount: this.filtersCount()
    });
  }
}
