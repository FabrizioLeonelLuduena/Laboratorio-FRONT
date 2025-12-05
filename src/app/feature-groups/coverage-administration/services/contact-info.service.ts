import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ContactTypeResponseDTO, InsurerContactInfoCreateRequestDTO,
  InsurerContactInfoResponseDTO, InsurerContactInfoUpdateRequestDTO
} from '../models/contact-info.model';

/**
 * ContactInfo Service
 * Manages insurer contact information and types.
 * All comments and documentation are in English as requested.
 */
@Injectable({
  providedIn: 'root'
})
export class ContactInfoService {
  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_CONTACTS = `${this.baseApiUrl}/coverages/insurer-contact-infos`;
  private readonly API_TYPES = `${this.baseApiUrl}/coverages/contact-types`;


  /**
   * constructor
   */
  constructor(private http: HttpClient) { }


  /**
   * Obtains a specific contact by id.
   */
  getById(id: number): Observable<InsurerContactInfoResponseDTO> {
    return this.http.get<InsurerContactInfoResponseDTO>(`${this.API_CONTACTS}/${id}`);
  }

  /**
   * Searches all the contacts for a specific insurer.
   */
  search(insurerId: number, active: boolean = true): Observable<InsurerContactInfoResponseDTO[]> {
    return this.http.get<any[]>(
      `${this.API_CONTACTS}`
    ).pipe(
      map((arr: any[]) => {
        if (!Array.isArray(arr)) return [];

        // Filters contacts that belong to the insurer and are active if requested
        return arr
          .filter(c =>
            c.insurerId === insurerId &&
            (active ? c.isActive : true)
          )
          .map(c => ({
            id: c.id,
            insurerId: c.insurerId,
            contactType: c.contactType,
            contact: c.contact,
            isActive: c.isActive
          }));
      })
    );
  }



  /**
   * Create a new contact
   */
  create(contact: InsurerContactInfoCreateRequestDTO): Observable<InsurerContactInfoResponseDTO> {
    return this.http.post<InsurerContactInfoResponseDTO>(`${this.API_CONTACTS}`,
      contact);
  }

  /**
   * Update an existing contact
   */
  update(contact: InsurerContactInfoUpdateRequestDTO): Observable<InsurerContactInfoResponseDTO> {
    return this.http.put<InsurerContactInfoResponseDTO>(
      `${this.API_CONTACTS}`,
      contact);
  }

  /**
   * Removes a contact from an insurer
   */
  softDelete(contactId: number): Observable<void> {
    return this.http.put<void>(
      `${this.API_CONTACTS}/deactivate`,
      { id: contactId }
    );
  }


  /**
   * Retrieves all the types of contacts valid for insurers
   */
  getTypes(): Observable<ContactTypeResponseDTO[]> {
    return this.http.get<ContactTypeResponseDTO[]>(`${this.API_TYPES}`);
  }
}
