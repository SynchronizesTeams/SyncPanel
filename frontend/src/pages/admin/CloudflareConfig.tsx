import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Cloud, RefreshCw, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export const CloudflareConfig: React.FC = () => {
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [tunnelId, setTunnelId] = useState('');
  const [tunnelName, setTunnelName] = useState('');

  const [status, setStatus] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const [stRes, domRes] = await Promise.all([
        api.get('/admin/cloudflare/status'),
        api.get('/domains')
      ]);
      if (stRes.data.success) setStatus(stRes.data.data);
      if (domRes.data.success) setDomains(domRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSaving(true);

    try {
      const res = await api.post('/admin/cloudflare/configure', {
        account_id: accountId,
        api_token: apiToken,
        tunnel_id: tunnelId,
        tunnel_name: tunnelName,
      });

      if (res.data.success) {
        setMsg('Cloudflare credentials saved securely!');
        setApiToken('');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Configuration save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncZones = async () => {
    setError('');
    setMsg('');
    setSyncing(true);

    try {
      const res = await api.post('/admin/cloudflare/sync');
      if (res.data.success) {
        setMsg(res.data.message);
        if (res.data.data) setDomains(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Zone sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Layout title="Cloudflare & Tunnel Integration">
      <div className="space-y-8">

        {/* Connectivity Status Banner */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Cloudflare API & Tunnel Status</h3>
              <p className="text-xs text-slate-400">
                API Token Encrypted at Rest &bull; Tunnel routing active via <code className="text-cyan-400">cloudflared</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold uppercase ${
              status?.configured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {status?.configured ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {status?.configured ? 'API Connected' : 'Not Configured'}
            </span>

            <button
              onClick={handleSyncZones}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Cloudflare Zones'}
            </button>
          </div>
        </div>

        {msg && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {msg}</div>}
        {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Configuration Form */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h4 className="text-base font-bold text-white mb-4">Cloudflare API Token & Account Settings</h4>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Account ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0123456789abcdef0123456789abcdef"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">API Token (Encrypted Server-Side)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter Cloudflare API Bearer Token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tunnel ID</label>
                  <input
                    type="text"
                    placeholder="Optional Tunnel UUID"
                    value={tunnelId}
                    onChange={(e) => setTunnelId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tunnel Name</label>
                  <input
                    type="text"
                    placeholder="e.g. cloudpanel-tunnel"
                    value={tunnelName}
                    onChange={(e) => setTunnelName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-lg glow-orange flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Cloudflare Settings'}
              </button>
            </form>
          </div>

          {/* Synchronized Cloudflare Domains List */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-white">Allowed Domains ({domains.length})</h4>
              <span className="text-xs text-slate-400">Synchronized Cloudflare Zones</span>
            </div>

            {domains.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No Cloudflare zones synchronized. Click "Sync Cloudflare Zones" above.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {domains.map((dom) => (
                  <div key={dom.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-cyan-400 font-bold">.{dom.domain}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Zone ID: {dom.zone_id || 'Mock'}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-semibold">
                      {dom.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </Layout>
  );
};
