/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';

/**
 * 编辑器状态接口
 */
interface EditorStore {
  /** 是否有未保存的更改 */
  isDirty: boolean;
  /** 设置脏状态 */
  setDirty: (dirty: boolean) => void;

  /** 选中的节点 ID 列表 */
  selectedNodes: string[];
  /** 设置选中的节点 */
  setSelectedNodes: (nodes: string[]) => void;

  /** 是否正在运行 */
  isRunning: boolean;
  /** 设置运行状态 */
  setRunning: (running: boolean) => void;

  /** 重置所有状态 */
  reset: () => void;
}

const initialState = {
  isDirty: false,
  selectedNodes: [],
  isRunning: false,
};

/**
 * 编辑器状态管理
 */
export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  setDirty: (dirty: boolean) => set({ isDirty: dirty }),

  setSelectedNodes: (nodes: string[]) => set({ selectedNodes: nodes }),

  setRunning: (running: boolean) => set({ isRunning: running }),

  reset: () => set(initialState),
}));
