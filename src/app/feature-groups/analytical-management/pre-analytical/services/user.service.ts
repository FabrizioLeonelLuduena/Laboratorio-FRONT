import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { User, UserRole } from '../../analytical/models/user.interface';

/**
 * Service responsible for managing user-related operations.
 * Provides methods to retrieve and manage user information.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  /**
   * Retrieves the currently authenticated user.
   * @TODO Replace with actual implementation that fetches from backend
   * @returns {User} The current user object with id, name, and role.
   * @throws Will throw an error if no user is currently authenticated.
   */
  getCurrentUser(): User {
    return {
      id: 1,
      name: 'Dr. Maria González',
      role: UserRole.TECNICO
    };
  }
}
