/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormMeta, FormRenderProps, ValidateTrigger } from '@flowgram.ai/free-layout-editor';

import { FormHeader, FormContent } from '../../form-components';
import { TransformCode } from './components/code';
import { TransformPortHints } from './components/port-hints';
import { TransformNodeJSON } from './types';

export const FormRender = ({ form }: FormRenderProps<TransformNodeJSON>) => (
  <>
    <FormHeader />
    <FormContent>
      {/* 画布上显示端口提示（success / failed） */}
      <TransformPortHints />
      <TransformCode />
    </FormContent>
  </>
);

const SIGNATURE_REG = /^(?:\s*async\s+)?function\s+Transform\s*\(\s*msg\s*,\s*metadata\s*,\s*msgType\s*,\s*dataType\s*\)\s*\{/m;

export const formMeta: FormMeta = {
  render: (props) => <FormRender {...props} />,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }) => (value ? undefined : 'Title is required'),
    'script.content': ({ value }) => {
      const text = String(value ?? '');
      if (!SIGNATURE_REG.test(text)) {
        return '函数名必须为 Transform，入参必须为 msg, metadata, msgType, dataType';
      }
      return undefined;
    },
  },
  effect: {},
};
