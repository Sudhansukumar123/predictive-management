import React from 'react';
import { ShieldAlert, Activity, CheckCircle } from 'lucide-react';

export const DigitalTwin = ({ machineName, machineType, telemetryData }) => {
  // If no live telemetry has arrived yet, use standard placeholder values
  const defaultSensors = {
    temperature: 45.0,
    pressure: machineType === 'pump' ? 120.0 : 1.5,
    rpm: machineType === 'cnc' ? 6000.0 : machineType === 'pump' ? 1800.0 : 60.0,
    vibration: 2.1,
    voltage: machineType === 'robotic_arm' ? 24.0 : 400.0,
    current: 12.0,
    humidity: 40.0,
    operating_hours: 1500.0
  };

  const sensors = telemetryData?.sensors || defaultSensors;
  const status = telemetryData?.status || 'healthy';
  const healthScore = telemetryData?.health_score || 100.0;
  const anomalyLabel = telemetryData?.anomaly_label || 0;

  // Rotation speed class
  const getRotationClass = () => {
    if (status === 'critical') return 'animate-spin-fast text-rose-500';
    if (sensors.rpm > 5000) return 'animate-spin-fast';
    if (sensors.rpm > 1000) return 'animate-spin-medium';
    return 'animate-spin-slow';
  };

  // Status-based colors
  const statusColor = 
    status === 'critical' ? 'text-rose-500 bg-rose-950/20 border-rose-800' :
    status === 'warning' ? 'text-amber-500 bg-amber-950/20 border-amber-800' :
    'text-emerald-500 bg-emerald-950/20 border-emerald-800';

  return (
    <div className="w-full flex flex-col p-6 rounded-2xl glass-panel border border-slate-800 transition-all duration-300">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="font-extrabold text-lg text-white font-sans">{machineName}</h3>
          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">
            DIGITAL TWIN TELEMETRY VIRTUALIZATION
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-mono uppercase font-bold flex items-center space-x-1.5 ${statusColor}`}>
          {status === 'critical' && <ShieldAlert className="h-3.5 w-3.5" />}
          {status === 'healthy' && <CheckCircle className="h-3.5 w-3.5" />}
          <span>{status}</span>
        </div>
      </div>

      {/* SVG Graphics Area */}
      <div className="h-64 bg-slate-950/60 rounded-xl border border-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Radar grids overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(2,132,199,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

        {/* 1. CNC Milling Machine SVG */}
        {machineType === 'cnc' && (
          <svg className="w-full h-full max-w-[240px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Machine Enclosure */}
            <rect x="20" y="20" width="160" height="160" rx="10" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="20" y1="140" x2="180" y2="140" stroke="#334155" strokeWidth="2" />
            
            {/* Spindle head structure */}
            <rect x="85" y="30" width="30" height="40" fill="#334155" stroke="#64748b" strokeWidth="2" />
            {/* Rotating Chuck */}
            <rect x="90" y="70" width="20" height="12" fill="#475569" />
            
            {/* Drill Spindle Gear (Rotating component) */}
            <circle cx="100" cy="90" r="14" fill="none" stroke={status === 'critical' ? '#ef4444' : '#0284c7'} strokeWidth="4" strokeDasharray="6 3" className={`${getRotationClass()}`} style={{ transformOrigin: '100px 90px' }} />
            
            {/* Tool / Drill Bit */}
            <polygon points="97,104 103,104 100,120" fill="#cbd5e1" stroke="#94a3b8" />

            {/* Coolant Jets (Active if CNC running) */}
            {sensors.rpm > 100 && (
              <>
                <path d="M78,110 Q88,115 97,112" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 3" className="animate-pulse" />
                <path d="M122,110 Q112,115 103,112" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 3" className="animate-pulse" />
              </>
            )}

            {/* Workpiece block */}
            <rect x="70" y="140" width="60" height="25" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            
            {/* Heat hotspot - overlays spindle bearing */}
            <circle cx="100" cy="70" r="22" className={`fill-none stroke-[3] ${
              status === 'critical' ? 'heat-zone-critical' :
              status === 'warning' ? 'heat-zone-warning' : 'stroke-sky-500/20'
            }`} />
          </svg>
        )}

        {/* 2. Robotic Arm SVG */}
        {machineType === 'robotic_arm' && (
          <svg className="w-full h-full max-w-[240px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grid background */}
            <circle cx="100" cy="100" r="80" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
            
            {/* Base platform */}
            <rect x="70" y="160" width="60" height="15" rx="3" fill="#334155" stroke="#475569" strokeWidth="2" />
            <circle cx="100" cy="160" r="10" fill="#475569" />
            
            {/* Segment 1: Lower Arm */}
            <g style={{ transform: 'rotate(-25deg)', transformOrigin: '100px 160px' }}>
              <rect x="95" y="90" width="10" height="70" rx="4" fill="#334155" stroke="#64748b" />
              {/* Joint 2 (Elbow) */}
              <circle cx="100" cy="90" r="8" fill="#475569" />
              {/* Hotspot overlay Joint 2 */}
              <circle cx="100" cy="90" r="16" className={`fill-none stroke-[3] ${
                status === 'critical' ? 'heat-zone-critical' :
                status === 'warning' ? 'heat-zone-warning' : 'stroke-sky-500/20'
              }`} />
              
              {/* Segment 2: Upper Arm */}
              <g style={{ transform: 'rotate(60deg)', transformOrigin: '100px 90px' }}>
                <rect x="96" y="35" width="8" height="60" rx="3" fill="#475569" stroke="#64748b" />
                {/* Joint 3 (Wrist) & Gripper */}
                <circle cx="100" cy="35" r="5" fill="#64748b" />
                <path d="M92,20 L96,30 L104,30 L108,20" stroke="#94a3b8" strokeWidth="2" fill="none" />
              </g>
            </g>
          </svg>
        )}

        {/* 3. Hydraulic Pump SVG */}
        {machineType === 'pump' && (
          <svg className="w-full h-full max-w-[240px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Pump Housing outer casing */}
            <circle cx="100" cy="100" r="60" fill="#1e293b" stroke="#475569" strokeWidth="3" />
            <circle cx="100" cy="100" r="50" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            
            {/* Liquid Pressure Flow Lines (Inlet/Outlet pipes) */}
            <rect x="10" y="90" width="30" height="20" fill="#334155" stroke="#475569" strokeWidth="2" />
            <rect x="160" y="90" width="30" height="20" fill="#334155" stroke="#475569" strokeWidth="2" />
            
            {/* Internal Impeller Blades (Spinning component) */}
            <g className={`${getRotationClass()}`} style={{ transformOrigin: '100px 100px' }}>
              <circle cx="100" cy="100" r="16" fill="#475569" />
              {/* Blades */}
              <line x1="100" y1="50" x2="100" y2="150" stroke={status === 'critical' ? '#ef4444' : '#0284c7'} strokeWidth="6" />
              <line x1="50" y1="100" x2="150" y2="100" stroke={status === 'critical' ? '#ef4444' : '#0284c7'} strokeWidth="6" />
              <line x1="65" y1="65" x2="135" y2="135" stroke={status === 'critical' ? '#ef4444' : '#0284c7'} strokeWidth="4" />
              <line x1="65" y1="135" x2="135" y2="65" stroke={status === 'critical' ? '#ef4444' : '#0284c7'} strokeWidth="4" />
            </g>

            {/* Hotspot overlay bearing casing */}
            <circle cx="100" cy="100" r="26" className={`fill-none stroke-[3] ${
              status === 'critical' ? 'heat-zone-critical' :
              status === 'warning' ? 'heat-zone-warning' : 'stroke-sky-500/20'
            }`} />
          </svg>
        )}

        {/* Real-time alarm alert overlay if anomaly is present */}
        {anomalyLabel === 1 && (
          <div className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 bg-rose-950/80 border border-rose-800 rounded-md animate-bounce glow-red">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">ANOMALY STATE</span>
          </div>
        )}
      </div>

      {/* Cybernetic Telemetry Readout Grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Temperature</p>
          <span className="mono-display text-sm font-bold text-sky-400">
            {sensors.temperature ? `${sensors.temperature.toFixed(1)}°C` : '0.0°C'}
          </span>
        </div>
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {machineType === 'pump' ? 'Pressure' : 'Vibration'}
          </p>
          <span className="mono-display text-sm font-bold text-sky-400">
            {machineType === 'pump' 
              ? `${sensors.pressure ? sensors.pressure.toFixed(1) : '0'} bar` 
              : `${sensors.vibration ? sensors.vibration.toFixed(2) : '0'} mm/s`
            }
          </span>
        </div>
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">RUL Estimate</p>
          <span className="mono-display text-sm font-bold text-sky-400">
            {telemetryData?.rul_hours ? `${telemetryData.rul_hours.toFixed(0)}h` : '2000h'}
          </span>
        </div>
      </div>
      
      {/* Explanation Footer if Anomaly is flagged */}
      {anomalyLabel === 1 && telemetryData?.anomaly_reason && (
        <div className="mt-4 p-3 bg-rose-950/15 border border-rose-950/50 rounded-xl">
          <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wide flex items-center space-x-1">
            <ShieldAlert className="h-3 w-3 mr-1" /> DIAGNOSED MECHANICAL FAILURE
          </p>
          <p className="text-xs text-rose-200 mt-1 leading-relaxed">{telemetryData.anomaly_reason}</p>
        </div>
      )}
    </div>
  );
};
