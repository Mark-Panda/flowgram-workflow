# 项目架构文档

## 📁 优化后的目录结构

```
flowgram-workflow/
├── .env.development          # 开发环境配置
├── .env.production           # 生产环境配置
├── src/
│   ├── app.tsx              # 应用入口 (含代码分割)
│   ├── editor.tsx           # 编辑器主组件
│   ├── vite-env.d.ts        # Vite 环境变量类型定义
│   │
│   ├── config/              # 📦 配置层
│   │   └── env.ts          # 环境变量统一管理
│   │
│   ├── stores/              # 🏪 状态管理层
│   │   ├── index.ts        # Store 导出
│   │   └── editor-store.ts # 编辑器状态管理
│   │
│   ├── services/            # 🔧 服务层
│   │   ├── index.ts
│   │   ├── http.ts         # HTTP 客户端 (含错误处理)
│   │   ├── api-rules.ts    # 规则 API
│   │   ├── dirty-service.ts # 脏状态服务 (集成 Zustand)
│   │   └── custom-service.ts
│   │
│   ├── hooks/               # 🎣 业务逻辑层
│   │   ├── index.ts
│   │   ├── use-editor-props.tsx      # 编辑器配置 (整合)
│   │   ├── use-editor-config.ts      # 基础配置
│   │   ├── use-editor-plugins.tsx    # 插件配置
│   │   ├── use-editor-callbacks.ts   # 回调函数
│   │   └── ...
│   │
│   ├── components/          # 🎨 展示层
│   │   ├── base-node/      # 基础节点组件
│   │   ├── sidebar/        # 侧边栏
│   │   ├── testrun/        # 测试运行
│   │   └── ...
│   │
│   ├── utils/               # 🛠️ 工具层
│   │   ├── index.ts
│   │   ├── error-handler.ts # 统一错误处理
│   │   └── ...
│   │
│   ├── nodes/               # 📊 节点定义
│   ├── plugins/             # 🔌 插件系统
│   ├── typings/             # 📝 类型定义
│   ├── context/             # 🔄 React Context
│   ├── shortcuts/           # ⌨️ 快捷键
│   └── styles/              # 🎨 样式文件
│
├── OPTIMIZATION_SUMMARY.md  # 优化总结
├── MIGRATION_GUIDE.md       # 迁移指南
└── ARCHITECTURE.md          # 本文档
```

## 🏗️ 架构分层

### 1. 配置层 (Config Layer)
**职责:** 管理应用配置和环境变量

```typescript
// src/config/env.ts
export const env = {
  apiOrigin: string;
  apiTimeout: number;
  isDev: boolean;
  isProd: boolean;
};
```

**特点:**
- 统一的环境变量管理
- 类型安全的配置访问
- 支持多环境配置

### 2. 状态管理层 (State Layer)
**职责:** 管理全局状态

```typescript
// src/stores/editor-store.ts
export const useEditorStore = create<EditorStore>((set) => ({
  isDirty: boolean;
  selectedNodes: string[];
  isRunning: boolean;
  // ... actions
}));
```

**特点:**
- 使用 Zustand 轻量级状态管理
- 响应式状态更新
- 易于测试和调试

### 3. 服务层 (Service Layer)
**职责:** 封装业务逻辑和 API 调用

```typescript
// src/services/http.ts
export const requestJSON = async <T>(path: string, opts?: RequestOptions): Promise<T>;

// src/services/api-rules.ts
export const getRuleDetail = (id: string) => get(`/rules/${id}`);
```

**特点:**
- 统一的 HTTP 客户端
- 自动错误处理
- 自动添加认证 token
- 请求/响应拦截器

### 4. 业务逻辑层 (Business Logic Layer)
**职责:** 封装可复用的业务逻辑

```typescript
// src/hooks/use-editor-config.ts
export const useEditorConfig = (readonly?: boolean) => ({
  background: true,
  readonly: !!readonly,
  // ... more config
});

// src/hooks/use-editor-plugins.tsx
export const useEditorPlugins = (initialGlobalVariable?: any) => [
  createFreeLinesPlugin({ ... }),
  createMinimapPlugin({ ... }),
  // ... more plugins
];
```

**特点:**
- 职责单一的 Hooks
- 易于组合和复用
- 更好的可测试性

### 5. 展示层 (Presentation Layer)
**职责:** UI 组件和用户交互

```typescript
// src/components/base-node/index.tsx
export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  // ... component logic
};
```

**特点:**
- 纯展示组件
- 通过 props 接收数据
- 通过回调函数通信

### 6. 工具层 (Utility Layer)
**职责:** 通用工具函数

```typescript
// src/utils/error-handler.ts
export const errorHandler = {
  handle: (error: unknown) => { ... },
  createBusinessError: (message: string) => { ... },
};
```

**特点:**
- 无状态的纯函数
- 可在任何层使用
- 易于单元测试

## 🔄 数据流

```
用户交互
    ↓
展示层 (Components)
    ↓
业务逻辑层 (Hooks)
    ↓
服务层 (Services)
    ↓
API 请求
    ↓
状态管理层 (Stores)
    ↓
展示层更新
```

## 🎯 设计原则

### 1. 单一职责原则 (SRP)
每个模块只负责一个功能：
- `useEditorConfig` 只负责基础配置
- `useEditorPlugins` 只负责插件配置
- `useEditorCallbacks` 只负责回调函数

### 2. 依赖倒置原则 (DIP)
高层模块不依赖低层模块：
- 展示层依赖业务逻辑层的抽象
- 业务逻辑层依赖服务层的抽象

