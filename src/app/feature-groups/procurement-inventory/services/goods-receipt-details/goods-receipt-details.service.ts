import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from 'src/environments/environment';

import {
  CreateGoodsReceiptDetailResponseDTO, GoodsReceiptDetailFiltersDTO, GoodsReceiptDetailUpdateDTO,
  RequestGoodsReceiptDetailDTO, ResponseGoodsReceiptDetailDTO
} from '../../models/goods-receipt-details/goods-receipt-details.models';
import { PageResponse } from '../../shared/utils/pagination';


/**
 * Servicio para gestión de detalles de recepciones de mercadería
 */
@Injectable({ providedIn: 'root' })
export class GoodsReceiptDetailsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/stock/goods-receipt-details`;

  /**
   * Crea un nuevo detalle de recepción de mercadería
   * @param dto - Datos del detalle a crear
   * @returns Observable con la respuesta de creación
   */
  create(dto: RequestGoodsReceiptDetailDTO) {
    return this.http.post<CreateGoodsReceiptDetailResponseDTO>(`${this.baseUrl}/create`, dto);
  }

  /**
   * Busca detalles de recepciones con filtros
   * @param f - Filtros de búsqueda para detalles
   * @returns Observable con página de resultados
   */
  search(f: GoodsReceiptDetailFiltersDTO) {
    let params = new HttpParams();
    Object.entries(f || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PageResponse<ResponseGoodsReceiptDetailDTO>>(this.baseUrl, { params });
  }

  /**
   * Obtiene un detalle de recepción por ID
   * @param id - ID del detalle
   * @returns Observable con los datos del detalle
   */
  getById(id: number) {
    return this.http.get<ResponseGoodsReceiptDetailDTO>(`${this.baseUrl}/${id}`);
  }

  /**
   * Actualiza un detalle de recepción
   * @param id - ID del detalle a actualizar
   * @param dto - Datos actualizados del detalle
   * @returns Observable con el detalle actualizado
   */
  update(id: number, dto: GoodsReceiptDetailUpdateDTO) {
    return this.http.put<ResponseGoodsReceiptDetailDTO>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Desactiva un detalle de recepción
   * @param id - ID del detalle a desactivar
   * @returns Observable vacío
   */
  deactivate(id: number) {
    return this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {});
  }
}
