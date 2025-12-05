import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DropdownModule } from 'primeng/dropdown';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { of } from 'rxjs';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';

import { catchError, timeout } from 'rxjs/operators';

import { ResponseLocationDTO } from '../../../models/locations/locations.model';
import { SupplyDetailResponseDTO } from '../../../models/supplies/supplies.model';
import { LocationsService } from '../../../services/locations.service';
import {
  SupplyThresholdsService,
  RequestStockThresholdDTO,
  ResponseStockThresholdDTO,
  StockThresholdResponseDTO
} from '../../../services/supply-thresholds.service';

/**
 * Interface para la configuración del modal
 */
export interface ThresholdsModalConfig {
  supply: SupplyDetailResponseDTO;
}

/**
 * Componente modal para gestionar umbrales de stock por ubicación
 * Muestra todas las ubicaciones activas y permite establecer stock mínimo y máximo
 */
@Component({
  selector: 'app-thresholds-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputNumberModule, DropdownModule, GenericButtonComponent],
  template: `
    <div class="thresholds-modal">
      <!-- Información del insumo -->
      <div class="supply-info">
        <h3 class="supply-name">{{ supply().name }}</h3>
        <p class="supply-category">{{ supply().categoryName }}</p>
      </div>

      <!-- Loading state -->
      @if (loading()) {
        <div class="loading-container">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary-color);"></i>
          <p>Cargando ubicaciones...</p>
        </div>
      }

      <!-- Error/Success state -->
      @if (error()) {
        <div class="message-container" [ngClass]="error()?.startsWith('✓') ? 'success-container' : 'error-container'">
          <i [class]="error()?.startsWith('✓') ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" 
             [style.font-size]="'1.5rem'" 
             [style.color]="error()?.startsWith('✓') ? 'var(--green-500)' : 'var(--red-500)'"></i>
          <p>{{ error() }}</p>
        </div>
      }

      <!-- Dropdown de ubicaciones y formulario -->
      @if (!loading() && !error() && availableLocations().length > 0) {
        <div class="threshold-form">
          <!-- Dropdown de ubicaciones -->
          <div class="form-group">
            <label for="location-select" class="form-label">
                <i class="pi pi-map-marker"></i>
              Seleccione una ubicación
            </label>
            <p-dropdown
              id="location-select"
              [(ngModel)]="selectedLocation"
              [options]="availableLocations()"
              optionLabel="name"
              placeholder="Seleccione una ubicación"
              [filter]="true"
              filterPlaceholder="Buscar ubicación"
              [showClear]="true"
              (onChange)="onLocationChange()"
              styleClass="w-full">
              <ng-template let-location pTemplate="item">
                <div class="location-option">
                  <span class="location-path">{{ location.name }}</span>
                </div>
              </ng-template>
            </p-dropdown>
              </div>

          <!-- Campos de umbrales (siempre visibles) -->
          <div class="threshold-fields">
            <div class="form-group">
              <label for="minimum-stock" class="form-label">
                Stock mínimo
              </label>
                <p-inputNumber
                id="minimum-stock"
                [ngModel]="currentThreshold().minimumStock"
                (ngModelChange)="updateMinimumStock($event)"
                  [min]="0"
                [max]="1000000"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  placeholder="0"
                [inputStyle]="{ width: '100%', textAlign: 'right' }"
                [disabled]="!selectedLocation"
                decrementButtonClass="p-button-sm"
                incrementButtonClass="p-button-sm">
                </p-inputNumber>
              @if (!selectedLocation) {
                <small class="field-hint">Seleccione una ubicación para configurar el umbral</small>
              }
              </div>

            <div class="form-group">
              <label for="maximum-stock" class="form-label">
                Stock máximo
              </label>
                <p-inputNumber
                id="maximum-stock"
                [ngModel]="currentThreshold().maximumStock"
                (ngModelChange)="updateMaximumStock($event)"
                [min]="0"
                  [max]="1000000"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  placeholder="0"
                [inputStyle]="{ width: '100%', textAlign: 'right' }"
                [disabled]="!selectedLocation"
                decrementButtonClass="p-button-sm"
                incrementButtonClass="p-button-sm">
                </p-inputNumber>
              @if (!selectedLocation) {
                <small class="field-hint">Seleccione una ubicación para configurar el umbral</small>
              }
            </div>
          </div>
        </div>
      }

      <!-- No locations message -->
      @if (!loading() && !error() && availableLocations().length === 0) {
        <div class="empty-container">
          <i class="pi pi-inbox" style="font-size: 2rem; color: var(--gray-400);"></i>
          <p>No hay ubicaciones activas disponibles</p>
        </div>
      }

      <!-- Actions con GenericButton -->
      <div class="modal-actions">
        <app-generic-button
          type="cancel"
          [disabled]="saving()"
          (pressed)="onCancel()"
        ></app-generic-button>

        <app-generic-button
          [text]="saving() ? 'Guardando...' : 'Guardar'"
          type="save"
          [disabled]="loading() || error() !== null || saving() || !selectedLocation || !isThresholdValid()"
          (pressed)="onSave()"
        ></app-generic-button>
      </div>
    </div>
  `,
  styles: [`
    .thresholds-modal {
      padding: 1.5rem;
      width: 100%;
      max-width: 750px;
    }

    .supply-info {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .supply-name {
      margin: 0 0 0.5rem 0;
      color: var(--text-color);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .supply-category {
      margin: 0;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }

    .loading-container,
    .message-container,
    .error-container,
    .success-container,
    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      gap: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .error-container {
      background-color: var(--red-50);
      border: 1px solid var(--red-200);
    }

    .success-container {
      background-color: var(--green-50);
      border: 1px solid var(--green-200);
    }

    .loading-container p,
    .message-container p,
    .error-container p,
    .success-container p,
    .empty-container p {
      margin: 0;
      color: var(--text-color);
      text-align: center;
    }

    .threshold-form {
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .form-label i {
      color: var(--primary-color);
    }

    .location-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }

    .location-path {
      font-size: 0.875rem;
      flex: 1;
    }

    .threshold-badge-small {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.375rem;
      background-color: var(--green-50);
      color: var(--green-700);
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .threshold-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
      padding: 1rem;
      background-color: var(--surface-50);
      border-radius: 6px;
      border: 1px solid var(--surface-border);
    }

    .field-hint {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      font-style: italic;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-border);
    }

  `]
})
export class ThresholdsModalComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig<ThresholdsModalConfig>);
  private thresholdsService = inject(SupplyThresholdsService);
  private locationsService = inject(LocationsService);
  private cdr = inject(ChangeDetectorRef);

  // Signals
  supply = signal<SupplyDetailResponseDTO>({} as SupplyDetailResponseDTO);
  availableLocations = signal<ResponseLocationDTO[]>([]);
  selectedLocation: ResponseLocationDTO | null = null;
  currentThreshold = signal<{ minimumStock: number; maximumStock: number; thresholdId?: number }>({
    minimumStock: 0,
    maximumStock: 0
  });
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  /**
   * Inicializa el componente y carga los datos necesarios
   */
  ngOnInit(): void {
    // eslint-disable-next-line no-console -- Debug log for modal initialization
    console.log('ThresholdsModalComponent initialized with config:', this.config);
    
    if (this.config.data?.supply) {
      const supply = this.config.data.supply;
      // eslint-disable-next-line no-console -- Debug log for supply data
      console.log('Supply received in modal:', supply);
      
      if (!supply.id) {
        this.error.set('El insumo no tiene un ID válido');
        this.loading.set(false);
        return;
      }
      
      this.supply.set(supply);
      this.loadLocationsForSupply();
    } else {
      // eslint-disable-next-line no-console -- Error log for missing supply data
      console.error('No supply data provided to modal');
      this.error.set('No se proporcionó información del insumo');
      this.loading.set(false);
    }
  }

  /**
   * Carga todas las ubicaciones activas (independientemente del insumo)
   * GET /api/v1/stock/locations/actives
   */
  private loadLocationsForSupply(): void {
    this.loading.set(true);
    this.error.set(null);

    // eslint-disable-next-line no-console -- Debug log for loading locations
    console.log('Loading all active locations');

    this.locationsService.getActiveLocations().subscribe({
      next: (locations: ResponseLocationDTO[]) => {
        // eslint-disable-next-line no-console -- Debug log for received locations
        console.log('Active locations received:', locations);
        
        this.availableLocations.set(locations);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        // eslint-disable-next-line no-console -- Error log for location loading failure
        console.error('Error loading locations:', error);
        
        let errorMessage = 'Error al cargar las ubicaciones. Por favor, intente nuevamente.';
        
        // ERR_EMPTY_RESPONSE o conexión fallida
        if (error.status === 0 || error.status === null) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique que el backend esté corriendo en el puerto 8011 y que el proxy esté configurado correctamente.';
        } else if (error.status === 404) {
          errorMessage = 'El endpoint no fue encontrado. Verifique que el backend tenga implementado el endpoint GET /api/v1/stock/locations/actives';
        } else if (error.status === 403 || error.status === 401) {
          errorMessage = 'No tiene permisos para acceder a esta información. Verifique que tenga el rol MANAGER_STOCK o ADMINISTRADOR.';
        } else if (error.status === 500) {
          const backendError = error.error?.message || error.error?.error || 'Error desconocido';
          errorMessage = `Error interno del servidor: ${backendError}. Verifique los logs del backend para más detalles.`;
          // eslint-disable-next-line no-console -- Log backend 500 error details for debugging
          console.error('Backend 500 error details:', error.error);
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Maneja el cambio de ubicación seleccionada
   * Verifica si ya existe un umbral para esta combinación insumo-ubicación
   */
  onLocationChange(): void {
    if (!this.selectedLocation) {
      this.currentThreshold.set({ minimumStock: 0, maximumStock: 0 });
      return;
    }

    // Cargar el umbral existente para esta combinación insumo-ubicación
    this.loadExistingThreshold();
  }

  /**
   * Carga el umbral existente para la combinación insumo-ubicación seleccionada
   * GET /api/v1/stock/stock-thresholds/supply/{supplyId}/location/{locationId}
   */
  private loadExistingThreshold(): void {
    if (!this.selectedLocation) return;

    const supplyId = this.supply().id;
    const locationId = this.selectedLocation.id;

    this.thresholdsService.getThresholdBySupplyAndLocation(supplyId, locationId).subscribe({
      next: (threshold: ResponseStockThresholdDTO | null) => {
        if (threshold) {
          // Si existe umbral, precargar los valores
          this.currentThreshold.set({
            minimumStock: threshold.minimumStock ?? 0,
            maximumStock: threshold.maximumStock ?? 0,
            thresholdId: threshold.id
          });
        } else {
          // Si no existe umbral, mostrar campos vacíos
          this.currentThreshold.set({
            minimumStock: 0,
            maximumStock: 0
          });
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        // Service already handles 404 and returns null, so this error shouldn't occur
        // but we handle it just in case
        // eslint-disable-next-line no-console -- Error log for unexpected threshold loading failure
        console.error('Error loading existing threshold:', error);
        this.error.set('Error al verificar umbral existente. Puede continuar configurando uno nuevo.');
        this.currentThreshold.set({
          minimumStock: 0,
          maximumStock: 0
        });
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Actualiza el stock mínimo
   */
  updateMinimumStock(value: number): void {
    const current = this.currentThreshold();
    const newMinimum = value ?? 0;
    
    this.currentThreshold.set({
      ...current,
      minimumStock: newMinimum
    });
    
    // Clear error if values are now valid
    if (current.maximumStock > 0 && newMinimum > 0 && newMinimum < current.maximumStock) {
      this.error.set(null);
    }
  }

  /**
   * Actualiza el stock máximo
   */
  updateMaximumStock(value: number): void {
    const current = this.currentThreshold();
    const newMaximum = value ?? 0;
    
    this.currentThreshold.set({
      ...current,
      maximumStock: newMaximum
    });
    
    // Clear error if values are now valid
    if (current.minimumStock > 0 && newMaximum > 0 && current.minimumStock < newMaximum) {
      this.error.set(null);
    }
  }

  /**
   * Valida que el umbral actual sea válido
   */
  isThresholdValid(): boolean {
    const threshold = this.currentThreshold();
    return threshold.minimumStock > 0 && 
           threshold.maximumStock > 0 && 
           threshold.minimumStock < threshold.maximumStock;
  }

  /**
   * Cancela la operación y cierra el modal
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Guarda el umbral para la ubicación seleccionada
   * Si hasThreshold es true, hace PUT, si no POST
   * No cierra el modal, permite continuar configurando otras ubicaciones
   */
  onSave(): void {
    this.error.set(null);

    if (!this.selectedLocation) {
      this.error.set('Debe seleccionar una ubicación');
      return;
    }

    const threshold = this.currentThreshold();

    // Validar valores
    if (threshold.minimumStock < 0 || threshold.maximumStock < 0) {
      this.error.set('Los valores deben ser mayores o iguales a 0');
      return;
    }

    if (threshold.minimumStock === 0 || threshold.maximumStock === 0) {
      this.error.set('Debe configurar valores mínimo y máximo mayores a 0');
      return;
    }

    if (threshold.minimumStock >= threshold.maximumStock) {
      this.error.set('El stock mínimo debe ser menor que el stock máximo');
      return;
    }

    this.saving.set(true);
    this.saveThreshold();
  }

  /**
   * Guarda o actualiza el umbral para la ubicación seleccionada
   */
  private saveThreshold(): void {
    if (!this.selectedLocation) {
      this.saving.set(false);
      this.error.set('No hay ubicación seleccionada');
      return;
    }

    const supplyId = this.supply().id;
    const threshold = this.currentThreshold();
    
    const data: RequestStockThresholdDTO = {
      supplyId,
      locationId: this.selectedLocation.id,
      minimumStock: threshold.minimumStock,
      maximumStock: threshold.maximumStock
    };

    // Si tiene threshold configurado, actualizar; si no, crear
    const operation = threshold.thresholdId
      ? this.thresholdsService.updateThreshold(threshold.thresholdId, data)
      : this.thresholdsService.createThreshold(data);

    operation.pipe(
      timeout(30000), // 30 seconds timeout
      catchError(error => {
        // eslint-disable-next-line no-console -- Error log for threshold save operation
        console.error(`Error ${threshold.thresholdId ? 'updating' : 'creating'} threshold:`, error);
        
        let errorMessage = 'Error desconocido';
        
        // Error de timeout
        if (error.name === 'TimeoutError') {
          errorMessage = 'La operación tardó demasiado tiempo. El servidor puede estar sobrecargado. Intente nuevamente.';
        }
        // Error 500 - Internal Server Error
        else if (error.status === 500) {
          const backendError = error.error?.error || error.error?.message || '';
          if (backendError.includes('OutOfMemoryError') || backendError.includes('heap space')) {
            errorMessage = 'Error del servidor: Memoria insuficiente (Java heap space). Contacte al administrador del sistema para aumentar la memoria del servidor.';
          } else {
            errorMessage = `Error interno del servidor (500): ${backendError || 'Error desconocido'}`;
          }
        }
        // Otros errores HTTP
        else if (error.status) {
          errorMessage = error.error?.message || error.error?.error || `Error HTTP ${error.status}`;
        }
        // Error de red o conexión
        else if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
        }
        // Otros errores
        else {
          errorMessage = error?.message || 'Error desconocido';
        }
        
        return of({ error: true, message: errorMessage });
      })
    ).subscribe({
      next: (result) => {
        // eslint-disable-next-line no-console -- Debug log for save operation result
        console.log('Save operation result:', result);
        
        // Check if it's a caught error
        if (result && typeof result === 'object' && 'error' in result && result.error === true) {
          this.saving.set(false);
          this.error.set(`Error al guardar el umbral: ${(result as any).message}`);
          this.cdr.markForCheck();
          return;
        }
        
        // If we reach here, the operation was successful
        // Backend returns StockThresholdResponseDTO with message and threshold
        this.saving.set(false);
        const response = result as StockThresholdResponseDTO;
        const successMessage = response?.message || 
          `Umbral ${threshold.thresholdId ? 'actualizado' : 'creado'} exitosamente`;
        
        // Show success message without closing the modal
        this.error.set(null);
        
        // Update threshold ID if it was created
        if (!threshold.thresholdId && response?.threshold?.id) {
          this.currentThreshold.update(current => ({
            ...current,
            thresholdId: response.threshold.id
          }));
        }
        
        // Keep the selected location to allow additional edits
        // Only clear values if user wants to configure another location
        // this.selectedLocation = null;
        // this.currentThreshold.set({ minimumStock: 0, maximumStock: 0 });
        
        // Show temporary success message
        const tempSuccessMessage = `✓ ${successMessage}`;
        this.error.set(tempSuccessMessage);
        
        // Clear message after 3 seconds
        setTimeout(() => {
          if (this.error() === tempSuccessMessage) {
            this.error.set(null);
          }
        }, 3000);
        
        this.cdr.markForCheck();
      },
      error: (error) => {
        // This error handler shouldn't execute because catchError already captures errors
        // but we keep it just in case
        // eslint-disable-next-line no-console -- Error log for unexpected save operation failure
        console.error('Unexpected error in save operation:', error);
        this.saving.set(false);
        this.error.set(`Error al guardar el umbral: ${error?.error?.message || error?.message || 'Error desconocido'}`);
        this.cdr.markForCheck();
      }
    });
  }
}
