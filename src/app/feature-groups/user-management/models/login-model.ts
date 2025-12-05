/**
 *  Model representing a user as returned by the backend.
 */
export interface UserResponse {
  id: number,
  firstName: string
  lastName: string,
  username: string,
  email: string,
  document: string,
  isActive: boolean,
  isEmailVerified: boolean,
  isExternal: boolean,
  createdDatetime: Date,
  lastUpdatedDatetime: Date,
  roles: { id: number, name: string }[],
  isFirstLogin: boolean,
  branchId?: number
}

/**
 *  Model representing a login request with username and password.
 */
export interface LoginRequest {
  username: string,
  password: string
}

/**
 *  Model representing the response from a login attempt, including user details and token.
 */
export interface LoginResponse {
  success: boolean,
  message: string,
  user: UserResponse | null,
  token: string
  firstLoginToken?: string
}
