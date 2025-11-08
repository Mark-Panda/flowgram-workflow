/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EditorRenderer, FreeLayoutEditorProvider } from '@flowgram.ai/free-layout-editor';

import '@flowgram.ai/free-layout-editor/index.css';
import './styles/index.css';
import { FlowDocumentJSON } from './typings';
import { nodeRegistries } from './nodes';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks';
import { DemoTools } from './components/tools';

export const Editor: React.FC<{ initialDoc?: FlowDocumentJSON }> = ({ initialDoc }) => {
  const data = initialDoc ?? initialData;
  const editorProps = useEditorProps(data, nodeRegistries);
  return (
    <div className="doc-free-feature-overview">
      <FreeLayoutEditorProvider {...editorProps}>
        <div className="demo-container">
          <EditorRenderer className="demo-editor" />
        </div>
        <DemoTools />
      </FreeLayoutEditorProvider>
    </div>
  );
};
