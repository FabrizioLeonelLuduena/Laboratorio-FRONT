
/**
 * Data Transfer Object for updating user information
 **/
export interface UpdateUserRequestDTO {
  /** User’s first name. */
  firstName: string;

  /** User’s last name. */
  lastName: string;

  /** Username used to log in. */
  username: string;

  /** User’s email address. */
  email: string;

  /** Identification document (digits only, sent as string). */
  document: string;

  /** List of role IDs assigned to the user. */
  roleId: number[];

  /** Branch ID associated with the user. Optional on update. */
  branchId?: number;
}
