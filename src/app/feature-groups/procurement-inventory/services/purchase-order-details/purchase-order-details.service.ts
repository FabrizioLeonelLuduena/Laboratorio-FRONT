/* eslint-disable import/order */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

import {
  CreatePurchaseOrderDetailDTO,
  CreatePurchaseOrderDetailResponse,
  PurchaseOrderDetailDTO,
  UpdatePurchaseOrderDetailDTO
} from '../../models/purchase-order-details/purchase-order-details.models';

/**
 * Servicio para gestionar los detalles de las órdenes de compra
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderDetailsService {
  private readonly baseUrl = `${environment.apiUrl}/v1/stock/purchase-orders/details`;

  /**
   * Constructor
   * @param http - HttpClient para realizar peticiones HTTP
   */
  constructor(private http: HttpClient) {}

  /**
   * Crear un nuevo detalle de orden de compra
   */
  create(dto: CreatePurchaseOrderDetailDTO): Observable<CreatePurchaseOrderDetailResponse> {
    return this.http.post<CreatePurchaseOrderDetailResponse>(this.baseUrl, dto);
  }

  /**
   * Obtener detalles de una orden de compra específica
   * Filtro por purchaseOrderId devuelve SOLO los detalles de esa orden
   * Query: GET /details?purchaseOrderId=2
   *
   * NOTA: El backend devuelve respuesta paginada: { content: PurchaseOrderDetailDTO[], ... }
   */
  getByPurchaseOrder(purchaseOrderId: number): Observable<any> {
    // Usar camelCase según contrato del backend
    const params = new HttpParams()
      .set('purchaseOrderId', purchaseOrderId.toString())
      .set('page', '0')
      .set('size', '100');


    return this.http.get<any>(this.baseUrl, { params });
  }

  /**
   * Obtener un detalle específico por ID
   */
  getById(detailId: number): Observable<PurchaseOrderDetailDTO> {
    return this.http.get<PurchaseOrderDetailDTO>(`${this.baseUrl}/${detailId}`);
  }

  /**
   * Actualizar un detalle
   * Solo puedes modificar: quantity, unit_price, supplier_item_id
   * Campos inmutables: purchase_order_id, supply_id, unit_of_measure_id, packaging_id
   * (estos últimos se actualizan automáticamente si cambias supplier_item_id)
   */
  update(detailId: number, dto: UpdatePurchaseOrderDetailDTO): Observable<any> {
    return this.http.put(`${this.baseUrl}/${detailId}`, dto);
  }

  /**
   * Desactivar un detalle (lógico)
   * Método: PATCH /details/{id}/deactivate
   * NO usar DELETE (no está habilitado, retorna 405)
   */
  deactivate(detailId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${detailId}/deactivate`, null);
  }

  /**
   * Sincronizar los detalles activos de una orden de compra
   * Desactiva automáticamente los detalles que NO están en la lista
   * POST /stock/purchase-orders/{purchaseOrderId}/details/sync
   * Body: { "detail_ids": [1, 3, 5] }
   */
  sync(purchaseOrderId: number, detailIds: number[]): Observable<any> {
    // URL correcta según estructura REST: /purchase-orders/{id}/details/sync
    const url = `${environment.apiUrl}/v1/stock/purchase-orders/${purchaseOrderId}/details/sync`;
    const body = { detail_ids: detailIds };


    return this.http.post(url, body);
  }
}


