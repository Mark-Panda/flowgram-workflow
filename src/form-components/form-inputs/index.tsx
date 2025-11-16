/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Field } from '@flowgram.ai/free-layout-editor';
import { DynamicValueInput, PromptEditorWithVariables } from '@flowgram.ai/form-materials';

import { VariablePicker } from '../variable-picker';
import { FormItem } from '../form-item';
import { Feedback } from '../feedback';
import { JsonSchema } from '../../typings';
import { useNodeRenderContext } from '../../hooks';
import { SqlTemplateEditor } from './sql-template-editor';
import { RuleSelect } from './rule-select';
import { NodeIdSelect } from './node-id-select';
import { NodeIdMultiSelect } from './node-id-multi-select';

export function FormInputs() {
  const { readonly } = useNodeRenderContext();

  return (
    <Field<JsonSchema> name="inputs">
      {({ field: inputsField }) => {
        const required = inputsField.value?.required || [];
        const properties = inputsField.value?.properties;
        if (!properties) {
          return <></>;
        }
        const content = Object.keys(properties).map((key) => {
          const property = properties[key];

          const formComponent = property.extra?.formComponent;
          const displayLabel = property.extra?.label || key;

          const vertical = ['prompt-editor', 'sql-editor'].includes(formComponent || '');

          return (
            <Field key={key} name={`inputsValues.${key}`} defaultValue={property.default}>
              {({ field, fieldState }) => {
                const isTemplate = (field.value as any)?.type === 'template';
                const needsToggle = false;
                const renderCore = () => {
                  if (formComponent === 'prompt-editor') {
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <PromptEditorWithVariables
                            value={field.value}
                            onChange={field.onChange}
                            readonly={readonly}
                            hasError={Object.keys(fieldState?.errors || {}).length > 0}
                          />
                        </div>
                        <VariablePicker
                          size="small"
                          disabled={readonly}
                          onInsert={(text) => {
                            const oldText =
                              typeof (field.value as any)?.content === 'string'
                                ? String((field.value as any)?.content)
                                : '';
                            const nextText = oldText ? `${oldText}${text}` : text;
                            field.onChange({ type: 'template', content: nextText } as any);
                          }}
                        />
                      </div>
                    );
                  }
                  if (formComponent === 'sql-editor') {
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <SqlTemplateEditor
                            value={field.value}
                            onChange={field.onChange}
                            readonly={readonly}
                            hasError={Object.keys(fieldState?.errors || {}).length > 0}
                          />
                        </div>
                        <VariablePicker
                          size="small"
                          disabled={readonly}
                          onInsert={(text) => {
                            const oldText =
                              typeof (field.value as any)?.content === 'string'
                                ? String((field.value as any)?.content)
                                : '';
                            const nextText = oldText ? `${oldText}${text}` : text;
                            field.onChange({ type: 'template', content: nextText } as any);
                          }}
                        />
                      </div>
                    );
                  }
                  if (isTemplate || !formComponent) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <DynamicValueInput
                            value={field.value}
                            onChange={field.onChange}
                            readonly={readonly}
                            hasError={Object.keys(fieldState?.errors || {}).length > 0}
                            schema={property}
                          />
                        </div>
                        <VariablePicker
                          size="small"
                          disabled={readonly}
                          onInsert={(text) => {
                            const oldText =
                              typeof (field.value as any)?.content === 'string'
                                ? String((field.value as any)?.content)
                                : '';
                            const nextText = oldText ? `${oldText}${text}` : text;
                            field.onChange({ type: 'template', content: nextText } as any);
                          }}
                        />
                      </div>
                    );
                  }
                  if (formComponent === 'node-selector') {
                    return (
                      <NodeIdSelect
                        value={field.value}
                        onChange={field.onChange}
                        readonly={readonly}
                        hasError={Object.keys(fieldState?.errors || {}).length > 0}
                      />
                    );
                  }
                  if (formComponent === 'node-selector-multi') {
                    return (
                      <NodeIdMultiSelect
                        value={field.value}
                        onChange={field.onChange}
                        readonly={readonly}
                        hasError={Object.keys(fieldState?.errors || {}).length > 0}
                      />
                    );
                  }
                  if (formComponent === 'enum-select') {
                    return (
                      <EnumSelect
                        value={field.value}
                        onChange={field.onChange}
                        readonly={readonly}
                        hasError={Object.keys(fieldState?.errors || {}).length > 0}
                        schema={property}
                      />
                    );
                  }
                  if (formComponent === 'rule-select') {
                    return (
                      <RuleSelect
                        value={field.value}
                        onChange={field.onChange}
                        readonly={readonly}
                        hasError={Object.keys(fieldState?.errors || {}).length > 0}
                      />
                    );
                  }
                  if (formComponent === 'array-editor') {
                    return (
                      <ArrayEditor
                        value={field.value}
                        onChange={field.onChange}
                        readonly={readonly}
                        hasError={Object.keys(fieldState?.errors || {}).length > 0}
                      />
                    );
                  }
                  return (
                    <DynamicValueInput
                      value={field.value}
                      onChange={field.onChange}
                      readonly={readonly}
                      hasError={Object.keys(fieldState?.errors || {}).length > 0}
                      schema={property}
                    />
                  );
                };

                return (
                  <FormItem
                    name={displayLabel}
                    vertical={vertical}
                    type={property.type as string}
                    required={required.includes(key)}
                    description={property.extra?.description}
                  >
                    {null}
                    {renderCore()}
                    <Feedback errors={fieldState?.errors} warnings={fieldState?.warnings} />
                  </FormItem>
                );
              }}
            </Field>
          );
        });
        return <>{content}</>;
      }}
    </Field>
  );
}
import { EnumSelect } from './enum-select';
import { ArrayEditor } from './array-editor';
