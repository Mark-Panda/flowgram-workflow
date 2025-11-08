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

      const nodesRC: RuleNodeRC[] = flattened.map((n: any) => {
        const nodeType = String(n.type);
        const base: RuleNodeRC = {
          id: n.id,
          additionalInfo: n.meta ? { meta: n.meta } : undefined,
          type: nodeType,
          name: n.data?.title ?? nodeType,
          debugMode: false,
          configuration: {
            ...(n.data ?? {}),
          },
        };

        // 按不同节点类型进行定制处理，默认保持原有逻辑
        switch (nodeType) {
          case 'http': {
            var newconfig = {};
            if (n.data?.api) {
              (newconfig as any)['requestMethod'] = n.data?.api.method;
              if (n.data?.api.url?.content) {
                (newconfig as any)['restEndpointUrlPattern'] = n.data?.api.url?.content;
              }
            }
            if (
              n.data?.headersValues &&
              Object.keys(n.data?.headersValues).length > 0 &&
              n.data?.headers &&
              Object.keys(n.data?.headers).length > 0
            ) {
              const headermap: Record<string, any> = {};
              Object.keys(n.data.headers.properties).forEach((key) => {
                headermap[key] = (n.data.headersValues as any)[key].content;
              });
              (newconfig as any)['headers'] = headermap;
            }
            if (
              n.data?.paramsValues &&
              Object.keys(n.data?.paramsValues).length > 0 &&
              n.data?.params &&
              Object.keys(n.data?.params).length > 0
            ) {
              const parammap: Record<string, any> = {};
              Object.keys(n.data.params.properties).forEach((key) => {
                parammap[key] = (n.data.paramsValues as any)[key].content;
              });
              (newconfig as any)['params'] = parammap;
            }
            if (n.data?.body && n.data?.body?.bodyType === 'JSON' && n.data?.body?.json?.content) {
              (newconfig as any)['body'] = n.data?.body.json.content;
            }
            if (n.data?.timeout) {
              (newconfig as any)['readTimeoutMs'] = n.data?.timeout.timeout;
            }
            base.configuration = newconfig;
            break;
          }
          case 'llm': {
            if (
              n.data?.inputs &&
              Object.keys(n.data?.inputs).length > 0 &&
              n.data?.inputsValues &&
              Object.keys(n.data?.inputsValues).length > 0
            ) {
              const configmap: Record<string, any> = {};
              const parammap: Record<string, any> = {};
              Object.keys(n.data.inputs.properties).forEach((key) => {
                switch (key) {
                  case 'userPrompt':
                    configmap['messages'] = [
                      {
                        role: 'user',
                        content: (n.data.inputsValues as any)[key].content,
                      },
                    ];
                    break;
                  case 'temperature':
                  case 'responseFormat':
                  case 'topP':
                  case 'maxTokens':
                    parammap[key] = (n.data.inputsValues as any)[key].content;
                    break;
                  default:
                    configmap[key] = (n.data.inputsValues as any)[key].content;
                }
                configmap['params'] = parammap;
              });
              base.configuration = configmap;
            }
            break;
          }
          case 'case-condition':
            if (Array.isArray(n.data?.cases) && n.data.cases.length > 0) {
              const formatValue = (v: any) => {
                const val = v?.content;
                const isNum =
                  typeof val === 'number' ||
                  (typeof val === 'string' && /^-?\d+(?:\.\d+)?$/.test(val));
                return isNum ? String(val) : JSON.stringify(String(val ?? ''));
              };

              const formatRow = (row: any) => {
                if (!row) return '';
                if (row.content && String(row.content).trim().length > 0) {
                  return String(row.content).trim();
                }
                if (row.type === 'expression') {
                  const left = row.left?.content ?? '';
                  const op = row.operator ?? '';
                  const right = formatValue(row.right ?? {});
                  if (left && op && right) {
                    return `${left} ${op} ${right}`;
                  }
                }
                return '';
              };

              const formatGroup = (g: any) => {
                const rows = Array.isArray(g?.rows) ? g.rows : [];
                const exprs = rows.map(formatRow).filter((s: string) => s && s.length > 0);
                const joiner = g?.operator === 'or' ? ' || ' : ' && ';
                if (exprs.length === 0) return '';
                const joined = exprs.join(joiner);
                return exprs.length > 1 ? `(${joined})` : joined;
              };

              const cases = (n.data.cases as any[])
                .map((c: any) => {
                  const groups = Array.isArray(c?.groups) ? c.groups : [];
                  const groupExprs = groups
                    .map(formatGroup)
                    .filter((s: string) => s && s.length > 0);
                  const fullExpr = groupExprs.join(' || ');
                  return { case: fullExpr, then: String(c.key ?? '') };
                })
                .filter((item) => item.case && item.then);

              base.configuration = { cases };
            }
            break;
          default: {
            // 保持默认逻辑
            if (
              n.data?.inputs &&
              Object.keys(n.data?.inputs).length > 0 &&
              n.data?.inputsValues &&
              Object.keys(n.data?.inputsValues).length > 0
            ) {
              const parammap: Record<string, any> = {};
              Object.keys(n.data.inputs.properties).forEach((key) => {
                parammap[key] = (n.data.inputsValues as any)[key].content;
              });
              base.configuration = parammap;
            }
            break;
          }
        }
        return base;
      });

      // 汇总连接：顶层 edges + loop 内 edges
      const connectionsRC: NodeConnectionRC[] = [];
      const pushEdge = (e: any) => {
        if (!e) return;
        connectionsRC.push({
          fromId: e.sourceNodeID ?? e.fromId ?? e.from?.id ?? '',
          toId: e.targetNodeID ?? e.toId ?? e.to?.id ?? '',
          type: e.sourcePortID ?? 'SUCCESS',
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

  return (
    <>
      <Space>
        <Tooltip content="导出为 JSON">
          <Button theme="light" icon={<IconDownload />} disabled={disabled} onClick={openExport}>
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
