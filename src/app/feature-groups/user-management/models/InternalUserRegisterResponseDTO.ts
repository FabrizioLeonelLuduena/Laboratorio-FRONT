/**
 * Data Transfer Object representing the response after registering a user.
 */
export interface InternalUserRegisterResponseDTO {
  /** Unique identifier of the user */
  id: number;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** User's document/ID number */
  document: string;

  /** User's email address */
  email: string;

  /** Username used for login */
  userName: string;

  /** Indicates whether the user is active */
  isActive: boolean;

  /** Identifier of the branch associated with the user. */
  branch: number;

  /** Informational or error message from the API */
  message: string;
}
