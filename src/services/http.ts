/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable import/no-extraneous-dependencies */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const BASE_URL = 'http://127.0.0.1:9099/api/v1';

const getToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('AUTH_TOKEN') || window.localStorage.getItem('token') || '';
};

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

// 创建 axios 实例并设置拦截器
const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json, text/plain, */*',
  },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    if (error?.response) {
      const status = error.response.status;
      const text =
        typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
      throw new Error(`HTTP ${status}: ${text || 'Request failed'}`);
    }
    throw error;
  }
);

export const requestJSON = async <T = any>(path: string, opts: RequestOptions = {}): Promise<T> => {
  const config: AxiosRequestConfig = {
    url: path,
    method: (opts.method || 'GET') as any,
    params: opts.params,
    headers: { ...(opts.headers || {}) },
    data: opts.body,
  };
  const resp = await client.request<T>(config);
  return resp.data as T;
};
