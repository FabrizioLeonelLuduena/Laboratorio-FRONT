/**
 * Represents a user in the system with their basic information and role.
 * @interface User
 */
export interface User {
  id: number;
  name: string;
  role: UserRole;
}

/**
 * Defines the possible roles a user can have in the system.
 * @readonly
 * @enum {string}
 */
export enum UserRole {
  TECNICO = 'Técnico de Laboratorio',
  BIOQUIMICO = 'Bioquímico',
}
