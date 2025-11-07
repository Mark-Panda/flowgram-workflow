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
    description: 'Fetch target node output by selecting a node ID.',
  },
  meta: {
    size: {
      width: 360,
      height: 240,
    },
  },
  onAdd() {
    return {
      id: `fetch_${nanoid(5)}`,
      type: WorkflowNodeType.FetchNodeOutput,
      data: {
        title: `FetchNodeOutput_${++index}`,
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