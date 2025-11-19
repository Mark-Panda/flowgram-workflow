/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from '@flowgram.ai/free-layout-editor';

import { useEditorStore } from '../stores/editor-store';

/**
 * 脏状态服务
 * 用于跟踪编辑器是否有未保存的更改
 */
@injectable()
export class DirtyService {
  setDirty(dirty: boolean) {
    useEditorStore.getState().setDirty(dirty);
  }

  isDirty() {
    return useEditorStore.getState().isDirty;
  }
}
