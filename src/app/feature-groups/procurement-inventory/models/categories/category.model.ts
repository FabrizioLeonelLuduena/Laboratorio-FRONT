/**
 * Response category dto
 */
export interface ResponseCategoryDTO {
    id: number,
    name: string,
    parentCategory: null | ResponseCategoryDTO,
    isActive: boolean
}
