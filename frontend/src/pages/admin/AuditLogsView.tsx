import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (actionQuery = '') => {
    try {
      const res = await api.get(`/admin/audit-logs?action=${actionQuery}`);
      if (res.data.success) {
        setLogs(res.data.data.data || res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(filterAction);
  };

  return (
    <Layout title="Audit Trail & Security Logs">
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-white">System Audit Trail</h3>
            <p className="text-xs text-slate-400">Security-sensitive administrative actions and tenant modifications</p>
          </div>

          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by action (e.g. USER_CREATED)..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs w-64 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">No audit log records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-4">Action</th>
                    <th className="pb-3 px-4">User</th>
                    <th className="pb-3 px-4">Resource</th>
                    <th className="pb-3 px-4">IP Address</th>
                    <th className="pb-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="py-3.5 px-4 font-bold text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-white">
                        {log.user ? log.user.name : 'System'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {log.resource_type ? `${log.resource_type} #${log.resource_id}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
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
