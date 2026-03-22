import { h } from 'preact';
import { userSettings } from '../state/store';
import { useState } from 'preact/hooks';
import { api } from '../api/client';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = useState(userSettings.value.aiProvider || 'anthropic');
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(userSettings.value.aiEnabled);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    try {
      await api.putAiSettings({ provider, key, enabled });
      userSettings.value = { ...userSettings.value, aiProvider: provider as any, aiEnabled: enabled };
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleRemove = async () => {
    try {
      await api.deleteAiSettings();
      setKey('');
      setEnabled(false);
      userSettings.value = { ...userSettings.value, aiEnabled: false };
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div class="settings-panel panel-glass" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, zIndex: 1000, padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-medium)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>System Configuration</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Analysis Engine</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Enable AI Synthesis</span>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled((e.target as HTMLInputElement).checked)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Provider</label>
          <select value={provider} onChange={e => setProvider((e.target as HTMLSelectElement).value as any)} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
            <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>API Key (BYOK)</label>
          <input type="password" value={key} onChange={e => setKey((e.target as HTMLInputElement).value)} placeholder="Enter API key" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Key is validated securely before saving to backend vault.</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleRemove} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>Remove Key</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {status === 'success' && <span style={{ color: 'var(--success)', fontSize: 'var(--text-xs)' }}>Saved successfully</span>}
          {status === 'error' && <span style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>Validation failed</span>}
          <button onClick={handleSave} disabled={status === 'saving'} style={{ background: 'var(--accent-blue)', border: 'none', color: '#000', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {status === 'saving' ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
