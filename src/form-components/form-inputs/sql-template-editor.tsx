/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { IFlowTemplateValue, SQLEditorWithVariables } from '@flowgram.ai/form-materials';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconCode } from '@douyinfe/semi-icons';

/**
 * 简单的 SQL 格式化函数
 * 支持基本的 SQL 关键字格式化和缩进
 */
function formatSQL(sql: string): string {
  if (!sql || !sql.trim()) return sql;

  let formatted = sql;

  // 移除多余的空白
  formatted = formatted.replace(/\s+/g, ' ').trim();

  // 为主要关键字添加换行
  const mainKeywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT'];
  mainKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, `\n${keyword}`);
  });

  // 为 AND/OR 添加换行和缩进
  formatted = formatted.replace(/\b(AND|OR)\b/gi, '\n  $1');

  // 为 JOIN 添加换行
  formatted = formatted.replace(/\b(LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|JOIN)\b/gi, '\n$1');

  // 为逗号后添加换行（在 SELECT 子句中）
  const lines = formatted.split('\n');
  const result: string[] = [];
  let inSelect = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('SELECT')) {
      inSelect = true;
      result.push(trimmed);
    } else if (inSelect && (trimmed.toUpperCase().startsWith('FROM') || 
                            trimmed.toUpperCase().startsWith('WHERE'))) {
      inSelect = false;
      result.push(trimmed);
    } else if (inSelect && trimmed.includes(',')) {
      // 在 SELECT 子句中，为逗号添加换行
      const parts = trimmed.split(',');
      parts.forEach((part, idx) => {
        if (idx === 0) {
          result.push('  ' + part.trim() + (idx < parts.length - 1 ? ',' : ''));
        } else {
          result.push('  ' + part.trim() + (idx < parts.length - 1 ? ',' : ''));
        }
      });
    } else {
      result.push(trimmed.startsWith('AND') || trimmed.startsWith('OR') ? '  ' + trimmed : trimmed);
    }
  });

  // 清理多余的空行
  return result.filter(line => line.trim()).join('\n');
}

export function SqlTemplateEditor({
  value,
  onChange,
  readonly,
  hasError,
}: {
  value?: IFlowTemplateValue;
  onChange: (val?: IFlowTemplateValue) => void;
  readonly?: boolean;
  hasError?: boolean;
}) {
  const text = typeof value?.content === 'string' ? (value?.content as string) : '';
  const [isFormatting, setIsFormatting] = useState(false);

  const handleFormat = () => {
    if (readonly || !text) return;
    
    setIsFormatting(true);
    try {
      const formatted = formatSQL(text);
      onChange({ type: 'template', content: formatted });
    } catch (error) {
      console.error('SQL 格式化失败:', error);
    } finally {
      setTimeout(() => setIsFormatting(false), 300);
    }
  };

  return (
    <div
      className="sql-template-editor-wrapper"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {!readonly && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
          }}
        >
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
        </div>
      )}
      <SQLEditorWithVariables
        value={text}
        onChange={(v) => onChange({ type: 'template', content: v })}
        readonly={readonly}
      />
    </div>
  );
}
