/**
 * Representa un usuario en el sistema con su información básica y rol.
 */
export interface User {
  id: number;
  name: string;
  role: UserRole;
}

/**
 * Define los roles posibles que un usuario puede tener en el sistema.
 */
export enum UserRole {
  TECNICO = 'Técnico de Laboratorio',
  BIOQUIMICO = 'Bioquímico',
}
