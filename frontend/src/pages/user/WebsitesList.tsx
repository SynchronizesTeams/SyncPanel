import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Globe, Plus, Upload, Trash2, ExternalLink, CheckCircle, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WebsitesList: React.FC = () => {
  const [websites, setWebsites] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchWebsites = async () => {
    try {
      const [webRes, domRes] = await Promise.all([
        api.get('/websites'),
        api.get('/domains')
      ]);
      if (webRes.data.success) setWebsites(webRes.data.data);
      if (domRes.data.success) {
        setDomains(domRes.data.data);
        if (domRes.data.data.length > 0) setDomainId(domRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleCreateAndDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Step 1: Create Website DB Record
      const createRes = await api.post('/websites', {
        name,
        domain_id: domainId,
        subdomain,
      });

      if (!createRes.data.success) {
        throw new Error(createRes.data.message);
      }

      const newWebsite = createRes.data.data;

      // Step 2: Deploy ZIP file if attached
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/websites/${newWebsite.id}/deploy`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setName('');
      setSubdomain('');
      setFile(null);
      setShowModal(false);
      fetchWebsites();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to deploy website');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this website? Website files will be permanently removed.')) return;

    try {
      await api.delete(`/websites/${id}`);
      fetchWebsites();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Layout title="Websites Management">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">Your Static Websites</h3>
            <p className="text-xs text-slate-400">Deploy HTML/CSS/JS ZIP builds with automated Cloudflare routing</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg glow-cyan flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Website
          </button>
        </div>

        {/* Websites Grid / List */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading website records...</div>
          ) : websites.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-200 font-bold text-base">No Websites Configured</p>
              <p className="text-xs text-slate-400 mt-1 mb-6">Create a website entry and upload your ZIP archive to deploy.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all"
              >
                + Deploy First Website
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {websites.map((site) => (
                <div key={site.id} className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-extrabold text-white text-base truncate">{site.name}</h4>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        site.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        site.status === 'deploying' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {site.status === 'active' && <CheckCircle className="w-3 h-3" />}
                        {site.status === 'deploying' && <Clock className="w-3 h-3 animate-spin" />}
                        <span className="capitalize">{site.status}</span>
                      </span>
                    </div>

                    <a
                      href={`http://${site.hostname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 mb-4 truncate"
                    >
                      {site.hostname} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1 mb-4">
                      <p className="text-slate-400">Doc Root: <span className="font-mono text-slate-200 text-[11px] truncate block">{site.document_root}</span></p>
                      <p className="text-slate-400">Storage Used: <strong className="text-slate-200">{site.storage_used_mb} MB</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <Link
                      to={`/websites/${site.id}`}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      Manage Deployments &rarr;
                    </Link>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Website"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal: Create & Deploy Website */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Create Static Website
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAndDeploy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personal Portfolio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subdomain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. portfolio"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Domain</label>
                  <select
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {domains.map((dom) => (
                      <option key={dom.id} value={dom.id}>.{dom.domain}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Upload Site Build (.ZIP)</label>
                <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="zip-upload"
                  />
                  <label htmlFor="zip-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs text-slate-300 font-medium">
                      {file ? file.name : 'Click to select ZIP archive containing index.html'}
                    </span>
                    <span className="text-[10px] text-slate-500">Max size: 100MB</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg glow-cyan disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Deploy Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
