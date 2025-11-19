# 快速开始指南

## 🚀 5 分钟上手优化后的项目

### 1. 环境准备

确保你的开发环境满足以下要求:

```bash
node >= 18.0.0
npm >= 9.0.0
```

检查版本:
```bash
node --version
npm --version
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

项目已经包含了默认的环境配置文件，你可以根据需要修改:

**.env.development** (开发环境)
```env
VITE_API_ORIGIN=http://127.0.0.1:9099
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=Flowgram Workflow
```

**.env.production** (生产环境)
```env
VITE_API_ORIGIN=https://your-production-api.com
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=Flowgram Workflow
```

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 `http://localhost:3000`

### 5. 开始开发

#### 使用路径别名

```typescript
// ✅ 推荐 - 使用路径别名
import { useEditorStore } from '@stores';
import { errorHandler } from '@utils';
import { env } from '@config/env';

// ❌ 不推荐 - 相对路径
import { useEditorStore } from '../../stores/editor-store';
```

#### 使用状态管理

```typescript
import { useEditorStore } from '@stores';

function MyComponent() {
  // 获取状态
  const isDirty = useEditorStore((state) => state.isDirty);
  
  // 获取 action
  const setDirty = useEditorStore((state) => state.setDirty);
  
  // 使用
  const handleSave = () => {
    // 保存逻辑...
    setDirty(false);
  };
  
  return <button disabled={!isDirty} onClick={handleSave}>保存</button>;
}
```

#### 使用错误处理

```typescript
import { errorHandler } from '@utils';

async function fetchData() {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    // 自动显示 Toast 并记录日志
    errorHandler.handle(error);
  }
}
```

#### 使用环境变量

```typescript
import { env } from '@config/env';

console.log('API地址:', env.apiOrigin);
console.log('是否开发环境:', env.isDev);
console.log('是否生产环境:', env.isProd);
```

## 📦 常用命令

### 开发
```bash
npm run dev          # 启动开发服务器
npm run start        # 同上
```

### 构建
```bash
npm run build:prod   # 生产环境构建
npm run build:analyze # 构建并分析包体积
```

### 代码质量
```bash
npm run lint         # 代码检查
npm run lint:fix     # 自动修复代码问题
npm run ts-check     # TypeScript 类型检查
```

### 清理
```bash
npm run clean        # 清理构建产物
```

## 🎯 项目结构速览

```
src/
├── config/          # 📦 配置 (环境变量等)
├── stores/          # 🏪 状态管理 (Zustand)
├── services/        # 🔧 服务层 (API、业务服务)
├── hooks/           # 🎣 业务逻辑 (自定义 Hooks)
├── components/      # 🎨 UI 组件
├── utils/           # 🛠️ 工具函数
├── nodes/           # 📊 节点定义
└── plugins/         # 🔌 插件系统
```

## 💡 开发技巧

### 1. 使用 TypeScript 类型提示

```typescript
// 所有导入都有完整的类型定义
import { useEditorStore } from '@stores';

// IDE 会自动提示可用的状态和方法
const isDirty = useEditorStore((state) => state.isDirty);
//                                      ↑ 自动补全
```

### 2. 利用代码分割

```typescript
// 大型组件使用 lazy 加载
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 使用 Suspense 包裹
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 3. 使用统一的错误处理

```typescript
import { errorHandler, AppError } from '@utils';

// 创建业务错误
throw errorHandler.createBusinessError('用户未登录', 'AUTH_ERROR');

// 创建网络错误
throw errorHandler.createNetworkError('请求失败', 500);

// 处理错误
try {
  // ...
} catch (error) {
  errorHandler.handle(error); // 自动显示 Toast
}
```

### 4. 拆分大型组件

```typescript
// ✅ 推荐 - 拆分为小组件
const Header = () => <div>Header</div>;
const Content = () => <div>Content</div>;
const Footer = () => <div>Footer</div>;

const Page = () => (
  <>
    <Header />
    <Content />
    <Footer />
  </>
);

// ❌ 不推荐 - 单个大组件
const Page = () => (
  <div>
    {/* 500 行代码... */}
  </div>
);
```

## 🐛 常见问题

### Q: 环境变量不生效？

A: 确保:
1. 文件名正确 (`.env.development` 或 `.env.production`)
2. 变量名以 `VITE_` 开头
3. 重启开发服务器

### Q: 路径别名不工作？

A: 确保:
1. `tsconfig.json` 中配置了 paths
2. `rsbuild.config.ts` 中配置了 alias
3. 重启 IDE 或 TypeScript 服务器

### Q: 状态不更新？

A: 检查:
1. 是否使用了选择器 `useEditorStore((state) => state.xxx)`
2. 是否调用了 action 方法
3. 查看 React DevTools 中的状态

### Q: 构建失败？

A: 尝试:
1. 删除 `node_modules` 和 `package-lock.json`
2. 运行 `npm install`
3. 运行 `npm run clean`
4. 重新构建

## 📚 进阶学习

### 1. 理解架构
阅读 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解项目架构设计

### 2. 学习优化
阅读 [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) 了解优化细节

### 3. 迁移旧代码
阅读 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 学习如何迁移

### 4. 查看更新
阅读 [CHANGELOG.md](./CHANGELOG.md) 了解版本变更

## 🎨 代码示例

### 创建新的 Hook

```typescript
// src/hooks/use-my-feature.ts
import { useCallback } from 'react';
import { useEditorStore } from '@stores';

export const useMyFeature = () => {
  const isDirty = useEditorStore((state) => state.isDirty);
  
  const doSomething = useCallback(() => {
    // 业务逻辑
  }, []);
  
  return { isDirty, doSomething };
};
```

### 创建新的服务

```typescript
// src/services/my-service.ts
import { injectable } from '@flowgram.ai/free-layout-editor';
import { get, post } from './http';

@injectable()
export class MyService {
  async getData() {
    return await get('/my-data');
  }
  
  async saveData(data: any) {
    return await post('/my-data', data);
  }
}
```

### 创建新的组件

```typescript
// src/components/my-component/index.tsx
import React from 'react';
import { useEditorStore } from '@stores';
import { errorHandler } from '@utils';

export const MyComponent: React.FC = () => {
  const isDirty = useEditorStore((state) => state.isDirty);
  
  const handleClick = async () => {
    try {
      // 业务逻辑
    } catch (error) {
      errorHandler.handle(error);
    }
  };
  
  return (
    <div>
      <button onClick={handleClick}>
        {isDirty ? '有未保存的更改' : '已保存'}
      </button>
    </div>
  );
};
```

## 🚀 部署

### 构建生产版本

```bash
npm run build:prod
```

构建产物在 `dist/` 目录中。

### 部署到服务器

```bash
# 将 dist 目录上传到服务器
scp -r dist/* user@server:/var/www/html/

# 或使用 CI/CD 工具自动部署
```

### 环境变量配置

确保生产环境的 `.env.production` 配置正确:

```env
VITE_API_ORIGIN=https://api.production.com
VITE_API_TIMEOUT=30000
```

## ✅ 检查清单

开始开发前，确保:

- [ ] Node.js >= 18.0.0
- [ ] npm >= 9.0.0
- [ ] 已运行 `npm install`
- [ ] 已配置 `.env.development`
- [ ] 已阅读 [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] 了解路径别名的使用
- [ ] 了解状态管理的使用
- [ ] 了解错误处理的使用

## 🎉 开始编码

现在你已经准备好了！开始愉快地编码吧！

如有问题，请查看:
- [架构文档](./ARCHITECTURE.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [更新日志](./CHANGELOG.md)
