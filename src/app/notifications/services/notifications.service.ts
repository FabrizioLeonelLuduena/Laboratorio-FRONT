import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

import { map } from 'rxjs/operators';

import { NotificationEventDto } from '../models/notification-event.dto';


/**
 * Service for managing system notifications.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/notifications`;
  private readonly commonHeaders = new HttpHeaders({
    Accept: 'application/json'
  });

  private es?: EventSource;
  private sse$ = new Subject<NotificationEventDto>();
  private unread$ = new Subject<number>();

  /**
   * Retrieves notifications for a user.
   */
  getNotifications(limit = 100, user?: string, read?: boolean): Observable<NotificationEventDto[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (user) params = params.set('user', user);
    if (typeof read === 'boolean') params = params.set('read', String(read));
    return this.http.get<NotificationEventDto[]>(`${this.baseUrl}`, {
      headers: this.commonHeaders,
      params
    });
  }

  /**
   *publishes a notification.
   */
  publishNotification(payload: NotificationEventDto): Observable<NotificationEventDto> {
    const headers = this.commonHeaders.set('Content-Type', 'application/json');
    return this.http.post<NotificationEventDto>(`${this.baseUrl}`, payload, {
      headers
    });
  }

  private _localUnread = 0;


  /**
   *connects to SSE
   */
  connectSse(ssePath: string = '/api/v1/notifications/stream', user?: string): Observable<NotificationEventDto> {
    try {
      this.disconnectSse();

      let url = ssePath;
      if (!/^https?:\/\//i.test(ssePath)) {
        if (ssePath.startsWith('/')) {
          url = ssePath;
        } else {
          const base = this.baseUrl.replace(/\/$/, '');
          const path = ssePath.replace(/^\//, '');
          url = `${base}/${path}`;
        }
      }

      if (user) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}user=${encodeURIComponent(user)}`;
      }

      this.es = new EventSource(url);

      this.es.addEventListener('message', (ev: MessageEvent<string>) => {
        try {
          const data = JSON.parse((ev as any).data);

          this.sse$.next(data as NotificationEventDto);

          const curr = (this._localUnread ?? 0) + 1;
          this._localUnread = curr;
          this.unread$.next(curr);

        } catch {
          return;
        }
      });

      this.es.addEventListener('unread-count', (ev: MessageEvent<string>) => {
        try {
          const data = JSON.parse((ev as any).data);
          const count = typeof data === 'number' ? data : Number(data?.count ?? 0);

          // 🔄 sincronizamos el contador local
          this._localUnread = Number.isFinite(count) ? count : 0;

          this.unread$.next(this._localUnread);
        } catch {
          return;
        }
      });

      this.es.addEventListener('connected', () => {});
      this.es.onerror = () => {};
    } catch {}

    return this.sse$.asObservable();
  }


  /**
   *disconnects from SSE
   */
  disconnectSse(): void {
    if (this.es) {
      try { this.es.close(); } catch {}
      this.es = undefined;
    }
  }

  /**
   *observe unread count.
   */
  observeUnreadCount(): Observable<number> {
    return this.unread$.asObservable();
  }

  /**
   *get unread count.
   */
  getUnreadCount(user?: string): Observable<number> {
    const params = user ? new HttpParams().set('user', user) : new HttpParams();
    return this.http.get<any>(`${this.baseUrl}/unread-count`, {
      headers: this.commonHeaders,
      params
    }).pipe(mapRespToCount);
  }

  /**
   *marks all notification as unread.
   */
  markAllAsRead(user?: string, upToTimestamp?: string): Observable<{ updated: number } | void> {
    const headers = this.commonHeaders.set('Content-Type', 'application/json');
    const body: any = {};
    if (user) body.user = user;
    if (upToTimestamp) body.up_to_timestamp = upToTimestamp;
    return this.http.post<{ updated: number } | void>(`${this.baseUrl}/read`, body, { headers });
  }

  /**
   *marks one notification as unread.
   */
  markOneAsRead(id: string, user?: string): Observable<{ updated: number } | void> {
    let url = `${this.baseUrl}/${encodeURIComponent(id)}/read`;
    if (user) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}user=${encodeURIComponent(user)}`;
    }
    const headers = this.commonHeaders.set('Content-Type', 'application/json');
    return this.http.post<{ updated: number } | void>(url, {}, { headers });
  }

  /**
   * marks one notification as unread.
   */
  markOneAsUnread(id: string, user?: string): Observable<{ updated: number } | void> {
    let url = `${this.baseUrl}/${encodeURIComponent(id)}/unread`;
    if (user) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}user=${encodeURIComponent(user)}`;
    }
    const headers = this.commonHeaders.set('Content-Type', 'application/json');
    return this.http.post<{ updated: number } | void>(url, {}, { headers });
  }
}

const mapRespToCount = map((resp: any) => {
  if (resp == null) return 0;
  if (typeof resp === 'number') return resp;
  if (typeof resp.count === 'number') return resp.count;
  return 0;
});
