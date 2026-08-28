'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SecretInfo {
  configured: boolean;
  source: 'settings' | 'env' | null;
  masked: string;
}

interface SettingsData {
  githubToken: SecretInfo;
  llm: {
    provider: string;
    apiKey: SecretInfo;
    strongModel: string;
    cheapModel: string;
    budgetYuan: number;
  };
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [strongModel, setStrongModel] = useState('');
  const [cheapModel, setCheapModel] = useState('');
  const [budgetYuan, setBudgetYuan] = useState(10);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/settings');
    const json = await res.json();
    const d = json.data as SettingsData;
    setData(d);
    setProvider(d.llm.provider);
    setStrongModel(d.llm.strongModel);
    setCheapModel(d.llm.cheapModel);
    setBudgetYuan(d.llm.budgetYuan);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = {
      llmProvider: provider,
      strongModel,
      cheapModel,
      budgetYuan: Number(budgetYuan),
    };
    if (githubToken) body.githubToken = githubToken;
    if (apiKey) body[`${provider}ApiKey`] = apiKey;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'save failed');
      setGithubToken('');
      setApiKey('');
      setToast('已保存');
      await load();
    } catch (e) {
      setToast(`保存失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <main>
      <h1 className="text-xl font-bold mb-6">设置</h1>

      {!data ? (
        <p className="text-[var(--muted)]">加载中…</p>
      ) : (
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block h-3.5 w-1 rounded bg-[var(--accent)]" />
              <h2 className="font-semibold">GitHub Token</h2>
            </div>
            <SecretStatus info={data.githubToken} label="GitHub Token" />
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={data.githubToken.configured ? '已配置，输入新值以覆盖' : 'ghp_xxx（必填才能用 GitHub 采集）'}
              className="input mt-2.5 mono"
            />
            <p className="text-xs text-[var(--faint)] mt-2">
              获取：<a className="link" href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer">github.com/settings/tokens/new</a>，勾选 public_repo
            </p>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block h-3.5 w-1 rounded bg-[var(--radar)]" />
              <h2 className="font-semibold">LLM 配置</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-[var(--muted)] text-xs">服务商</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="select mt-1.5"
                >
                  <option value="deepseek">deepseek</option>
                  <option value="anthropic">anthropic</option>
                  <option value="openai">openai</option>
                  <option value="openrouter">openrouter</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[var(--muted)] text-xs">每日预算（元）</span>
                <input
                  type="number"
                  min={0}
                  value={budgetYuan}
                  onChange={(e) => setBudgetYuan(Number(e.target.value))}
                  className="input mt-1.5 mono"
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--muted)] text-xs">强模型（卡片分析）</span>
                <input
                  value={strongModel}
                  onChange={(e) => setStrongModel(e.target.value)}
                  className="input mt-1.5 mono"
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--muted)] text-xs">轻量模型（预筛）</span>
                <input
                  value={cheapModel}
                  onChange={(e) => setCheapModel(e.target.value)}
                  className="input mt-1.5 mono"
                />
              </label>
            </div>

            <div className="mt-3">
              <SecretStatus info={data.llm.apiKey} label={`${provider} API Key`} />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={data.llm.apiKey.configured ? '已配置，输入新值以覆盖' : `sk-xxx（${provider}）`}
                className="input mt-2.5 mono"
              />
              {provider === 'deepseek' && (
                <p className="text-xs text-[var(--faint)] mt-2">
                  获取：<a className="link" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">platform.deepseek.com/api_keys</a>
                </p>
              )}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? '保存中…' : '保存'}
            </button>
            {toast && <span className="text-sm text-[var(--radar)] mono">✓ {toast}</span>}
          </div>

          <p className="text-xs text-[var(--faint)]">
            优先级：网页设置 &gt; .env.local。密钥仅存于本机 SQLite，API 返回一律脱敏。
          </p>
        </div>
      )}
    </main>
  );
}

function SecretStatus({ info, label }: { info: SecretInfo; label: string }) {
  if (!info.configured) {
    return <span className="badge badge-pending">{label}：未配置</span>;
  }
  const src = info.source === 'settings' ? '网页设置' : '.env';
  return (
    <span className="badge badge-fresh">
      {label}：已配置（{src}）{info.masked ? ` ${info.masked}` : ''}
    </span>
  );
}
