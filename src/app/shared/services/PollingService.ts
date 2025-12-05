import { Injectable } from '@angular/core';

import { PollingConfig } from '../models/PollingConfig';
import { PollingInstance } from '../utils/PollingInstance';

/**
 * PollingService
 */
@Injectable({ providedIn: 'root' })
export class PollingService {
  /**
   * This interfaces allows you to create polling to your endpoint.
   */
  createPolling<T>(config: PollingConfig<T>): PollingInstance<T> {
    return new PollingInstance(config);
  }
}
