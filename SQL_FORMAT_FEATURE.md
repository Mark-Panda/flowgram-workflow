# SQL 格式化功能说明

## 🎉 新功能

为数据库节点的 SQL 输入框添加了一键格式化功能，让 SQL 语句更加清晰易读！

## ✨ 功能特性

### 1. 一键格式化
- 点击输入框右上角的格式化按钮（代码图标）
- 自动格式化 SQL 语句
- 支持多种 SQL 语句类型

### 2. 智能格式化规则

#### 关键字换行
自动为主要 SQL 关键字添加换行：
- `SELECT` - 查询字段
- `FROM` - 数据源
- `WHERE` - 筛选条件
- `ORDER BY` - 排序
- `GROUP BY` - 分组
- `HAVING` - 分组筛选
- `LIMIT` - 限制结果数

#### 条件缩进
为逻辑运算符添加缩进：
- `AND` - 逻辑与
- `OR` - 逻辑或

#### JOIN 语句
为 JOIN 语句添加换行：
- `JOIN`
- `LEFT JOIN`
- `RIGHT JOIN`
- `INNER JOIN`
- `OUTER JOIN`

#### SELECT 字段
在 SELECT 子句中，为逗号分隔的字段添加换行和缩进

## 📝 使用示例

### 格式化前
```sql
select * from component_use_rule where disabled = false and id > 100 order by id desc limit 10
```

### 格式化后
```sql
SELECT *
FROM component_use_rule
WHERE disabled = false
  AND id > 100
ORDER BY id desc
LIMIT 10
```

### 复杂查询示例

#### 格式化前
```sql
select id,name,email,created_at from users where status='active' and age>18 and city='Beijing' order by created_at desc limit 100
```

#### 格式化后
```sql
SELECT
  id,
  name,
  email,
  created_at
FROM users
WHERE status='active'
  AND age>18
  AND city='Beijing'
ORDER BY created_at desc
LIMIT 100
```

### JOIN 查询示例

#### 格式化前
```sql
select u.id,u.name,o.order_id from users u left join orders o on u.id=o.user_id where u.status='active' and o.amount>100
```

#### 格式化后
```sql
SELECT u.id,u.name,o.order_id
FROM users u
LEFT JOIN orders o on u.id=o.user_id
WHERE u.status='active'
  AND o.amount>100
```

## 🎨 UI 设计

### 格式化按钮
- **位置**: 输入框右上角
- **图标**: 代码图标 `<IconCode />`
- **样式**: 半透明白色背景，悬停时高亮
- **提示**: 鼠标悬停显示"格式化 SQL"

### 按钮状态
- **正常**: 可点击
- **加载中**: 显示加载动画
- **禁用**: 
  - 输入框为空时
  - 只读模式时

## 🔧 技术实现

### 文件修改

**src/form-components/form-inputs/sql-template-editor.tsx**
```typescript
// 添加了格式化函数
function formatSQL(sql: string): string {
  // 格式化逻辑
}

// 添加了格式化按钮
<Tooltip content="格式化 SQL">
  <Button
    icon={<IconCode />}
    size="small"
    onClick={handleFormat}
    loading={isFormatting}
    disabled={!text || readonly}
    theme="borderless"
  />
</Tooltip>
```

**src/styles/index.css**
```css
/* SQL 格式化按钮样式 */
.sql-template-editor-wrapper .semi-button {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
```

### 核心算法

1. **空白处理**: 移除多余空白，统一为单个空格
2. **关键字识别**: 使用正则表达式识别 SQL 关键字
3. **换行插入**: 在关键字前插入换行符
4. **缩进处理**: 为条件语句添加缩进
5. **字段分割**: 在 SELECT 子句中分割字段

### 格式化流程

```
原始 SQL
  ↓
移除多余空白
  ↓
识别主要关键字
  ↓
添加换行
  ↓
处理 AND/OR 缩进
  ↓
处理 JOIN 语句
  ↓
处理 SELECT 字段
  ↓
清理空行
  ↓
格式化完成
```

## 🎯 支持的 SQL 类型

### ✅ 完全支持
- `SELECT` 查询
- `INSERT` 插入
- `UPDATE` 更新
- `DELETE` 删除
- `JOIN` 连接查询
- 条件查询（WHERE, AND, OR）
- 排序和分组（ORDER BY, GROUP BY）
- 聚合函数（COUNT, SUM, AVG, MAX, MIN）

### ⚠️ 部分支持
- 子查询（会格式化，但可能不够完美）
- 复杂的 CASE WHEN 语句
- 存储过程和函数

### ❌ 暂不支持
- PL/SQL 块
- 触发器定义
- 复杂的嵌套查询优化

## 💡 使用技巧

### 1. 快速格式化
在输入完 SQL 后，点击格式化按钮即可

### 2. 保持变量引用
格式化不会影响模板变量：
```sql
-- 格式化前
select * from users where id = ${msg.userId}

-- 格式化后
SELECT *
FROM users
WHERE id = ${msg.userId}
```

### 3. 配合占位符
格式化支持 SQL 占位符：
```sql
-- 格式化前
select * from users where id = ? and status = ?

-- 格式化后
SELECT *
FROM users
WHERE id = ?
  AND status = ?
```

## 🐛 已知限制

### 1. 大小写
格式化会将关键字转换为大写，这是 SQL 的最佳实践

### 2. 复杂嵌套
对于非常复杂的嵌套查询，格式化结果可能需要手动调整

### 3. 自定义函数
自定义函数名不会被识别为关键字

## 🔄 未来改进

### 短期计划
- [ ] 支持更多 SQL 方言（MySQL, PostgreSQL, Oracle）
- [ ] 添加格式化选项（缩进大小、关键字大小写）
- [ ] 支持撤销格式化

### 长期计划
- [ ] 集成专业的 SQL 格式化库（如 sql-formatter）
- [ ] 支持 SQL 语法高亮
- [ ] 支持 SQL 语法检查
- [ ] 添加 SQL 片段模板

## 📚 相关文档

- [SQL_OVERFLOW_FIX.md](./SQL_OVERFLOW_FIX.md) - SQL 溢出问题修复
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - 项目优化总结

## 🎓 最佳实践

### 1. 格式化时机
- 编写完 SQL 后立即格式化
- 修改 SQL 后重新格式化
- 代码审查前格式化

### 2. 代码风格
- 关键字使用大写
- 字段名使用小写或驼峰
- 适当的缩进和换行

### 3. 可读性
```sql
-- ✅ 好的格式
SELECT
  user_id,
  user_name,
  email
FROM users
WHERE status = 'active'
  AND created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 100

-- ❌ 不好的格式
select user_id,user_name,email from users where status='active' and created_at>'2024-01-01' order by created_at desc limit 100
```

## 🚀 快速开始

1. **打开数据库节点**
   - 在工作流中添加或打开数据库节点

2. **输入 SQL**
   - 在 SQL 输入框中输入查询语句

3. **点击格式化**
   - 点击右上角的代码图标按钮
   - 等待格式化完成（通常不到 1 秒）

4. **查看结果**
   - SQL 语句已经格式化完成
   - 可以继续编辑或保存

## 💬 反馈

如果你有任何建议或发现问题：
1. 检查格式化结果是否符合预期
2. 尝试手动调整格式
3. 提交反馈或 Issue

## 🎉 总结

- ✅ **功能完整** - 支持常见 SQL 语句格式化
- ✅ **易于使用** - 一键格式化，无需配置
- ✅ **性能优秀** - 格式化速度快
- ✅ **体验良好** - 清晰的视觉反馈

现在你可以享受更加清晰、规范的 SQL 代码了！
