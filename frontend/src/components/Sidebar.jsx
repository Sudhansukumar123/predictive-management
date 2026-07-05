import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Gauge, 
  Cpu, 
  Calendar, 
  Package, 
  FileText, 
  LogOut, 
  Activity, 
  Bot, 
  UserCheck 
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Gauge, roles: ['admin', 'engineer', 'operator'] },
    { name: 'ML Pipeline', path: '/ml-pipeline', icon: Cpu, roles: ['admin', 'engineer'] },
    { name: 'Scheduler', path: '/scheduler', icon: Calendar, roles: ['admin', 'engineer', 'operator'] },
    { name: 'Spare Parts', path: '/inventory', icon: Package, roles: ['admin', 'engineer'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['admin', 'engineer', 'operator'] },
  ];

  return (
    <aside className="w-64 h-screen glass-panel border-r border-slate-800 flex flex-col justify-between fixed left-0 top-0 z-20">
      <div className="flex flex-col">
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 bg-gradient-to-r from-industry-900 to-transparent">
          <div className="p-2 bg-sky-950 rounded-lg border border-sky-800 glow-blue">
            <Activity className="h-6 w-6 text-sky-400 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white font-sans">
              Smart<span className="text-sky-400">Predict</span>
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">
              Industry 4.0 Hub
            </span>
          </div>
        </div>

        {/* Live Network Status Indicator */}
        <div className="px-6 py-3 flex items-center justify-between text-xs border-b border-slate-800/50 bg-slate-900/30">
          <span className="text-slate-400 font-semibold">Telemetry Server</span>
          <div className="flex items-center space-x-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500 glow-green' : 'bg-rose-500 glow-red animate-ping'}`}></span>
            <span className={`font-mono uppercase text-[10px] ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Check roles access
            if (user && !item.roles.includes(user.role)) return null;

            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-lg glow-blue scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 hover:translate-x-1'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'}`} />
                <span className="text-sm font-semibold tracking-wide font-sans">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/20">
        {user && (
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-sky-400" />
              </div>
              <div className="max-w-[120px] overflow-hidden truncate">
                <p className="text-xs font-bold text-slate-100 truncate">{user.full_name || user.email}</p>
                <span className="text-[10px] font-mono font-bold text-sky-500 uppercase">{user.role}</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-rose-950 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 text-xs font-bold tracking-wider uppercase transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  );
};
