import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export const ServerDoctorView: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoctorHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/system/health');
      if (res.data.success) {
        setHealth(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorHealth();
  }, []);

  const checks = [
    { name: 'Nginx Web Server', key: 'nginx' },
    { name: 'PostgreSQL Database Engine', key: 'postgresql' },
    { name: 'Redis Cache & Queue Broker', key: 'redis' },
    { name: 'Cloudflare Tunnel Daemon (cloudflared)', key: 'cloudflared' },
  ];

  return (
    <Layout title="Server Doctor & Diagnostics">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">CloudPanel Doctor Diagnostics</h3>
            <p className="text-xs text-slate-400">Run automated health checks on Linux host services and runtime dependencies</p>
          </div>

          <button
            onClick={fetchDoctorHealth}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg glow-cyan flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Doctor Diagnostics
          </button>
        </div>

        {/* Health Check Cards Grid */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          {checks.map((item) => {
            const status = health?.services?.[item.key] || 'running';
            const isOk = status === 'running';

            return (
              <div key={item.key} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOk ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Service unit: <code className="text-cyan-400">{item.key}.service</code></p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  isOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {isOk ? '[OK] Running' : '[FAIL] Service Down'}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </Layout>
  );
};
