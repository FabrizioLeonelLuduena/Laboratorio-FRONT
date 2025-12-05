/**
 * Generic DTO for paginated responses from the backend.
 * Mirrors the structure of PaginatedResponseDTO<T> in the Spring Boot API.
 */
export interface PaginatedResponseDTO<T> {
  /** The actual content of the page. */
  content: T[];

  /** Current page number (0-based). */
  page: number;

  /** Size of the page. */
  size: number;

  /** Total number of elements across all pages. */
  totalElements: number;

  /** Total number of pages. */
  totalPages: number;

  /** Whether this is the first page. */
  first: boolean;

  /** Whether this is the last page. */
  last: boolean;
}
