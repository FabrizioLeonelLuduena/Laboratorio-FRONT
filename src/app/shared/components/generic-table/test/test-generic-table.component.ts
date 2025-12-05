import { CommonModule } from '@angular/common';
import { Component, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Filter, FilterChangeEvent } from '../../../models/filter.model';
import { GenericTableComponent } from '../../generic-table/generic-table.component';

/**
 * 🧪 Prueba real de la tabla genérica
 * - Usa el componente <app-generic-table>
 * - Prueba filtros, buscador, exportación y fila expandida
 */
@Component({
  selector: 'app-test-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule, GenericTableComponent],
  templateUrl: './test-generic-table.component.html'
})
export class TestGenericTableComponent {
  /** Columnas básicas */
  columns = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'role', header: 'Rol', sortable: true },
    { field: 'is_active', header: 'Estado', sortable: true },
    { field: 'created_at', header: 'Fecha Alta', sortable: true }
  ];

  /** Datos mockeados con más información */
  data = [
    {
      id: 1,
      name: 'María Gómez',
      role: 'Admin',
      is_active: true,
      created_at: '2024-10-01',
      email: 'maria.gomez@example.com',
      phone: '+54 11 1234-5678',
      department: 'IT',
      location: 'Buenos Aires',
      salary: '$85,000',
      start_date: '2020-03-15',
      last_login: '2025-01-10 14:30',
      projects: 12
    },
    {
      id: 2,
      name: 'Juan Pérez',
      role: 'Manager',
      is_active: true,
      created_at: '2024-10-02',
      email: 'juan.perez@example.com',
      phone: '+54 11 8765-4321',
      department: 'Sales',
      location: 'Córdoba',
      salary: '$75,000',
      start_date: '2021-07-20',
      last_login: '2025-01-11 09:15',
      projects: 8
    },
    {
      id: 3,
      name: 'Lucía Martínez',
      role: 'Manager',
      is_active: true,
      created_at: '2024-10-03',
      email: 'lucia.martinez@example.com',
      phone: '+54 11 5555-6666',
      department: 'Marketing',
      location: 'Rosario',
      salary: '$80,000',
      start_date: '2019-11-10',
      last_login: '2025-01-11 16:45',
      projects: 10
    },
    {
      id: 4,
      name: 'Pedro Ramírez',
      role: 'User',
      is_active: false,
      created_at: '2024-10-04',
      email: 'pedro.ramirez@example.com',
      phone: '+54 11 9999-0000',
      department: 'HR',
      location: 'Mendoza',
      salary: '$50,000',
      start_date: '2022-02-01',
      last_login: '2024-11-15 11:20',
      projects: 3
    }
  ];

  /** Obtiene nombres únicos de los datos */
  private getUniqueNames(): string[] {
    const names = this.data.map(item => item.name);
    return [...new Set(names)];
  }

  /** Filtros (estado y rol) */
  filters: Filter[] = [
    {
      id: 'is_active',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Activos', value: true },
        { label: 'Inactivos', value: false }
      ]
    },
    {
      id: 'role',
      label: 'Rol',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Admin', value: 'Admin' },
        { label: 'User', value: 'User' },
        { label: 'Manager', value: 'Manager' }
      ]
    },
    {
      id: 'name',
      label: 'Nombre',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        ...this.getUniqueNames().map(name => ({ label: name, value: name }))
      ]
    }
  ];

  /** Resultado filtrado (como señal para detección de cambios) */
  filteredData = signal(structuredClone(this.data));

  /** Referencia a la tabla */
  @ViewChild(GenericTableComponent) table!: GenericTableComponent;

  /**
   * 🔍 Filtra los datos según los filtros activos
   */
  onFilterChange(event: FilterChangeEvent): void {
    const activeFilters = event.filters;

    const filtered = this.data.filter(item => {
      return activeFilters.every(f => {
        const value = f.value;
        if (value === null || value === undefined) return true;
        return item[f.id as keyof typeof item] === value;
      });
    });
    this.filteredData.set(filtered);
  }

  /**
   * Acciones del menú contextual
   */
  getActionsForRow(row: any) {
    const actions = [
      { id: 'view', label: 'Ver', icon: 'pi pi-eye', command: () => alert(`👁️ Ver ${row.name}`) },
      { id: 'edit', label: 'Editar', icon: 'pi pi-pencil', command: () => alert(`✏️ Editar ${row.name}`) },
      { id: 'delete', label: 'Eliminar', icon: 'pi pi-trash', command: () => alert(`🗑️ Eliminar ${row.name}`) }
    ];

    //  Ejemplo: fila inactiva → reemplazar por acción de reactivar
    if (!row.is_active) {
      return [
        { id: 'view', label: 'Ver', icon: 'pi pi-eye', command: () => alert(`👁️ Ver ${row.name}`) },
        { id: 'reactivate', label: 'Reactivar', icon: 'pi pi-refresh', command: () => alert(`🔄 Reactivar ${row.name}`) }
      ];
    }

    return actions;
  }
}
