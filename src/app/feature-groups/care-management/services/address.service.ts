import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AddressRequest } from '../models/address';

/**
 * Service to get and post addresses.
 */
@Injectable({
  providedIn: 'root'
})
export class AddressService {
  /**
   * HttpClient injection.
   * @param http
   */
  constructor(private http: HttpClient) {}
  // private apiUrl = environmentDocker.urlAddresses;
  private readonly apiUrl = `${environment.apiUrl}/v2/configurations/addresses`;

  /**
   * Post a new address.
   */
  postAddress(addressRequest: AddressRequest): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}`, {
      streetName: addressRequest.streetName,
      streetNumber: addressRequest.streetNumber,
      neighborhoodId: addressRequest.neighborhoodId,
      postalCode: addressRequest.postalCode,
      latitude: addressRequest.latitude,
      longitude: addressRequest.longitude
    });
  }

  /**
   * Get all the addresses for a branch.
   */
  getAllAddresses(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((rawAddresses: any[]) =>
        rawAddresses.map((rawAddress: any) => ({
          id: rawAddress.id,
          streetName: rawAddress.streetName,
          streetNumber: rawAddress.streetNumber,
          neighborhoodId: rawAddress.neighborhoodId,
          postalCode: rawAddress.postalCode,
          latitude: rawAddress.latitude,
          longitude: rawAddress.longitude
        }))
      )
    );
  }
}
