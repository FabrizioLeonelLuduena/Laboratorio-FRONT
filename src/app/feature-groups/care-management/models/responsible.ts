/**
 * Interface that represents a responsible for a branch.
 */
export interface Responsible {
  id: number;
  name: string;
}

/**
 * Interface that represents the payload for a responsible in requests.
 */
export interface ResponsibleRequest {
  name: string;
  userId: number;
}
