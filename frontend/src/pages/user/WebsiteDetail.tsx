import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Upload, ArrowLeft } from 'lucide-react';

export const WebsiteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [website, setWebsite] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/websites/${id}`);
      if (res.data.success) {
        setWebsite(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleRedeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setMsg('');
    setDeploying(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/websites/${id}/deploy`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMsg('New build deployment queued successfully!');
      setFile(null);
      fetchDetail();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return <Layout title="Website Details"><div className="text-center py-12 text-slate-500">Loading website...</div></Layout>;
  }

  if (!website) {
    return <Layout title="Website Details"><div className="text-center py-12 text-rose-400">Website not found</div></Layout>;
  }

  return (
    <Layout title={`Manage ${website.name}`}>
      <div className="space-y-8">

        <Link to="/websites" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400">
          <ArrowLeft className="w-4 h-4" /> Back to Websites
        </Link>

        {/* Website Status & Metadata Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-white">{website.name}</h2>
              <a
                href={`http://${website.hostname}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-mono text-cyan-400 hover:underline inline-flex items-center gap-1 mt-1"
              >
                {website.hostname}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold uppercase ${
                website.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                website.status === 'deploying' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {website.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 uppercase font-semibold mb-1">Document Root Directory</p>
              <p className="font-mono text-slate-200 text-sm">{website.document_root}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 uppercase font-semibold mb-1">Disk Usage</p>
              <p className="font-mono text-slate-200 text-sm">{website.storage_used_mb} MB / {website.storage_limit_mb} MB</p>
            </div>
          </div>
        </div>

        {/* Deploy New Build Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            Deploy New Build Version
          </h3>

          {error && <div className="p-3 mb-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{error}</div>}
          {msg && <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">{msg}</div>}

          <form onSubmit={handleRedeploy} className="flex flex-col md:flex-row items-center gap-4">
            <input
              type="file"
              accept=".zip"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
            <button
              type="submit"
              disabled={deploying || !file}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 shadow-lg glow-cyan disabled:opacity-50"
            >
              {deploying ? 'Deploying...' : 'Upload & Deploy'}
            </button>
          </form>
        </div>

        {/* Deployment History Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">Deployment Log History</h3>

          {!website.deployments || website.deployments.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No deployment history found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-4">Filename</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Storage Used</th>
                    <th className="pb-3 px-4">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {website.deployments.map((dep: any) => (
                    <tr key={dep.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono text-xs text-slate-200">{dep.filename}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          dep.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          dep.status === 'processing' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          <span className="capitalize">{dep.status}</span>
                        </span>
                        {dep.error_message && <p className="text-[11px] text-rose-400 mt-1">{dep.error_message}</p>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{dep.storage_used_mb} MB</td>
                      <td className="py-3 px-4 text-xs text-slate-400">{dep.completed_at ? new Date(dep.completed_at).toLocaleString() : 'Processing...'}</td>
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
