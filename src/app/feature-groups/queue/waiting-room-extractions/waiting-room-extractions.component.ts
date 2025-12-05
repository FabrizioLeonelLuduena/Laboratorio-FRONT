import { Component, inject, OnInit, OnDestroy } from '@angular/core';

import { interval, Subscription } from 'rxjs';

import { AlertType, GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { AttentionResponse } from '../../care-management/models/attention.models';
import { AttentionService } from '../../care-management/services/attention.service';

/**
 * Waiting room component for extractions.
 */
@Component({
  selector: 'app-waiting-room-extractions',
  imports: [
    GenericAlertComponent
  ],
  templateUrl: './waiting-room-extractions.component.html',
  styleUrls: ['./waiting-room-extractions.component.css']
})
export class WaitingRoomExtractionsComponent implements OnInit, OnDestroy {
  displaySlots: (AttentionResponse | null)[] = Array(5).fill(null);
  readonly FIXED_ROWS = 5;

  showCallOverlay = false;
  lastCalledCode = '';
  lastCalledBox = 0;

  alertVisible = false;
  alertType: AlertType = 'info';
  alertTitle = '';
  alertMessage = '';

  loading = false;

  private attentionService = inject(AttentionService);
  private pollSub?: Subscription;

  private previousFirstCode: string | null = null;
  private callQueue: AttentionResponse[] = [];
  private audio?: HTMLAudioElement;

  /**
   * Initializes the component, loads initial queue and starts polling.
   */
  ngOnInit(): void {
    this.loadQueue(true);
    this.audio = new Audio('assets/sounds/queue-notification.mp3');

    this.pollSub = interval(10000).subscribe(() => this.loadQueue());
  }

  /**
   * Cleans up polling subscription on component destruction.
   */
  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  /**
   * Loads the extraction queue and detects new calls.
   * @param isInitialLoad - Whether it's the initial load.
   */
  private loadQueue(isInitialLoad = false): void {
    this.attentionService.getInExtraction().subscribe({
      next: (data: AttentionResponse[]) => {
        // Sort data by admission date in descending order (most recent first)
        data.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());

        if (data.length > 0) {
          if (isInitialLoad) {
            this.previousFirstCode = data[0].attentionNumber;
          } else {
            const lastKnownIndex = this.previousFirstCode
              ? data.findIndex(item => item.attentionNumber === this.previousFirstCode)
              : -1;

            const newCalls = lastKnownIndex > 0 ? data.slice(0, lastKnownIndex) :
              (lastKnownIndex === -1 && this.previousFirstCode !== data[0].attentionNumber) ? [data[0]] : [];

            if (newCalls.length > 0) {
              this.callQueue.push(...newCalls.reverse());
              if (!this.showCallOverlay) {
                this.processCallQueue();
              }
            }
            this.previousFirstCode = data[0].attentionNumber;
          }
        }

        this.displaySlots = Array(this.FIXED_ROWS).fill(null).map((_, i) => data[i] || null);
        this.loading = false;
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar la cola de espera.');
        this.loading = false;
      }
    });
  }

  /**
   * Processes the call queue, showing an overlay for each call.
   */
  private processCallQueue(): void {
    if (this.callQueue.length === 0) {
      return;
    }

    const nextCall = this.callQueue.shift();
    if (!nextCall) return;

    this.lastCalledCode = nextCall.attentionNumber;
    this.lastCalledBox = nextCall.attentionBox;
    this.showCallOverlay = true;
    this.playSound();

    setTimeout(() => {
      this.showCallOverlay = false;
      setTimeout(() => this.processCallQueue(), 500);
    }, 10000);
  }

  /**
   * Shows a generic alert.
   * @param type - The alert type.
   * @param title - The alert title.
   * @param message - The alert message.
   */
  private showAlert(type: AlertType, title: string, message: string): void {
    this.alertVisible = true;
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;

    setTimeout(() => {
      this.alertVisible = false;
    }, 4000);
  }

  /**
   * Plays a notification sound.
   */
  private playSound(): void {
    if (this.audio) {
      this.audio.play().catch();
    }
  }
}
