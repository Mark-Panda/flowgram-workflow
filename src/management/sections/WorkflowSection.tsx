import React, { useEffect, useState } from 'react';

import {
  Button,
  Input,
  Select,
  Typography,
  Tag,
  Skeleton,
  Pagination,
  Modal,
  Toast,
} from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft } from '@douyinfe/semi-icons';

import { RuleDetail, RuleDetailData } from '../rule-detail';
import { FlowDocumentJSON } from '../../typings';
import {
  getRuleList,
  createRuleBase,
  startRuleChain,
  stopRuleChain,
  deleteRuleChain,
} from '../../services/api-rules';
import { Editor } from '../../editor';

export const WorkflowSection: React.FC = () => {
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
  const [chainFilter, setChainFilter] = useState<'all' | 'root' | 'sub'>('all');
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createRoot, setCreateRoot] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [operatingIds, setOperatingIds] = useState<Set<string>>(new Set());
  const [createId, setCreateId] = useState<string>(() => {
    try {
      const { customAlphabet } = require('nanoid');
      return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)();
    } catch {
      return Math.random().toString(36).slice(2, 14);
    }
  });

  const refreshList = async () => {
    if (showEditor) return;
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

  useEffect(() => {
    if (showEditor) return;
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
  }, [page, size, keywords, chainFilter, showEditor]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#F7F8FA',
        overflow: 'hidden',
      }}
    >
      {showDetail ? (
        <RuleDetail
          data={detailData as RuleDetailData}
          onBack={() => {
            setShowDetail(false);
            setDetailData(undefined);
          }}
        />
      ) : showEditor ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              background: '#fff',
              borderBottom: '1px solid rgba(6,7,9,0.06)',
            }}
          >
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
          </div>
          <Editor initialDoc={selectedDoc} />
        </div>
      ) : (
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
            }}
          >
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
                onClick={() => setShowCreateModal(true)}
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
            <div style={{ background: 'transparent' }}>
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
                    点击右上角“新建工作流”按钮开始创建
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
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
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
                            type="danger"
                            disabled={operatingIds.has(String(chain?.id ?? ''))}
                            loading={operatingIds.has(String(chain?.id ?? ''))}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const id = String(chain?.id ?? '');
                              const name = String(chain?.name ?? '');
                              if (!id) return;
                              
                              Modal.confirm({
                                title: '确认删除',
                                content: `确定要删除工作流"${name}"吗？此操作不可恢复。`,
                                okText: '确认删除',
                                cancelText: '取消',
                                okType: 'danger',
                                onOk: async () => {
                                  const next = new Set(operatingIds);
                                  next.add(id);
                                  setOperatingIds(next);
                                  try {
                                    await deleteRuleChain(id);
                                    Toast.success({ content: '删除成功' });
                                    await refreshList();
                                  } catch (e) {
                                    Toast.error({ content: String((e as Error)?.message ?? e) });
                                  } finally {
                                    const done = new Set(operatingIds);
                                    done.delete(id);
                                    setOperatingIds(done);
                                  }
                                },
                              });
                            }}
                          >
                            删除
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
                        style={{ display: 'flex', alignItems: 'center' }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
            window.location.hash = `#/workflow/${encodeURIComponent(createId)}`;
            setCreateName('');
            setCreateDesc('');
            setCreateRoot(true);
            try {
              const { customAlphabet } = require('nanoid');
              setCreateId(
                customAlphabet(
                  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
                  12
                )()
              );
            } catch {
              setCreateId(Math.random().toString(36).slice(2, 14));
            }
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
            <Select
              value={createRoot ? '1' : '0'}
              onChange={(v) => setCreateRoot(v === '1')}
              style={{ width: 80 }}
            >
              <Select.Option value="1">是</Select.Option>
              <Select.Option value="0">否</Select.Option>
            </Select>
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
            <Typography.Text
              type="tertiary"
              style={{ fontSize: 11, marginTop: 4, display: 'block' }}
            >
              💡 提示：ID 用于唯一标识工作流，建议使用默认生成的随机 ID
            </Typography.Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowSection;
