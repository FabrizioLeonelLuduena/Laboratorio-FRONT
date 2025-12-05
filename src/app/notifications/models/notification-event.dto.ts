/**
 *
 */
export interface NotificationEventDto {
  id: string;
  source: string;
  eventType: string;
  timestamp: string; // ISO-8601
  recipients: RecipientsDto;
  notification: NotificationPayloadDto;
}

/**
 *
 */
export interface RecipientsDto {
  users: string[];
  roles: string[];
  plants: string[];
  departments: string[];
}

/**
 *
 */
export interface NotificationPayloadDto {
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  metadata?: MetadataDto;
}

/**
 *
 */
export interface MetadataDto {
  orderId?: number;
  link?: string;
  icon?: string;
}

/**
 *
 */
export interface ErrorApi {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

