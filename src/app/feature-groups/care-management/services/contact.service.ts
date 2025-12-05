import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ContactRequest } from '../models/contact';

/**
 * Service to create a new contact and get the generated id.
 */
@Injectable({
  providedIn: 'root'
})
export class ContactService {
  /**
   * HttpClient injection.
   * @param http
   */
  constructor(private http: HttpClient) {}
  private apiUrl = `${environment.apiUrl}/v2/configurations/contacts`;

  /**
   * Post a new contact.
   */
  postContact(contactRequest: ContactRequest): Observable<number> {
    return this.http.post<number>(this.apiUrl, {
      contact: contactRequest.contact,
      contactType: contactRequest.contactType
    });
  }

  /**
   * Get All the contacts for a branch.
   */
  getAllContacts(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((rawContacts: any[]) =>
        rawContacts.map((rawContact: any) => ({
          id: rawContact.id,
          contact: rawContact.contact,
          contactType: rawContact.contactType
        }))
      )
    );
  }
}
