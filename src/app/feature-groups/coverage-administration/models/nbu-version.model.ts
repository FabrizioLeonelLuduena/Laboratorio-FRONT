/**
 * NBU Version DTO
 */
export interface NbuVersionDTO {
  id: number;
  entityVersion: number;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  createdUser: string;
  lastUpdatedUser: string;
  versionCode: string;
  publicationYear: number;
  updateYear: number;
  publicationDate: string;
  effectivityDate: string;
  endDate: string;
}
