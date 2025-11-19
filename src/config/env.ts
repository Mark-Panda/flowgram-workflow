/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * 环境变量配置
 */
export const env = {
  /** API 服务地址 */
  apiOrigin: (import.meta.env.VITE_API_ORIGIN as string) || 'http://127.0.0.1:9099',
  /** API 请求超时时间(毫秒) */
  apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  /** 应用标题 */
  appTitle: (import.meta.env.VITE_APP_TITLE as string) || 'Flowgram Workflow',
  /** 是否开发环境 */
  isDev: import.meta.env.DEV,
  /** 是否生产环境 */
  isProd: import.meta.env.PROD,
  /** 构建模式 */
  mode: import.meta.env.MODE,
} as const;
