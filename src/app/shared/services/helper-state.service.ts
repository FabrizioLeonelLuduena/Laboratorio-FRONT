import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

/**
 * Helper form state.
 */
export interface HelperFormState {
  isFormVisible: boolean;
  formType?: 'employee' | 'doctor';
}

/**
 * Service to share form state between components and the navbar.
 */
@Injectable({
  providedIn: 'root'
})
export class HelperStateService {
  private formStateSubject = new BehaviorSubject<HelperFormState>({ isFormVisible: false });
  public formState$ = this.formStateSubject.asObservable();

  /**
   * Updates the form state.
   */
  setFormState(isVisible: boolean, formType?: 'employee' | 'doctor'): void {
    this.formStateSubject.next({ isFormVisible: isVisible, formType });
  }

  /**
   * Hides the form.
   */
  hideForm(): void {
    this.formStateSubject.next({ isFormVisible: false });
  }
}
