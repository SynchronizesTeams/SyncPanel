import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Cpu, HardDrive, Server, Globe, Activity, CheckCircle, XCircle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [resourceUsage, setResourceUsage] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hRes, rRes] = await Promise.all([
          api.get('/admin/system/health'),
          api.get('/admin/resource-usage')
        ]);
        if (hRes.data.success) setHealth(hRes.data.data);
        if (rRes.data.success) setResourceUsage(rRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout title="Admin System Overview">
      <div className="space-y-8">

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">CPU Load Avg</span>
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-black text-white">{health?.cpu?.load_1min || '0.10'}</h3>
            <p className="text-[11px] text-slate-400 mt-1">1m: {health?.cpu?.load_1min} | 5m: {health?.cpu?.load_5min}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">RAM Usage</span>
              <Server className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-white">{health?.memory?.percentage || 0}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">{health?.memory?.used_mb || 0} MB / {health?.memory?.total_mb || 0} MB</p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Disk Usage</span>
              <HardDrive className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-2xl font-black text-white">{health?.disk?.percentage || 0}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">{health?.disk?.used_gb || 0} GB / {health?.disk?.total_gb || 0} GB</p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Hosted Sites</span>
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white">{resourceUsage?.total_websites || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Total Storage: {resourceUsage?.total_storage_mb || 0} MB</p>
          </div>

        </div>

        {/* System Services Health Matrix */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            System Services Status
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health?.services || { nginx: 'running', postgresql: 'running', redis: 'running', cloudflared: 'running' }).map(([service, status]) => (
              <div key={service} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white uppercase">{service}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{String(status)}</p>
                </div>
                {status === 'running' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};
