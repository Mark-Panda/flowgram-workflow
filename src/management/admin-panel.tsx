/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';

import { Button, List, Nav, Typography } from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft } from '@douyinfe/semi-icons';

import { Editor } from '../editor';
import { FlowDocumentJSON, FlowNodeJSON } from '../typings';
import { nodeRegistries } from '../nodes';

type MenuKey = 'workflow' | 'component';

export const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('workflow');
  const [showEditor, setShowEditor] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedDoc, setSelectedDoc] = useState<FlowDocumentJSON | undefined>();

  const componentList = useMemo(
    () =>
      nodeRegistries.map((reg) => ({
        type: reg.type,
        description: reg.info?.description ?? '',
        icon: reg.info?.icon,
      })),
    []
  );

  const renderHeader = () => {
    if (activeMenu === 'workflow') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!showEditor ? (
            <>
              <Typography.Title heading={4} style={{ margin: 0 }}>
                工作流管理
              </Typography.Title>
              <Button icon={<IconPlus />} theme="solid" type="primary" onClick={() => { setSelectedDoc(undefined); setShowEditor(true); }}>
                新建工作流
              </Button>
            </>
          ) : (
            <>
              <Button icon={<IconChevronLeft />} onClick={() => { setShowEditor(false); setSelectedDoc(undefined); }}>
                返回管理面板
              </Button>
              <Typography.Text type="tertiary" style={{ marginLeft: 8 }}>
                使用当前已有的画布创建工作流
              </Typography.Text>
            </>
          )}
        </div>
      );
    }
    return (
      <Typography.Title heading={4} style={{ margin: 0 }}>
        组件管理
      </Typography.Title>
    );
  };

  // 将 RuleChain 响应项转换为 FlowDocumentJSON（带 DAG 分层 + barycenter 优化）
  const convertRuleChainToFlowDoc = (item: any): FlowDocumentJSON => {
    const rcNodes: any[] = Array.isArray(item?.metadata?.nodes) ? item.metadata.nodes : [];
    const rcConns: any[] = Array.isArray(item?.metadata?.connections) ? item.metadata.connections : [];
    const ids = rcNodes.map((n: any) => String(n.id));
    const adjacency = new Map<string, string[]>();
    const indegree = new Map<string, number>();
    ids.forEach(id => { adjacency.set(id, []); indegree.set(id, 0); });
    for (const c of rcConns) {
      const fromId = String(c.fromId ?? c.from?.id ?? '');
      const toId = String(c.toId ?? c.to?.id ?? '');
      if (!fromId || !toId) continue;
      adjacency.get(fromId)!.push(toId);
      indegree.set(toId, (indegree.get(toId) ?? 0) + 1);
    }
    let rootIds: string[] = [];
    const firstIdx = item?.metadata?.firstNodeIndex;
    if (typeof firstIdx === 'number' && rcNodes[firstIdx]) rootIds = [String(rcNodes[firstIdx].id)];
    else {
      rootIds = ids.filter(id => (indegree.get(id) ?? 0) === 0);
      if (rootIds.length === 0 && ids.length > 0) rootIds = [ids[0]];
    }
    const level: Record<string, number> = {}; ids.forEach(id => level[id] = 0);
    const visited = new Set<string>(); const queue: string[] = [];
    for (const r of rootIds) { level[r] = 0; visited.add(r); queue.push(r); }
    while (queue.length) {
      const curr = queue.shift()!; const nexts = adjacency.get(curr) ?? [];
      for (const nb of nexts) {
        const nl = level[curr] + 1; if (level[nb] < nl) level[nb] = nl;
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    const maxLevel = Math.max(0, ...Object.values(level));
    ids.forEach(id => { if (!visited.has(id)) level[id] = maxLevel + 1; });
    const buckets = new Map<number, string[]>();
    ids.forEach(id => { const lv = level[id]; if (!buckets.has(lv)) buckets.set(lv, []); buckets.get(lv)!.push(id); });
    const reverseAdjacency = new Map<string, string[]>();
    ids.forEach(id => reverseAdjacency.set(id, []));
    for (const [from, tos] of adjacency.entries()) { for (const to of tos) { reverseAdjacency.get(to)!.push(from); } }
    const sortByBary = (layerIds: string[], neighborPos: Map<string, number>, getNs: (id: string)=>string[]) => {
      const originalIndex = new Map<string, number>(); layerIds.forEach((id, i) => originalIndex.set(id, i));
      return [...layerIds].map(id => {
        const ns = (getNs(id) || []).filter(n => neighborPos.has(n));
        const bc = ns.length ? ns.reduce((s, n) => s + (neighborPos.get(n) ?? 0), 0) / ns.length : (originalIndex.get(id) ?? 0);
        return { id, bc };
      }).sort((a,b)=>a.bc-b.bc).map(x=>x.id);
    };
    const layerKeys = Array.from(buckets.keys()).sort((a,b)=>a-b);
    for (let i=1;i<layerKeys.length;i++){
      const prev = buckets.get(layerKeys[i-1]) ?? []; const curr = buckets.get(layerKeys[i]) ?? [];
      const posPrev = new Map<string, number>(); prev.forEach((id,idx)=>posPrev.set(id,idx));
      buckets.set(layerKeys[i], sortByBary(curr, posPrev, id=>reverseAdjacency.get(id) ?? []));
    }
    for (let i=layerKeys.length-2;i>=0;i--){
      const next = buckets.get(layerKeys[i+1]) ?? []; const curr = buckets.get(layerKeys[i]) ?? [];
      const posNext = new Map<string, number>(); next.forEach((id,idx)=>posNext.set(id,idx));
      buckets.set(layerKeys[i], sortByBary(curr, posNext, id=>adjacency.get(id) ?? []));
    }
    const spacingX = 440, spacingY = 180; const startX = 180, startY = 180;
    const nodeById = new Map<string, any>(); rcNodes.forEach(n=>nodeById.set(String(n.id), n));
    const nodes: FlowNodeJSON[] = ids.map(id => {
      const n = nodeById.get(id) ?? {}; const lv = level[id] ?? 0;
      const layerNodes = buckets.get(lv) ?? []; const idxInLayer = layerNodes.indexOf(id);
      const x = startX + lv * spacingX; const y = startY + (idxInLayer>=0?idxInLayer:0) * spacingY;
      return { id, type: String(n.type ?? 'default'), meta: { position: { x, y } }, data: { title: n.name ?? String(n.type ?? id), ...(n.configuration ?? {}) } } as any;
    });
    const edges = rcConns.map((e:any)=>({ sourceNodeID: String(e.fromId ?? e.from?.id ?? ''), targetNodeID: String(e.toId ?? e.to?.id ?? ''), sourcePortID: e.type ?? e.label ?? undefined }));
    return { nodes, edges };
  };

  // 拉取工作流列表
  useEffect(() => {
    if (activeMenu !== 'workflow' || showEditor) return;
    setLoading(true); setError(undefined);
    fetch('http://127.0.0.1:9099/api/v1/rules')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRules(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [activeMenu, showEditor]);

  const renderContent = () => {
    if (activeMenu === 'workflow') {
      if (showEditor) {
        // 展示当前已有的画布
        return (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <Editor initialDoc={selectedDoc} />
          </div>
        );
      }
      // 工作流管理列表
      return (
        <div style={{ padding: 16, width: '100%' }}>
          {error ? (
            <Typography.Text type="danger">加载失败：{error}</Typography.Text>
          ) : null}
          {loading ? (
            <Typography.Text type="tertiary">加载中...</Typography.Text>
          ) : (
            <List
              dataSource={rules}
              renderItem={(it: any) => (
                <List.Item
                  header={<div style={{ width: 32, height: 32, borderRadius: 4, background: '#F2F3F5' }} />}
                  main={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <Typography.Text strong>{String(it?.ruleChain?.name ?? '-')}</Typography.Text>
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type="tertiary">ID: {String(it?.ruleChain?.id ?? '-')}</Typography.Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type="tertiary">Debug: {String(it?.ruleChain?.debugMode ?? false)} | Disabled: {String(it?.ruleChain?.disabled ?? false)}</Typography.Text>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={() => { const doc = convertRuleChainToFlowDoc(it); setSelectedDoc(doc); setShowEditor(true); }} theme="solid" type="primary">打开</Button>
                      </div>
                    </div>
                  }
                />
              )}
            />
          )}
        </div>
      );
    }

    // 组件管理：列出节点注册信息
    return (
      <div style={{ padding: 16 }}>
        <List
          dataSource={componentList}
          renderItem={(item) => (
            <List.Item
              header={
                item.icon ? (
                  <img src={item.icon as string} alt={String(item.type)} style={{ width: 32, height: 32, borderRadius: 4 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 4, background: '#F2F3F5' }} />
                )
              }
              main={
                <div>
                  <Typography.Text strong>{String(item.type)}</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    <Typography.Text type="tertiary">{item.description}</Typography.Text>
                  </div>
                </div>
              }
            />
          )}
        />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ borderBottom: '1px solid rgba(6,7,9,0.1)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Nav
          mode="horizontal"
          items={[
            { itemKey: 'workflow', text: '工作流管理' },
            { itemKey: 'component', text: '组件管理' },
          ]}
          selectedKeys={[activeMenu]}
          onSelect={(data) => setActiveMenu(data.itemKey as MenuKey)}
        />
        {renderHeader()}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{renderContent()}</div>
    </div>
  );
};