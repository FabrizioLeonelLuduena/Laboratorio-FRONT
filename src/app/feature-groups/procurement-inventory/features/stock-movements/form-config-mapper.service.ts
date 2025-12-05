import { Injectable } from '@angular/core';

import { CollapsableFormField } from 'src/app/shared/components/collapsable-form/collapsable-form.component';
import {
  GenericFieldType,
  GenericFormField,
  GenericSelectOption
} from 'src/app/shared/components/generic-form/generic-form.component';

import { FormFieldConfig, FormSectionConfig, GenericFormConfig } from '../../models/form-config.model';

/**
 * Result of mapping form configuration
 */
export interface MappedFormConfig {
  fields: GenericFormField[];
  initialValues: Record<string, any>;
  maxCols: 1 | 2 | 3 | 4;
}

/**
 * Service for mapping form configurations to generic form fields
 */
@Injectable({
  providedIn: 'root'
})
export class FormConfigMapperService {
  /**
   * Map form configuration to fields and initial values
   */
  mapFormConfig(config: GenericFormConfig): GenericFormConfig {
    return JSON.parse(JSON.stringify(config)) as GenericFormConfig;
  }

  /**
   * Map configuration to fields, initial values and max columns
   */
  mapConfigToFields(config: GenericFormConfig): MappedFormConfig {
    const initialValues: Record<string, any> = {};
    const mappedFields: GenericFormField[] = [];

    config.sections.forEach((section: FormSectionConfig, index: number) => {
      if (config.sections.length > 1) {
        mappedFields.push({
          name: `divider-${index}`,
          label: section.title ?? '',
          type: 'divider',
          colSpan: 4,
          align: 'left'
        });
      }

      section.fields.forEach((field: FormFieldConfig) => {
        if (config.isEditMode && field.createOnly) return;
        if (!config.isEditMode && field.editOnly) return;

        const mapped = this.mapField(field, !!config.readonly);
        mappedFields.push(mapped);

        if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue;
        }
      });
    });

    const maxCol = mappedFields
      .filter(field => field.type !== 'divider')
      .reduce((max, field) => Math.max(max, field.colSpan ?? 1), 1);

    return {
      fields: mappedFields,
      initialValues,
      maxCols: Math.min(4, Math.max(1, maxCol)) as 1 | 2 | 3 | 4
    };
  }

  /**
   * Map individual field configuration
   */
  private mapField(field: FormFieldConfig, formReadonly: boolean): GenericFormField {
    const type = this.mapFieldType(field.type);
    const colSpan = this.mapColSpan(field.colSpan);

    if (type === 'array') {
      return {
        name: field.name,
        label: field.label,
        type,
        colSpan,
        required: !!field.required,
        hint: field.helpText,
        array: {
          itemFields: (field.arrayFields ?? []).map((child: FormFieldConfig) =>
            this.mapCollapsableField(child)
          ),
          itemsTitle: field.label,
          addLabel: field.addButtonLabel,
          defaultCollapsed: field.arrayDefaultCollapsed ?? false,
          minItems: field.arrayMinItems,
          maxItems: field.arrayMaxItems
        }
      };
    }

    const mapped: GenericFormField = {
      name: field.name,
      label: field.label,
      type,
      placeholder: field.placeholder,
      required: !!field.required,
      disabled: !!(formReadonly || field.disabled || field.readonly),
      hint: field.helpText,
      colSpan,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      minLength: field.minLength,
      maxLength: field.maxLength
    };

    if (type === 'select' || type === 'radio' || type === 'multiselect') {
      mapped.options = (field.options ?? []).map((opt: GenericSelectOption) => ({ ...opt }));
    }

    return mapped;
  }

  /**
   * Map field type
   */
  private mapFieldType(type: FormFieldConfig['type']): GenericFieldType {
    if (type === 'phone') return 'tel';
    return type as GenericFieldType;
  }

  /**
   * Map child field to collapsable configuration
   */
  private mapCollapsableField(field: FormFieldConfig): CollapsableFormField {
    return {
      name: field.name,
      label: field.label,
      type: this.mapCollapsableFieldType(field.type),
      placeholder: field.placeholder,
      required: !!field.required,
      options: (field.options ?? []).map(opt => ({ ...opt })),
      showInSummary: field.showInSummary
    };
  }

  /**
   * Map to supported collapsable field types
   */
  private mapCollapsableFieldType(type: FormFieldConfig['type']): CollapsableFormField['type'] {
    switch (type) {
    case 'number':
      return 'number';
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'select':
      return 'select';
    default:
      return 'text';
    }
  }

  /**
   * Map column span
   */
  private mapColSpan(colSpan?: number): 1 | 2 | 3 | 4 {
    if (!colSpan) return 1;
    if (colSpan >= 12) return 4;
    if (colSpan >= 9) return 3;
    if (colSpan >= 6) return 2;
    return 1;
  }

  /**
   * Update field options in a field array
   */
  updateFieldOptions(fields: GenericFormField[], fieldName: string, options: GenericSelectOption[]): void {
    for (const field of fields) {
      if (field.name === fieldName) {
        field.options = options.map(opt => ({ ...opt }));
      }

      if (field.type === 'array' && field.array?.itemFields) {
        field.array.itemFields = field.array.itemFields.map(itemField => {
          if (itemField.name === fieldName) {
            return {
              ...itemField,
              options: options.map(opt => ({ ...opt }))
            };
          }
          return itemField;
        });
      }
    }
  }
}