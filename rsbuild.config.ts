/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLess } from '@rsbuild/plugin-less';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [pluginReact(), pluginLess()],
  source: {
    entry: {
      index: './src/app.tsx',
    },
    /**
     * support inversify @injectable() and @inject decorators
     */
    decorators: {
      version: 'legacy',
    },
    /**
     * 路径别名配置
     */
    alias: {
      '@': './src',
      '@types': './src/typings',
      '@components': './src/components',
      '@hooks': './src/hooks',
      '@services': './src/services',
      '@utils': './src/utils',
      '@config': './src/config',
      '@nodes': './src/nodes',
      '@plugins': './src/plugins',
      '@stores': './src/stores',
    },
  },
  html: {
    title: 'Flowgram Workflow',
  },
  /**
   * 性能优化配置
   */
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      override: {
        chunks: 'all',
        cacheGroups: {
          // 第三方库单独打包
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            name: 'vendors',
          },
          // Flowgram 相关包单独打包
          flowgram: {
            test: /[\\/]node_modules[\\/]@flowgram\.ai[\\/]/,
            priority: 20,
            name: 'flowgram',
          },
          // Semi UI 单独打包
          semi: {
            test: /[\\/]node_modules[\\/]@douyinfe[\\/]semi/,
            priority: 15,
            name: 'semi-ui',
          },
        },
      },
    },
  },
  tools: {
    rspack: {
      /**
       * ignore warnings from @coze-editor/editor/language-typescript
       */
      ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
    },
  },
});
