/**
 *
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;      // current page (zero-based)
}

// Common filters base
/**
 *
 */
export interface BaseFiltersDTO {
  page?: number;  // default 0
  size?: number;  // default 10
  sort?: string;  // e.g. "creationDate,desc"
}
