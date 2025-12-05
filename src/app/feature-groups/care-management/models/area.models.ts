import { SectionRequest, SectionResponse, UpdateSectionRelationsRequest } from './section.models';

/**
 * Interface that represents an area into the branch.
 */
export interface AreaRequest {
  name: string;
  type: string;
  isExternal: boolean;
  sections: SectionRequest[];
}

/**
 * Interface that represents the response of the area from the backend.
 */
export interface AreaResponse {
  id: number;
  name: string;
  type: string;
  isExternal: boolean;
  isActive: boolean;
  sections: SectionResponse[];
}

/**
 * Interface that represents the necessary data to update area's relation with branches.
 */
export interface UpdateAreaRelationRequest {
  branchId: number;
  areaId: number;
  sections: UpdateSectionRelationsRequest[];
}
