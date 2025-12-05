import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ResponseCategoryDTO } from '../../models/categories/category.model';

/**
 * Service for managing Supply Categories
 *
 * KNOWN ISSUE (Backend):
 * The endpoint /v1/stock/categories returns a 500 StackOverflowError due to circular reference
 * in the Category entity. The parent_category field references another Category, creating
 * an infinite loop during JSON serialization with Jackson.
 *
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/v1/stock/categories`;
  private http = inject(HttpClient);

  /**
   * Get all Supply Categories
   * @returns Observable with array of ResponseCategoryDTO
   * @throws HttpErrorResponse - Currently throws 500 due to backend circular reference issue
   */
  getCategories(): Observable<ResponseCategoryDTO[]> {
    return this.http.get<ResponseCategoryDTO[]>(this.apiUrl);
  }
}

