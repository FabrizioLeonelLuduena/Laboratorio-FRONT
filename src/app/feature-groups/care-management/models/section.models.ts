/**
 * Interface that represents a section into an area on the branch.
 */
export interface SectionResponse {
  id: number;
  name: string;
  isActive: boolean;
}

/**
 * Interface to create a section
 */
export interface SectionRequest {
  name: string;
}

/**
 * Interface that represents the necessary data to update section's relation with branches.
 */
export interface UpdateSectionRelationsRequest{
  id: number;
}
