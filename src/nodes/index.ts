/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry } from '../typings';
import { VariableNodeRegistry } from './variable';
import { TransformNodeRegistry } from './transform';
import { StartNodeRegistry } from './start';
import { LoopNodeRegistry } from './loop';
import { LLMNodeRegistry } from './llm';
import { JoinNodeRegistry } from './join';
import { HTTPNodeRegistry } from './http';
import { GroupNodeRegistry } from './group';
import { ForkNodeRegistry } from './fork';
import { ForNodeRegistry } from './for';
import { FetchNodeOutputRegistry } from './fetch-node-output';
import { EndNodeRegistry } from './end';
import { ContinueNodeRegistry } from './continue';
import { ConditionNodeRegistry } from './condition';
import { CommentNodeRegistry } from './comment';
import { CodeNodeRegistry } from './code';
import { CaseConditionNodeRegistry } from './case-condition';
import { BreakNodeRegistry } from './break';
import { BlockStartNodeRegistry } from './block-start';
import { BlockEndNodeRegistry } from './block-end';
export { WorkflowNodeType } from './constants';

// 节点注册
export const nodeRegistries: FlowNodeRegistry[] = [
  TransformNodeRegistry,
  CaseConditionNodeRegistry,
  ConditionNodeRegistry,
  StartNodeRegistry,
  EndNodeRegistry,
  LLMNodeRegistry,
  LoopNodeRegistry,
  ForNodeRegistry,
  ForkNodeRegistry,
  JoinNodeRegistry,
  FetchNodeOutputRegistry,
  CommentNodeRegistry,
  BlockStartNodeRegistry,
  BlockEndNodeRegistry,
  HTTPNodeRegistry,
  CodeNodeRegistry,
  ContinueNodeRegistry,
  BreakNodeRegistry,
  VariableNodeRegistry,
  GroupNodeRegistry,
];
