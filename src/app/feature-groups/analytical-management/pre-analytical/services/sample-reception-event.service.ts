import { Injectable } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { SampleReceptionEvent } from '../models/checkin.interface';


/**
 * Service for communication between check-in and reception components.
 * Emits events when samples change state to IN_TRANSIT during check-in.
 */
@Injectable({
  providedIn: 'root'
})
export class SampleReceptionEventService {
  private sampleCheckedInSubject = new Subject<SampleReceptionEvent>();

  /**
   * Observable that components can subscribe to receive check-in events
   */
  sampleCheckedIn$: Observable<SampleReceptionEvent> = this.sampleCheckedInSubject.asObservable();

  /**
   * Emits an event when samples are checked in and move to IN_TRANSIT state
   * @param event The check-in event containing protocol and samples
   */
  emitSampleCheckedIn(event: SampleReceptionEvent): void {
    this.sampleCheckedInSubject.next(event);
  }
}
