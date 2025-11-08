/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';

let index = 0;

export const JoinNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Join,
  info: {
    icon: '',
    description: '合并节点: 等待所有子节点执行完成后合并输出.',
  },
  meta: {
    // 设置端口：一个输入，两个输出（success / failed）
    defaultPorts: [
      { type: 'input', location: 'left' },
      { type: 'output', location: 'right', portID: 'success' },
      { type: 'output', location: 'bottom', portID: 'failed' },
    ],
    size: {
      width: 360,
      height: 240,
    },
  },
  onAdd() {
    return {
      id: `${nanoid(16)}`,
      type: WorkflowNodeType.Join,
      data: {
        title: `Join_${++index}`,
        inputsValues: {
          timeout: { type: 'constant', content: 0 },
        },
        inputs: {
          type: 'object',
          required: ['timeout'],
          properties: {
            timeout: { type: 'number' },
          },
        },
        outputs: {
          type: 'object',
          properties: {},
        },
      },
    };
  },
};
