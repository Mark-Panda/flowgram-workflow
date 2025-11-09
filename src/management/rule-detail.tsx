/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';

import { Button, Input, Nav, Switch, Typography, Toast } from '@douyinfe/semi-ui';

import { FlowDocumentJSON, FlowNodeJSON } from '../typings';
import { setRuleBaseInfo } from '../services/rule-base-info';
import { createRuleBase, getRuleDetail } from '../services/api-rules';
import { WorkflowNodeType } from '../nodes';
import { Editor } from '../editor';

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
    // 若后端已保存 FreeLayout 编辑器的原始文档，则优先使用该字段进行渲染
    flowgramUI?: FlowDocumentJSON | any;
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
  const menuItems = useMemo(
    () => [
      { itemKey: 'workflow', text: '工作流设置' },
      { itemKey: 'design', text: '工作流设计' },
    ],
    []
  );

  // 将接口返回的 metadata 转换为 FlowDocumentJSON：
  // 优先使用 metadata.flowgramUI；若无则按“新界面”处理
  const convertMetadataToDoc = (md?: RuleDetailData['metadata']): FlowDocumentJSON | undefined => {
    // 1) 若后端提供了原始的编辑器文档（flowgramUI），直接使用
    if (md && md.flowgramUI && Array.isArray((md.flowgramUI as any)?.nodes)) {
      return md.flowgramUI as FlowDocumentJSON;
    }
    // 2) 否则视为新界面：只创建一个起始节点
    const startNode: FlowNodeJSON = {
      id: String(data?.ruleChain?.id ?? 'start_' + Math.random().toString(36).slice(2, 8)),
      type: WorkflowNodeType.Start,
      meta: { position: { x: 180, y: 180 } },
      data: { title: data?.ruleChain?.name ?? 'Start' },
    } as any;
    return { nodes: [startNode], edges: [] };
  };

  const designDoc: FlowDocumentJSON | undefined = convertMetadataToDoc(data?.metadata);
  // 左侧子菜单选中状态（基础信息/变量/运行日志/工作流集成）
  const [subKey, setSubKey] = useState<string>('basic');
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F8FA' }}
    >
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
          <Button onClick={onBack} type="secondary">
            退出
          </Button>
          <Nav
            mode="horizontal"
            items={menuItems}
            selectedKeys={[activeKey]}
            onSelect={(d) => {
              const key = String(d.itemKey);
              setActiveKey(key);
              const id = String(data?.ruleChain?.id ?? '');
              if (!id) return;
              if (key === 'design')
                window.location.hash = `#/workflow/${encodeURIComponent(id)}/design`;
              if (key === 'workflow') window.location.hash = `#/workflow/${encodeURIComponent(id)}`;
            }}
            style={{ marginLeft: 8 }}
          />
        </div>
        <Typography.Title
          heading={5}
          style={{
            margin: 0,
            maxWidth: 420,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            justifySelf: 'center',
          }}
        >
          {name || data?.ruleChain?.id}
        </Typography.Title>
        <div />
      </div>
      {activeKey === 'design' ? (
        <div style={{ height: '100%', display: 'flex' }}>
          <Editor initialDoc={designDoc} />
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              maxWidth: 1200,
              margin: '0 auto',
            }}
          >
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
              <div
                style={{
                  background: '#fff',
                  border: '1px solid rgba(6,7,9,0.06)',
                  boxShadow: '0 1px 6px rgba(6,7,9,0.06)',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                {subKey === 'basic' && (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '200px 1fr',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Typography.Text type="tertiary">ID</Typography.Text>
                      <Typography.Text>{data?.ruleChain?.id}</Typography.Text>

                      <Typography.Text type="tertiary">工作流名称</Typography.Text>
                      <Input value={name} onChange={setName} placeholder="请输入工作流名称" />

                      <Typography.Text type="tertiary">调试模式</Typography.Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch checked={debug} onChange={(v) => setDebug(!!v)} />
                        <Typography.Text type="tertiary">
                          开启后会显著增加系统负载，并将节点执行时输出日志
                        </Typography.Text>
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
                            const body = {
                              id,
                              name,
                              debugMode: !!debug,
                              root: !!root,
                              disabled: !!data?.ruleChain?.disabled,
                              additionalInfo: { description: desc ?? '' },
                              configuration: { vars: {} },
                            };
                            await createRuleBase(id, body);
                            // 保存成功后刷新详情
                            const json = await getRuleDetail(id);
                            const rc = json?.ruleChain || {};
                            setName(String(rc?.name ?? name));
                            setDesc(String(rc?.additionalInfo?.description ?? desc ?? ''));
                            try {
                              setRuleBaseInfo(rc);
                            } catch {}
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
