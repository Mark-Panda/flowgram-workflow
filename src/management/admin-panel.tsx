/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import ReactQuill from 'react-quill';
import React, { useEffect, useMemo, useState } from 'react';

import { marked } from 'marked';
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
  Table,
  Spin,
  TextArea,
} from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft } from '@douyinfe/semi-icons';

import { Editor } from '../editor';
import { RuleDetail, RuleDetailData } from './rule-detail';
import { FlowDocumentJSON } from '../typings';
import { requestJSON } from '../services/http';
import { getRuleList, createRuleBase, startRuleChain, stopRuleChain } from '../services/api-rules';
import { nodeRegistries } from '../nodes';
import 'react-quill/dist/quill.snow.css';

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
      const { customAlphabet } = require('nanoid');
      return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)();
    } catch {
      return Math.random().toString(36).slice(2, 14);
    }
  });

  const [componentSub, setComponentSub] = useState<'installed' | 'rules' | 'market'>('installed');
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | undefined>();
  const [components, setComponents] = useState<any[]>([]);
  const [compKeywords, setCompKeywords] = useState('');
  const [compKind, setCompKind] = useState<'all' | 'endpoint' | 'node'>('all');
  const [compPage, setCompPage] = useState(1);
  const [compSize, setCompSize] = useState(10);

  const compKinds = ['all', 'endpoint', 'node'] as const;

  const filteredComponents = useMemo(() => {
    const kw = compKeywords.trim().toLowerCase();
    const byKw = (components || []).filter((c: any) => {
      if (!kw) return true;
      const name = String(c.name ?? c.title ?? c.type ?? '').toLowerCase();
      const desc = String(c.description ?? c.desc ?? '').toLowerCase();
      return name.includes(kw) || desc.includes(kw);
    });
    const byKind = byKw.filter((c: any) => {
      if (compKind === 'all') return true;
      return String(c.kind) === compKind;
    });
    return byKind;
  }, [components, compKeywords, compKind]);

  const pagedComponents = useMemo(() => {
    const start = (compPage - 1) * compSize;
    return filteredComponents.slice(start, start + compSize);
  }, [filteredComponents, compPage, compSize]);

  const componentOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts = (components || []).map((c: any) => {
      const label = String(c.label || c.name || c.type || '-');
      const value = String(c.type || c.name || '');
      const category = String(c.category || '');
      return { label, value, kind: String(c.kind || ''), category };
    });
    return opts.filter((o) => {
      if (!o.value) return false;
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [components]);

  const fetchComponents = async () => {
    setCompLoading(true);
    setCompError(undefined);
    try {
      const data = await requestJSON<any>('/components');
      const epList: any[] = Array.isArray(data?.endpoints) ? data.endpoints : [];
      const nodeList: any[] = Array.isArray(data?.nodes) ? data.nodes : [];
      const pool: Record<string, any[]> = (data?.builtins?.nodePool || {}) as any;
      const normEp = epList.map((ep: any) => {
        const type = String(ep?.type ?? '');
        const inst = Array.isArray(pool?.[type]) ? pool[type] : [];
        return {
          id: type,
          type,
          name: String(ep?.name ?? ''),
          label: String(ep?.label ?? ''),
          category: String(ep?.category ?? (type.split('/')?.[0] || '未分类')),
          kind: 'endpoint',
          description: String(ep?.desc ?? ''),
          version: String(ep?.version ?? ''),
          disabled: !!ep?.disabled,
          fieldsLen: Array.isArray(ep?.fields) ? ep.fields.length : 0,
          relationTypesLen: Array.isArray(ep?.relationTypes) ? ep.relationTypes.length : 0,
          instancesCount: inst.length,
        };
      });
      const normNode = nodeList.map((nd: any) => {
        const type = String(nd?.type ?? '');
        return {
          id: type,
          type,
          name: String(nd?.name ?? ''),
          label: String(nd?.label ?? ''),
          category: String(nd?.category ?? (type.split('/')?.[0] || '未分类')),
          kind: 'node',
          description: String(nd?.desc ?? ''),
          version: String(nd?.version ?? ''),
          disabled: !!nd?.disabled,
          fieldsLen: Array.isArray(nd?.fields) ? nd.fields.length : 0,
          relationTypesLen: Array.isArray(nd?.relationTypes) ? nd.relationTypes.length : 0,
          instancesCount: 0,
        };
      });
      setComponents([...normEp, ...normNode]);
    } catch (e) {
      setCompError(String((e as Error)?.message ?? e));
    } finally {
      setCompLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'component' && componentSub === 'installed') {
      fetchComponents();
    }
  }, [activeMenu, componentSub]);

  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleError, setRuleError] = useState<string | undefined>();
  const [ruleItems, setRuleItems] = useState<any[]>([]);
  const [ruleKeywords, setRuleKeywords] = useState('');
  const [ruleKind, setRuleKind] = useState<'all' | 'endpoint' | 'node' | 'external'>('all');
  const [ruleStatus, setRuleStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [rulePage, setRulePage] = useState(1);
  const [ruleSize, setRuleSize] = useState(10);
  const [ruleTotal, setRuleTotal] = useState(0);
  const [ruleEditVisible, setRuleEditVisible] = useState(false);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleEditMode, setRuleEditMode] = useState<'edit' | 'create' | 'view'>('edit');
  const [ruleForm, setRuleForm] = useState({
    componentName: '',
    componentType: 'action',
    disabled: false,
    useDesc: '',
    useRuleDesc: '',
    id: '',
  });
  const [ruleDescMode, setRuleDescMode] = useState<'rich' | 'markdown'>('markdown');
  const [ruleDescPreview, setRuleDescPreview] = useState(true);

  const filteredRules = useMemo(() => {
    const kw = ruleKeywords.trim().toLowerCase();
    let arr = ruleItems.filter((r) => {
      if (!kw) return true;
      const name = String(r.name ?? r.ruleName ?? r.id ?? '').toLowerCase();
      const desc = String(r.description ?? r.desc ?? '').toLowerCase();
      return name.includes(kw) || desc.includes(kw);
    });
    if (ruleKind !== 'all') arr = arr.filter((r) => String(r.kind) === ruleKind);
    if (ruleStatus !== 'all') {
      const needEnabled = ruleStatus === 'enabled';
      arr = arr.filter((r) => !!r.enabled === needEnabled);
    }
    return arr;
  }, [ruleItems, ruleKeywords, ruleKind, ruleStatus]);

  const pagedRules = useMemo(() => {
    const start = (rulePage - 1) * ruleSize;
    return filteredRules.slice(start, start + ruleSize);
  }, [filteredRules, rulePage, ruleSize]);

  const fetchRules = async (page?: number, size?: number) => {
    setRuleLoading(true);
    setRuleError(undefined);
    try {
      const data = await requestJSON<any>('/componentUseRule/page', {
        params: { page: page ?? rulePage, size: size ?? ruleSize },
      });
      const list = Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      const norm = list.map((it: any) => {
        const compType = String(it?.componentType ?? it?.type ?? '');
        const kind = compType.startsWith('endpoint')
          ? 'endpoint'
          : compType === 'external'
          ? 'external'
          : 'node';
        const updatedISO = String(it?.updatedAt ?? it?.updateTime ?? '');
        const updatedTs = updatedISO ? Date.parse(updatedISO) : null;
        return {
          id: String(it?.id ?? Math.random()),
          name: String(it?.componentName ?? it?.name ?? compType ?? ''),
          type: compType,
          kind,
          category: String(compType.split('/')?.[0] || compType || '未知'),
          description: String(it?.useDesc ?? it?.description ?? it?.desc ?? ''),
          ruleDesc: String(it?.useRuleDesc ?? ''),
          enabled: it?.disabled === false,
          updateTime: updatedTs,
        };
      });
      setRuleItems(norm);
      const total = Number(data?.total ?? norm.length);
      setRuleTotal(Number.isFinite(total) ? total : norm.length);
    } catch (e) {
      setRuleError(String((e as Error)?.message ?? e));
    } finally {
      setRuleLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'component' && componentSub === 'rules') {
      fetchRules(1, ruleSize);
      setRulePage(1);
    }
  }, [activeMenu, componentSub]);

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
              gap: 16,
              marginBottom: 20,
              background: '#fff',
              borderRadius: 14,
              border: '1px solid rgba(6,7,9,0.06)',
              boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
              padding: '14px 18px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(6,7,9,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(6,7,9,0.04)';
            }}
          >
            {/* 左侧：搜索框 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <Input
                prefix={<span style={{ color: '#667EEA', fontSize: 16 }}>🔍</span>}
                value={keywords}
                onChange={(v) => {
                  setKeywords(v);
                  setPage(1);
                }}
                placeholder="搜索工作流名称或 ID..."
                showClear
                style={{
                  maxWidth: 420,
                  borderRadius: 10,
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                }}
              />
            </div>
            {/* 右侧：下拉筛选 + 新建按钮 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Select
                prefix={<span style={{ fontSize: 14 }}>📊</span>}
                value={chainFilter}
                style={{ width: 180, borderRadius: 10 }}
                onChange={(v) => {
                  setChainFilter(v as 'all' | 'root' | 'sub');
                  setPage(1);
                }}
              >
                <Select.Option value="all">全部类型</Select.Option>
                <Select.Option value="root">🌳 根规则链</Select.Option>
                <Select.Option value="sub">🔗 子规则链</Select.Option>
              </Select>
              <Button
                icon={<IconPlus />}
                theme="solid"
                type="primary"
                size="large"
                onClick={() => {
                  setShowCreateModal(true);
                }}
                style={{
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                  border: 'none',
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid rgba(6,7,9,0.06)',
                    boxShadow: '0 4px 12px rgba(6,7,9,0.04)',
                    padding: 16,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                    <Skeleton.Avatar size="large" />
                    <div style={{ flex: 1 }}>
                      <Skeleton.Title style={{ width: '70%', marginBottom: 8 }} />
                      <Skeleton.Paragraph rows={1} style={{ width: '50%' }} />
                    </div>
                  </div>
                  <Skeleton.Paragraph rows={2} style={{ marginTop: 12 }} />
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'transparent',
              }}
            >
              {rules.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 60,
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(6,7,9,0.04)',
                  }}
                >
                  <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
                  <Typography.Title heading={5} style={{ marginBottom: 8, color: '#1C2029' }}>
                    暂无工作流数据
                  </Typography.Title>
                  <Typography.Text type="tertiary" style={{ fontSize: 14 }}>
                    点击右上角&ldquo;新建工作流&rdquo;按钮开始创建
                  </Typography.Text>
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
                          {!disabled && (
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
                          )}
                          {disabled && (
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
                          )}
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
                      marginTop: 20,
                      background: '#fff',
                      borderRadius: 14,
                      border: '1px solid rgba(6,7,9,0.06)',
                      boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Typography.Text style={{ color: '#667EEA', fontWeight: 500 }}>
                        📊 共 {total} 条
                      </Typography.Text>
                      <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
                        显示 {start}-{end} 条
                      </Typography.Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Select
                        value={size}
                        style={{ width: 110, borderRadius: 8 }}
                        onChange={(v) => {
                          setSize(Number(v));
                          setPage(1);
                        }}
                      >
                        <Select.Option value={10}>10 / 页</Select.Option>
                        <Select.Option value={20}>20 / 页</Select.Option>
                        <Select.Option value={50}>50 / 页</Select.Option>
                      </Select>
                      <Pagination
                        total={total}
                        pageSize={size}
                        currentPage={page}
                        onChange={(p: number) => setPage(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                        }}
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

    // 组件管理：新增子菜单（已安装组件 / 组件规则 / 组件市场）
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid rgba(6,7,9,0.06)',
            boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
            padding: '8px 12px',
          }}
        >
          <Nav
            mode="horizontal"
            items={[
              { itemKey: 'installed', text: '✅ 已安装组件' },
              { itemKey: 'rules', text: '📐 组件规则' },
              { itemKey: 'market', text: '🛍️ 组件市场' },
            ]}
            selectedKeys={[componentSub]}
            onSelect={(data) => setComponentSub(data.itemKey as any)}
            style={{ background: 'transparent' }}
          />
        </div>

        {componentSub === 'installed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(6,7,9,0.06)',
                boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Input
                  prefix={<span style={{ color: '#667EEA', fontSize: 16 }}>🔍</span>}
                  value={compKeywords}
                  onChange={(v) => {
                    setCompKeywords(v);
                    setCompPage(1);
                  }}
                  placeholder="搜索组件名称/描述..."
                  showClear
                  style={{ maxWidth: 380, borderRadius: 10 }}
                />
                <Select
                  value={compKind}
                  style={{ width: 180 }}
                  onChange={(v) => {
                    setCompKind(v as any);
                    setCompPage(1);
                  }}
                >
                  {compKinds.map((k) => (
                    <Select.Option key={k} value={k}>
                      {k === 'all' ? '全部种类' : k === 'endpoint' ? '端点' : '节点'}
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => fetchComponents()}
                  loading={compLoading}
                >
                  查询
                </Button>
                <Button
                  type="tertiary"
                  onClick={() => {
                    setCompKeywords('');
                    setCompKind('all');
                    setCompPage(1);
                    fetchComponents();
                  }}
                >
                  重置
                </Button>
              </div>
              <div>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => Toast.info({ content: '创建组件功能待接入' })}
                >
                  创建组件
                </Button>
              </div>
            </div>
            {compError ? (
              <Typography.Text type="danger">加载失败：{compError}</Typography.Text>
            ) : null}
            <Spin spinning={compLoading}>
              <Table
                dataSource={pagedComponents}
                rowKey={(r: any) => String(r.id ?? r.type ?? Math.random())}
                columns={[
                  {
                    title: '组件名称',
                    render: (_, r: any) => String(r.label || r.name || r.type || '-'),
                    width: 240,
                  },
                  {
                    title: '组件分类',
                    render: (_, r: any) => String(r.category ?? '未分类'),
                    width: 160,
                  },
                  {
                    title: '组件种类',
                    render: (_, r: any) => (String(r.kind) === 'endpoint' ? '端点' : '节点'),
                    width: 120,
                  },
                  {
                    title: '字段数',
                    dataIndex: 'fieldsLen',
                    width: 100,
                  },
                  {
                    title: '关联数',
                    dataIndex: 'relationTypesLen',
                    width: 100,
                  },
                  {
                    title: '实例数',
                    dataIndex: 'instancesCount',
                    width: 100,
                  },
                  {
                    title: '描述',
                    render: (_, r: any) => (
                      <Typography.Text type="tertiary">
                        {String(r.description ?? r.desc ?? '')}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: '操作',
                    width: 220,
                    render: (_, r: any) => (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() =>
                            Toast.info({ content: `查看详情：${String(r.name ?? r.type ?? '')}` })
                          }
                        >
                          详情
                        </Button>
                        <Button
                          size="small"
                          type="secondary"
                          onClick={() => Toast.info({ content: '启用/停用功能待接入' })}
                        >
                          启用/停用
                        </Button>
                        <Button
                          size="small"
                          type="danger"
                          onClick={() => Toast.info({ content: '移除功能待接入' })}
                        >
                          移除
                        </Button>
                      </div>
                    ),
                  },
                ]}
                pagination={false}
              />
            </Spin>
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(6,7,9,0.06)',
                boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Typography.Text>共 {filteredComponents.length} 条</Typography.Text>
                <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
                  显示 {filteredComponents.length === 0 ? 0 : (compPage - 1) * compSize + 1}-
                  {Math.min(compPage * compSize, filteredComponents.length)} 条
                </Typography.Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Select
                  value={compSize}
                  style={{ width: 110 }}
                  onChange={(v) => {
                    setCompSize(Number(v));
                    setCompPage(1);
                  }}
                >
                  <Select.Option value={10}>10 / 页</Select.Option>
                  <Select.Option value={20}>20 / 页</Select.Option>
                  <Select.Option value={50}>50 / 页</Select.Option>
                </Select>
                <Pagination
                  total={filteredComponents.length}
                  pageSize={compSize}
                  currentPage={compPage}
                  onChange={(p: number) => setCompPage(p)}
                />
              </div>
            </div>
          </div>
        )}

        {componentSub === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(6,7,9,0.06)',
                boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Input
                  prefix={<span style={{ color: '#667EEA', fontSize: 16 }}>🔍</span>}
                  value={ruleKeywords}
                  onChange={(v) => {
                    setRuleKeywords(v);
                    setRulePage(1);
                  }}
                  placeholder="搜索规则名称/描述..."
                  showClear
                  style={{ maxWidth: 380, borderRadius: 10 }}
                />
                <Select
                  value={ruleKind}
                  style={{ width: 160 }}
                  onChange={(v) => {
                    setRuleKind(v as any);
                    setRulePage(1);
                  }}
                >
                  <Select.Option value="all">全部类型</Select.Option>
                  <Select.Option value="endpoint">端点</Select.Option>
                  <Select.Option value="node">节点</Select.Option>
                  <Select.Option value="external">外部</Select.Option>
                </Select>
                <Select
                  value={ruleStatus}
                  style={{ width: 160 }}
                  onChange={(v) => {
                    setRuleStatus(v as any);
                    setRulePage(1);
                  }}
                >
                  <Select.Option value="all">全部状态</Select.Option>
                  <Select.Option value="enabled">启用</Select.Option>
                  <Select.Option value="disabled">禁用</Select.Option>
                </Select>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => fetchRules(1, ruleSize)}
                  loading={ruleLoading}
                >
                  查询
                </Button>
                <Button
                  type="tertiary"
                  onClick={() => {
                    setRuleKeywords('');
                    setRuleKind('all');
                    setRuleStatus('all');
                    setRulePage(1);
                    fetchRules(1, ruleSize);
                  }}
                >
                  重置
                </Button>
              </div>
              <div>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => {
                    if (!components.length) fetchComponents();
                    setRuleEditMode('create');
                    setRuleForm({
                      componentName: '',
                      componentType: 'action',
                      disabled: false,
                      useDesc: '',
                      useRuleDesc: '',
                      id: '',
                    });
                    setRuleDescMode('markdown');
                    setRuleDescPreview(true);
                    setRuleEditVisible(true);
                  }}
                >
                  新增规则
                </Button>
              </div>
            </div>
            {ruleError ? (
              <Typography.Text type="danger">加载失败：{ruleError}</Typography.Text>
            ) : null}
            <Spin spinning={ruleLoading}>
              <Table
                dataSource={pagedRules}
                rowKey={(r: any) => String(r.id)}
                columns={[
                  {
                    title: '规则名称',
                    render: (_, r: any) => String(r.name ?? '-'),
                    width: 220,
                  },
                  {
                    title: '类型',
                    render: (_, r: any) =>
                      String(r.kind) === 'endpoint'
                        ? '端点'
                        : String(r.kind) === 'node'
                        ? '节点'
                        : '外部',
                    width: 120,
                  },
                  {
                    title: '描述',
                    render: (_, r: any) => (
                      <Typography.Text type="tertiary">
                        {String(r.description ?? '')}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: '状态',
                    width: 120,
                    render: (_, r: any) => (
                      <Tag size="small" color={r.enabled ? 'green' : 'orange'}>
                        {r.enabled ? '启用' : '禁用'}
                      </Tag>
                    ),
                  },
                  {
                    title: '更新时间',
                    width: 180,
                    render: (_, r: any) => {
                      const ts = Number(r.updateTime ?? 0);
                      return ts ? new Date(ts).toLocaleString() : '';
                    },
                  },
                  {
                    title: '操作',
                    width: 220,
                    render: (_, r: any) => (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            const compType = String(r.type || '');
                            const mappedType = compType.startsWith('endpoint')
                              ? 'endpoint'
                              : r.kind === 'external'
                              ? 'external'
                              : 'action';
                            setRuleEditMode('view');
                            setRuleForm({
                              componentName: String(r.name || ''),
                              componentType: mappedType,
                              disabled: !Boolean(r.enabled),
                              useDesc: String(r.description || ''),
                              useRuleDesc: String(r.ruleDesc || ''),
                              id: String(r.id || ''),
                            });
                            const isHTML = /<[^>]+>/.test(String(r.ruleDesc || ''));
                            setRuleDescMode(isHTML ? 'rich' : 'markdown');
                            setRuleDescPreview(isHTML ? false : true);
                            setRuleEditVisible(true);
                          }}
                        >
                          详情
                        </Button>
                        <Button
                          size="small"
                          type="secondary"
                          onClick={() => {
                            const compType = String(r.type || '');
                            const mappedType = compType.startsWith('endpoint')
                              ? 'endpoint'
                              : r.kind === 'external'
                              ? 'external'
                              : 'action';
                            setRuleEditMode('edit');
                            setRuleForm({
                              componentName: String(r.name || ''),
                              componentType: mappedType,
                              disabled: !Boolean(r.enabled),
                              useDesc: String(r.description || ''),
                              useRuleDesc: String(r.ruleDesc || ''),
                              id: String(r.id || ''),
                            });
                            setRuleDescMode('markdown');
                            setRuleDescPreview(true);
                            setRuleEditVisible(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          size="small"
                          type="danger"
                          onClick={() => Toast.info({ content: '删除功能待接入' })}
                        >
                          删除
                        </Button>
                      </div>
                    ),
                  },
                ]}
                pagination={false}
              />
            </Spin>
            <Modal
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🛠️</span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {ruleEditMode === 'edit'
                      ? '编辑组件规则'
                      : ruleEditMode === 'create'
                      ? '新增组件规则'
                      : '组件规则详情'}
                  </span>
                </div>
              }
              visible={ruleEditVisible}
              onCancel={() => setRuleEditVisible(false)}
              confirmLoading={ruleSubmitting}
              okText={
                ruleEditMode === 'edit' ? '更新' : ruleEditMode === 'create' ? '新增' : '关闭'
              }
              onOk={async () => {
                if (!ruleForm.componentName.trim()) {
                  Toast.warning({ content: '请输入组件名称' });
                  return;
                }
                if (ruleEditMode === 'view') {
                  setRuleEditVisible(false);
                  return;
                }
                setRuleSubmitting(true);
                try {
                  const content = String(ruleForm.useRuleDesc || '');
                  if (ruleEditMode === 'edit') {
                    if (!ruleForm.id) {
                      Toast.warning({ content: '缺少规则ID' });
                      setRuleSubmitting(false);
                      return;
                    }
                    await requestJSON('/componentUseRule/update', {
                      method: 'POST',
                      body: {
                        componentName: ruleForm.componentName,
                        componentType: ruleForm.componentType,
                        disabled: !!ruleForm.disabled,
                        useDesc: ruleForm.useDesc,
                        useRuleDesc: content,
                        id: String(ruleForm.id),
                      },
                    });
                    Toast.success({ content: '更新成功' });
                  } else {
                    await requestJSON('/componentUseRule/create', {
                      method: 'POST',
                      body: {
                        componentName: ruleForm.componentName,
                        componentType: ruleForm.componentType,
                        disabled: !!ruleForm.disabled,
                        useDesc: ruleForm.useDesc,
                        useRuleDesc: content,
                      },
                    });
                    Toast.success({ content: '新增成功' });
                  }
                  setRuleEditVisible(false);
                  await fetchRules(rulePage, ruleSize);
                } catch (e) {
                  Toast.error({ content: String((e as Error)?.message ?? e) });
                } finally {
                  setRuleSubmitting(false);
                }
              }}
              style={{ borderRadius: 16, width: 980 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                    组件名称 *
                  </Typography.Text>
                  {ruleEditMode === 'edit' ? (
                    <Input value={ruleForm.componentName} placeholder="组件名称不可修改" disabled />
                  ) : ruleEditMode === 'create' ? (
                    <Select
                      value={ruleForm.componentName}
                      style={{ width: '100%' }}
                      onChange={(v) => {
                        const name = String(v);
                        const opt = componentOptions.find((o) => o.value === name);
                        const compType =
                          opt?.category || (name.startsWith('endpoint') ? 'endpoint' : 'action');
                        setRuleForm({
                          ...ruleForm,
                          componentName: name,
                          componentType: compType,
                        });
                      }}
                    >
                      {componentOptions.map((o) => (
                        <Select.Option key={o.value} value={o.value}>
                          {o.label}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={ruleForm.componentName} disabled />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                      组件类型 *
                    </Typography.Text>
                    <Select
                      value={ruleForm.componentType}
                      onChange={(v) => setRuleForm({ ...ruleForm, componentType: String(v) })}
                      disabled={ruleEditMode === 'view'}
                    >
                      <Select.Option value="action">动作</Select.Option>
                      <Select.Option value="endpoint">端点</Select.Option>
                      <Select.Option value="external">外部</Select.Option>
                    </Select>
                  </div>
                  <div style={{ width: 160 }}>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                      组件状态
                    </Typography.Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Typography.Text>启用</Typography.Text>
                      <Switch
                        checked={!ruleForm.disabled}
                        onChange={(v) => setRuleForm({ ...ruleForm, disabled: !v })}
                        disabled={ruleEditMode === 'view'}
                      />
                      <Typography.Text type="tertiary">禁用</Typography.Text>
                    </div>
                  </div>
                </div>
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                    使用描述
                  </Typography.Text>
                  <TextArea
                    value={ruleForm.useDesc}
                    onChange={(v) => setRuleForm({ ...ruleForm, useDesc: String(v) })}
                    autosize={{ minRows: 3, maxRows: 6 }}
                    placeholder="请输入使用描述"
                    disabled={ruleEditMode === 'view'}
                  />
                </div>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                      使用规则描述
                    </Typography.Text>
                    <Select
                      value={ruleDescMode}
                      onChange={(v) => {
                        setRuleDescMode(v as any);
                        if (String(v) === 'rich') setRuleDescPreview(false);
                        else setRuleDescPreview(true);
                      }}
                      disabled={ruleEditMode === 'view'}
                      style={{ width: 140 }}
                    >
                      <Select.Option value="rich">富文本</Select.Option>
                      <Select.Option value="markdown">Markdown</Select.Option>
                    </Select>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        ruleDescMode === 'markdown' && ruleDescPreview ? '1fr 1fr' : '1fr',
                      gap: 12,
                    }}
                  >
                    <div>
                      {ruleDescMode === 'rich' ? (
                        <ReactQuill
                          value={ruleForm.useRuleDesc}
                          onChange={(html) =>
                            setRuleForm({ ...ruleForm, useRuleDesc: String(html) })
                          }
                          theme="snow"
                          modules={{
                            toolbar:
                              ruleEditMode === 'view'
                                ? false
                                : [
                                    [{ header: [1, 2, 3, false] }],
                                    [
                                      'bold',
                                      'italic',
                                      'underline',
                                      'strike',
                                      'blockquote',
                                      'code-block',
                                    ],
                                    [{ list: 'ordered' }, { list: 'bullet' }],
                                    ['link'],
                                    ['clean'],
                                  ],
                          }}
                          readOnly={ruleEditMode === 'view'}
                          formats={[
                            'header',
                            'bold',
                            'italic',
                            'underline',
                            'strike',
                            'blockquote',
                            'code-block',
                            'list',
                            'ordered',
                            'bullet',
                            'link',
                          ]}
                        />
                      ) : (
                        <TextArea
                          value={ruleForm.useRuleDesc}
                          onChange={(v) => setRuleForm({ ...ruleForm, useRuleDesc: String(v) })}
                          autosize={{ minRows: 10, maxRows: 24 }}
                          placeholder="支持 Markdown 语法，提交时将自动转换为 HTML"
                          disabled={ruleEditMode === 'view'}
                        />
                      )}
                    </div>
                    {ruleDescMode === 'markdown' && ruleDescPreview && (
                      <div
                        style={{
                          border: '1px solid rgba(6,7,9,0.08)',
                          borderRadius: 8,
                          padding: 12,
                          background: '#FAFAFB',
                          overflowY: 'auto',
                          maxHeight: 420,
                        }}
                        dangerouslySetInnerHTML={{
                          __html:
                            ruleDescMode === 'markdown'
                              ? String(marked.parse(ruleForm.useRuleDesc || ''))
                              : String(ruleForm.useRuleDesc || ''),
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Typography.Text>实时预览</Typography.Text>
                    <Switch
                      checked={ruleDescPreview}
                      onChange={(v) => setRuleDescPreview(!!v)}
                      disabled={ruleEditMode === 'view'}
                    />
                  </div>
                </div>
              </div>
            </Modal>
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(6,7,9,0.06)',
                boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Typography.Text>共 {filteredRules.length} 条</Typography.Text>
                <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
                  显示 {filteredRules.length === 0 ? 0 : (rulePage - 1) * ruleSize + 1}-
                  {Math.min(rulePage * ruleSize, filteredRules.length)} 条
                </Typography.Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Select
                  value={ruleSize}
                  style={{ width: 110 }}
                  onChange={(v) => {
                    const s = Number(v);
                    setRuleSize(s);
                    setRulePage(1);
                    fetchRules(1, s);
                  }}
                >
                  <Select.Option value={10}>10 / 页</Select.Option>
                  <Select.Option value={20}>20 / 页</Select.Option>
                  <Select.Option value={50}>50 / 页</Select.Option>
                </Select>
                <Pagination
                  total={ruleTotal}
                  pageSize={ruleSize}
                  currentPage={rulePage}
                  onChange={(p: number) => {
                    setRulePage(p);
                    fetchRules(p, ruleSize);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {componentSub === 'market' && (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid rgba(6,7,9,0.06)',
              boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography.Title heading={5} style={{ margin: 0 }}>
                  组件市场
                </Typography.Title>
                <Typography.Text type="tertiary" style={{ display: 'block', marginTop: 6 }}>
                  暂无远程市场接入，展示本地可用组件概览
                </Typography.Text>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
                marginTop: 16,
              }}
            >
              {componentList.map((item) => (
                <div
                  key={String(item.type)}
                  style={{
                    background: '#FAFAFB',
                    borderRadius: 12,
                    border: '1px solid rgba(6,7,9,0.06)',
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {item.icon ? (
                    <img
                      src={item.icon as string}
                      alt={String(item.type)}
                      style={{ width: 32, height: 32, borderRadius: 4 }}
                    />
                  ) : (
                    <div
                      style={{ width: 32, height: 32, borderRadius: 4, background: '#F2F3F5' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block' }}>
                      {String(item.type)}
                    </Typography.Text>
                    <Typography.Text
                      type="tertiary"
                      style={{
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.description}
                    </Typography.Text>
                  </div>
                  <Button
                    size="small"
                    type="tertiary"
                    onClick={() => Toast.info({ content: '可在画布侧边栏添加此组件' })}
                  >
                    添加
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCreateModal = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>新建工作流</span>
        </div>
      }
      visible={showCreateModal}
      onCancel={() => setShowCreateModal(false)}
      confirmLoading={createSubmitting}
      style={{ borderRadius: 16 }}
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
            const { customAlphabet } = require('nanoid');
            setCreateId(
              customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)()
            );
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#1C2029' }}>
            工作流名称 *
          </Typography.Text>
          <Input
            value={createName}
            onChange={setCreateName}
            placeholder="请输入工作流名称"
            size="large"
            style={{ borderRadius: 10 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#1C2029' }}>
            工作流描述
          </Typography.Text>
          <Input
            value={createDesc}
            onChange={setCreateDesc}
            placeholder="请输入工作流描述（可选）"
            size="large"
            style={{ borderRadius: 10 }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'rgba(102, 126, 234, 0.08)',
            borderRadius: 10,
            border: '1px solid rgba(102, 126, 234, 0.15)',
          }}
        >
          <Switch checked={createRoot} onChange={(v) => setCreateRoot(!!v)} />
          <div>
            <Typography.Text strong style={{ display: 'block', color: '#1C2029' }}>
              根规则链
            </Typography.Text>
            <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
              是否设置为根规则链
            </Typography.Text>
          </div>
        </div>

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#1C2029' }}>
            工作流 ID
          </Typography.Text>
          <Input
            value={createId}
            onChange={setCreateId}
            placeholder="自动生成，可修改"
            size="large"
            style={{ borderRadius: 10, fontFamily: 'monospace' }}
          />
          <Typography.Text type="tertiary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
            💡 提示：ID 用于唯一标识工作流，建议使用默认生成的随机 ID
          </Typography.Text>
        </div>
      </div>
    </Modal>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F8FA' }}>
      {/* 左侧菜单栏 - 优化版 */}
      <div
        style={{
          width: 260,
          borderRight: '1px solid rgba(6,7,9,0.08)',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            padding: '16px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Typography.Title heading={5} style={{ margin: 0, color: '#fff', position: 'relative' }}>
            ⚡ Flowgram
          </Typography.Title>
          <Typography.Text
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              position: 'relative',
            }}
          >
            控制台 · 管理与组件
          </Typography.Text>
        </div>

        {/* 导航菜单 */}
        <div style={{ flex: 1 }}>
          <Nav
            mode="vertical"
            items={[
              { itemKey: 'workflow', text: '🔄 工作流管理' },
              { itemKey: 'component', text: '🧩 组件管理' },
            ]}
            selectedKeys={[activeMenu]}
            onSelect={(data) => {
              const key = data.itemKey as MenuKey;
              setActiveMenu(key);
              if (key === 'workflow') window.location.hash = '#/';
              if (key === 'component') window.location.hash = '#/components';
            }}
            style={{
              background: 'transparent',
            }}
          />
        </div>

        {/* 底部版本信息 */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(102, 126, 234, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.15)',
          }}
        >
          <Typography.Text
            type="tertiary"
            style={{ fontSize: 11, display: 'block', fontWeight: 500 }}
          >
            💎 v1.0.0 Demo
          </Typography.Text>
          <Typography.Text type="tertiary" style={{ fontSize: 10 }}>
            Powered by Flowgram.ai
          </Typography.Text>
        </div>
      </div>
      {/* 右侧内容区 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#F7F8FA',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid rgba(6,7,9,0.06)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(6,7,9,0.04)',
            backdropFilter: 'blur(8px)',
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
