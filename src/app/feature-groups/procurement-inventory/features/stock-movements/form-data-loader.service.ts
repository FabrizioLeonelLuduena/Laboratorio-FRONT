import { Injectable, inject } from '@angular/core';

import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { GenericSelectOption } from 'src/app/shared/components/generic-form/generic-form.component';

import { ResponseLocationDTO } from '../../models/locations/locations.model';
import { ResponseSupplierDTO } from '../../models/suppliers/suppliers.model';
import { SupplyDetailResponseDTO } from '../../models/supplies/supplies.model';
import { LocationsService } from '../../services/locations.service';
import { SuppliersService } from '../../services/suppliers.service';
import { SuppliesService } from '../../services/supplies/supplies.service';

/**
 * Interface for form data loader result
 */
export interface FormDataLoaderResult {
  suppliers: ResponseSupplierDTO[];
  supplies: SupplyDetailResponseDTO[];
  locations: ResponseLocationDTO[];
  supplierOptions: GenericSelectOption[];
  supplyOptions: GenericSelectOption[];
  locationOptions: GenericSelectOption[];
  errors: string[];
}

/**
 * Service for loading form dropdown data
 */
@Injectable({
  providedIn: 'root'
})
export class FormDataLoaderService {
  private suppliersService = inject(SuppliersService);
  private suppliesService = inject(SuppliesService);
  private locationsService = inject(LocationsService);

  /**
   * Load all form data in parallel
   */
  loadAllFormData(): Observable<FormDataLoaderResult> {
    return forkJoin({
      suppliers: this.loadSuppliers(),
      supplies: this.loadSupplies(),
      locations: this.loadLocations()
    }).pipe(
      map(({ suppliers, supplies, locations }) => ({
        suppliers: suppliers.data,
        supplies: supplies.data,
        locations: locations.data,
        supplierOptions: this.mapToSupplierOptions(suppliers.data),
        supplyOptions: this.mapToSupplyOptions(supplies.data),
        locationOptions: this.mapToLocationOptions(locations.data),
        errors: [
          ...suppliers.errors,
          ...supplies.errors,
          ...locations.errors
        ]
      }))
    );
  }

  /**
   * Load suppliers
   */
  private loadSuppliers(): Observable<{ data: ResponseSupplierDTO[]; errors: string[] }> {
    return this.suppliersService.getActiveSuppliers().pipe(
      map(suppliers => ({ data: suppliers, errors: [] })),
      catchError(() => of({
        data: [],
        errors: ['No se pudieron cargar los proveedores. Por favor, recargue la página e intente nuevamente.']
      }))
    );
  }

  /**
   * Load supplies
   */
  private loadSupplies(): Observable<{ data: SupplyDetailResponseDTO[]; errors: string[] }> {
    return this.suppliesService.searchSupplies({ isActive: true }).pipe(
      map(response => ({ data: response.content || [], errors: [] })),
      catchError(() => of({
        data: [],
        errors: ['No se pudieron cargar los insumos. Por favor, recargue la página e intente nuevamente.']
      }))
    );
  }

  /**
   * Load locations
   */
  private loadLocations(): Observable<{ data: ResponseLocationDTO[]; errors: string[] }> {
    return this.locationsService.getAllLocations({ isActive: true }).pipe(
      map(response => ({ data: response.content, errors: [] })),
      catchError(() => of({
        data: [],
        errors: ['No se pudieron cargar las ubicaciones. Por favor, recargue la página e intente nuevamente.']
      }))
    );
  }

  /**
   * Map suppliers to select options
   */
  private mapToSupplierOptions(suppliers: ResponseSupplierDTO[]): GenericSelectOption[] {
    return suppliers.map(s => ({
      label: s.companyName,
      value: s.id
    }));
  }

  /**
   * Map supplies to select options
   */
  private mapToSupplyOptions(supplies: SupplyDetailResponseDTO[]): GenericSelectOption[] {
    return supplies.map(s => ({
      label: s.name,
      value: s.id
    }));
  }

  /**
   * Map locations to select options
   */
  private mapToLocationOptions(locations: ResponseLocationDTO[]): GenericSelectOption[] {
    return locations.map(l => ({
      label: `${l.name} (${l.locationType})`,
      value: l.id
    }));
  }
}
