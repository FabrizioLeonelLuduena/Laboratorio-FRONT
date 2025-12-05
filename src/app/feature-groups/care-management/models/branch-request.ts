import { AddressRequest } from './address';
import { ContactRequest } from './contact';
import { ResponsibleRequest } from './responsible';
import { ScheduleRequest } from './schedule';
import { WorkspaceRequest } from './workspace.models';

/**
 * Interface that represents the request to save a branch.
 */
export interface BranchRequest {
  code: string;
  description: string;
  schedules: ScheduleRequest[];
  responsible: ResponsibleRequest;
  address: AddressRequest;
  contacts: ContactRequest[];
  workspaces: WorkspaceRequest[];
  boxCount: number;
  registerCount: number;
  assistantDesk: number;
}

/**
 * Interface that represents the request to update a branch.
 */
export interface BranchUpdateRequest {
  description: string;
  schedules: ScheduleRequest[];
  responsible: ResponsibleRequest;
  address: AddressRequest;
  contacts: ContactRequest[];
  status: string;
  // Complete list of area/section relations (final state)
  workspaces?: WorkspaceRequest[];
  boxCount: number;
  registerCount: number;
  assistantDesk: number;
}
