/* eslint-disable import/order */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { ResponseSupplierItemsBySupplierIdDTO } from '../../models/supplier-items/supplier-items.model';

/**
 * Servicio para gestionar los supplier items
 */
@Injectable({ providedIn: 'root' })
export class SupplierItemsService {
  private readonly baseUrl = `${environment.apiUrl}/v1/stock/suppliers`;

  // Debug property para tracking de consultas
  public lastAttempts: Array<{ url: string; ok: boolean; status?: number; error?: string; length?: number }> = [];

  /**
   * Constructor
   * @param http - HttpClient para realizar peticiones HTTP
   */
  constructor(private http: HttpClient) {}

  /**
   * Obtiene los items de un proveedor específico
   * Normaliza la respuesta para que tenga una estructura consistente con nombres legibles
   * Según la guía: GET /api/suppliers/{supplier_id}/items
   */
  getBySupplier(supplierId: number): Observable<any[]> {
    const url = `${this.baseUrl}/${supplierId}/items`;

    return this.http.get<any>(url).pipe(
      map((response: any) => {
        // Manejar diferentes formatos de respuesta
        let items: any[] = [];

        if (Array.isArray(response)) {
          items = response;
        } else if (response?.content && Array.isArray(response.content)) {
          items = response.content;
        } else if (response?.items && Array.isArray(response.items)) {
          items = response.items;
        } else if (response) {
          // Si es un objeto único, convertirlo en array
          items = [response];
        }

        // Debug tracking
        this.lastAttempts.push({
          url,
          ok: true,
          length: items.length,
          status: 200
        });

        // Normalizar cada item para tener una estructura consistente
        const normalized = items.map((item: any) => this.normalizeItem(item));

        return normalized;
      }),
      catchError((error: any) => {

        // Debug tracking de errores
        this.lastAttempts.push({
          url,
          ok: false,
          status: error.status || 0,
          error: error.message || 'Error desconocido'
        });

        // Re-lanzar el error para que el componente lo maneje
        throw error;
      })
    );
  }

  /**
   * Normaliza un item individual
   * Según la guía, la respuesta incluye: id, item_code, description, unit_price, supplier
   */
  private normalizeItem(item: any): any {
    // Priorizar campos según la estructura de la guía
    const id = item.id || item.supplierItemId || item.supplier_item_id;
    const itemCode = item.item_code || item.itemCode || item.code || '';
    const description = item.description || item.name || item.supplierItemName || item.productName || '';
    const unitPrice = this.parsePrice(item);

    // Construir nombre para mostrar
    let displayName = description;
    if (itemCode) {
      displayName = `${itemCode} - ${description}`;
    }

    // Extraer IDs necesarios para el detalle de orden de compra
    // Intentar múltiples variantes de nombres (snake_case, camelCase, objetos anidados)
    const supplyId = item.supply_id || item.supplyId || item.supply?.id;
    const unitOfMeasureId = item.unit_of_measure_id || item.unitOfMeasureId ||
                            item.unitOfMeasure?.id || item.unit_of_measure?.id;
    const packagingId = item.packaging_id || item.packagingId || item.packaging?.id;


    return {
      id,
      name: displayName,
      item_code: itemCode,
      description,
      label: this.buildLabel(item),
      sublabel: this.buildSublabel(item),
      unit_price: unitPrice,
      supply_id: supplyId,
      unit_of_measure_id: unitOfMeasureId,
      packaging_id: packagingId,
      // Guardar el objeto raw completo para acceder a propiedades anidadas
      raw: item
    };
  }

  /**
   * Construye el label principal para el dropdown
   * Formato: "CODIGO - Descripción"
   */
  private buildLabel(item: any): string {
    const code = item.item_code || item.itemCode || item.code || '';
    const desc = item.description || item.name || item.supplierItemName || item.productName || '';

    if (code && desc) {
      return `${code} - ${desc}`;
    } else if (desc) {
      return desc;
    } else if (code) {
      return code;
    }

    return `Item #${item.id || '?'}`;
  }

  /**
   * Construye el sublabel con información adicional
   */
  private buildSublabel(item: any): string {
    const parts: string[] = [];

    // Unidad de medida
    const uom = item.unitOfMeasure?.name || item.unit_of_measure_name || null;
    if (uom) {
      parts.push(uom);
    }

    // Packaging
    if (item.packaging) {
      const pkg = item.packaging;
      parts.push(`${pkg.units_per_package || ''} x ${pkg.uom_name || 'unidades'}`.trim());
    }

    return parts.join(' • ');
  }

  /**
   * Parse el precio del item manejando diferentes formatos
   */
  private parsePrice(item: any): number {
    const price = item.unitPrice || item.unit_price || item.price || item.unitPriceList || 0;
    return typeof price === 'string' ? parseFloat(price) : Number(price) || 0;
  }

  /**
   * Busca items por criterios (para búsquedas avanzadas)
   */
  search(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/items/search`, { params });
  }

  /**
   * Obtiene el detalle completo de un supplier item específico
   * Endpoint: GET /api/v1/stock/supplier-items/{id}
   */
  getById(supplierItemId: number): Observable<any> {
    const url = `${environment.apiUrl}/v1/stock/supplier-items/${supplierItemId}`;

    return this.http.get<any>(url).pipe(
      map((item: any) => {
        return this.normalizeItem(item);
      }),
      catchError((error: any) => {
        throw error;
      })
    );
  }

  /**
   * Gets the supplies provided by a specific supplier.
   * Endpoint: GET /api/v1/stock/supplier-items/supplier/{id}
   * @param supplierId - The ID of the supplier.
   * @returns An observable with an array of supplier items with complete information.
   */
  getSuppliesBySupplierId(supplierId: number): Observable<ResponseSupplierItemsBySupplierIdDTO[]> {
    const url = `${environment.apiUrl}/v1/stock/supplier-items/supplier/${supplierId}`;

    return this.http.get<ResponseSupplierItemsBySupplierIdDTO[]>(url).pipe(
      map((response: ResponseSupplierItemsBySupplierIdDTO[] | any) => {
        const items = Array.isArray(response) ? response : (response?.content || []);
        return items;
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Creates a new supplier item.
   * Endpoint: POST /api/v1/stock/supplier-items
   * @param supplierItemData - The supplier item data to create.
   * @returns An observable with the created supplier item.
   */
  createSupplierItem(supplierItemData: any): Observable<any> {
    const url = `${environment.apiUrl}/v1/stock/supplier-items`;

    return this.http.post<any>(url, supplierItemData).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }
}

