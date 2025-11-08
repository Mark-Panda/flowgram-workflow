/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';

let index = 0;

export const ForkNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Fork,
  info: {
    icon: '',
    description: '并行执行多节点',
  },
  meta: {
    size: {
      width: 360,
      height: 220,
    },
  },
  onAdd() {
    return {
      id: `${nanoid(16)}`,
      type: WorkflowNodeType.Fork,
      data: {
        title: `Fork_${++index}`,
        inputs: {
          type: 'object',
          properties: {},
        },
        outputs: {
          type: 'object',
          properties: {},
        },
      },
    };
  },
};
