/**
 * Interface that represents a schedule for a branch.
 */
export interface Contact {
  id: number;
  contact: string;
  contactType: string;
}

/**
 * Interface to do a request to the API.
 */
export interface ContactRequest {
  contact: string;
  contactType: string;
}
