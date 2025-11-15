/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import {
  useClientContext,
  useService,
  GlobalScope,
  ASTFactory,
} from '@flowgram.ai/free-layout-editor';
import { JsonSchemaUtils } from '@flowgram.ai/form-materials';
import { Button, Modal, TextArea, Toast, Space, Dropdown } from '@douyinfe/semi-ui';
import { IconDownload, IconUpload, IconCopy, IconChevronDown } from '@douyinfe/semi-icons';

import { problemPanelFactory } from '../problem-panel';
import { buildRuleChainJSONFromDocument } from '../../utils/rulechain-builder';
import { FlowDocumentJSON, FlowNodeJSON } from '../../typings';
import { getRuleBaseInfo } from '../../services/rule-base-info';
import { GetGlobalVariableSchema } from '../../plugins/variable-panel-plugin';
import iconVariable from '../../assets/icon-variable.png';

export function ExportImport(props: { disabled?: boolean }) {
  const { document: workflowDocument, get } = useClientContext();
  const globalScope = useService(GlobalScope);
  const panelManager = usePanelManager();

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

  const openExport = useCallback(async () => {
    const nodes = workflowDocument.getAllNodes();
    await Promise.all(nodes.map(async (n) => n.form?.validate()));
    const invalidNodes = nodes.filter((n) => n.form?.state.invalid);
    if (invalidNodes.length > 0) {
      const problems = invalidNodes.map((n) => {
        const json: any = workflowDocument.toNodeJSON(n);
        const title = json?.data?.title;
        return { nodeId: n.id, title: title ? String(title) : n.id };
      });
      panelManager.open(problemPanelFactory.key, 'bottom', { props: { problems } });
      Toast.error('存在未填写的必填项');
      return;
    }
    const text = buildExportJSON();
    setExportText(text);
    setExportVisible(true);
  }, [buildExportJSON, workflowDocument]);

  const openRuleChainExport = useCallback(async () => {
    const nodes = workflowDocument.getAllNodes();
    await Promise.all(nodes.map(async (n) => n.form?.validate()));
    const invalidNodes = nodes.filter((n) => n.form?.state.invalid);
    if (invalidNodes.length > 0) {
      const problems = invalidNodes.map((n) => {
        const json: any = workflowDocument.toNodeJSON(n);
        const title = json?.data?.title;
        return { nodeId: n.id, title: title ? String(title) : n.id };
      });
      panelManager.open(problemPanelFactory.key, 'bottom', { props: { problems } });
      Toast.error('存在未填写的必填项');
      return;
    }
    const baseInfo = getRuleBaseInfo();
    const text = buildRuleChainJSONFromDocument(workflowDocument, baseInfo);
    setRuleChainText(text);
    setRuleChainVisible(true);
  }, [workflowDocument]);

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
        !!o &&
        !!o.ruleChain &&
        !!o.metadata &&
        Array.isArray(o.metadata.nodes) &&
        Array.isArray(o.metadata.connections);

      let doc: FlowDocumentJSON | null = null;
      if (isFlowDoc(raw)) {
        doc = raw;
      } else if (isRuleChain(raw)) {
        const rc = raw as any;
        const spacingX = 440;
        const spacingY = 180;
        const startX = 180;
        const startY = 180;

        const rcNodes: any[] = Array.isArray(rc.metadata.nodes) ? rc.metadata.nodes : [];
        const rcConns: any[] = Array.isArray(rc.metadata.connections)
          ? rc.metadata.connections
          : [];

        // 构建邻接表与入度表
        const ids = rcNodes.map((n: any) => String(n.id));
        const adjacency = new Map<string, string[]>();
        const indegree = new Map<string, number>();
        ids.forEach((id) => {
          adjacency.set(id, []);
          indegree.set(id, 0);
        });
        for (const c of rcConns) {
          const fromId = String(c.fromId ?? c.from?.id ?? '');
          const toId = String(c.toId ?? c.to?.id ?? '');
          if (!fromId || !toId) continue;
          if (!adjacency.has(fromId)) adjacency.set(fromId, []);
          adjacency.get(fromId)!.push(toId);
          indegree.set(toId, (indegree.get(toId) ?? 0) + 1);
        }

        // 选择根：优先使用 firstNodeIndex，其次入度为 0 的节点；如都没有则选择第一个
        let rootIds: string[] = [];
        const firstIdx = rc?.metadata?.firstNodeIndex;
        if (typeof firstIdx === 'number' && rcNodes[firstIdx]) {
          rootIds = [String(rcNodes[firstIdx].id)];
        } else {
          rootIds = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
          if (rootIds.length === 0 && ids.length > 0) rootIds = [ids[0]];
        }

        // 基于多源 BFS 计算层级（最长路径层级）
        const level: Record<string, number> = {};
        ids.forEach((id) => (level[id] = 0));
        const visited = new Set<string>();
        const queue: string[] = [];
        for (const r of rootIds) {
          level[r] = 0;
          queue.push(r);
          visited.add(r);
        }
        while (queue.length) {
          const curr = queue.shift()!;
          const nexts = adjacency.get(curr) ?? [];
          for (const nb of nexts) {
            const nextLevel = level[curr] + 1;
            if (level[nb] < nextLevel) level[nb] = nextLevel;
            if (!visited.has(nb)) {
              visited.add(nb);
              queue.push(nb);
            }
          }
        }

        // 若存在未访问（可能因环导致），统一放在末层之后
        const maxLevel = Math.max(0, ...Object.values(level));
        ids.forEach((id) => {
          if (!visited.has(id)) level[id] = maxLevel + 1;
        });

        // 分层节点桶
        const buckets = new Map<number, string[]>();
        ids.forEach((id) => {
          const lv = level[id];
          if (!buckets.has(lv)) buckets.set(lv, []);
          buckets.get(lv)!.push(id);
        });

        // 构建反向邻接表（入边）
        const reverseAdjacency = new Map<string, string[]>();
        ids.forEach((id) => reverseAdjacency.set(id, []));
        for (const [from, tos] of adjacency.entries()) {
          for (const to of tos) {
            if (!reverseAdjacency.has(to)) reverseAdjacency.set(to, []);
            reverseAdjacency.get(to)!.push(from);
          }
        }

        // 辅助：根据相邻层位置计算同层排序（barycenter）
        const sortByBarycenter = (
          layerIds: string[],
          neighborPos: Map<string, number>,
          getNeighbors: (id: string) => string[]
        ) => {
          const originalIndex = new Map<string, number>();
          layerIds.forEach((id, i) => originalIndex.set(id, i));
          return [...layerIds]
            .map((id) => {
              const ns = (getNeighbors(id) || []).filter((n) => neighborPos.has(n));
              if (ns.length === 0) {
                return { id, bc: originalIndex.get(id) ?? 0 };
              }
              const bc = ns.reduce((sum, n) => sum + (neighborPos.get(n) ?? 0), 0) / ns.length;
              return { id, bc };
            })
            .sort((a, b) => a.bc - b.bc)
            .map((x) => x.id);
        };

        // 层序排序：自顶向下用入边（上一层）重排，同层更贴近上一层邻居；再自底向上用出边（下一层）重排
        const layerKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
        // Top-down sweep
        for (let i = 1; i < layerKeys.length; i++) {
          const prevLayer = buckets.get(layerKeys[i - 1]) ?? [];
          const currLayer = buckets.get(layerKeys[i]) ?? [];
          const posPrev = new Map<string, number>();
          prevLayer.forEach((id, idx) => posPrev.set(id, idx));
          const reordered = sortByBarycenter(
            currLayer,
            posPrev,
            (id) => reverseAdjacency.get(id) ?? []
          );
          buckets.set(layerKeys[i], reordered);
        }
        // Bottom-up sweep
        for (let i = layerKeys.length - 2; i >= 0; i--) {
          const nextLayer = buckets.get(layerKeys[i + 1]) ?? [];
          const currLayer = buckets.get(layerKeys[i]) ?? [];
          const posNext = new Map<string, number>();
          nextLayer.forEach((id, idx) => posNext.set(id, idx));
          const reordered = sortByBarycenter(currLayer, posNext, (id) => adjacency.get(id) ?? []);
          buckets.set(layerKeys[i], reordered);
        }

        // 生成节点坐标：x 按层级，y 按层内序号
        const nodeById = new Map<string, any>();
        rcNodes.forEach((n) => nodeById.set(String(n.id), n));

        const nodes: FlowNodeJSON[] = ids.map((id) => {
          const n = nodeById.get(id) ?? {};
          const lv = level[id] ?? 0;
          const layerNodes = buckets.get(lv) ?? [];
          const idxInLayer = layerNodes.indexOf(id);
          const x = startX + lv * spacingX;
          const y = startY + (idxInLayer >= 0 ? idxInLayer : 0) * spacingY;
          return {
            id,
            type: String(n.type ?? 'default'),
            meta: { position: { x, y } },
            data: {
              title: n.name ?? String(n.type ?? id),
              ...(n.configuration ?? {}),
            },
          } as any;
        });

        const edges = rcConns.map((e: any) => ({
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

  const menuItems = [
    {
      node: 'item',
      name: '导出 JSON',
      icon: <IconDownload size="large" />,
      onClick: openExport,
    },
    {
      node: 'item',
      name: '导出 RuleChain',
      icon: <IconDownload size="large" />,
      onClick: openRuleChainExport,
    },
    {
      node: 'divider',
    },
    {
      node: 'item',
      name: '导入 JSON',
      icon: <IconUpload size="large" />,
      onClick: () => setImportVisible(true),
    },
  ];

  return (
    <>
      <Dropdown
        trigger="click"
        position="bottomRight"
        menu={menuItems.map((item) => ({ ...item, node: 'item' as const }))}
        disabled={disabled}
      >
        <Button
          theme="light"
          size="small"
          disabled={disabled}
          icon={<IconDownload size="default" />}
          iconPosition="left"
        >
          导出/导入
          <IconChevronDown size="small" style={{ marginLeft: 4 }} />
        </Button>
      </Dropdown>

      <Modal
        title="导出工作流 JSON"
        visible={exportVisible}
        onCancel={() => setExportVisible(false)}
        footer={
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
        }
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
        footer={
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
        }
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
