/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { Button, Input, Nav, Switch, Typography, Toast } from '@douyinfe/semi-ui';
import { Editor } from '../editor';
import { FlowDocumentJSON, FlowNodeJSON } from '../typings';
import { WorkflowNodeType } from '../nodes';

export interface RuleDetailData {
  ruleChain: {
    id: string;
    name: string;
    debugMode?: boolean;
    root?: boolean;
    disabled?: boolean;
    additionalInfo?: {
      description?: string;
      createTime?: string;
      updateTime?: string;
      username?: string;
    };
  };
  metadata?: {
    firstNodeIndex?: number;
    nodes?: any[] | null;
    connections?: any[] | null;
  };
}

export const RuleDetail: React.FC<{
  data: RuleDetailData;
  onBack: () => void;
  initialTab?: 'workflow' | 'design';
}> = ({ data, onBack, initialTab }) => {
  const [name, setName] = useState<string>(data?.ruleChain?.name ?? '');
  const [desc, setDesc] = useState<string>(data?.ruleChain?.additionalInfo?.description ?? '');
  const [debug, setDebug] = useState<boolean>(!!data?.ruleChain?.debugMode);
  const [root] = useState<boolean>(!!data?.ruleChain?.root);
  const [activeKey, setActiveKey] = useState<string>(initialTab ?? 'workflow');
  const [saving, setSaving] = useState<boolean>(false);
  React.useEffect(() => {
    if (initialTab) setActiveKey(initialTab);
  }, [initialTab]);
  const menuItems = useMemo(() => (
    [
      { itemKey: 'workflow', text: '工作流设置' },
      { itemKey: 'design', text: '工作流设计' },
    ]
  ), []);

  // 将接口返回的metadata转换为FlowDocumentJSON；如无数据则使用全新画布
  const convertMetadataToDoc = (md?: RuleDetailData['metadata']): FlowDocumentJSON | undefined => {
    if (!md || !Array.isArray(md.nodes) || md.nodes.length === 0) {
      // 新画布：使用规则链ID作为起始节点ID
      const startNode: FlowNodeJSON = {
        id: String(data?.ruleChain?.id ?? 'start_' + Math.random().toString(36).slice(2, 8)),
        type: WorkflowNodeType.Start,
        meta: { position: { x: 180, y: 180 } },
        data: { title: data?.ruleChain?.name ?? 'Start' },
      } as any;
      return { nodes: [startNode], edges: [] };
    }
    // 简单转换：按层级摆放，若无连接信息则仅平铺
    const ids = md.nodes.map((n: any) => String(n.id));
    const spacingX = 440, spacingY = 180; const startX = 180, startY = 180;
    const nodes: FlowNodeJSON[] = ids.map((id, idx) => ({
      id,
      type: String((md.nodes as any[])[idx]?.type ?? WorkflowNodeType.Transform),
      meta: { position: { x: startX + (idx % 4) * spacingX, y: startY + Math.floor(idx / 4) * spacingY } },
      data: { title: String((md.nodes as any[])[idx]?.name ?? id), ...(((md.nodes as any[])[idx]?.configuration) ?? {}) },
    } as any));
    const edges = Array.isArray(md.connections)
      ? md.connections.map((e: any) => ({
          sourceNodeID: String(e.fromId ?? e.from?.id ?? ''),
          targetNodeID: String(e.toId ?? e.to?.id ?? ''),
          sourcePortID: e.type ?? e.label ?? undefined,
        }))
      : [];
    return { nodes, edges };
  };

  const designDoc: FlowDocumentJSON | undefined = convertMetadataToDoc(data?.metadata);
  // 左侧子菜单选中状态（基础信息/变量/运行日志/工作流集成）
  const [subKey, setSubKey] = useState<string>('basic');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F8FA' }}>
      <div
        style={{
          borderBottom: '1px solid rgba(6,7,9,0.06)',
          padding: '8px 12px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          background: '#fff',
          boxShadow: '0 1px 6px rgba(6,7,9,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button onClick={onBack} type="secondary">退出</Button>
          <Nav
            mode="horizontal"
            items={menuItems}
            selectedKeys={[activeKey]}
            onSelect={(d) => {
              const key = String(d.itemKey);
              setActiveKey(key);
              const id = String(data?.ruleChain?.id ?? '');
              if (!id) return;
              if (key === 'design') window.location.hash = `#/workflow/${encodeURIComponent(id)}/design`;
              if (key === 'workflow') window.location.hash = `#/workflow/${encodeURIComponent(id)}`;
            }}
            style={{ marginLeft: 8 }}
          />
        </div>
        <Typography.Title heading={5} style={{ margin: 0, maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', justifySelf: 'center' }}>{name || data?.ruleChain?.id}</Typography.Title>
        <div />
      </div>
      {activeKey === 'design' ? (
        <div style={{ height: '100%', display: 'flex' }}>
          <Editor initialDoc={designDoc} />
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', maxWidth: 1200, margin: '0 auto' }}>
            {/* 左侧垂直菜单 */}
            <div style={{ width: 240 }}>
              <Nav
                mode="vertical"
                items={[
                  { itemKey: 'basic', text: '基础信息' },
                  { itemKey: 'vars', text: '变量' },
                  { itemKey: 'logs', text: '运行日志' },
                  { itemKey: 'integration', text: '工作流集成' },
                ]}
                selectedKeys={[subKey]}
                onSelect={(d) => setSubKey(String(d.itemKey))}
              />
            </div>
            {/* 右侧卡片内容 */}
            <div style={{ flex: 1 }}>
              <div style={{ background: '#fff', border: '1px solid rgba(6,7,9,0.06)', boxShadow: '0 1px 6px rgba(6,7,9,0.06)', borderRadius: 12, padding: 16 }}>
                {subKey === 'basic' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, alignItems: 'center' }}>
                      <Typography.Text type="tertiary">ID</Typography.Text>
                      <Typography.Text>{data?.ruleChain?.id}</Typography.Text>

                      <Typography.Text type="tertiary">工作流名称</Typography.Text>
                      <Input value={name} onChange={setName} placeholder="请输入工作流名称" />

                      <Typography.Text type="tertiary">调试模式</Typography.Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch checked={debug} onChange={(v) => setDebug(!!v)} />
                        <Typography.Text type="tertiary">开启后会显著增加系统负载，并将节点执行时输出日志</Typography.Text>
                      </div>

                      <Typography.Text type="tertiary">根链</Typography.Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch checked={root} disabled />
                        <Typography.Text type="tertiary">当前为根规则链</Typography.Text>
                      </div>

                      <Typography.Text type="tertiary">描述</Typography.Text>
                      <Input value={desc} onChange={setDesc} placeholder="描述" />
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        theme="solid"
                        type="primary"
                        loading={saving}
                        onClick={async () => {
                          const id = String(data?.ruleChain?.id ?? '');
                          if (!id) {
                            Toast.error({ content: '缺少规则链ID，无法保存' });
                            return;
                          }
                          try {
                            setSaving(true);
                            const token = (typeof window !== 'undefined' && (localStorage.getItem('AUTH_TOKEN') || localStorage.getItem('token'))) || '';
                            const postUrl = `http://127.0.0.1:9099/api/v1/rules/${encodeURIComponent(id)}/base`;
                            const body = {
                              id,
                              name,
                              debugMode: !!debug,
                              root: !!root,
                              disabled: !!data?.ruleChain?.disabled,
                              additionalInfo: { description: desc ?? '' },
                              configuration: { vars: {} },
                            };
                            const res = await fetch(postUrl, {
                              method: 'POST',
                              headers: {
                                Accept: 'application/json, text/plain, */*',
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify(body),
                            });
                            if (!res.ok) {
                              const t = await res.text();
                              throw new Error(`保存失败：HTTP ${res.status} ${t || ''}`);
                            }
                            // 保存成功后刷新详情
                            const getUrl = `http://127.0.0.1:9099/api/v1/rules/${encodeURIComponent(id)}`;
                            const detailRes = await fetch(getUrl, {
                              headers: {
                                Accept: 'application/json, text/plain, */*',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                            });
                            if (!detailRes.ok) {
                              const txt = await detailRes.text();
                              throw new Error(`刷新失败：HTTP ${detailRes.status} ${txt || ''}`);
                            }
                            const json = await detailRes.json();
                            const rc = json?.ruleChain || {};
                            setName(String(rc?.name ?? name));
                            setDesc(String(rc?.additionalInfo?.description ?? desc ?? ''));
                            setSaving(false);
                            Toast.success({ content: '保存成功并已刷新' });
                          } catch (e) {
                            setSaving(false);
                            Toast.error({ content: String((e as Error)?.message ?? e) });
                          }
                        }}
                      >
                        保存
                      </Button>
                    </div>
                  </>
                )}
                {subKey === 'vars' && (
                  <Typography.Text type="tertiary">变量配置功能待接入</Typography.Text>
                )}
                {subKey === 'logs' && (
                  <Typography.Text type="tertiary">运行日志功能待接入</Typography.Text>
                )}
                {subKey === 'integration' && (
                  <Typography.Text type="tertiary">工作流集成功能待接入</Typography.Text>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};