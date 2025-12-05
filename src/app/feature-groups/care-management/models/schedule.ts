/**
 * Interface that represents a schedule for a branch.
 */
export interface Schedule {
  id: number;
  dayFrom: string;
  dayTo: string;
  scheduleFromTime: string;
  scheduleToTime: string;
  scheduleType: string;
}

/**
 * Interface to do a request to the API.
 */
export interface ScheduleRequest {
  dayFrom: string;
  dayTo: string;
  scheduleFromTime: string;
  scheduleToTime: string;
  scheduleType: string;
}
