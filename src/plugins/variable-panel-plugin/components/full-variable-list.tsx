/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService } from '@flowgram.ai/free-layout-editor';
import { WorkflowDocument, WorkflowNodeEntity } from '@flowgram.ai/free-layout-editor';
import { useVariableTree } from '@flowgram.ai/form-materials';
import { Tree } from '@douyinfe/semi-ui';

import { getNodeTypeName } from '../../../nodes/node-type-names';

export function FullVariableList() {
  const treeData = useVariableTree({});
  const document = useService(WorkflowDocument);
  const nodes: WorkflowNodeEntity[] = document.getAllNodes();

  const nodeItems = nodes
    .filter((n: any) => n.flowNodeType !== 'block-start' && n.flowNodeType !== 'block-end')
    .map((n: any) => {
      const label = n.data?.title || getNodeTypeName(String(n.flowNodeType));
      return {
        label,
        key: `node:${n.id}`,
        children: [
          { label: 'id', key: `node:${n.id}:id` },
          { label: 'ts', key: `node:${n.id}:ts` },
          { label: 'data', key: `node:${n.id}:data` },
          { label: 'msg', key: `node:${n.id}:msg` },
          { label: 'metadata', key: `node:${n.id}:metadata` },
          { label: 'msgType', key: `node:${n.id}:msgType` },
          { label: 'dataType', key: `node:${n.id}:dataType` },
        ],
      } as any;
    });

  const merged = Array.isArray(treeData) ? [...treeData, ...nodeItems] : nodeItems;

  return <Tree treeData={merged} />;
}
