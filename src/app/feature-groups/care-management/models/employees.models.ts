/** Employee entity returned by the API */
export interface EmployeeResponse {
  id: number;
  name: string;
  lastName: string;
  document: string;
  dateOfBirth: string;
  dateOfJoining: string;
  dateOfLeaving: string;
  status: string;
  registration?: string | null;
  isExternal?: boolean | null;
  isBiochemist?: boolean | null;
  zone?: string | null;
  userId: number;
  username: string | null;
  contacts: ContactEmployeeRequest[];
  permissions: RoleResponse[];
  createdDatetime: string;
  lastUpdatedDatetime: string;
  createdUser: string;
  lastUpdatedUser: string;

  grossSalary: number;
  netSalary: number;
}

/** Employee contact Entity */
export interface ContactEmployeeRequest {
  contactType: string;
  contact: string;
}

/** Page wrapper for employee list */
export interface EmployeePageResponse {
  content: EmployeeResponse[];
  totalElements: number;
}

/** Payload to create/update a employee */
export interface EmployeeRequest {
  name: string;
  lastName: string;
  document: string;
  username: string;
  dateOfBirth: string;
  registration?: string | null;
  isExternal?: boolean | null;
  zone?: string | null;
  contacts: ContactEmployeeRequest[];
  permissions: RoleResponse[];
  branchId?: number;
  grossSalary: number;
  netSalary: number;
}

/**
 * Employee role entity
 */
export interface RoleResponse {
  id: number;
  description: string;
}


/**
 * Personal data interface
 */
export interface PersonalData {
  name: string;
  lastName: string;
  document: string;
  dateOfBirth: Date | string;
  username?: string;
}

/**
 * Salary data interface
 */
export interface SalaryData {
  grossSalary: number;
  netSalary: number;
}
