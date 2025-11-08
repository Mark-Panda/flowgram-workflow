/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { unstableSetCreateRoot } from '@flowgram.ai/form-materials';

import { AdminPanel } from './management/admin-panel';
import { RuleDetailPage } from './management/rule-detail-page';

/**
 * React 18/19 polyfill for form-materials
 */
unstableSetCreateRoot(createRoot);

const app = createRoot(document.getElementById('root')!);

function Router() {
  const [hash, setHash] = React.useState<string>(() => window.location.hash || '#/');
  React.useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const match = hash.match(/^#\/workflow\/([^/]+)(?:\/(design))?$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const tab = (match[2] as 'design' | undefined);
    return <RuleDetailPage id={id} tab={tab} />;
  }
  return <AdminPanel />;
}

app.render(<Router />);
