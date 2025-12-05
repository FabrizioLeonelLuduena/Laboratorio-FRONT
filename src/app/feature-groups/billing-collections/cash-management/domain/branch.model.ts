/**
 * Represents a branch/sucursal in the system
 */
export interface Branch {
  id: number;
  name: string;
}

/**
 * Temporary list of branches until the microservice endpoint is available.
 */
export const TEMP_BRANCHES: Branch[] = [
  { id: 1, name: 'Sede Principal' },
  { id: 2, name: 'Sede Norte' },
  { id: 3, name: 'Sede Sur' }
];
