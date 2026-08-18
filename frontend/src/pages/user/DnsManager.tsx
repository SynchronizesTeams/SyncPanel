import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Network, Plus, Trash2, ShieldCheck, X } from 'lucide-react';

export const DnsManager: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [domainId, setDomainId] = useState('');
  const [type, setType] = useState('A');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [proxied, setProxied] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [recRes, domRes] = await Promise.all([
        api.get('/dns-records'),
        api.get('/domains')
      ]);
      if (recRes.data.success) setRecords(recRes.data.data);
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
    fetchData();
  }, []);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/dns-records', {
        domain_id: domainId,
        type,
        name,
        content,
        proxied,
        ttl: 1,
      });

      setShowModal(false);
      setName('');
      setContent('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create DNS record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this DNS record?')) return;

    try {
      await api.delete(`/dns-records/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete DNS record');
    }
  };

  return (
    <Layout title="DNS Records Manager">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">DNS Records Management</h3>
            <p className="text-xs text-slate-400">Manage A, AAAA, CNAME, and TXT records synchronized with Cloudflare</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold text-sm shadow-lg flex items-center gap-2 hover:from-purple-400 hover:to-blue-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add DNS Record
          </button>
        </div>

        {/* DNS Table Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading DNS records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
              <Network className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-200 font-bold text-base">No Custom DNS Records</p>
              <p className="text-xs text-slate-400 mt-1 mb-6">Add custom A, CNAME, or TXT entries for your subdomains.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all"
              >
                + Add First DNS Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Content</th>
                    <th className="pb-3 px-4">Cloudflare Proxy</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/40">
                      <td className="py-3.5 px-4 font-bold text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
                          {rec.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-white">{rec.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 max-w-xs truncate">{rec.content}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          rec.proxied ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          <ShieldCheck className="w-4 h-4" />
                          {rec.proxied ? 'Proxied (Orange Cloud)' : 'DNS Only'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete DNS Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Add DNS Record */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-400" />
                Add New DNS Record
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Record Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="A">A (IPv4)</option>
                    <option value="AAAA">AAAA (IPv6)</option>
                    <option value="CNAME">CNAME (Alias)</option>
                    <option value="TXT">TXT (Text)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Domain</label>
                  <select
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {domains.map((dom) => (
                      <option key={dom.id} value={dom.id}>.{dom.domain}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Record Name / Hostname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sub or @"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">IPv4 / IPv6 / Target Content</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.0.2.1 or target.example.com"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="proxied"
                  checked={proxied}
                  onChange={(e) => setProxied(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-purple-500 focus:ring-0"
                />
                <label htmlFor="proxied" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Cloudflare Proxy Status (Orange Cloud Enabled)
                </label>
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
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create DNS Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
