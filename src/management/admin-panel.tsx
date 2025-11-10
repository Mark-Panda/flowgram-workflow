/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';

import {
  Button,
  List,
  Nav,
  Typography,
  Tag,
  Skeleton,
  Input,
  Switch,
  Select,
  Pagination,
  Modal,
  Toast,
} from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft } from '@douyinfe/semi-icons';

import { Editor } from '../editor';
import { RuleDetail, RuleDetailData } from './rule-detail';
import { FlowDocumentJSON, FlowNodeJSON } from '../typings';
import { getRuleList, createRuleBase, startRuleChain, stopRuleChain } from '../services/api-rules';
import { nodeRegistries } from '../nodes';

type MenuKey = 'workflow' | 'component';

export const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('workflow');
  const [showEditor, setShowEditor] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedDoc, setSelectedDoc] = useState<FlowDocumentJSON | undefined>();
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<RuleDetailData | undefined>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [keywords, setKeywords] = useState('');
  // 链类型筛选：全部 / 根规则链 / 子规则链
  const [chainFilter, setChainFilter] = useState<'all' | 'root' | 'sub'>('all');
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createRoot, setCreateRoot] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  // 列表项操作（部署/下线）加载态：按规则链ID记录
  const [operatingIds, setOperatingIds] = useState<Set<string>>(new Set());
  const [createId, setCreateId] = useState<string>(() => {
    try {
      // lazy nanoid import to avoid bundle if not used
      const { nanoid } = require('nanoid');
      return nanoid(12);
    } catch {
      return Math.random().toString(36).slice(2, 14);
    }
  });

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
            <Typography.Title heading={4} style={{ margin: 0 }}>
              工作流管理
            </Typography.Title>
          ) : (
            <>
              <Button
                icon={<IconChevronLeft />}
                onClick={() => {
                  setShowEditor(false);
                  setSelectedDoc(undefined);
                }}
              >
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

  // 刷新当前列表（保持分页与筛选参数）
  const refreshList = async () => {
    if (activeMenu !== 'workflow' || showEditor) return;
    setLoading(true);
    setError(undefined);
    const rootParam = chainFilter === 'root' ? true : chainFilter === 'sub' ? false : undefined;
    try {
      const data = await getRuleList({
        page,
        size,
        keywords: keywords.trim() || undefined,
        root: rootParam,
      });
      const items = Array.isArray(data.items) ? data.items : [];
      setRules(items);
      const t = Number(data.total ?? data.count ?? items.length);
      setTotal(Number.isFinite(t) ? t : items.length);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // 将 RuleChain 响应项转换为 FlowDocumentJSON（带 DAG 分层 + barycenter 优化）
  const convertRuleChainToFlowDoc = (item: any): FlowDocumentJSON => {
    const rcNodes: any[] = Array.isArray(item?.metadata?.nodes) ? item.metadata.nodes : [];
    const rcConns: any[] = Array.isArray(item?.metadata?.connections)
      ? item.metadata.connections
      : [];
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
      adjacency.get(fromId)!.push(toId);
      indegree.set(toId, (indegree.get(toId) ?? 0) + 1);
    }
    let rootIds: string[] = [];
    const firstIdx = item?.metadata?.firstNodeIndex;
    if (typeof firstIdx === 'number' && rcNodes[firstIdx]) rootIds = [String(rcNodes[firstIdx].id)];
    else {
      rootIds = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
      if (rootIds.length === 0 && ids.length > 0) rootIds = [ids[0]];
    }
    const level: Record<string, number> = {};
    ids.forEach((id) => (level[id] = 0));
    const visited = new Set<string>();
    const queue: string[] = [];
    for (const r of rootIds) {
      level[r] = 0;
      visited.add(r);
      queue.push(r);
    }
    while (queue.length) {
      const curr = queue.shift()!;
      const nexts = adjacency.get(curr) ?? [];
      for (const nb of nexts) {
        const nl = level[curr] + 1;
        if (level[nb] < nl) level[nb] = nl;
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    const maxLevel = Math.max(0, ...Object.values(level));
    ids.forEach((id) => {
      if (!visited.has(id)) level[id] = maxLevel + 1;
    });
    const buckets = new Map<number, string[]>();
    ids.forEach((id) => {
      const lv = level[id];
      if (!buckets.has(lv)) buckets.set(lv, []);
      buckets.get(lv)!.push(id);
    });
    const reverseAdjacency = new Map<string, string[]>();
    ids.forEach((id) => reverseAdjacency.set(id, []));
    for (const [from, tos] of adjacency.entries()) {
      for (const to of tos) {
        reverseAdjacency.get(to)!.push(from);
      }
    }
    const sortByBary = (
      layerIds: string[],
      neighborPos: Map<string, number>,
      getNs: (id: string) => string[]
    ) => {
      const originalIndex = new Map<string, number>();
      layerIds.forEach((id, i) => originalIndex.set(id, i));
      return [...layerIds]
        .map((id) => {
          const ns = (getNs(id) || []).filter((n) => neighborPos.has(n));
          const bc = ns.length
            ? ns.reduce((s, n) => s + (neighborPos.get(n) ?? 0), 0) / ns.length
            : originalIndex.get(id) ?? 0;
          return { id, bc };
        })
        .sort((a, b) => a.bc - b.bc)
        .map((x) => x.id);
    };
    const layerKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
    for (let i = 1; i < layerKeys.length; i++) {
      const prev = buckets.get(layerKeys[i - 1]) ?? [];
      const curr = buckets.get(layerKeys[i]) ?? [];
      const posPrev = new Map<string, number>();
      prev.forEach((id, idx) => posPrev.set(id, idx));
      buckets.set(
        layerKeys[i],
        sortByBary(curr, posPrev, (id) => reverseAdjacency.get(id) ?? [])
      );
    }
    for (let i = layerKeys.length - 2; i >= 0; i--) {
      const next = buckets.get(layerKeys[i + 1]) ?? [];
      const curr = buckets.get(layerKeys[i]) ?? [];
      const posNext = new Map<string, number>();
      next.forEach((id, idx) => posNext.set(id, idx));
      buckets.set(
        layerKeys[i],
        sortByBary(curr, posNext, (id) => adjacency.get(id) ?? [])
      );
    }
    const spacingX = 440,
      spacingY = 180;
    const startX = 180,
      startY = 180;
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
        data: { title: n.name ?? String(n.type ?? id), ...(n.configuration ?? {}) },
      } as any;
    });
    const edges = rcConns.map((e: any) => ({
      sourceNodeID: String(e.fromId ?? e.from?.id ?? ''),
      targetNodeID: String(e.toId ?? e.to?.id ?? ''),
      sourcePortID: e.type ?? e.label ?? undefined,
    }));
    return { nodes, edges };
  };

  // 拉取工作流列表（支持分页与查询）
  useEffect(() => {
    if (activeMenu !== 'workflow' || showEditor) return;
    setLoading(true);
    setError(undefined);
    const rootParam = chainFilter === 'root' ? true : chainFilter === 'sub' ? false : undefined;
    getRuleList({ page, size, keywords: keywords.trim() || undefined, root: rootParam })
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        setRules(items);
        const t = Number(data.total ?? data.count ?? items.length);
        setTotal(Number.isFinite(t) ? t : items.length);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [activeMenu, showEditor, page, size, keywords, chainFilter]);

  const renderContent = () => {
    if (activeMenu === 'workflow') {
      if (showDetail) {
        return (
          <RuleDetail
            data={detailData as RuleDetailData}
            onBack={() => {
              setShowDetail(false);
              setDetailData(undefined);
            }}
          />
        );
      }
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
          {error ? <Typography.Text type="danger">加载失败：{error}</Typography.Text> : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
              background: '#fff',
              borderRadius: 10,
              border: '1px solid rgba(6,7,9,0.06)',
              boxShadow: '0 1px 4px rgba(6,7,9,0.06)',
              padding: '10px 12px',
            }}
          >
            {/* 左侧：搜索框 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Input
                value={keywords}
                onChange={(v) => {
                  setKeywords(v);
                  setPage(1);
                }}
                placeholder="搜索名称或ID"
                showClear
                style={{ maxWidth: 320 }}
              />
            </div>
            {/* 右侧：下拉筛选 + 新建按钮 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Select
                value={chainFilter}
                style={{ width: 160 }}
                onChange={(v) => {
                  setChainFilter(v as 'all' | 'root' | 'sub');
                  setPage(1);
                }}
              >
                <Select.Option value="all">全部</Select.Option>
                <Select.Option value="root">根规则链</Select.Option>
                <Select.Option value="sub">子规则链</Select.Option>
              </Select>
              <Button
                icon={<IconPlus />}
                theme="solid"
                type="primary"
                onClick={() => {
                  setShowCreateModal(true);
                }}
              >
                新建工作流
              </Button>
            </div>
          </div>
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid rgba(6,7,9,0.06)',
                    boxShadow: '0 2px 10px rgba(6,7,9,0.06)',
                    padding: 12,
                  }}
                >
                  <Skeleton.Title style={{ width: '60%' }} />
                  <Skeleton.Paragraph rows={2} style={{ marginTop: 8 }} />
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(6,7,9,0.06)',
                boxShadow: '0 2px 10px rgba(6,7,9,0.06)',
                padding: 12,
              }}
            >
              {rules.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography.Text type="tertiary">暂无工作流数据</Typography.Text>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 16,
                  }}
                >
                  {rules.map((it: any) => {
                    const chain = it?.ruleChain ?? {};
                    const disabled = Boolean(chain?.disabled);
                    const debug = Boolean(chain?.debugMode);
                    const isRoot = Boolean(chain?.root);

                    // 根据状态设置不同的主题色
                    const getStatusStyle = () => {
                      if (disabled)
                        return {
                          iconBg: 'linear-gradient(135deg, #E5E6EB 0%, #D1D4DB 100%)',
                          iconColor: '#8F959E',
                          borderColor: 'rgba(6,7,9,0.08)',
                        };
                      if (debug)
                        return {
                          iconBg: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
                          iconColor: '#fff',
                          borderColor: 'rgba(71, 118, 230, 0.2)',
                        };
                      return {
                        iconBg: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
                        iconColor: '#fff',
                        borderColor: 'rgba(17, 153, 142, 0.2)',
                      };
                    };

                    const statusStyle = getStatusStyle();

                    return (
                      <div
                        key={String(chain?.id ?? Math.random())}
                        style={{
                          background: '#fff',
                          borderRadius: 16,
                          border: `1px solid ${statusStyle.borderColor}`,
                          boxShadow: '0 4px 12px rgba(6,7,9,0.04)',
                          padding: 16,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            '0 8px 24px rgba(6,7,9,0.12)';
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            '0 4px 12px rgba(6,7,9,0.04)';
                          (e.currentTarget as HTMLDivElement).style.transform = 'none';
                        }}
                      >
                        {/* 顶部装饰渐变条 */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: statusStyle.iconBg,
                          }}
                        />

                        {/* 卡片头部 */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 14,
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background: statusStyle.iconBg,
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              fontWeight: 600,
                              color: statusStyle.iconColor,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              flexShrink: 0,
                            }}
                          >
                            {String(chain?.name ?? '-')
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <Typography.Text
                                strong
                                style={{
                                  fontSize: 16,
                                  color: '#1C2029',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {String(chain?.name ?? '-')}
                              </Typography.Text>
                              {isRoot && (
                                <Tag
                                  size="small"
                                  style={{
                                    background: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 500,
                                  }}
                                >
                                  根规则链
                                </Tag>
                              )}
                            </div>

                            <Typography.Text
                              type="tertiary"
                              style={{
                                fontSize: 12,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ID: {String(chain?.id ?? '-')}
                            </Typography.Text>
                          </div>
                        </div>

                        {/* 状态标签区 */}
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(6,7,9,0.06)',
                            flexWrap: 'wrap',
                          }}
                        >
                          {!isRoot && (
                            <Tag size="small" color="cyan" style={{ borderRadius: 6 }}>
                              子规则链
                            </Tag>
                          )}
                          <Tag
                            size="small"
                            color={debug ? 'blue' : 'grey'}
                            style={{ borderRadius: 6 }}
                          >
                            {debug ? '🔍 调试开启' : '调试关闭'}
                          </Tag>
                          <Tag
                            size="small"
                            color={disabled ? 'orange' : 'green'}
                            style={{ borderRadius: 6 }}
                          >
                            {disabled ? '⏸ 已禁用' : '✓ 启用中'}
                          </Tag>
                        </div>

                        {/* 操作按钮区 */}
                        <div
                          style={{
                            marginTop: 14,
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Button
                            size="small"
                            type="tertiary"
                            disabled={operatingIds.has(String(chain?.id ?? ''))}
                            loading={operatingIds.has(String(chain?.id ?? ''))}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const id = String(chain?.id ?? '');
                              if (!id) return;
                              const next = new Set(operatingIds);
                              next.add(id);
                              setOperatingIds(next);
                              try {
                                await stopRuleChain(id);
                                Toast.success({ content: '已下线该规则链' });
                                await refreshList();
                              } catch (e) {
                                Toast.error({ content: String((e as Error)?.message ?? e) });
                              } finally {
                                const done = new Set(operatingIds);
                                done.delete(id);
                                setOperatingIds(done);
                              }
                            }}
                          >
                            下线
                          </Button>
                          <Button
                            size="small"
                            type="secondary"
                            disabled={operatingIds.has(String(chain?.id ?? ''))}
                            loading={operatingIds.has(String(chain?.id ?? ''))}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const id = String(chain?.id ?? '');
                              if (!id) return;
                              const next = new Set(operatingIds);
                              next.add(id);
                              setOperatingIds(next);
                              try {
                                await startRuleChain(id);
                                Toast.success({ content: '已部署该规则链' });
                                await refreshList();
                              } catch (e) {
                                Toast.error({ content: String((e as Error)?.message ?? e) });
                              } finally {
                                const done = new Set(operatingIds);
                                done.delete(id);
                                setOperatingIds(done);
                              }
                            }}
                          >
                            部署
                          </Button>
                          <Button
                            size="small"
                            theme="solid"
                            type="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = String(chain?.id ?? '');
                              if (!id) return;
                              window.location.hash = `#/workflow/${encodeURIComponent(id)}`;
                            }}
                          >
                            打开
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {(() => {
                const start = total === 0 ? 0 : (page - 1) * size + 1;
                const end = Math.min(page * size, total);
                return (
                  <div
                    style={{
                      marginTop: 16,
                      position: 'sticky',
                      bottom: 0,
                      background: '#fff',
                      borderTop: '1px solid rgba(6,7,9,0.06)',
                      boxShadow: '0 -1px 6px rgba(6,7,9,0.06)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <Typography.Text type="tertiary">共 {total} 条</Typography.Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Select
                          value={size}
                          style={{ width: 100 }}
                          onChange={(v) => {
                            setSize(Number(v));
                            setPage(1);
                          }}
                        >
                          <Select.Option value={10}>10 / 页</Select.Option>
                          <Select.Option value={20}>20 / 页</Select.Option>
                          <Select.Option value={50}>50 / 页</Select.Option>
                        </Select>
                      </div>
                      <Pagination
                        total={total}
                        pageSize={size}
                        currentPage={page}
                        onChange={(p: number) => setPage(p)}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
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
                  <img
                    src={item.icon as string}
                    alt={String(item.type)}
                    style={{ width: 32, height: 32, borderRadius: 4 }}
                  />
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

  const renderCreateModal = () => (
    <Modal
      title="新建工作流"
      visible={showCreateModal}
      onCancel={() => setShowCreateModal(false)}
      confirmLoading={createSubmitting}
      onOk={async () => {
        if (!createName.trim()) {
          Toast.warning({ content: '请输入工作流名称' });
          return;
        }
        setCreateSubmitting(true);
        try {
          const body = {
            id: createId,
            name: createName.trim(),
            root: !!createRoot,
            additionalInfo: { description: createDesc ?? '' },
          };
          await createRuleBase(createId, body);
          Toast.success({ content: '创建成功' });
          setShowCreateModal(false);
          // 路由跳转到与“打开工作流”一致的详情页
          window.location.hash = `#/workflow/${encodeURIComponent(createId)}`;
          // 重置表单
          setCreateName('');
          setCreateDesc('');
          setCreateRoot(true);
          try {
            const { nanoid } = require('nanoid');
            setCreateId(nanoid(12));
          } catch {
            setCreateId(Math.random().toString(36).slice(2, 14));
          }
          // 重新加载列表
          setPage(1);
        } catch (e) {
          Toast.error({ content: String((e as Error)?.message ?? e) });
        } finally {
          setCreateSubmitting(false);
        }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input value={createName} onChange={setCreateName} placeholder="工作流名称" />
        <Input value={createDesc} onChange={setCreateDesc} placeholder="工作流描述" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch checked={createRoot} onChange={(v) => setCreateRoot(!!v)} />
          <Typography.Text>根规则链</Typography.Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography.Text type="tertiary">工作流ID</Typography.Text>
          <Input value={createId} onChange={setCreateId} placeholder="自动生成，可修改" />
        </div>
      </div>
    </Modal>
  );

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧菜单栏 */}
      <div
        style={{
          width: 240,
          borderRight: '1px solid rgba(6,7,9,0.08)',
          background: '#F7F8FA',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fff',
            border: '1px solid rgba(6,7,9,0.06)',
            boxShadow: '0 1px 4px rgba(6,7,9,0.06)',
          }}
        >
          <Typography.Title heading={5} style={{ margin: 0 }}>
            Flowgram 控制台
          </Typography.Title>
          <Typography.Text type="tertiary">管理与组件</Typography.Text>
        </div>
        <Nav
          mode="vertical"
          items={[
            { itemKey: 'workflow', text: '工作流管理' },
            { itemKey: 'component', text: '组件管理' },
          ]}
          selectedKeys={[activeMenu]}
          onSelect={(data) => {
            const key = data.itemKey as MenuKey;
            setActiveMenu(key);
            if (key === 'workflow') window.location.hash = '#/';
            if (key === 'component') window.location.hash = '#/components';
          }}
        />
        <div style={{ marginTop: 'auto', padding: '0 4px' }}>
          <Typography.Text type="tertiary">v1.0.0 Demo</Typography.Text>
        </div>
      </div>
      {/* 右侧内容区 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            borderBottom: '1px solid rgba(6,7,9,0.06)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            boxShadow: '0 1px 6px rgba(6,7,9,0.06)',
          }}
        >
          {renderHeader()}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{renderContent()}</div>
        {renderCreateModal()}
      </div>
    </div>
  );
};