### 3. 开闭原则 (OCP)
对扩展开放，对修改关闭：
- 新增插件不需要修改核心代码
- 新增节点类型通过注册表扩展

### 4. 接口隔离原则 (ISP)
客户端不应依赖它不需要的接口：
- Hooks 只暴露必要的接口
- 组件只接收必要的 props

## 🔌 插件系统架构

```typescript
// 插件配置流程
useEditorPlugins()
    ↓
[
  createFreeStackPlugin({ ... }),    // 节点排序
  createFreeLinesPlugin({ ... }),    // 连线渲染
  createMinimapPlugin({ ... }),      // 缩略图
  createFreeSnapPlugin({ ... }),     // 自动对齐
  createRuntimePlugin({ ... }),      // 运行时
  // ... more plugins
]
    ↓
FreeLayoutEditorProvider
```

**插件分类:**
1. **渲染插件:** 负责节点、连线、面板的渲染
2. **交互插件:** 负责拖拽、对齐、选择等交互
3. **功能插件:** 负责运行时、变量管理等功能

## 🔐 安全架构

### 1. 环境变量隔离
```
开发环境 (.env.development)
    ↓
env.ts (类型安全的访问)
    ↓
应用代码
```

### 2. 错误处理
```
API 错误
    ↓
HTTP 拦截器
    ↓
AppError 转换
    ↓
统一错误处理器
    ↓
用户友好提示
```

### 3. 认证流程
```
用户登录
    ↓
Token 存储 (localStorage)
    ↓
HTTP 请求拦截器自动添加
    ↓
API 请求
```

## ⚡ 性能优化架构

### 1. 代码分割
```typescript
// 路由级分割
const AdminPanel = lazy(() => import('./management/admin-panel'));
const RuleDetailPage = lazy(() => import('./management/rule-detail-page'));

// 使用 Suspense
<Suspense fallback={<LoadingFallback />}>
  <Router />
</Suspense>
```

### 2. 构建优化
```typescript
// rsbuild.config.ts
performance: {
  chunkSplit: {
    cacheGroups: {
      vendor: { ... },     // 第三方库
      flowgram: { ... },   // Flowgram 包
      semi: { ... },       // Semi UI
    }
  }
}
```

### 3. 状态优化
```typescript
// 使用 Zustand 的选择器避免不必要的重渲染
const isDirty = useEditorStore((state) => state.isDirty);
// 只在 isDirty 变化时重渲染
```

## 🧪 可测试性架构

### 1. 纯函数优先
```typescript
// ✅ 易于测试
export const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ❌ 难以测试
export const calculateTotal = () => {
  const items = store.getState().items;
  return items.reduce((sum, item) => sum + item.price, 0);
};
```

### 2. 依赖注入
```typescript
// 使用 Inversify 进行依赖注入
@injectable()
export class CustomService {
  @inject(WorkflowDocument) document: WorkflowDocument;
}
```

### 3. Mock 友好
```typescript
// 服务层易于 Mock
jest.mock('@services/http', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
```

## 📊 监控和日志架构

### 1. 错误监控
```typescript
// 统一错误处理器
errorHandler.handle(error);
    ↓
console.error (开发环境)
    ↓
Sentry (生产环境 - 待集成)
```

### 2. 性能监控
```typescript
// 关键操作的性能追踪
console.log('--- Playground init ---');
console.log('--- Playground rendered ---');
console.log('Auto Save: ', event);
```

## 🔄 状态同步架构

```
Zustand Store (全局状态)
    ↕️
DirtyService (服务层)
    ↕️
编辑器 Context (编辑器状态)
    ↕️
组件 (本地状态)
```

## 🎨 主题系统架构 (待实现)

```typescript
// 未来架构
src/
├── theme/
│   ├── index.ts          # 主题配置
│   ├── colors.ts         # 颜色定义
│   ├── spacing.ts        # 间距定义
│   └── typography.ts     # 字体定义
```

## 📝 类型系统架构

```
src/typings/              # 类型定义根目录
├── index.ts             # 统一导出
├── node.ts              # 节点类型
├── workflow.ts          # 工作流类型
└── json-schema.ts       # JSON Schema 类型

src/vite-env.d.ts        # Vite 环境类型
```

## 🚀 部署架构

```
开发环境
    ↓
npm run dev
    ↓
Rsbuild Dev Server (HMR)

生产环境
    ↓
npm run build:prod
    ↓
Rsbuild 构建
    ↓
dist/ (静态文件)
    ↓
CDN / 静态服务器
```

## 📚 扩展性

### 添加新节点类型
1. 在 `src/nodes/` 创建新目录
2. 实现节点注册
3. 添加到 `nodeRegistries` 数组

### 添加新插件
1. 在 `src/plugins/` 创建新目录
2. 实现插件逻辑
3. 在 `useEditorPlugins` 中注册

### 添加新服务
1. 在 `src/services/` 创建新文件
2. 使用 `@injectable()` 装饰器
3. 在 `onBind` 中注册

## 🎯 最佳实践

1. **配置集中管理:** 所有配置放在 `config/` 目录
2. **状态统一管理:** 使用 Zustand 管理全局状态
3. **错误统一处理:** 使用 `errorHandler` 处理所有错误
4. **类型安全优先:** 所有函数和变量都有明确类型
5. **代码分层清晰:** 严格遵循分层架构
6. **单向数据流:** 数据从上到下流动

## 📖 相关文档

- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [README](./README.zh_CN.md)
