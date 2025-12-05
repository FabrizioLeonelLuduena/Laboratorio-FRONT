import { Component, inject, OnInit, OnDestroy } from '@angular/core';

import { interval, Subscription } from 'rxjs';

import { AlertType, GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { PageResponse, QueueCompletedDto } from '../models/queue.models';
import { QueueService } from '../services/queue.service';

/**
 *
 */
@Component({
  selector: 'app-waiting-room',
  imports: [
    GenericAlertComponent
  ],
  templateUrl: './waiting-room.component.html',
  styleUrl: './waiting-room.component.css'
})
export class WaitingRoomComponent implements OnInit, OnDestroy {

  displaySlots: (QueueCompletedDto | null)[] = Array(5).fill(null);
  readonly FIXED_ROWS = 5;

  showCallOverlay = false;
  lastCalledCode = '';
  lastCalledBox = 0;

  alertVisible = false;
  alertType: AlertType = 'info';
  alertTitle = '';
  alertMessage = '';

  loading = false;

  private queueService = inject(QueueService);
  private pollSub?: Subscription;
  private currentBranchId = 1;
  private readonly userKey = 'auth_user';

  private previousFirstCode: string | null = null;
  private callQueue: QueueCompletedDto[] = [];
  private audio?: HTMLAudioElement;


  /**
   * Initializes the component, loads initial queue and starts polling
   */
  ngOnInit(): void {
    this.currentBranchId = this.getBranchId();
    this.loadQueue(true);
    this.audio = new Audio('assets/sounds/queue-notification.mp3');


    this.pollSub = interval(10000).subscribe(() => this.loadQueue());
  }

  /**
   * Cleans up polling subscription on component destruction
   */
  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  /**
   * Carga la cola completada y detecta nuevos llamados
   */
  private loadQueue(isInitialLoad = false): void {
    this.queueService.getCompletedQueue(this.currentBranchId, 1).subscribe({
      next: (response: PageResponse<QueueCompletedDto>) => {
        const data = response.content;

        if (data.length > 0) {
          if (isInitialLoad) {
            this.previousFirstCode = data[0].publicCode;
          } else {
            const lastKnownIndex = this.previousFirstCode
              ? data.findIndex(item => item.publicCode === this.previousFirstCode)
              : -1;

            const newCalls = lastKnownIndex > 0 ? data.slice(0, lastKnownIndex) :
              (lastKnownIndex === -1 && this.previousFirstCode !== data[0].publicCode) ? [data[0]] : [];

            if (newCalls.length > 0) {
              this.callQueue.push(...newCalls.reverse());
              if (!this.showCallOverlay) {
                this.processCallQueue();
              }
            }
            this.previousFirstCode = data[0].publicCode;
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
   * Procesa la cola de llamados mostrando un overlay por cada uno
   */
  private processCallQueue(): void {
    if (this.callQueue.length === 0) {
      return;
    }

    const nextCall = this.callQueue.shift();
    if (!nextCall) return;

    this.lastCalledCode = nextCall.publicCode;
    this.lastCalledBox = nextCall.boxNumber;
    this.showCallOverlay = true;
    this.playSound();


    setTimeout(() => {
      this.showCallOverlay = false;
      // Espera un momento antes de mostrar el siguiente para que no se solapen
      setTimeout(() => this.processCallQueue(), 500);
    }, 10000);
  }

  /**
   * Obtiene el branchId del usuario en localStorage
   */
  private getBranchId(): number {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return 1;

    try {
      const user = JSON.parse(raw);
      return Number(user?.branch) || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Muestra una alerta genérica
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
 * Reproduce un sonido de notificación.
 */
  private playSound(): void {
    if (this.audio) {
      this.audio.play().catch();
    }
  }
}
