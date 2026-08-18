import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Globe, HardDrive, Network, Plus, ArrowUpRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<any[]>([]);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [webRes, dnsRes] = await Promise.all([
          api.get('/websites'),
          api.get('/dns-records')
        ]);
        if (webRes.data.success) setWebsites(webRes.data.data);
        if (dnsRes.data.success) setDnsRecords(dnsRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalUsedStorage = websites.reduce((acc, site) => acc + (site.storage_used_mb || 0), 0);
  const maxStorage = user?.max_storage_mb || 2048;
  const storagePercentage = Math.min(100, Math.round((totalUsedStorage / maxStorage) * 100));

  const maxWebsites = user?.max_websites || 5;
  const websitesPercentage = Math.min(100, Math.round((websites.length / maxWebsites) * 100));

  const maxDns = user?.max_dns_records || 50;
  const dnsPercentage = Math.min(100, Math.round((dnsRecords.length / maxDns) * 100));

  return (
    <Layout title="Dashboard Overview">
      <div className="space-y-8">

        {/* Hero Welcome Card */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border-cyan-500/20">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-white">Welcome back, {user?.name}! 👋</h2>
              <p className="text-slate-400 text-sm mt-1">
                Your static websites are proxied securely via Cloudflare Tunnel.
              </p>
            </div>
            <Link
              to="/websites"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg glow-cyan flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create & Deploy Site
            </Link>
          </div>
        </div>

        {/* Quotas Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Websites Quota */}
          <div className="glass-card rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-cyan-400">{websitesPercentage}% used</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Websites Quota</p>
            <h3 className="text-2xl font-black text-white mt-1">{websites.length} <span className="text-sm font-normal text-slate-400">/ {maxWebsites} Sites</span></h3>
            <div className="w-full h-2 bg-slate-900 rounded-full mt-4 overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${websitesPercentage}%` }} />
            </div>
          </div>

          {/* Storage Quota */}
          <div className="glass-card rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-orange-400">{storagePercentage}% used</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Disk Storage</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalUsedStorage} MB <span className="text-sm font-normal text-slate-400">/ {maxStorage} MB</span></h3>
            <div className="w-full h-2 bg-slate-900 rounded-full mt-4 overflow-hidden border border-slate-800">
              <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${storagePercentage}%` }} />
            </div>
          </div>

          {/* DNS Records Quota */}
          <div className="glass-card rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Network className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-purple-400">{dnsPercentage}% used</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">DNS Records</p>
            <h3 className="text-2xl font-black text-white mt-1">{dnsRecords.length} <span className="text-sm font-normal text-slate-400">/ {maxDns} Records</span></h3>
            <div className="w-full h-2 bg-slate-900 rounded-full mt-4 overflow-hidden border border-slate-800">
              <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: `${dnsPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Active Websites Table Overview */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Your Hosted Websites</h3>
              <p className="text-xs text-slate-400">Overview of deployed sites and Cloudflare hostnames</p>
            </div>
            <Link to="/websites" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading websites...</div>
          ) : websites.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">No websites created yet.</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Upload a static site ZIP to go online.</p>
              <Link
                to="/websites"
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create First Website
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Hostname</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Storage</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {websites.slice(0, 5).map((site) => (
                    <tr key={site.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{site.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-cyan-400">{site.hostname}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                          site.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          site.status === 'deploying' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {site.status === 'active' && <CheckCircle className="w-3 h-3" />}
                          {site.status === 'deploying' && <Clock className="w-3 h-3 animate-spin" />}
                          {site.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          <span className="capitalize">{site.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs font-mono">{site.storage_used_mb} MB</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/websites/${site.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};
