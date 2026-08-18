import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, HardDrive } from 'lucide-react';

export const Header: React.FC<{ title: string }> = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="glass-nav h-16 fixed top-0 right-0 left-64 z-30 px-8 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Status: <strong className="text-emerald-400 capitalize">{user?.status || 'Active'}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Quota: <strong className="text-white">{user?.max_storage_mb} MB</strong></span>
        </div>
      </div>
    </header>
  );
};
