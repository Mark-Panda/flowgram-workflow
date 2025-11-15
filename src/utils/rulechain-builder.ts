/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { WorkflowDocument, WorkflowNodeEntity } from '@flowgram.ai/free-layout-editor';

import { WorkflowNodeType } from '../nodes/constants';

export interface RuleChainBaseInfo {
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

interface FromDsl {
  path: string;
  configuration: Record<string, any>;
  processors: string[];
}

interface ToDsl {
  path: string;
  configuration: Record<string, any>;
  wait: boolean;
  processors: string[];
}

interface RouterDsl {
  id: string;
  params: any[];
  from: FromDsl;
  to: ToDsl;
  additionalInfo?: Record<string, any>;
}

type EndpointDsl = RuleNodeRC & {
  processors?: string[];
  routers?: RouterDsl[];
};

interface RuleMetadataRC {
  firstNodeIndex: number;
  endpoints?: EndpointDsl[];
  nodes: RuleNodeRC[];
  connections: NodeConnectionRC[];
  ruleChainConnections?: Array<{ fromId: string; toId: string; type: string }>;
}

interface RuleChainRC {
  ruleChain: RuleChainBaseInfo;
  metadata: RuleMetadataRC;
}

export function buildRuleChainJSONFromDocument(
  document: WorkflowDocument,
  baseOverride?: Partial<RuleChainBaseInfo>
): string {
  const raw = document.toJSON() as any;

  // 展平节点（包含 loop/group 等子块）
  const flattened: any[] = [];
  raw.nodes.forEach((n: any) => {
    flattened.push(n);
  });
  // 汇总连接：顶层 edges + loop 内 edges
  const connectionsRC: NodeConnectionRC[] = [];
  raw.edges.forEach((n: any) => {
    const conn = buildRuleChainMetaConnection(n);
    if (conn) {
      connectionsRC.push(conn);
    }
  });
  const endpoiontNode = ['endpoint/schedule'];
  // 处理endpoiont节点信息
  const endpoiontsRc: EndpointDsl[] = flattened
    .filter((n: any) => endpoiontNode.includes(String(n.type)))
    .map((n: any) => {
      const nodeType = String(n.type);
      const base: EndpointDsl = {
        id: n.id,
        additionalInfo: n.meta ? { meta: n.meta } : undefined,
        type: nodeType,
        name: n.data?.title ?? nodeType,
        debugMode: false,
        configuration: {},
      };
      switch (nodeType) {
        case 'endpoint/schedule':
          if (n.data?.inputs && n.data?.inputsValues) {
            base.routers = [
              {
                id: nanoid(16),
                params: [],
                from: {
                  path: n.data?.inputsValues.cron.content,
                  configuration: {},
                  processors: [],
                },
                to: {
                  path: baseOverride?.id + ':' + flattened[0].id,
                  configuration: {},
                  wait: false,
                  processors: [],
                },
              },
            ];
          }
          break;
        default:
          break;
      }
      return base;
    });

  const nodesRC: RuleNodeRC[] = [];
  flattened.map((n: any) => {
    buildRuleChainMetaNodes(n, nodesRC, connectionsRC);
    return;
  });
  console.log(nodesRC, connectionsRC);

  const startIndex = nodesRC.findIndex((n) => n.type === 'start');
  const ruleChain: RuleChainRC = {
    ruleChain: {
      id: String(baseOverride?.id ?? raw.id ?? 'workflow'),
      name: String(baseOverride?.name ?? raw.name ?? 'Workflow'),
      debugMode: !!(baseOverride?.debugMode ?? false),
      root: !!(baseOverride?.root ?? true),
      disabled: !!(baseOverride?.disabled ?? false),
      configuration: { ...(baseOverride?.configuration ?? {}) },
      additionalInfo: { ...(baseOverride?.additionalInfo ?? {}) },
    },
    metadata: {
      firstNodeIndex: startIndex >= 0 ? startIndex : 0,
      endpoints: endpoiontsRc,
      nodes: nodesRC,
      connections: connectionsRC,
      ruleChainConnections: [],
    },
  };

  return JSON.stringify(ruleChain, null, 2);
}

function buildRuleChainMetaNodes(
  n: any,
  nodesRC: RuleNodeRC[],
  connectionsRC: NodeConnectionRC[]
): [RuleNodeRC[], NodeConnectionRC[]] {
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
  switch (nodeType) {
    case 'endpoint/schedule':
    case 'block-start':
    case 'block-end':
      // 按要求：endpoint/schedule 不加入 nodesRC
      return null as any;
    case 'group': {
      if (n.data) {
        base.configuration = { nodeIds: n.data?.blockIDs };
        base.type = 'groupAction';
      }
      break;
    }
    case 'for': {
      if (n.data) {
        base.configuration = {
          range: n.data?.note.content,
          do: n.data?.nodeId.content,
          mode: n.data?.operationMode.content,
          extra: {
            blocks: [],
            edges: [],
          },
        };
      }
      if (n.blocks && n.blocks.length > 0) {
        const forBlocks: any = [];
        for (const b of n.blocks) {
          const nodeType = String(b.type);
          if (nodeType === 'block-start' || nodeType === 'block-end') {
            forBlocks.push(b);
            continue;
          }
          buildRuleChainMetaNodes(b, nodesRC, connectionsRC);
        }
        base.configuration.extra.blocks = forBlocks;
      }
      if (n.edges && n.edges.length > 0) {
        const forEdges: any = [];
        for (const e of n.edges) {
          const sourceId = e.sourceNodeID ?? '';
          const targetId = e.targetNodeID ?? '';
          if (
            String(sourceId).startsWith('block_start') ||
            String(targetId).startsWith('block_end')
          ) {
            forEdges.push(e);
            continue;
          }
          const connection = buildRuleChainMetaConnection(e);
          if (connection) {
            connectionsRC.push(connection);
          }
        }
        base.configuration.extra.edges = forEdges;
      }
      break;
    }
    case 'restApiCall': {
      const newconfig: Record<string, any> = {};
      if (n.data?.api) {
        newconfig['requestMethod'] = n.data?.api.method;
        if (n.data?.api.url?.content) {
          newconfig['restEndpointUrlPattern'] = n.data?.api.url?.content;
        }
      }
      if (
        n.data?.headersValues &&
        Object.keys(n.data?.headersValues).length > 0 &&
        n.data?.headers &&
        Object.keys(n.data?.headers).length > 0
      ) {
        const headermap: Record<string, any> = {};
        Object.keys(n.data.headers.properties).forEach((key: string) => {
          headermap[key] = (n.data.headersValues as any)[key].content;
        });
        newconfig['headers'] = headermap;
      }
      if (
        n.data?.paramsValues &&
        Object.keys(n.data?.paramsValues).length > 0 &&
        n.data?.params &&
        Object.keys(n.data?.params).length > 0
      ) {
        const parammap: Record<string, any> = {};
        Object.keys(n.data.params.properties).forEach((key: string) => {
          parammap[key] = (n.data.paramsValues as any)[key].content;
        });
        newconfig['params'] = parammap;
        // TODO: 将params参数解析到URL上
      }
      if (n.data?.body && n.data?.body?.bodyType === 'JSON' && n.data?.body?.json?.content) {
        newconfig['body'] = n.data?.body.json.content;
      }
      if (n.data?.timeout) {
        newconfig['readTimeoutMs'] = n.data?.timeout.timeout;
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
        Object.keys(n.data.inputs.properties).forEach((key: string) => {
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
    case 'switch': {
      if (Array.isArray(n.data?.cases) && n.data.cases.length > 0) {
        const formatValue = (v: any) => {
          const val = v?.content;
          const isNum =
            typeof val === 'number' || (typeof val === 'string' && /^-?\d+(?:\.\d+)?$/.test(val));
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
            if (left && op && right) return `${left} ${op} ${right}`;
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
            const groupExprs = groups.map(formatGroup).filter((s: string) => s && s.length > 0);
            const fullExpr = groupExprs.join(' || ');
            return { case: fullExpr, then: String(c.key ?? '') };
          })
          .filter((item) => item.case && item.then);
        base.configuration = { cases };
      }
      break;
    }
    case 'jsTransform':
    case 'log':
    case 'jsFilter': {
      if (n.data?.script) {
        const matchName =
          n.type === 'jsTransform'
            ? 'Transform'
            : n.type === 'log'
            ? 'String'
            : n.type === 'jsFilter'
            ? 'Filter'
            : '';
        const scriptText: string = String(n.data?.script?.content ?? '');
        const fnIdx = scriptText.indexOf(`function ${matchName}`);
        const braceStart = fnIdx >= 0 ? scriptText.indexOf('{', fnIdx) : -1;
        if (braceStart >= 0) {
          let i = braceStart + 1;
          let depth = 1;
          let end = scriptText.length;
          let inSingle = false;
          let inDouble = false;
          let inTemplate = false;
          let inLineComment = false;
          let inBlockComment = false;
          for (; i < scriptText.length; i++) {
            const ch = scriptText[i];
            const prev = scriptText[i - 1];
            if (inLineComment) {
              if (ch === '\n') inLineComment = false;
              continue;
            }
            if (inBlockComment) {
              if (ch === '*' && scriptText[i + 1] === '/') {
                inBlockComment = false;
                i++;
              }
              continue;
            }
            if (!inSingle && !inDouble && !inTemplate) {
              if (ch === '/' && scriptText[i + 1] === '/') {
                inLineComment = true;
                i++;
                continue;
              }
              if (ch === '/' && scriptText[i + 1] === '*') {
                inBlockComment = true;
                i++;
                continue;
              }
              if (ch === "'" && prev !== '\\') {
                inSingle = true;
                continue;
              }
              if (ch === '"' && prev !== '\\') {
                inDouble = true;
                continue;
              }
              if (ch === '`' && prev !== '\\') {
                inTemplate = true;
                continue;
              }
            } else {
              if (inSingle && ch === "'" && prev !== '\\') {
                inSingle = false;
                continue;
              }
              if (inDouble && ch === '"' && prev !== '\\') {
                inDouble = false;
                continue;
              }
              if (inTemplate && ch === '`' && prev !== '\\') {
                inTemplate = false;
                continue;
              }
              continue;
            }
            if (ch === '{') depth++;
            else if (ch === '}') {
              depth--;
              if (depth === 0) {
                end = i;
                break;
              }
            }
          }
          const body = scriptText.slice(braceStart + 1, end).trim();
          base.configuration = { jsScript: body };
        }
      }
      break;
    }
    case 'flow': {
      if (n.data?.inputs && n.data?.inputsValues) {
        const tId = n.data?.inputsValues?.targetId?.content;
        const ext = n.data?.inputsValues?.extend?.content;
        base.configuration = {
          targetId: String(tId ?? ''),
          extend: !!ext,
        } as any;
      }
      break;
    }
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

  nodesRC.push(base);
  return [nodesRC, connectionsRC];
}

function buildRuleChainMetaConnection(n: any): NodeConnectionRC | null {
  const sourceId = n.sourceNodeID ?? '';
  const targetId = n.targetNodeID ?? '';
  if (String(sourceId).startsWith('block_start') || String(targetId).startsWith('block_end')) {
    return null;
  }
  return {
    fromId: sourceId,
    toId: targetId,
    type: n.sourcePortID ?? 'Success',
    label: n.sourcePortID ?? n.label,
  };
}
