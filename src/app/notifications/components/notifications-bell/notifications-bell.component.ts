import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';

import { PopoverModule } from 'primeng/popover';
import { forkJoin, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { UserPreferencesService } from 'src/app/feature-groups/user-management/services/user-preferences.service';

import { NotificationEventDto } from '../../models/notification-event.dto';
import { NotificationsService } from '../../services/notifications.service';
import { PriorityLabelPipe } from '../priority-label.pipe';

/**
 * Component for displaying the notifications bell icon.
 */
@Component({
  selector: 'app-notifications-bell',
  imports: [
    CommonModule,
    DatePipe,
    PriorityLabelPipe,
    PopoverModule // ✅ el único necesario
  ],
  templateUrl: './notifications-bell.component.html',
  styleUrls: ['./notifications-bell.component.css']
})
export class NotificationsBellComponent implements OnInit, OnDestroy {

  @Input() limit = 100;
  @Input() title = 'Notificaciones';
  @Input() enableSse = true;
  @Input() ssePath: string = '/api/v1/notifications/stream';
  @Input() user?: string;
  @Output() unreadCountChange = new EventEmitter<number>();

  isLoading = false;
  errorMsg: string | null = null;
  notifications: Array<NotificationEventDto & { isRead?: boolean }> = [];
  unreadCount = 0;

  private sub?: Subscription;
  private sseSub?: Subscription;

  private readonly preferencesService = inject(UserPreferencesService);

  /**
   * Constructs the NotificationsBellComponent.
   * @param notificationsService - Service for retrieving and managing notifications.
   * @param authService - Service providing authentication state and current user information.
   */
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService
  ) { }

  /**
   *dasd
   */
  protected toDate(ts: string | number): Date {
    const num = Number(ts);

    // Si es un número tipo "segundos UNIX"
    if (num < 2e12) return new Date(num * 1000);

    // Ya está en milisegundos
    return new Date(num);
  }

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    // Si no llega `user` por @Input, intentar obtenerlo del AuthService
    if (!this.user) {
      const current = this.authService.getUser();
      // Support possible shapes: username, userName, or first_name/last_name fallback
      this.user = current?.email ?? (current as any)?.email ??
        ((current?.firstName || current?.lastName) ? `${current?.firstName ?? ''} ${current?.lastName ?? ''}`.trim() : undefined);
    }

    // Semilla de contador de no leídas por usuario
    if (this.user) {
      this.notificationsService.getUnreadCount(this.user).subscribe(count => {
        this.unreadCount = count ?? 0;
        this.unreadCountChange.emit(this.unreadCount);
      });
    }

    this.fetch();

    // Verificar preferencia de notificaciones del navegador
    const browserNotificationsEnabled = this.preferencesService.getNotificationPreference('browser');

    if (this.enableSse && browserNotificationsEnabled) {
      // Escucha actualizaciones del backend sobre no leídas
      this.notificationsService.observeUnreadCount().subscribe(count => {
        this.unreadCount = count ?? 0;
        this.unreadCountChange.emit(this.unreadCount);
      });
      this.sseSub = this.notificationsService
        .connectSse(this.ssePath, this.user)
        .subscribe((evt) => {
          this.notifications = [...this.notifications, evt].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          if (this.notifications.length > this.limit) {
            this.notifications = this.notifications.slice(0, this.limit);
          }
        });
    }
  }

  /**
   * Refreshes the notifications list.
   */
  refresh(): void {
    this.fetch();
  }

  /**
   * Fetches notifications from the server.
   */
  private fetch(): void {
    if (this.sub) this.sub?.unsubscribe();
    this.errorMsg = null;
    this.isLoading = true;

    // Traer leídas y no leídas para poder mantenerlas en el listado
    const unread$ = this.notificationsService.getNotifications(this.limit, this.user, false);
    const read$ = this.notificationsService.getNotifications(this.limit, this.user, true);
    this.sub = forkJoin([unread$, read$]).subscribe({
      next: ([unread, read]) => {
        const withFlags: Array<NotificationEventDto & { isRead?: boolean }> = [
          ...(unread ?? []).map(n => ({ ...n, isRead: false })),
          ...(read ?? []).map(n => ({ ...n, isRead: true }))
        ];
        this.notifications = withFlags.sort(
          (a, b) => this.toDate(b.timestamp).getTime() - this.toDate(a.timestamp).getTime()
        );
        this.isLoading = false;
      },
      error: (err) => {
        this.notifications = [];
        this.errorMsg = this.extractError(err);
        this.isLoading = false;
      }
    });
  }



  /**
   * Opens a notification link in a new tab.
   */
  openNotification(n: NotificationEventDto & { isRead?: boolean }): void {
    const link = n.notification?.metadata?.link;
    if (link) window.open(link, '_blank');
  }

  /**
   *toggle read / unread status of a notification
   */
  toggleRead(n: NotificationEventDto & { isRead?: boolean }, ev?: MouseEvent): void {
    ev?.stopPropagation();
    if (!n?.id || !this.user) return;
    const req$ = n.isRead
      ? this.notificationsService.markOneAsUnread(n.id, this.user)
      : this.notificationsService.markOneAsRead(n.id, this.user);
    req$.subscribe({
      next: () => {
        n.isRead = !n.isRead;
        this.notificationsService.getUnreadCount(this.user!).subscribe(count => {
          this.unreadCount = count ?? 0;
          this.unreadCountChange.emit(this.unreadCount);
        });
      },
      error: () => { }
    });
  }

  /**
   * Marks all notifications as read.
   */
  markAllAsRead(): void {
    if (!this.user) return;
    const nowIso = new Date().toISOString();
    this.notificationsService.markAllAsRead(this.user, nowIso).subscribe({
      next: () => {
        const cutoff = new Date(nowIso).getTime();
        this.notifications = this.notifications.map(n => {
          const ts = new Date(n.timestamp).getTime();
          return ts <= cutoff ? { ...n, isRead: true } : n;
        }) as any;
        this.unreadCount = 0;
        this.unreadCountChange.emit(this.unreadCount);
      },
      error: () => { }
    });
  }

  /**
   * Extracts the error message from an error object.
   */
  private extractError(err: any): string {
    return err?.error?.message || err?.message || 'Error al obtener notificaciones';
  }

  /**
   * Clean up subscriptions on component destroy.
   */
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sseSub?.unsubscribe();
    this.notificationsService.disconnectSse();
  }
}
