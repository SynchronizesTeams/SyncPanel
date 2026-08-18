import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle } from 'lucide-react';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [status, setStatus] = useState('active');
  const [maxWebsites, setMaxWebsites] = useState(5);
  const [maxStorageMb, setMaxStorageMb] = useState(2048);
  const [maxDnsRecords, setMaxDnsRecords] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setStatus('active');
    setMaxWebsites(5);
    setMaxStorageMb(2048);
    setMaxDnsRecords(50);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setStatus(u.status);
    setMaxWebsites(u.max_websites);
    setMaxStorageMb(u.max_storage_mb);
    setMaxDnsRecords(u.max_dns_records);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload: any = {
        name,
        email,
        role,
        status,
        max_websites: maxWebsites,
        max_storage_mb: maxStorageMb,
        max_dns_records: maxDnsRecords,
      };
      if (password) payload.password = password;

      if (editId) {
        await api.put(`/admin/users/${editId}`, payload);
      } else {
        await api.post('/admin/users', payload);
      }

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user? All user websites and files will be permanently deleted.')) return;

    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Layout title="User & Tenant Management">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">Panel Users & Quotas</h3>
            <p className="text-xs text-slate-400">Configure multi-tenant users, roles, storage limits, and account states</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg glow-cyan flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
        </div>

        {/* Users Table Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-4">User</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Sites Quota</th>
                    <th className="pb-3 px-4">Storage Quota</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{u.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-xs">
                        <span className={`px-2.5 py-1 rounded-md uppercase ${
                          u.role === 'admin' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {u.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {u.websites_count || 0} / {u.max_websites}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {u.max_storage_mb} MB
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete User"
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

      {/* Modal: Create/Edit User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editId ? 'Edit User Account & Quotas' : 'Create New User Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Password {editId && '(leave blank to keep unchanged)'}</label>
                <input
                  type="password"
                  required={!editId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="user">User (Standard Tenant)</option>
                    <option value="admin">Admin (System Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Max Sites</label>
                  <input
                    type="number"
                    required
                    value={maxWebsites}
                    onChange={(e) => setMaxWebsites(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Max Storage (MB)</label>
                  <input
                    type="number"
                    required
                    value={maxStorageMb}
                    onChange={(e) => setMaxStorageMb(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Max DNS</label>
                  <input
                    type="number"
                    required
                    value={maxDnsRecords}
                    onChange={(e) => setMaxDnsRecords(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
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
                  {submitting ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
