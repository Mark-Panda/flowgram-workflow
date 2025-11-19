/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Toast } from '@douyinfe/semi-ui';

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public statusCode?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 错误处理器
 */
export const errorHandler = {
  /**
   * 处理错误
   */
  handle: (error: unknown, showToast = true): AppError => {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'SYSTEM_ERROR');
      console.error('System Error:', error);
    } else {
      appError = new AppError(String(error), 'UNKNOWN_ERROR');
      console.error('Unknown Error:', error);
    }

    if (showToast) {
      Toast.error(appError.message);
    }

    return appError;
  },

  /**
   * 静默处理错误(不显示 Toast)
   */
  handleSilent: (error: unknown): AppError => errorHandler.handle(error, false),

  /**
   * 创建业务错误
   */
  createBusinessError: (message: string, code: string, data?: any): AppError =>
    new AppError(message, code, undefined, data),

  /**
   * 创建网络错误
   */
  createNetworkError: (message: string, statusCode: number, data?: any): AppError =>
    new AppError(message, 'NETWORK_ERROR', statusCode, data),
};
