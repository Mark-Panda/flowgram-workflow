/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry } from '../typings';
import { TransformNodeRegistry } from './transform';
import { StartNodeRegistry } from './start';
import { LogStringNodeRegistry } from './logString';
import { LLMNodeRegistry } from './llm';
import { JsFilterNodeRegistry } from './jsFilter';
import { JoinNodeRegistry } from './join';
import { HTTPNodeRegistry } from './http';
import { GroupNodeRegistry } from './group';
import { ForkNodeRegistry } from './fork';
import { ForNodeRegistry } from './for';
import { FetchNodeOutputRegistry } from './fetch-node-output';
import { EndNodeRegistry } from './end';
import { CommentNodeRegistry } from './comment';
import { CaseConditionNodeRegistry } from './case-condition';
import { BlockStartNodeRegistry } from './block-start';
import { BlockEndNodeRegistry } from './block-end';
import { DBClientNodeRegistry } from './dbClient';
export { WorkflowNodeType } from './constants';

// 节点注册
export const nodeRegistries: FlowNodeRegistry[] = [
  TransformNodeRegistry,
  JsFilterNodeRegistry,
  LogStringNodeRegistry,
  CaseConditionNodeRegistry,
  StartNodeRegistry,
  EndNodeRegistry,
  LLMNodeRegistry,
  ForNodeRegistry,
  ForkNodeRegistry,
  JoinNodeRegistry,
  FetchNodeOutputRegistry,
  CommentNodeRegistry,
  BlockStartNodeRegistry,
  BlockEndNodeRegistry,
  HTTPNodeRegistry,
  GroupNodeRegistry,
  DBClientNodeRegistry,
];
