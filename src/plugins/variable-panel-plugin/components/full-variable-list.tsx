/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';

import {
  useRefresh,
  useService,
  GlobalScope,
  WorkflowDocument,
  WorkflowNodeEntity,
  BaseVariableField,
} from '@flowgram.ai/free-layout-editor';
import { useVariableTree, JsonSchemaUtils } from '@flowgram.ai/form-materials';
import { Tree } from '@douyinfe/semi-ui';

import { getNodeTypeName } from '../../../nodes/node-type-names';

export function FullVariableList() {
  const refresh = useRefresh();
  const document = useService(WorkflowDocument);
  const globalScope = useService(GlobalScope);

  useEffect(() => {
    let disposables: any[] = [];
    try {
      disposables.push(document.output.onDocumentChange(() => refresh()));
    } catch {}
    try {
      disposables.push(globalScope.output.onVariableListChange(() => refresh()));
    } catch {}
    return () => {
      disposables.forEach((d) => d?.dispose?.());
    };
  }, []);

  const treeData = useVariableTree({});
  const nodes: WorkflowNodeEntity[] = document.getAllNodes();
  const nodeItems = nodes
    .filter((n: any) => n.flowNodeType !== 'block-start' && n.flowNodeType !== 'block-end')
    .map((n: any) => {
      const label = document.toNodeJSON(n)?.data?.title || getNodeTypeName(String(n.flowNodeType));
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

  return (
    <Tree
      treeData={merged}
      onSelect={(keys, info: any) => {
        try {
          const label: string = String(info?.node?.label ?? '');
          if (!label) return;
          const globalVar = globalScope.getVar() as BaseVariableField;
          if (!globalVar) return;
          const schema = globalVar.type
            ? JsonSchemaUtils.astToSchema(globalVar.type)
            : ({ type: 'object', properties: {} } as any);
          const props = (schema as any).properties || ((schema as any).properties = {});
          if (!props[label]) {
            props[label] = { type: 'string' } as any;
            globalVar.updateType(JsonSchemaUtils.schemaToAST(schema));
          }
        } catch {}
      }}
    />
  );
}
