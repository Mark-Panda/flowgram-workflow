/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService, WorkflowDocument, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconSave } from '@douyinfe/semi-icons';

import { problemPanelFactory } from '../problem-panel';
import { buildRuleChainJSONFromDocument } from '../../utils/rulechain-builder';
import { getRuleBaseInfo } from '../../services/rule-base-info';
import { updateRule } from '../../services/api-rules';

export const SaveButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const wfDocument = useService(WorkflowDocument);
  const { playground, document } = useClientContext();
  const panelManager = usePanelManager();

  const onClick = async () => {
    try {
      const nodes = document.getAllNodes();
      await Promise.all(nodes.map(async (n) => n.form?.validate()));
      const invalidNodes = nodes.filter((n) => n.form?.state.invalid);
      const toJSONList = nodes.map((n) => document.toNodeJSON(n));
      const getVal = (v: any) => {
        if (!v) return undefined;
        if (typeof v.content !== 'undefined') return v.content;
        return v;
      };
      const isEmpty = (schema: any, val: any) => {
        const t = schema?.type;
        if (t === 'string') return !(typeof val === 'string' && val.trim().length > 0);
        if (t === 'number') return !(typeof val === 'number');
        if (t === 'boolean') return typeof val === 'boolean' ? false : true;
        if (t === 'array') return Array.isArray(val) ? false : true;
        if (t === 'object') return typeof val === 'object' && val !== null ? false : true;
        return val === undefined || val === null;
      };
      const requiredInvalids: Array<{ nodeId: string; title?: string }> = [];
      const validateNode = (json: any) => {
        const inputs = json?.data?.inputs;
        const values = json?.data?.inputsValues;
        const requiredKeys: string[] = Array.isArray(inputs?.required) ? inputs.required : [];
        requiredKeys.forEach((k) => {
          const schema = inputs?.properties?.[k];
          const v = getVal(values?.[k]);
          if (isEmpty(schema, v)) {
            requiredInvalids.push({ nodeId: json?.id, title: json?.data?.title });
          }
        });
        const blocks = Array.isArray(json?.blocks) ? json.blocks : [];
        blocks.forEach((b: any) => validateNode(b));
      };
      toJSONList.forEach(validateNode);
      if (invalidNodes.length > 0 || requiredInvalids.length > 0) {
        const problems = [
          ...invalidNodes.map((n) => {
            const json: any = document.toNodeJSON(n);
            const title = json?.data?.title;
            return { nodeId: n.id, title: title ? String(title) : n.id };
          }),
          ...requiredInvalids.map((r) => ({ nodeId: r.nodeId, title: r.title ?? r.nodeId })),
        ];
        panelManager.open(problemPanelFactory.key, 'bottom', { props: { problems } });
        Toast.error({ content: '存在未填写的必填项' });
        return;
      }
      const baseInfo = getRuleBaseInfo();
      const text = buildRuleChainJSONFromDocument(wfDocument, baseInfo);
      const payload = JSON.parse(text);
      const id = String(payload?.ruleChain?.id || baseInfo?.id || '');
      if (!id) {
        Toast.error({ content: '保存失败：缺少规则链ID' });
        return;
      }
      await updateRule(id, payload);
      Toast.success({ content: '保存成功' });
    } catch (e) {
      console.error(e);
      Toast.error({ content: `保存失败：${String((e as Error)?.message ?? e)}` });
    }
  };

  return (
    <Tooltip content="保存画布">
      <Button
        icon={<IconSave size="default" />}
        type="primary"
        theme="solid"
        size="small"
        disabled={disabled || playground.config.readonly}
        onClick={onClick}
      >
        保存
      </Button>
    </Tooltip>
  );
};
