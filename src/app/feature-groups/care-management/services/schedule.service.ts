import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ScheduleRequest } from '../models/schedule';

/**
 * Service to create a new schedule and get the generated id.
 */
@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  /**
   * HttpClient injection.
   * @param http
   */
  constructor(private http: HttpClient) {}

  private apiUrl = `${environment.apiUrl}/v2/configurations/schedules`;

  /**
   * Method to parse time.
   * @param time
   * @private
   */
  private normalizeTime(time: string): string {
    return time.length === 5 ? `${time}:00` : time;
  }

  /**
   * Post a new schedule.
   */
  postSchedule(scheduleRequest: ScheduleRequest): Observable<number> {
    return this.http.post<number>(this.apiUrl, {
      dayFrom: scheduleRequest.dayFrom,
      dayTo: scheduleRequest.dayTo,
      scheduleFromTime: this.normalizeTime(scheduleRequest.scheduleFromTime),
      scheduleToTime: this.normalizeTime(scheduleRequest.scheduleToTime),
      scheduleType: scheduleRequest.scheduleType
    });
  }

  /**
   * Method to get all the schedules from the branches.
   */
  getAllSchedules(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((schedules: any[]) =>
        schedules.map((schedule: any) => ({
          id: schedule.id,
          dayFrom: schedule.dayFrom,
          dayTo: schedule.dayTo,
          scheduleFromTime: schedule.scheduleFromTime,
          scheduleToTime: schedule.scheduleToTime,
          scheduleType: schedule.scheduleType
        }))
      )
    );
  }
}
