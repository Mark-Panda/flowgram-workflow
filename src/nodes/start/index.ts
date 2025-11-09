/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { FlowNodeRegistry } from '../../typings';
import iconStart from '../../assets/icon-start.jpg';
import { formMeta } from './form-meta';
import { WorkflowNodeType,OutPutPortType } from '../constants';

export const StartNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Start,
  meta: {
    isStart: true,
    deleteDisable: false,
    copyDisable: true,
    nodePanelVisible: true,
    defaultPorts: [{ type: 'output', location: 'right', portID: OutPutPortType.SuccessPort }],
    size: {
      width: 360,
      height: 211,
    },
  },
  info: {
    icon: iconStart,
    description:
      'The starting node of the workflow, used to set the information needed to initiate the workflow.',
  },
  /**
   * Render node via formMeta
   */
  formMeta,
  /**
   * Allow adding start node from panel
   */
  onAdd() {
    return {
      id: `${nanoid(16)}`,
      type: WorkflowNodeType.Start,
      data: {
        title: 'Start',
        positionType: 'header',
        outputs: {
          type: 'object',
          properties: {},
        },
      },
    } as any;
  },
};
