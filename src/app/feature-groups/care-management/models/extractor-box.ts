import { InternalUser } from '../../user-management/models/InternalUser';

/**
 * Represents an extractor box used in the care management system.
 */
export interface ExtractorBox {
  id: number;
  name: string;
  key: string;
  assignedUser: InternalUser | null;
}
