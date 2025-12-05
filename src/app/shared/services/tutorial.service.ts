import { Injectable } from '@angular/core';

import { Subject } from 'rxjs';

/**
 * Defines the keys for the available tutorials.
 * Can be a main module (like 'procurement-inventory') or a specific page.
 */
export type TutorialKey =
  | 'coverage-administration'
  | 'care-management'
  | 'procurement-inventory'
  | 'user-management'
  | 'billing-collections'
  | 'appointments-results'
  | 'patients'
  | 'analysis-list'
  | 'attention-detail'
  | 'attention-workflow'
  | 'pre-analytical'
  | 'post-analytical'
  | 'analytical'
  | 'attentions';

/**
 * @class TutorialService
 * @description Service to trigger tutorials across the application.
 * Supports both main modules and specific sub-routes.
 */
@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private trigger = new Subject<string>();
  public trigger$ = this.trigger.asObservable();

  /**
   * Triggers a tutorial by its key.
   * Can trigger by main module (e.g., 'procurement-inventory')
   * or specific sub-route (e.g., 'procurement-inventory/suppliers').
   * @param key - The key of the tutorial to start.
   */
  public startTutorial(key: TutorialKey | string) {
    this.trigger.next(key);
  }
}
