import { BehaviorSubject, Subscription, timer } from 'rxjs';

import { switchMap } from 'rxjs/operators';

import { PollingConfig } from '../models/PollingConfig';

/**
 * Manages a polling mechanism with an adaptive interval.
 * It periodically fetches data, compares it with the previous state,
 * and adjusts the polling frequency based on detected changes.
 * @template T The type of data being polled.
 */
export class PollingInstance<T> {
  /** The current polling interval in milliseconds. */
  private interval: number;

  /** A counter for consecutive polling cycles with no significant changes. */
  private triesQuiet = 0;

  /** A cache of the data from the last successful poll. */
  private previousData: T | null = null;

  /** The main RxJS subscription for the polling timer. */
  private subscription = new Subscription();

  /** An RxJS BehaviorSubject that holds and emits the latest polled data. */
  private dataSubject = new BehaviorSubject<T | null>(null);

  /** A public observable that consumers can subscribe to for receiving data updates. */
  data$ = this.dataSubject.asObservable();

  /**
   * Initializes the polling instance with a given configuration.
   * @param config The polling configuration object.
   */
  constructor(private config: PollingConfig<T>) {
    this.interval = config.intervalStart;
    this.start();
  }

  /**
   * Starts the polling timer and the data fetching process.
   */
  private start() {
    this.subscription.add(
      timer(0, this.interval)
        .pipe(switchMap(() => this.config.request()))
        .subscribe((data) => {
          this.handleResponse(data);
        })
    );
  }

  /**
   * Restarts the polling timer with the updated interval.
   * This is called when the polling frequency needs to change.
   */
  private restartTimer() {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    this.start();
  }

  /**
   * Processes the fetched data, adjusts the polling interval, and emits the new data.
   * @param data The new data received from the request.
   */
  private handleResponse(data: T) {
    const diffFn = this.config.detectChanges ?? (() => 0);
    const changes = diffFn(this.previousData, data);

    // If there is significant activity, decrease the interval (poll faster).
    if (changes > this.config.activityThreshold) {
      this.interval = Math.max(this.config.intervalMin, this.interval * 0.5);
      this.restartTimer();
      this.triesQuiet = 0;
    }
    // If there is little to no activity, increment the quiet counter.
    else if (changes <= this.config.quietThreshold) {
      this.triesQuiet++;

      // After several quiet cycles, increase the interval (poll slower).
      if (this.triesQuiet >= 5) {
        this.interval = Math.min(this.config.intervalMax, this.interval * 1.5);
        this.restartTimer();
        this.triesQuiet = 0;
      }
    }

    this.dataSubject.next(data);
    this.previousData = data;
  }

  /**
   * Stops the polling process and cleans up the subscription.
   */
  stop() {
    this.subscription.unsubscribe();
  }
}
