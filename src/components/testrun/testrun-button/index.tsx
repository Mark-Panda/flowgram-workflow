/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect, useCallback } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useClientContext, FlowNodeEntity } from '@flowgram.ai/free-layout-editor';
import { Button, Badge } from '@douyinfe/semi-ui';
import { IconPlay } from '@douyinfe/semi-icons';

import { testRunPanelFactory } from '../testrun-panel/test-run-panel';
import { problemPanelFactory } from '../../problem-panel';

import styles from './index.module.less';

export function TestRunButton(props: { disabled: boolean }) {
  const [errorCount, setErrorCount] = useState(0);
  const clientContext = useClientContext();
  const panelManager = usePanelManager();
  const updateValidateData = useCallback(() => {
    const allForms = clientContext.document.getAllNodes().map((node) => node.form);
    const count = allForms.filter((form) => form?.state.invalid).length;
    setErrorCount(count);
  }, [clientContext]);

  /**
   * Validate all node and Save
   */
  const onTestRun = useCallback(async () => {
    const nodes = clientContext.document.getAllNodes();
    await Promise.all(nodes.map(async (n) => n.form?.validate()));
    const invalidNodes = nodes.filter((n) => n.form?.state.invalid);
    if (invalidNodes.length > 0) {
      const problems = invalidNodes.map((n) => {
        const json: any = clientContext.document.toNodeJSON(n);
        const title = json?.data?.title;
        return { nodeId: n.id, title: title ? String(title) : n.id };
      });
      panelManager.open(problemPanelFactory.key, 'bottom', { props: { problems } });
      return;
    }
    panelManager.open(testRunPanelFactory.key, 'right');
  }, [clientContext]);

  /**
   * Listen single node validate
   */
  useEffect(() => {
    const listenSingleNodeValidate = (node: FlowNodeEntity) => {
      const { form } = node;
      if (form) {
        const formValidateDispose = form.onValidate(() => updateValidateData());
        node.onDispose(() => formValidateDispose.dispose());
      }
    };
    clientContext.document.getAllNodes().map((node) => listenSingleNodeValidate(node));
    const dispose = clientContext.document.onNodeCreate(({ node }) =>
      listenSingleNodeValidate(node)
    );
    return () => dispose.dispose();
  }, [clientContext]);

  const button =
    errorCount === 0 ? (
      <Button
        disabled={props.disabled}
        onClick={onTestRun}
        icon={<IconPlay size="default" />}
        className={styles.testrunSuccessButton}
        size="small"
        theme="solid"
      >
        测试运行
      </Button>
    ) : (
      <Badge count={errorCount} position="rightTop" type="danger">
        <Button
          type="danger"
          disabled={props.disabled}
          onClick={onTestRun}
          icon={<IconPlay size="default" />}
          className={styles.testrunErrorButton}
          size="small"
          theme="solid"
        >
          测试运行
        </Button>
      </Badge>
    );

  return button;
}
