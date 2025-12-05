/**
 * This interface represents a medical analysis with its properties.
 */
export interface Analysis {
  id: number;
  shortCode: number;
  name: string;
  description: string | null;
  familyName?: string | null;
  nbuCode?: number | null;
  determinations?: Determination[];
}

/**
 * Determination within an analysis
 */
export interface Determination {
  id?: number;
  name?: string;
  handlingTime?: {
    timeValue: number;
    timeUnit: string;
  };
}
