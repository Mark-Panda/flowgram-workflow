/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

import {
  useClientContext,
  useService,
  GlobalScope,
  ASTFactory,
} from '@flowgram.ai/free-layout-editor';
import { JsonSchemaUtils } from '@flowgram.ai/form-materials';
import { Button, Modal, TextArea, Toast, Space, Tooltip } from '@douyinfe/semi-ui';
import { IconDownload, IconUpload, IconCopy } from '@douyinfe/semi-icons';

import { FlowDocumentJSON, FlowNodeJSON } from '../../typings';
import { GetGlobalVariableSchema } from '../../plugins/variable-panel-plugin';
import iconVariable from '../../assets/icon-variable.png';

export function ExportImport(props: { disabled?: boolean }) {
  const { document: workflowDocument, get } = useClientContext();
  const globalScope = useService(GlobalScope);

  const [exportVisible, setExportVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [ruleChainVisible, setRuleChainVisible] = useState(false);
  const [ruleChainText, setRuleChainText] = useState('');

  const buildExportJSON = useCallback(() => {
    try {
      const getter = get<GetGlobalVariableSchema>(GetGlobalVariableSchema);
      const raw = workflowDocument.toJSON();
      // 标准化节点数据以满足 FlowNodeJSON 的必需字段约束
      const normalizedNodes: FlowNodeJSON[] = raw.nodes.map((n: any) => ({
        ...n,
        data: n.data ?? {},
      }));
      const full: FlowDocumentJSON = {
        nodes: normalizedNodes,
        edges: raw.edges,
        globalVariable: getter ? getter() : undefined,
      };
      return JSON.stringify(full, null, 2);
    } catch (e) {
      console.error(e);
      Toast.error('导出失败：序列化异常');
      return '';
    }
  }, [workflowDocument, get]);

  const openExport = useCallback(() => {
    const text = buildExportJSON();
    setExportText(text);
    setExportVisible(true);
  }, [buildExportJSON]);

  /**
   * RuleChain 类型（对应用户提供的 Go 结构）
   */
  interface RuleChainBaseInfo {
    id: string;
    name: string;
    debugMode: boolean;
    root: boolean;
    disabled: boolean;
    configuration?: Record<string, any>;
    additionalInfo?: Record<string, any>;
  }
  interface RuleNodeRC {
    id: string;
    additionalInfo?: Record<string, any>;
    type: string;
    name: string;
    debugMode: boolean;
    configuration: Record<string, any>;
  }
  interface NodeConnectionRC {
    fromId: string;
    toId: string;
    type: string;
    label?: string;
  }
  interface EndpointDslRC {
    ruleNode: RuleNodeRC;
    processors: string[];
    routers: any[]; // 未提供 RouterDsl 结构，先占位为空数组
  }
  interface RuleMetadataRC {
    firstNodeIndex: number;
    endpoints?: EndpointDslRC[];
    nodes: RuleNodeRC[];
    connections: NodeConnectionRC[];
    ruleChainConnections?: Array<{ fromId: string; toId: string; type: string }>; // 可选
  }
  interface RuleChainRC {
    ruleChain: RuleChainBaseInfo;
    metadata: RuleMetadataRC;
  }

  const buildRuleChainJSON = useCallback(() => {
    try {
      const raw = workflowDocument.toJSON() as any;
      // 展平节点（包含 loop/group 等子块）
      const flattened: any[] = [];
      raw.nodes.forEach((n: any) => {
        flattened.push(n);
        if (Array.isArray(n.blocks)) {
          n.blocks.forEach((b: any) => flattened.push(b));
        }
      });

      const nodesRC: RuleNodeRC[] = flattened.map((n: any) => ({
        id: n.id,
        additionalInfo: n.meta ? { meta: n.meta } : undefined,
        type: String(n.type),
        name: n.data?.title ?? String(n.type),
        debugMode: false,
        configuration: {
          ...(n.data ?? {}),
        },
      }));

      // 汇总连接：顶层 edges + loop 内 edges
      const connectionsRC: NodeConnectionRC[] = [];
      const pushEdge = (e: any) => {
        if (!e) return;
        connectionsRC.push({
          fromId: e.sourceNodeID ?? e.fromId ?? e.from?.id ?? '',
          toId: e.targetNodeID ?? e.toId ?? e.to?.id ?? '',
          type: e.type ?? 'DEFAULT',
          label: e.sourcePortID ?? e.label,
        });
      };
      (raw.edges ?? []).forEach(pushEdge);
      raw.nodes.forEach((n: any) => {
        (n.edges ?? []).forEach(pushEdge);
      });

      const startIndex = nodesRC.findIndex((n) => n.type === 'start');
      const ruleChain: RuleChainRC = {
        ruleChain: {
          id: raw.id ?? 'workflow',
          name: raw.name ?? 'Workflow',
          debugMode: false,
          root: true,
          disabled: false,
          configuration: {},
          additionalInfo: {},
        },
        metadata: {
          firstNodeIndex: startIndex >= 0 ? startIndex : 0,
          endpoints: [],
          nodes: nodesRC,
          connections: connectionsRC,
          ruleChainConnections: [],
        },
      };

      return JSON.stringify(ruleChain, null, 2);
    } catch (e) {
      console.error(e);
      Toast.error('导出失败：RuleChain 序列化异常');
      return '';
    }
  }, [workflowDocument]);

  const openRuleChainExport = useCallback(() => {
    const text = buildRuleChainJSON();
    setRuleChainText(text);
    setRuleChainVisible(true);
  }, [buildRuleChainJSON]);

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      Toast.success('JSON 已复制到剪贴板');
    } catch {
      Toast.error('复制失败');
    }
  }, [exportText]);

  const downloadExport = useCallback(() => {
    try {
      const blob = new Blob([exportText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = 'workflow.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Toast.error('下载失败');
    }
  }, [exportText]);

  const onImportConfirm = useCallback(() => {
    try {
      const raw = JSON.parse(importText);

      const isFlowDoc = (o: any): o is FlowDocumentJSON =>
        !!o && Array.isArray(o.nodes) && Array.isArray(o.edges);

      const isRuleChain = (o: any): o is { ruleChain: any; metadata: any } =>
        !!o && !!o.ruleChain && !!o.metadata && Array.isArray(o.metadata.nodes) && Array.isArray(o.metadata.connections);

      let doc: FlowDocumentJSON | null = null;
      if (isFlowDoc(raw)) {
        doc = raw;
      } else if (isRuleChain(raw)) {
        const rc = raw as any;
        const spacingX = 440;
        const spacingY = 180;
        const startX = 180;
        const startY = 180;
        const nodes: FlowNodeJSON[] = (rc.metadata.nodes as any[]).map((n: any, idx: number) => {
          const col = Math.floor(idx / 5);
          const row = idx % 5;
          const x = startX + col * spacingX;
          const y = startY + row * spacingY;
          return {
            id: String(n.id),
            type: String(n.type),
            meta: { position: { x, y } },
            data: {
              title: n.name ?? String(n.type),
              ...(n.configuration ?? {}),
            },
          } as any;
        });
        const edges = (rc.metadata.connections as any[]).map((e: any) => ({
          sourceNodeID: String(e.fromId ?? e.from?.id ?? ''),
          targetNodeID: String(e.toId ?? e.to?.id ?? ''),
          sourcePortID: e.label ?? undefined,
        }));
        doc = { nodes, edges };
      }

      if (!doc) {
        Toast.error('导入失败：无法识别的 JSON 格式');
        return;
      }

      workflowDocument.fromJSON({ nodes: doc.nodes, edges: doc.edges });

      if ((doc as any).globalVariable) {
        globalScope.setVar(
          ASTFactory.createVariableDeclaration({
            key: 'global',
            meta: { title: 'Global', icon: iconVariable },
            type: JsonSchemaUtils.schemaToAST((doc as any).globalVariable),
          })
        );
      }

      Toast.success('导入成功');
      setImportVisible(false);
    } catch (e) {
      console.error(e);
      Toast.error('导入失败：JSON 解析异常');
    }
  }, [workflowDocument, globalScope, importText]);

  const disabled = props.disabled;

  return (
    <>
      <Space>
        <Tooltip content="导出为 JSON">
          <Button
            theme="light"
            icon={<IconDownload />}
            disabled={disabled}
            onClick={openExport}
          >
            导出JSON
          </Button>
        </Tooltip>
        <Tooltip content="导出为 RuleChain JSON">
          <Button
            theme="light"
            icon={<IconDownload />}
            disabled={disabled}
            onClick={openRuleChainExport}
          >
            导出RuleChain
          </Button>
        </Tooltip>
        <Tooltip content="从 JSON 导入">
          <Button
            theme="light"
            icon={<IconUpload />}
            disabled={disabled}
            onClick={() => setImportVisible(true)}
          >
            导入JSON
          </Button>
        </Tooltip>
      </Space>

      <Modal
        title="导出工作流 JSON"
        visible={exportVisible}
        onCancel={() => setExportVisible(false)}
        footer={(
          <Space>
            <Button icon={<IconCopy />} onClick={copyExport}>
              复制
            </Button>
            <Button icon={<IconDownload />} onClick={downloadExport}>
              下载
            </Button>
            <Button type="primary" onClick={() => setExportVisible(false)}>
              关闭
            </Button>
          </Space>
        )}
        width={720}
      >
        <TextArea
          value={exportText}
          onChange={(v) => setExportText(String(v))}
          autosize={{ minRows: 18, maxRows: 32 }}
        />
      </Modal>

      <Modal
        title="导出 RuleChain JSON"
        visible={ruleChainVisible}
        onCancel={() => setRuleChainVisible(false)}
        footer={(
          <Space>
            <Button
              icon={<IconCopy />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(ruleChainText);
                  Toast.success('RuleChain JSON 已复制到剪贴板');
                } catch {
                  Toast.error('复制失败');
                }
              }}
            >
              复制
            </Button>
            <Button
              icon={<IconDownload />}
              onClick={() => {
                try {
                  const blob = new Blob([ruleChainText], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = 'rulechain.json';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  Toast.error('下载失败');
                }
              }}
            >
              下载
            </Button>
            <Button type="primary" onClick={() => setRuleChainVisible(false)}>
              关闭
            </Button>
          </Space>
        )}
        width={720}
      >
        <TextArea
          value={ruleChainText}
          onChange={(v) => setRuleChainText(String(v))}
          autosize={{ minRows: 18, maxRows: 32 }}
        />
      </Modal>

      <Modal
        title="导入工作流 JSON"
        visible={importVisible}
        onCancel={() => setImportVisible(false)}
        onOk={onImportConfirm}
        okText="导入"
        width={720}
      >
        <TextArea
          placeholder="在此粘贴工作流 JSON"
          value={importText}
          onChange={(v) => setImportText(String(v))}
          autosize={{ minRows: 18, maxRows: 32 }}
        />
      </Modal>
    </>
  );
}