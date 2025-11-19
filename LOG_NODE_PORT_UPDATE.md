# 日志节点端口位置调整

## 📝 修改说明

将日志节点（LogString）的输入端口位置从**左侧**调整为**上部中间**，以优化节点连接的视觉效果。

## 🔄 修改内容

### 修改的文件
`src/nodes/logString/index.tsx`

### 修改前
```typescript
defaultPorts: [
  { type: 'input', location: 'left' },      // ← 输入端在左侧
  { type: 'output', location: 'right', portID: OutPutPortType.SuccessPort },
  { type: 'output', location: 'bottom', portID: OutPutPortType.FailurePort },
],
```

### 修改后
```typescript
defaultPorts: [
  { type: 'input', location: 'top' },       // ✅ 输入端在上部中间
  { type: 'output', location: 'right', portID: OutPutPortType.SuccessPort },
  { type: 'output', location: 'bottom', portID: OutPutPortType.FailurePort },
],
```

## 🎯 端口布局

### 修改后的端口位置

```
        ⬇️ input (top)
    ┌─────────────────┐
    │                 │
    │   Log 节点      │ ➡️ success (right)
    │                 │
    └─────────────────┘
            ⬇️
        failure (bottom)
```

### 端口说明

| 端口类型 | 位置 | 用途 |
|---------|------|------|
| **输入端口** | 上部中间 (top) | 接收上游节点的数据 |
| **成功输出** | 右侧 (right) | 日志记录成功后的流程 |
| **失败输出** | 底部 (bottom) | 日志记录失败后的流程 |

## 💡 修改原因

### 1. 视觉优化
- ✅ 上下连接更符合流程图的阅读习惯
- ✅ 避免左右交叉连线
- ✅ 提升整体布局的清晰度

### 2. 布局一致性
- ✅ 与其他节点的端口布局保持一致
- ✅ 便于构建垂直流程
- ✅ 减少连线的复杂度

### 3. 用户体验
- ✅ 更直观的数据流向
- ✅ 更容易理解节点之间的关系
- ✅ 减少连线重叠的可能性

## 🔍 可用的端口位置

Flowgram 编辑器支持以下端口位置：

| 位置 | 说明 | 适用场景 |
|------|------|----------|
| `top` | 上部中间 | 接收上游数据 |
| `bottom` | 底部中间 | 错误/失败输出 |
| `left` | 左侧中间 | 传统输入端 |
| `right` | 右侧中间 | 成功/主要输出 |

## 📊 影响范围

### ✅ 影响的功能
- 新添加的日志节点将使用新的端口位置
- 现有工作流中的日志节点**不受影响**（保持原有连接）

### ❌ 不影响的功能
- 现有工作流的布局
- 节点的其他配置
- 日志功能本身
- 其他类型的节点

## 🚀 使用方法

### 1. 添加新的日志节点
在工作流编辑器中添加日志节点，输入端口将自动出现在上部中间位置。

### 2. 连接节点
- 从上游节点的输出端连接到日志节点的**上部输入端**
- 从日志节点的**右侧输出端**连接到成功流程
- 从日志节点的**底部输出端**连接到失败流程

### 3. 典型流程示例

```
    [开始节点]
        ↓
    [处理节点]
        ↓
    [日志节点] ➡️ [下一步]
        ↓
    [错误处理]
```

## 🎨 视觉效果

### 修改前（左侧输入）
```
[上游节点] ➡️ [日志节点] ➡️ [下游节点]
                  ↓
              [错误处理]
```
- ❌ 横向连线较多
- ❌ 可能与其他连线交叉

### 修改后（上部输入）
```
    [上游节点]
        ↓
    [日志节点] ➡️ [下游节点]
        ↓
    [错误处理]
```
- ✅ 垂直流程更清晰
- ✅ 减少连线交叉
- ✅ 符合从上到下的阅读习惯

## 🔧 其他节点参考

如果需要修改其他节点的端口位置，可以参考以下模式：

### 标准模式（推荐）
```typescript
defaultPorts: [
  { type: 'input', location: 'top' },        // 输入在上
  { type: 'output', location: 'right' },     // 主输出在右
  { type: 'output', location: 'bottom' },    // 错误输出在下
],
```

### 传统模式
```typescript
defaultPorts: [
  { type: 'input', location: 'left' },       // 输入在左
  { type: 'output', location: 'right' },     // 输出在右
],
```

### 分支模式
```typescript
defaultPorts: [
  { type: 'input', location: 'top' },        // 输入在上
  { type: 'output', location: 'right' },     // 分支1在右
  { type: 'output', location: 'left' },      // 分支2在左
  { type: 'output', location: 'bottom' },    // 默认在下
],
```

## 📝 注意事项

### 1. 现有工作流
- 现有工作流中的日志节点**保持原有端口位置**
- 不会影响已建立的连接
- 只有新添加的节点使用新位置

### 2. 节点大小
- 节点大小保持不变（360 x 330）
- 端口位置自动居中
- 不影响节点内容布局

### 3. 兼容性
- ✅ 与所有现有节点兼容
- ✅ 支持所有连接方式
- ✅ 不影响工作流执行

## 🎓 最佳实践

### 1. 流程设计
建议使用垂直流程设计：
```
开始
  ↓
处理
  ↓
日志
  ↓
结束
```

### 2. 错误处理
将错误处理节点放在底部：
```
    [主流程]
        ↓
    [日志节点] ➡️ [继续]
        ↓
    [错误处理]
```

### 3. 并行流程
使用右侧输出进行并行：
```
    [日志节点] ➡️ [流程A]
        ↓
    [流程B]
```

## 🔄 回滚方法

如果需要恢复到左侧输入，修改代码：

```typescript
// 恢复为左侧输入
defaultPorts: [
  { type: 'input', location: 'left' },
  { type: 'output', location: 'right', portID: OutPutPortType.SuccessPort },
  { type: 'output', location: 'bottom', portID: OutPutPortType.FailurePort },
],
```

## 🎉 总结

- ✅ **修改完成** - 日志节点输入端已移至上部中间
- ✅ **向后兼容** - 不影响现有工作流
- ✅ **体验提升** - 更清晰的流程布局
- ✅ **易于使用** - 符合直觉的连接方式

现在日志节点的输入端口已经调整到上部中间位置，可以更好地支持垂直流程设计！
