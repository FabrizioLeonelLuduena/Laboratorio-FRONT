import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { StockMovementType } from '../../enums/movementType.enum';
import { RequestStockMovementDTO, StockMovementDetailDTO } from '../../models/stock-movements/stockMovements.model';
import { StockMovementsService } from '../../services/stock-movements/stock-movements.service';

/**
 * Interface for movement strategy configuration
 */
export interface MovementStrategyConfig {
  breadcrumb: string;
  validate: (formData: any) => { valid: boolean; message?: string };
  buildPayload: (formData: any, userId: number) => RequestStockMovementDTO;
  submit: (payload: RequestStockMovementDTO) => Observable<any>;
  successMessage: (response: any) => string;
}

/**
 * Service that provides strategy pattern for different stock movement types
 */
@Injectable({
  providedIn: 'root'
})
export class StockMovementStrategyService {
  /**
   * Constructor
   */
  private stockMovementsService = inject(StockMovementsService);

  /**
   * Get strategy configuration for a specific movement type
   */
  getStrategy(type: StockMovementType): MovementStrategyConfig {
    const strategies: Record<StockMovementType, MovementStrategyConfig> = {
      [StockMovementType.PURCHASE]: {
        breadcrumb: 'Compras e inventario > Movimientos de stock > Nuevo ingreso',
        validate: this.validateEntry.bind(this),
        buildPayload: this.buildEntryPayload.bind(this),
        submit: (payload) => this.stockMovementsService.registryPurchase(payload),
        successMessage: () => 'Ingreso registrado exitosamente'
      },
      [StockMovementType.TRANSFER]: {
        breadcrumb: 'Compras e inventario > Movimientos de stock > Nueva transferencia',
        validate: this.validateTransfer.bind(this),
        buildPayload: this.buildTransferPayload.bind(this),
        submit: (payload) => this.stockMovementsService.createTransfer(payload),
        successMessage: () => 'Remito de transferencia generado. Pendiente de confirmación en ubicación de destino'
      },
      [StockMovementType.ADJUSTMENT]: {
        breadcrumb: 'Compras e inventario > Movimientos de stock > Nuevo ajuste',
        validate: this.validateAdjustment.bind(this),
        buildPayload: this.buildAdjustmentPayload.bind(this),
        submit: (payload) => this.stockMovementsService.createAdjustment(payload),
        successMessage: () => 'Ajuste registrado exitosamente'
      },
      [StockMovementType.RETURN]: {
        breadcrumb: 'Compras e inventario > Movimientos de stock > Nueva devolución',
        validate: this.validateReturn.bind(this),
        buildPayload: this.buildReturnPayload.bind(this),
        submit: (payload) => this.stockMovementsService.createReturn(payload),
        successMessage: () => 'Devolución registrada exitosamente'
      }
    };

    return strategies[type];
  }

  // ========== VALIDATION METHODS ==========

  /**
   * Valida los campos para el ingreso
   */
  private validateEntry(formData: any): { valid: boolean; message?: string } {
    if (!formData.supplierId) {
      return { valid: false, message: 'Debe seleccionar un proveedor para registrar un ingreso.' };
    }

    const quantities = this.getDetailQuantities(formData);
    if (quantities.some(quantity => quantity <= 0)) {
      return { valid: false, message: 'La cantidad debe ser mayor a cero para un ingreso.' };
    }
    return this.validateCommon(formData);
  }

  /**
   * Valida los campos para la transferencia
   */
  private validateTransfer(formData: any): { valid: boolean; message?: string } {
    if (!formData.originLocationId || !formData.locationId) {
      return { valid: false, message: 'Debe seleccionar ubicaciones de origen y destino válidas.' };
    }

    if (formData.originLocationId === formData.locationId) {
      return { valid: false, message: 'La ubicación de origen y destino deben ser diferentes.' };
    }
    const quantities = this.getDetailQuantities(formData);
    if (quantities.some(quantity => quantity <= 0)) {
      return { valid: false, message: 'La cantidad debe ser mayor a cero para una salida.' };
    }
    return this.validateCommon(formData);
  }

  /**
   * Valida los campos para el ajuste
   */
  private validateAdjustment(formData: any): { valid: boolean; message?: string } {
    const quantities = this.getDetailQuantities(formData);
    if (quantities.some(quantity => quantity === 0)) {
      return { valid: false, message: 'La cantidad de ajuste no puede ser cero.' };
    }
    return this.validateCommon(formData);
  }

  /**
   * Valida los campos para la devolución
   */
  private validateReturn(formData: any): { valid: boolean; message?: string } {
    const quantities = this.getDetailQuantities(formData);
    if (quantities.some(quantity => quantity <= 0)) {
      return { valid: false, message: 'La cantidad debe ser mayor a cero para una devolución.' };
    }
    return this.validateCommon(formData);
  }

