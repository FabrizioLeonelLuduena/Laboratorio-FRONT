import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../../environments/environment.production';
import { ProtocolResponse } from '../../pre-analytical/models/protocol.interface';

/**
 * Mocked Service to obtain a protocol
 */
@Injectable({
  providedIn: 'root'
})
export class ProtocolService {

  private readonly apiUrl = `${environment.apiUrl}/v1`;
  private http = inject(HttpClient);

  /**
   * Retrieves protocols filtered by date and branch.
   * @returns Observable containing the list of protocols.
   * @param params
   */
  getTrackingProtocols(params?: {
    sectionId?: number;
    protocolId?: number;
    from?: string;
    to?: string;
  }) {
    let httpParams = new HttpParams();

    if (params?.sectionId) httpParams = httpParams.set('sectionId', params.sectionId);
    if (params?.from)      httpParams = httpParams.set('from', params.from);
    if (params?.to)        httpParams = httpParams.set('to', params.to);

    return this.http.get<ProtocolResponse[]>(`${this.apiUrl}/labels/protocols/track-statuses`, { params: httpParams });
  }

}