/**
 * Data Transfer Object for registering a new internal user.
 */
export interface InternalUserRegisterRequestDTO {
  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** User's document/ID number */
  document: string;

  /** User's email address */
  email: string;

  /** User's branch */
  branch?: number;

  /** Username chosen for login */
  username: string;

  /** List of role IDs assigned to the user */
  role: number[];
}
