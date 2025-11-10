/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { useService, WorkflowDocument, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconSave } from '@douyinfe/semi-icons';

import { buildRuleChainJSONFromDocument } from '../../utils/rulechain-builder';
import { getRuleBaseInfo } from '../../services/rule-base-info';
import { updateRule } from '../../services/api-rules';

export const SaveButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const wfDocument = useService(WorkflowDocument);
  const { playground } = useClientContext();

  const onClick = async () => {
    try {
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
