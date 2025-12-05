import { RolesResponseDTO } from './RolesResponseDTO';

/**
 * Represents an internal user within the system.
 *
 * Contains personal information, account status, and associated roles.
 * This interface is mainly used in the internal user management and authentication modules.
 *
 * @interface InternalUser
 */
export interface InternalUser {
  /** Unique identifier of the internal user. */
  id: number;

  /** User’s first name. */
  firstName: string;

  /** User’s last name. */
  lastName: string;

  /** Username used to log in. */
  username: string;

  /** User’s email address. */
  email: string;

  /** Identification document (e.g., national ID or employee number). */
  document: string;

  /** Indicates whether the user account is active. */
  isActive: boolean;

  /** Indicates whether the user’s email address has been verified. */
  isEmailVerified: boolean;

  /** Indicates whether the user was created externally (e.g., by an external system). */
  isExternal: boolean;

  /** ISO 8601 timestamp representing when the user was created (e.g., YYYY-MM-DDTHH:mm:ssZ). */
  createdDatetime: string;

  /** ISO 8601 timestamp representing when the user was last updated (e.g., YYYY-MM-DDTHH:mm:ssZ). */
  lastUpdatedDatetime: string;

  /** List of roles assigned to the user (e.g., ["ADMIN", "USER"]). */
  roles: RolesResponseDTO[];

  /** Branch ID associated with the user. */
  branchId: number;
}

