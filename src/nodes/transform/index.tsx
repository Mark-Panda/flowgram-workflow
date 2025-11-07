/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import iconCode from '../../assets/icon-script.png';
import { formMeta } from './form-meta';

const defaultCode = `// 函数签名不可修改
async function Transform(msg, metadata, msgType, dataType) {
  // 默认返回值：原样返回四项内容（可在函数体内修改）
  return {
    msg: msg,           // 转换后的消息内容
    metadata: metadata, // 转换后的元数据
    msgType: msgType,   // 转换后的消息类型
    dataType: dataType  // 可选：转换后的数据类型
  };
}`;

export const TransformNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Transform,
  info: {
    icon: iconCode,
    description: 'Transform 消息内容，函数签名与入参固定',
  },
  meta: {
    // 设置端口：一个输入，两个输出（success / failed）
    defaultPorts: [
      { type: 'input', location: 'left' },
      { type: 'output', location: 'right', portID: 'success' },
      { type: 'output', location: 'bottom', portID: 'failed' },
    ],
    size: {
      width: 360,
      height: 330,
    },
  },
  onAdd() {
    return {
      id: `transform_${nanoid(5)}`,
      type: 'transform',
      data: {
        title: `Transform`,
        script: {
          language: 'javascript',
          content: defaultCode,
        },
      },
    };
  },
  formMeta,
};