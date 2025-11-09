/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { requestJSON } from './http';

export const getRuleList = async (params: {
  page?: number;
  size?: number;
  keywords?: string;
  root?: boolean;
}) => requestJSON<{ items: any[]; total?: number; count?: number }>('/rules', { params });

export const createRuleBase = async (id: string, body: any) =>
  requestJSON(`/rules/${encodeURIComponent(id)}/base`, { method: 'POST', body });

export const getRuleDetail = async (id: string) => requestJSON(`/rules/${encodeURIComponent(id)}`);

export const updateRule = async (id: string, body: any) =>
  requestJSON(`/rules/${encodeURIComponent(id)}`, { method: 'POST', body });
