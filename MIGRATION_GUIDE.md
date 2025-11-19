# 迁移指南

本文档说明如何从旧代码迁移到优化后的新架构。

## 🔄 向后兼容性

**好消息:** 大部分优化都是向后兼容的，现有代码无需修改即可运行。

## 📋 可选迁移项

以下是建议迁移的部分，但不是必须的：

### 1. 使用路径别名

**旧方式:**
```typescript
import { useEditorStore } from '../../stores/editor-store';
import { errorHandler } from '../../utils/error-handler';
import { env } from '../../config/env';
```

**新方式:**
```typescript
import { useEditorStore } from '@stores';
import { errorHandler } from '@utils';
import { env } from '@config/env';
```

### 2. 使用 Zustand 状态管理

**旧方式 (仍然可用):**
```typescript
import { useService } from '@flowgram.ai/free-layout-editor';
import { DirtyService } from '@services/dirty-service';

const dirtyService = useService(DirtyService);
const isDirty = dirtyService.isDirty();
```

**新方式 (推荐):**
```typescript
import { useEditorStore } from '@stores';

const isDirty = useEditorStore((state) => state.isDirty);
const setDirty = useEditorStore((state) => state.setDirty);
```

### 3. 使用统一错误处理

**旧方式:**
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error(error);
  Toast.error('操作失败');
}
```

**新方式:**
```typescript
import { errorHandler } from '@utils';

try {
  await someAsyncOperation();
} catch (error) {
  errorHandler.handle(error); // 自动显示 Toast 和记录日志
}
```

### 4. 使用环境变量

**旧方式:**
```typescript
const API_URL = 'http://127.0.0.1:9099';
```

**新方式:**
```typescript
import { env } from '@config/env';

const API_URL = env.apiOrigin;
```

## 🔧 必须的配置更改

### 1. 环境变量配置

创建或更新以下文件：

**.env.development**
```env
VITE_API_ORIGIN=http://127.0.0.1:9099
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=Flowgram Workflow
```

**.env.production**
```env
VITE_API_ORIGIN=https://your-production-api.com
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=Flowgram Workflow
```

### 2. 安装新依赖

```bash
npm install zustand@4.5.0
```

### 3. 更新依赖版本 (可选但推荐)

```bash
npm install
```

这将根据 `package.json` 中锁定的版本安装依赖。

## 📝 代码示例

### 完整的组件迁移示例

**优化前:**
```typescript
import React from 'react';
import { useService } from '@flowgram.ai/free-layout-editor';
import { DirtyService } from '../../services/dirty-service';
import { Toast } from '@douyinfe/semi-ui';

export const MyComponent = () => {
  const dirtyService = useService(DirtyService);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    // 手动监听状态变化
    const checkDirty = setInterval(() => {
      setIsDirty(dirtyService.isDirty());
    }, 100);
    return () => clearInterval(checkDirty);
  }, [dirtyService]);

  const handleSave = async () => {
    try {
      await saveData();
      dirtyService.setDirty(false);
      Toast.success('保存成功');
    } catch (error) {
      console.error(error);
      Toast.error('保存失败');
    }
  };

  return (
    <button disabled={!isDirty} onClick={handleSave}>
      保存
    </button>
  );
};
```

**优化后:**
```typescript
import React from 'react';
import { useEditorStore } from '@stores';
import { errorHandler } from '@utils';
import { Toast } from '@douyinfe/semi-ui';

export const MyComponent = () => {
  // 直接从 store 获取状态，自动响应式更新
  const isDirty = useEditorStore((state) => state.isDirty);
  const setDirty = useEditorStore((state) => state.setDirty);

  const handleSave = async () => {
    try {
      await saveData();
      setDirty(false);
      Toast.success('保存成功');
    } catch (error) {
      // 统一错误处理
      errorHandler.handle(error);
    }
  };

  return (
    <button disabled={!isDirty} onClick={handleSave}>
      保存
    </button>
  );
};
```

### HTTP 请求迁移示例

**优化前:**
```typescript
import axios from 'axios';

const API_URL = 'http://127.0.0.1:9099/api/v1';

export const fetchData = async () => {
  try {
    const response = await axios.get(`${API_URL}/data`);
    return response.data;
  } catch (error) {
    console.error('Request failed:', error);
    throw new Error('Failed to fetch data');
  }
};
```

**优化后:**
```typescript
import { get } from '@services/http';
// 错误处理已在 HTTP 拦截器中统一处理

export const fetchData = async () => {
  // 自动使用环境变量中的 API 地址
  // 自动添加认证 token
  // 自动处理错误
  return await get('/data');
};
```

## ⚠️ 破坏性变更

### DirtyService 接口变更

**旧接口 (已移除):**
```typescript
class DirtyService {
  dirty: boolean;  // ❌ 已移除
  onChange(callback): Disposer;  // ❌ 已移除
}
```

**新接口:**
```typescript
class DirtyService {
  setDirty(dirty: boolean): void;  // ✅ 保留
  isDirty(): boolean;  // ✅ 保留
}
```

**迁移方案:**

如果你的代码使用了 `dirtyService.dirty` 或 `dirtyService.onChange`:

```typescript
// 旧代码
const isDirty = dirtyService.dirty;
dirtyService.onChange((d) => console.log(d));

// 新代码 - 方案 1: 使用 Zustand (推荐)
import { useEditorStore } from '@stores';
const isDirty = useEditorStore((state) => state.isDirty);

// 新代码 - 方案 2: 使用 DirtyService
const isDirty = dirtyService.isDirty();
```

## 🧪 测试迁移

### 1. 开发环境测试

```bash
npm run dev
```

检查：
- ✅ 应用正常启动
- ✅ API 请求使用正确的地址
- ✅ 状态管理正常工作
- ✅ 错误提示正常显示

### 2. 生产构建测试

```bash
npm run build:prod
```

检查：
- ✅ 构建成功
- ✅ 代码分割生效
- ✅ 产物体积合理

### 3. 类型检查

```bash
npm run ts-check
```

确保没有类型错误。

## 📚 常见问题

### Q: 是否必须迁移到新架构？

A: 不是必须的。旧代码仍然可以正常运行。但建议逐步迁移以获得更好的开发体验。

### Q: 如何逐步迁移？

A: 建议按以下顺序：
1. 先配置环境变量
2. 新组件使用新架构
3. 逐步重构旧组件

### Q: 迁移会影响性能吗？

A: 不会。新架构通过代码分割和优化的构建配置，反而会提升性能。

### Q: 如何回退到旧版本？

A: 使用 Git 回退到优化前的提交即可。所有优化都是增量的。

## 🎯 迁移检查清单

- [ ] 创建 `.env.development` 和 `.env.production`
- [ ] 安装 `zustand` 依赖
- [ ] 运行 `npm install` 更新依赖
- [ ] 运行 `npm run dev` 测试开发环境
- [ ] 运行 `npm run build:prod` 测试生产构建
- [ ] 运行 `npm run ts-check` 检查类型
- [ ] 更新使用 `dirtyService.dirty` 的代码
- [ ] (可选) 迁移到路径别名
- [ ] (可选) 使用 Zustand 状态管理
- [ ] (可选) 使用统一错误处理

## 💡 最佳实践

1. **渐进式迁移:** 不要一次性重写所有代码
2. **测试驱动:** 每次迁移后都要测试
3. **保持一致:** 新代码统一使用新架构
4. **文档更新:** 及时更新团队文档

## 🆘 需要帮助？

如果遇到迁移问题，请：
1. 查看 `OPTIMIZATION_SUMMARY.md` 了解优化详情
2. 查看示例代码
3. 联系技术支持
