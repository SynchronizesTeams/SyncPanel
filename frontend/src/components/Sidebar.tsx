import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Globe,
  Network,
  Users,
  Cloud,
  Activity,
  ShieldAlert,
  LogOut
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const userNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Websites', path: '/websites', icon: Globe },
    { name: 'DNS Records', path: '/dns-records', icon: Network },
  ];

  const adminNav = [
    { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Cloudflare & Tunnel', path: '/admin/cloudflare', icon: Cloud },
    { name: 'Server Health', path: '/admin/health', icon: Activity },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
  ];

  const links = isAdmin ? adminNav : userNav;

  return (
    <aside className="w-64 glass-card h-screen fixed left-0 top-0 flex flex-col justify-between p-4 z-40 border-r border-slate-800">
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg glow-cyan">
            CP
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-wide">CloudPanel</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold uppercase">
              {isAdmin ? 'Admin Console' : 'User Portal'}
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard' || item.path === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 glow-cyan'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400 border border-slate-700">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
