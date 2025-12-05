import { Injectable, signal } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

/**
 * Types of notifications that can be displayed.
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Interface for notification messages.
 */
export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

/**
 * Simple notification service for displaying user messages.
 * This is a basic implementation that can be easily replaced with
 * Angular Material's MatSnackBar or other notification libraries.
 * 
 * @example
 * ```typescript
 * constructor(private notifications: NotificationService) {}
 * 
 * showSuccess() {
 *   this.notifications.success('Operation completed successfully');
 * }
 * 
 * showError() {
 *   this.notifications.error('An error occurred', 'Please try again');
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  /** Subject for notification messages */
  private readonly notificationSubject = new BehaviorSubject<NotificationMessage[]>([]);
  
  /** Observable for components to subscribe to notifications */
  readonly notifications$ = this.notificationSubject.asObservable();
  
  /** Current notifications array */
  private notifications: NotificationMessage[] = [];
  
  /** Signal for reactive components */
  readonly notificationsSignal = signal<NotificationMessage[]>([]);

  /**
   * Shows a success notification.
   * 
   * @param message - The success message to display
   * @param title - Optional title (default: 'Éxito')
   * @param duration - Display duration in milliseconds (default: 3000)
   * 
   * @example
   * ```typescript
   * this.notifications.success('Configuration saved successfully');
   * this.notifications.success('Data updated', 'Update Complete', 5000);
   * ```
   */
  success(message: string, title: string = 'Éxito', duration: number = 3000): void {
    this.addNotification({
      id: this.generateId(),
      type: NotificationType.SUCCESS,
      title,
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Shows an error notification.
   * 
   * @param message - The error message to display
   * @param title - Optional title (default: 'Error')
   * @param duration - Display duration in milliseconds (default: 5000)
   * 
   * @example
   * ```typescript
   * this.notifications.error('Failed to save data');
   * this.notifications.error('Network error', 'Connection Failed', 8000);
   * ```
   */
  error(message: string, title: string = 'Error', duration: number = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: NotificationType.ERROR,
      title,
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Shows a warning notification.
   * 
   * @param message - The warning message to display
   * @param title - Optional title (default: 'Advertencia')
   * @param duration - Display duration in milliseconds (default: 4000)
   * 
   * @example
   * ```typescript
   * this.notifications.warning('This action cannot be undone');
   * ```
   */
  warning(message: string, title: string = 'Advertencia', duration: number = 4000): void {
    this.addNotification({
      id: this.generateId(),
      type: NotificationType.WARNING,
      title,
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Shows an info notification.
   * 
   * @param message - The info message to display
   * @param title - Optional title (default: 'Información')
   * @param duration - Display duration in milliseconds (default: 3000)
   * 
   * @example
   * ```typescript
   * this.notifications.info('Loading data, please wait...');
   * ```
   */
  info(message: string, title: string = 'Información', duration: number = 3000): void {
    this.addNotification({
      id: this.generateId(),
      type: NotificationType.INFO,
      title,
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Removes a specific notification by ID.
   * 
   * @param id - The notification ID to remove
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.updateNotifications();
  }

  /**
   * Clears all notifications.
   */
  clear(): void {
    this.notifications = [];
    this.updateNotifications();
  }

  /**
   * Gets the current notifications array.
   * 
   * @returns Array of current notifications
   */
  getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  /**
   * Adds a new notification to the queue and handles auto-removal.
   * 
   * @param notification - The notification to add
   * @private
   */
  private addNotification(notification: NotificationMessage): void {
    this.notifications.push(notification);
    this.updateNotifications();
    
    // Log to console for development
    this.logToConsole(notification);
    
    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Updates the notification subjects and signals.
   * 
   * @private
   */
  private updateNotifications(): void {
    this.notificationSubject.next([...this.notifications]);
    this.notificationsSignal.set([...this.notifications]);
  }

  /**
   * Logs notification to console for development purposes.
   * 
   * @param notification - The notification to log
   * @private
   */
  private logToConsole(notification: NotificationMessage): void {
    const timestamp = notification.timestamp.toLocaleTimeString();
    const logMessage = `[${timestamp}] ${notification.type.toUpperCase()}: ${notification.title} - ${notification.message}`;
    
    switch (notification.type) {
    case NotificationType.SUCCESS:
      // eslint-disable-next-line no-console
      console.log(`${logMessage}`);
      break;
    case NotificationType.ERROR:
      // eslint-disable-next-line no-console
      console.error(`${logMessage}`);
      break;
    case NotificationType.WARNING:
      // eslint-disable-next-line no-console
      console.warn(`${logMessage}`);
      break;
    case NotificationType.INFO:
      // eslint-disable-next-line no-console
      console.info(`ℹ️ ${logMessage}`);
      break;
    }
  }

  /**
   * Generates a unique ID for notifications.
   * 
   * @returns Unique notification ID
   * @private
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}