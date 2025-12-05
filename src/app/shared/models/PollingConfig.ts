import { Observable } from 'rxjs';

/**
 *  PollingConfig.
 */
export interface PollingConfig<T> {
  intervalStart: number;
  intervalMin: number;
  intervalMax: number;

  activityThreshold: number;
  quietThreshold: number;

  request: () => Observable<T>;
  detectChanges?: (prev: T | null, next: T) => number;
}
