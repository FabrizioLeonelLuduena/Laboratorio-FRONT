/**
 * Interface for sample data in reprint component
 */
export interface SampleInterface extends Record<string, unknown> {
  id: number;
  protocolNumber: string;
  configurationName: string;
  analysisName: string;
  status: string;
  quantity: number;
  selected: boolean;
}
