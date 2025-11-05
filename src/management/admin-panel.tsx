/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';

import { Button, List, Nav, Typography } from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft } from '@douyinfe/semi-icons';

import { Editor } from '../editor';
import { nodeRegistries } from '../nodes';

type MenuKey = 'workflow' | 'component';

export const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('workflow');
  const [showEditor, setShowEditor] = useState(false);

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
              <Button icon={<IconPlus />} theme="solid" type="primary" onClick={() => setShowEditor(true)}>
                新建工作流
              </Button>
            </>
          ) : (
            <>
              <Button icon={<IconChevronLeft />} onClick={() => setShowEditor(false)}>
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

  const renderContent = () => {
    if (activeMenu === 'workflow') {
      if (showEditor) {
        // 展示当前已有的画布
        return (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <Editor />
          </div>
        );
      }
      // 简单的占位列表，后续可接入持久化的工作流清单
      return (
        <div style={{ padding: 16 }}>
          <Typography.Text type="tertiary">
            点击右上角“新建工作流”使用画布创建新的工作流。
          </Typography.Text>
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