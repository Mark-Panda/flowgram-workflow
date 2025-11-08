/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Spin, Typography } from '@douyinfe/semi-ui';
import { RuleDetail, RuleDetailData } from './rule-detail';

export const RuleDetailPage: React.FC<{ id: string; tab?: 'workflow' | 'design' }> = ({ id, tab }) => {
  const [data, setData] = useState<RuleDetailData | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const token = (typeof window !== 'undefined' && (localStorage.getItem('AUTH_TOKEN') || localStorage.getItem('token'))) || '';
        const res = await fetch(`http://127.0.0.1:9099/api/v1/rules/${encodeURIComponent(id)}`, {
          headers: {
            Accept: 'application/json, text/plain, */*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json as RuleDetailData);
      } catch (e) {
        if (mounted) setError(String((e as Error)?.message ?? e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <Spin tip="加载中..." style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
  if (error || !data) return <div style={{ padding: 24 }}><Typography.Text type="danger">加载失败：{error ?? '未知错误'}</Typography.Text></div>;

  return (
    <RuleDetail data={data} onBack={() => { window.location.hash = '#/'; }} initialTab={tab ?? 'workflow'} />
  );
};