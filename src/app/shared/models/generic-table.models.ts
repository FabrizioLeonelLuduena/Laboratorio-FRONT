import { PipeTransform, TemplateRef, Type } from '@angular/core';

/**
 * Arguments for pipes, either as a static array or a function that generates the array based on the row and value.
 */
export type PipeArgs =
  | any[]
  | ((row: any, value: any) => any[]);

/**
 * configuration for custom pipes defined by their token.
 */
export interface ColumnPipeConfigByToken {
  token: Type<PipeTransform>;
  args?: PipeArgs;
}

/**
 * configuration for built-in Angular pipes.
 */
export interface ColumnPipeConfigByName {
  name: 'date' | 'currency' | 'number' | 'percent' | 'titlecase' | 'uppercase' | 'lowercase' | 'scale';
  args?: PipeArgs;
}

/**
 *  Configuration for a pipe to be applied to a table column.
 */
export type ColumnPipeConfig = ColumnPipeConfigByToken | ColumnPipeConfigByName;

/**
 * Configuration interface for defining generic table columns.
 */
export interface GenericColumn {
  field: string;
  header: string;
  nullDisplay?: string;
  pipes?: ColumnPipeConfig[];
  sortable?: boolean;
  template?: TemplateRef<any>;
}
