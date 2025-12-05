/**
 * this interface represents a medical analysis with its properties.
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

/**
 *
 */
export interface AnalysisWithAuth {
  id: number;
  shortCode: number;
  name: string;
  description: string | null;
  familyName?: string | null;
  nbuCode?: number | null;
  determinations?: Determination[];
  authorized: boolean;
}


/**
 *
 */
export interface AnalysisApp {
  id: number | string;
  shortCode: number | string;
  name?: string;
  description?: string | null;
  code: string;
}

