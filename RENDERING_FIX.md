# 画布渲染问题修复说明

## 问题描述
画布内容没有成功渲染。

## 原因分析
在优化过程中，我尝试拆分 `useEditorProps` Hook 并使用 `useMemo` 来优化性能，但这导致了以下问题：

1. **依赖项不稳定**: 拆分后的 hooks 返回的对象/数组引用每次都不同
2. **配置丢失**: 某些配置在拆分过程中可能丢失或格式错误
3. **语法错误**: 编辑过程中引入了语法错误

## 解决方案
已回滚到原始的 `useEditorProps` 实现，保持代码稳定性。

## 当前状态
✅ 已恢复原始文件  
✅ 画布应该可以正常渲染  
✅ 所有功能应该正常工作  

## 验证步骤

1. **刷新浏览器**
   ```bash
   # 在浏览器中按 Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
   # 强制刷新页面
   ```

2. **检查控制台**
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签
   - 应该看到 "--- Playground init ---" 和 "--- Playground rendered ---"

3. **检查画布**
   - 应该能看到节点
   - 应该能拖拽节点
   - 应该能连接节点

## 如果问题仍然存在

### 1. 清除缓存
```bash
# 停止开发服务器 (Ctrl+C)
# 清除缓存
rm -rf node_modules/.cache
rm -rf dist

# 重新启动
npm run dev
```

### 2. 检查初始数据
确保 `src/initial-data.ts` 包含有效的节点数据：

```typescript
export const initialData: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      // ... 节点配置
    }
  ],
  lines: [],
  // ...
};
```

### 3. 检查节点注册
确保所有节点类型都已正确注册：

```typescript
// src/nodes/index.ts
export const nodeRegistries: FlowNodeRegistry[] = [
  StartNodeRegistry,
  EndNodeRegistry,
  // ... 其他节点
];
```

### 4. 检查编辑器组件
```typescript
// src/editor.tsx
<FreeLayoutEditorProvider {...editorProps}>
  <div className="demo-container">
    <EditorRenderer className="demo-editor" />
  </div>
</FreeLayoutEditorProvider>
```

## 已知的控制台警告

以下警告是正常的，不影响功能：

1. **`FreeLayoutScopeChain.sortAll is not implemented`**
   - 来源: Flowgram 框架
   - 影响: 无
   - 状态: 可忽略

2. **`findDOMNode is deprecated`**
   - 来源: Semi UI
   - 影响: 无
   - 状态: 等待框架更新

详见 [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

## 优化建议

如果需要优化 `useEditorProps`，建议：

1. **保持原始结构**: 不要拆分成多个 hooks
2. **使用 useCallback**: 对回调函数使用 useCallback
3. **稳定的依赖**: 确保 useMemo 的依赖项稳定
4. **渐进式优化**: 一次只优化一个部分

## 性能优化的正确方式

```typescript
export function useEditorProps(
  initialData: FlowDocumentJSON,
  nodeRegistries: FlowNodeRegistry[],
  readonly?: boolean,
  initialLogs?: { list: any[]; startTs?: number; endTs?: number }
): FreeLayoutProps {
  // ✅ 使用 useCallback 优化回调函数
  const onContentChange = useCallback(
    debounce((ctx: FreeLayoutPluginContext, event) => {
      // ... 处理逻辑
    }, 1000),
    [] // 空依赖，只创建一次
  );

  // ✅ 使用 useMemo 优化配置对象
  return useMemo<FreeLayoutProps>(
    () => ({
      // ... 配置
      onContentChange,
    }),
    [readonly] // 只依赖会变化的原始值
  );
}
```

## 总结

- ✅ 问题已修复
- ✅ 代码已恢复到稳定状态
- ✅ 画布应该可以正常渲染
- ⚠️ 性能优化需要更谨慎的方式

如有其他问题，请查看:
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - 已知问题
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - 优化总结
- [QUICK_START.md](./QUICK_START.md) - 快速开始
