/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import { Nav, Typography } from '@douyinfe/semi-ui';

import { WorkflowSection } from './sections/WorkflowSection';
import { DocsSection } from './sections/DocsSection';
import { ComponentsSection } from './sections/ComponentsSection';
import { IntroPage } from '../landing/IntroPage';

type MenuKey = 'intro' | 'workflow' | 'component' | 'docs';

export const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(() => {
    try {
      const h = typeof window !== 'undefined' ? window.location.hash : '';
      if (h === '#/' || h === '' || h === '#') return 'intro';
      if (h.startsWith('#/components')) return 'component';
      if (h.startsWith('#/docs')) return 'docs';
      return 'workflow';
    } catch {
      return 'intro';
    }
  });

  useEffect(() => {
    const getMenu = (h: string): MenuKey => {
      if (h === '#/' || h === '' || h === '#') return 'intro';
      if (h.startsWith('#/components')) return 'component';
      if (h.startsWith('#/docs')) return 'docs';
      return 'workflow';
    };
    const onHash = () => {
      try {
        const h = typeof window !== 'undefined' ? window.location.hash : '';
        setActiveMenu(getMenu(h || '#/'));
      } catch {}
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const renderContent = () => {
    if (activeMenu === 'intro') return <IntroPage />;
    if (activeMenu === 'workflow') return <WorkflowSection />;
    if (activeMenu === 'docs') return <DocsSection />;
    return <ComponentsSection />;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F8FA' }}>
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
          <Typography.Title
            heading={5}
            style={{ margin: 0, color: '#fff', position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              try {
                window.location.hash = '#/';
                setActiveMenu('intro');
              } catch {}
            }}
          >
            ⚡ Flowgram
          </Typography.Title>
          <Typography.Text
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, position: 'relative' }}
          >
            控制台 · 管理与组件
          </Typography.Text>
        </div>
        <div style={{ flex: 1 }}>
          <Nav
            mode="vertical"
            items={[
              { itemKey: 'workflow', text: '🔄 工作流管理' },
              { itemKey: 'component', text: '🧩 组件管理' },
              { itemKey: 'docs', text: '📄 业务文档管理' },
            ]}
            selectedKeys={activeMenu === 'intro' ? [] : [activeMenu]}
            onSelect={(data) => {
              const key = data.itemKey as MenuKey;
              setActiveMenu(key);
              if (key === 'workflow') window.location.hash = '#/admin';
              if (key === 'component') window.location.hash = '#/components';
              if (key === 'docs') window.location.hash = '#/docs';
            }}
            style={{ background: 'transparent' }}
          />
        </div>
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#F7F8FA',
          overflow: 'hidden',
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel;
