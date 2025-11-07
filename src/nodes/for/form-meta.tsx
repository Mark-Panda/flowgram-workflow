/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormRenderProps, FlowNodeJSON, Field, FormMeta } from '@flowgram.ai/free-layout-editor';
import { SubCanvasRender } from '@flowgram.ai/free-container-plugin';
import {
  BatchOutputs,
  createBatchOutputsFormPlugin,
  DisplayOutputs,
  IFlowValue,
  IFlowRefValue,
} from '@flowgram.ai/form-materials';

import { defaultFormMeta } from '../default-form-meta';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { FormHeader, FormContent, FormItem, Feedback } from '../../form-components';
import { Input, Select } from '@douyinfe/semi-ui';
import { useService, WorkflowDocument } from '@flowgram.ai/free-layout-editor';
import { WorkflowNodeType } from '../constants';

// 使用通用 FlowNodeJSON 即可，无需特定 forFor 字段
type ForNodeJSON = FlowNodeJSON;

export const ForFormRender = ({ form }: FormRenderProps<ForNodeJSON>) => {
  const isSidebar = useIsSidebar();
  const { readonly, node } = useNodeRenderContext();
  const formHeight = 115;

  // 移除 forFor 输入框

  const document = useService(WorkflowDocument);
  const nodeIdLinked = (
    <Field<IFlowValue> name={`nodeId`}>
      {({ field, fieldState }) => {
        const children = document
          .getAllNodes()
          .filter((n) => n.parent?.id === node.id);
        const validChildren = children.filter(
          (n) =>
            ![WorkflowNodeType.BlockStart, WorkflowNodeType.BlockEnd].includes(
              n.flowNodeType as WorkflowNodeType
            )
        );
        const firstChildId = validChildren[0]?.id ?? '';
        if ((field.value?.content as string) !== firstChildId) {
          // 联动填充为子画布中的第一个子节点ID
          field.onChange({ type: 'constant', content: firstChildId });
        }
        return (
          <FormItem name={'nodeId'} type={'string'} required>
            <Input value={firstChildId} disabled placeholder="请选择在子画布中连接的单个节点" />
            <Feedback errors={fieldState?.errors} />
          </FormItem>
        );
      }}
    </Field>
  );

  const textInput = (
    <Field<IFlowValue> name={`note`}>
      {({ field, fieldState }) => (
        <FormItem name={'note'} type={'string'}>
          <Input
            value={typeof field.value?.content === 'string' ? (field.value?.content as string) : ''}
            onChange={(val) => field.onChange({ type: 'constant', content: val })}
            disabled={readonly}
          />
          <Feedback errors={fieldState?.errors} />
        </FormItem>
      )}
    </Field>
  );

  const modeSelect = (
    <Field<IFlowValue> name={`operationMode`}>
      {({ field, fieldState }) => (
        <FormItem name={'operationMode'} type={'number'}>
          <Select
            value={(field.value?.content as number) ?? undefined}
            onChange={(val) => field.onChange({ type: 'constant', content: val })}
            disabled={readonly}
            optionList={[
              { label: '0 - 忽略', value: 0 },
              { label: '1 - 追加', value: 1 },
              { label: '2 - 覆盖', value: 2 },
              { label: '3 - 异步执行', value: 3 },
            ]}
            style={{ width: '100%' }}
          />
          <Feedback errors={fieldState?.errors} />
        </FormItem>
      )}
    </Field>
  );

  const forOutputs = (
    <Field<Record<string, IFlowRefValue | undefined> | undefined> name={`forOutputs`}>
      {({ field, fieldState }) => (
        <FormItem name="forOutputs" type="object" vertical>
          <BatchOutputs
            style={{ width: '100%' }}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            readonly={readonly}
            hasError={Object.keys(fieldState?.errors || {}).length > 0}
          />
          <Feedback errors={fieldState?.errors} />
        </FormItem>
      )}
    </Field>
  );

  if (isSidebar) {
    return (
      <>
        <FormHeader />
        <FormContent>
          {/* 已删除 forFor */}
          {textInput}
          {modeSelect}
          {nodeIdLinked}
          {forOutputs}
        </FormContent>
      </>
    );
  }
  return (
    <>
      <FormHeader />
      <FormContent>
        {/* 已删除 forFor */}
        {nodeIdLinked}
        {textInput}
        {modeSelect}
        <SubCanvasRender offsetY={0} />
        <DisplayOutputs displayFromScope />
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta = {
  ...defaultFormMeta,
  render: ForFormRender,
  // 移除 forFor 的 effect 映射
  plugins: [createBatchOutputsFormPlugin({ outputKey: 'forOutputs', inferTargetKey: 'outputs' })],
};
