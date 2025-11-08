/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';

let index = 0;

export const FetchNodeOutputRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.FetchNodeOutput,
  info: {
    icon: '',
    description: '获取已经执行完节点的输出信息',
  },
  meta: {
    size: {
      width: 360,
      height: 240,
    },
  },
  onAdd() {
    return {
      id: `${nanoid(16)}`,
      type: WorkflowNodeType.FetchNodeOutput,
      data: {
        title: `获取完成节点信息_${++index}`,
        inputsValues: {
          nodeId: { type: 'constant', content: '' },
        },
        inputs: {
          type: 'object',
          required: ['nodeId'],
          properties: {
            nodeId: {
              type: 'string',
              extra: { formComponent: 'node-selector' },
            },
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
