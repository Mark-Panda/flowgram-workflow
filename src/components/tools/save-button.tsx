/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconSave } from '@douyinfe/semi-icons';
import { useService, WorkflowDocument, useClientContext } from '@flowgram.ai/free-layout-editor';

export const SaveButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const wfDocument = useService(WorkflowDocument);
  const { playground } = useClientContext();

  const onClick = () => {
    try {
      const json = wfDocument.toJSON();
      const fileName = `workflow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const link = window.document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Toast.success({ content: '画布已导出为文件（保存）' });
    } catch (e) {
      console.error(e);
      Toast.error({ content: '保存失败' });
    }
  };

  return (
    <Tooltip content="保存画布">
      <Button icon={<IconSave />} type="primary" theme="solid" size="small" disabled={disabled || playground.config.readonly} onClick={onClick}>
        保存
      </Button>
    </Tooltip>
  );
};