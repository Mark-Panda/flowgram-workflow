export async function executeTestRun(params: {
  ruleId: string;
  msgType: string;
  metadata?: string;
  headers?: Record<string, any>;
  body?: any;
  debugMode?: boolean;
  msgId: string;
}): Promise<{ ok: boolean; status: number; data: any }> {
  const { ruleId, msgType, metadata, headers, body, debugMode, msgId } = params;
  const qs = [
    `debugMode=${debugMode ? 'true' : 'false'}`,
    metadata ? metadata : '',
    `msgId=${encodeURIComponent(msgId)}`,
  ]
    .filter(Boolean)
    .join('&');
  const url = `http://127.0.0.1:9099/api/v1/rules/${encodeURIComponent(
    ruleId
  )}/notify/${encodeURIComponent(msgType)}${qs ? `?${qs}` : ''}`;
  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  Object.keys(headers || {}).forEach((k) => {
    const v = (headers as any)[k];
    if (v !== undefined && v !== null) hdrs[k] = String(v);
  });
  const resp = await fetch(url, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(body ?? {}),
  });
  try {
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  } catch {
    return { ok: resp.ok, status: resp.status, data: {} };
  }
}

export async function fetchRunLogs(msgId: string): Promise<any> {
  const url = `http://127.0.0.1:9099/api/v1/logs/runs/msgId?msgId=${encodeURIComponent(msgId)}`;
  const resp = await fetch(url, { method: 'GET' });
  try {
    return await resp.json();
  } catch {
    return {};
  }
}
