/** DTO del backend: CreateRegistersRequestDTO */
export interface CreateRegistersRequestDTO {
  branch_id: number;
  quantity: number;
}

/** DTO del backend: CashRegisterDTO */
export interface CashRegisterDTO {
  register_id: number;
  branch_id: number;
  description: string;
  status: boolean;
}


// ===== DTOs and Helper Types (scoped to this service file) =====

/**
 *
 */
export interface CashRegisterForMainDTO {
  registerId: number;
  branchId: number;
  description: string;
  status: boolean;
  currentAmount: number;
  isMain: boolean;
}

/**
 *
 */
export interface CashSessionDTO {
  sessionId: number;
  userId: number;
  cashRegisterId: number;
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  finalCash?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

/**
 *
 */
export interface EmptyRegisterRequestDTO {
  amount: number;
}

/**
 *
 */
export interface EmptyRegisterResponseDTO {
  sourceRegisterId: number;
  mainRegisterId: number;
  movedAmount: number;
  sourceNewAmount: number;
  mainNewAmount: number;
}

/**
 *
 */
export interface BranchRegistersDTO {
  branchId: number;
  registers: RegisterBranchViewDTO[];
}

/**
 *
 */
export interface RegisterBranchViewDTO {
  registerId: number;
  description: string;
  sessionUserId?: number;
  sessionStatus?: 'OPEN' | 'CLOSED' | 'CANCELLED';
  initialCash?: number;
  currentCash: number;
}

/**
 *
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
}

/**
 *
 */
export interface RegisterSessionsFilter {
  page?: number;
  size?: number;
  sort?: string;
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED';
  userId?: number;
  openedFrom?: string; // ISO string
  openedTo?: string;   // ISO string
}