  /**
   * Valida los campos comunes
   */
  private validateCommon(formData: any): { valid: boolean; message?: string } {
    const quantities = this.getDetailQuantities(formData);
    if (quantities.length === 0) {
      return { valid: false, message: 'Debe agregar al menos un detalle con cantidad.' };
    }

    if (quantities.some(quantity => Number.isNaN(quantity))) {
      return { valid: false, message: 'Las cantidades de los detalles deben ser numéricas.' };
    }

    if (quantities.every(quantity => quantity === 0)) {
      return { valid: false, message: 'Debe indicar una cantidad diferente de cero.' };
    }

    if (Array.isArray(formData.details) && formData.details.length > 0) {
      const missingSupply = formData.details.some((detail: any) => !detail?.supplyId);
      if (missingSupply) {
        return { valid: false, message: 'Cada detalle debe incluir un producto seleccionado.' };
      }
    }

    if (formData.expirationDate) {
      const expirationDate = new Date(formData.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        return { valid: false, message: 'La fecha de expiración no puede ser anterior a hoy.' };
      }
    }

    return { valid: true };
  }

  /**
   * Construye el payload para el ingreso
   */
  private buildEntryPayload(formData: any, userId: number): RequestStockMovementDTO {
    const destinationLocationId = formData.locationId ?? formData.originLocationId;
    const supplierId = this.toNumber(formData.supplierId);

    return {
      destinationLocationId: this.toNumber(destinationLocationId),
      userId: userId,
      supplierId: supplierId,
      reason: this.trimOrUndefined(formData.reason),
      notes: this.trimOrUndefined(formData.notes),
      details: this.buildDetails(formData)
    };
  }

  /**
   * Construye el payload para la transferencia
   */
  private buildTransferPayload(formData: any, userId: number): RequestStockMovementDTO {
    return {
      originLocationId: this.toNumber(formData.originLocationId),
      destinationLocationId: this.toNumber(formData.locationId),
      userId: userId,
      reason: this.trimOrUndefined(formData.reason),
      notes: this.trimOrUndefined(formData.notes),
      details: this.buildDetails(formData)
    };
  }

  /**
   * Construye el payload para el ajuste
   */
  private buildAdjustmentPayload(formData: any, userId: number): RequestStockMovementDTO {
    const destinationLocationId = formData.locationId ?? formData.originLocationId;

    return {
      destinationLocationId: this.toNumber(destinationLocationId),
      userId: userId,
      originLocationId: this.toNumber(formData.originLocationId),
      reason: this.trimOrUndefined(formData.reason),
      notes: this.trimOrUndefined(formData.notes),
      details: this.buildDetails(formData)
    };
  }

  /**
   * Construye el payload para la devolución
   * Note: RETURN requires origin_location_id according to the API
   * Now supports exitReason to differentiate between CONSUMPTION and SUPPLIER_RETURN
   */
  private buildReturnPayload(formData: any, userId: number): RequestStockMovementDTO {
    return {
      originLocationId: this.toNumber(formData.locationId),
      userId: userId,
      supplierId: this.toNumber(formData.supplierId),
      reason: this.trimOrUndefined(formData.reason),
      notes: this.trimOrUndefined(formData.notes),
      exitReason: formData.exitReason || 'SUPPLIER_RETURN', // Default to SUPPLIER_RETURN for backward compatibility
      details: this.buildDetails(formData)
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Trim y convierte a string
   */
  private trimOrUndefined(value: any): string | undefined {
    return value ? String(value).trim() : undefined;
  }

  /**
   * Formatea la fecha para el backend
   */
  private formatDateOrUndefined(date: Date | string): string | undefined {
    if (!date) return undefined;

    if (typeof date === 'string') {
      return date;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Construye el detalle del movimiento
   */
  private buildDetails(formData: any): StockMovementDetailDTO[] {
    if (Array.isArray(formData.details) && formData.details.length > 0) {
      return formData.details.map((detail: any) => ({
        supplyId: this.toNumber(detail.supplyId ?? formData.supplyId) ?? 0,
        quantity: this.toNumber(detail.quantity) ?? 0,
        batchNumber: this.trimOrUndefined(detail.batchNumber ?? formData.batchNumber),
        expirationDate: this.formatDateOrUndefined(detail.expirationDate ?? formData.expirationDate),
        notes: this.trimOrUndefined(detail.notes)
      }));
    }

    const detail: StockMovementDetailDTO = {
      supplyId: this.toNumber(formData.supplyId) ?? 0,
      quantity: this.toNumber(formData.quantity) ?? 0,
      batchNumber: this.trimOrUndefined(formData.batchNumber),
      expirationDate: this.formatDateOrUndefined(formData.expirationDate),
      notes: this.trimOrUndefined(formData.detail_notes)
    };

    return [detail];
  }

  /**
   * Obtiene las cantidades de los detalles del formulario
   */
  private getDetailQuantities(formData: any): number[] {
    if (Array.isArray(formData.details) && formData.details.length > 0) {
      return formData.details.map((detail: any) => {
        const value = this.toNumber(detail.quantity);
        return value ?? Number.NaN;
      });
    }

    if (formData.quantity !== undefined && formData.quantity !== null && formData.quantity !== '') {
      const value = this.toNumber(formData.quantity);
      return [value ?? Number.NaN];
    }

    return [];
  }

  /**
   * Convierte a número seguro
   */
  private toNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
