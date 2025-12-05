/**
 * Generic paginated response interface from Spring Boot backend.
 * Matches the structure of Spring's Page<T> response.
 * Uses camelCase format (after passing through caseConverterInterceptor).
 */

/**
 * Sort object from Spring Page response
 */
export interface SortObject {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

/**
 * Pageable object from Spring Page response
 */
export interface PageableObject {
  offset: number;
  sort: SortObject;
  pageSize: number;
  pageNumber: number;
  unpaged: boolean;
  paged: boolean;
}

/**
 * Generic paginated response interface from backend.
 * Matches Spring Boot Page<T> structure.
 */
export interface PageResponse<T> {
  content: T[];
  pageable: PageableObject;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: SortObject;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

