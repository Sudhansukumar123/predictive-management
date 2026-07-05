import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { DigitalTwin } from '../components/DigitalTwin';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  CheckCircle, 
  TrendingUp, 
  Flame, 
  RotateCw, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';

export const Dashboard = () => {
  const { telemetry } = useSocket();
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineHistory, setMachineHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAnomalyButton, setActiveAnomalyButton] = useState({}); // machine_id -> anomalyType

  // Load initial machine fleet state
  const loadFleet = async () => {
    try {
      const fleet = await api.getMachines();
      setMachines(fleet);
      if (fleet.length > 0 && !selectedMachine) {
        setSelectedMachine(fleet[0]);
      }
      
      // Load recent alerts
      const tasks = await api.getTasks(); // can cross-reference
      // Simple custom alerts fetch would be ideal, we will query reports context or construct from machines
    } catch (e) {
      console.error("Failed to load fleet:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
    const interval = setInterval(loadFleet, 5000); // Poll database updates
    return () => clearInterval(interval);
  }, []);

  // Fetch detail for selected machine history (for charting)
  const fetchHistory = async () => {
    if (!selectedMachine) return;
    try {
      const details = await api.getMachineDetail(selectedMachine.id);
      
      // Format readings for charting
      const formatted = details.recent_readings.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature: r.temperature,
        vibration: r.vibration,
        pressure: r.pressure,
        rpm: r.rpm
      }));
      setMachineHistory(formatted);
      
      // Load alerts for selected machine
      const activeAlerts = details.recent_readings
        .filter(r => r.anomaly_label === 1)
        .map(r => ({
          id: r.id,
          message: r.anomaly_reason || "Mechanical Anomaly Detected",
          time: new Date(r.timestamp).toLocaleTimeString()
        }))
        .slice(-5);
      setAlerts(activeAlerts.reverse());
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedMachine]);

  // Append new incoming WebSocket ticks to the chart history
  useEffect(() => {
    if (!selectedMachine) return;
    const socketTick = telemetry[selectedMachine.id];
    if (socketTick) {
      const newTick = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature: socketTick.sensors.temperature,
        vibration: socketTick.sensors.vibration,
        pressure: socketTick.sensors.pressure,
        rpm: socketTick.sensors.rpm
      };
      setMachineHistory(prev => {
        const next = [...prev, newTick];
        if (next.length > 30) next.shift(); // keep 30 ticks
        return next;
      });
    }
  }, [telemetry, selectedMachine]);

  // Inject Anomaly handler
  const handleInjectAnomaly = async (anomalyType) => {
    if (!selectedMachine) return;
    try {
      await api.injectAnomaly(selectedMachine.id, anomalyType);
      setActiveAnomalyButton(prev => ({
        ...prev,
        [selectedMachine.id]: anomalyType
      }));
      loadFleet();
    } catch (e) {
      console.error(e);
    }
  };

  // Clear Anomaly handler
  const handleClearAnomaly = async () => {
    if (!selectedMachine) return;
    try {
      await api.clearAnomaly(selectedMachine.id);
      setActiveAnomalyButton(prev => ({
        ...prev,
        [selectedMachine.id]: null
      }));
      loadFleet();
    } catch (e) {
      console.error(e);
    }
  };

  // Merge database values with live WebSocket telemetry
  const getMergedMachineData = (m) => {
    const live = telemetry[m.id];
    if (live) {
      return {
        ...m,
        status: live.status,
        health_score: live.health_score,
        oee: live.oee,
        rul_hours: live.rul_hours
      };
    }
    return m;
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-industry-950 flex flex-col items-center justify-center space-y-4 ml-64 p-8">
        <div className="h-10 w-10 border-4 border-t-sky-500 border-r-sky-500/20 border-b-sky-500/20 border-l-sky-500/20 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Compiling Plant Diagnostics...</p>
      </div>
    );
  }

  const mergedMachines = machines.map(getMergedMachineData);
  const activeAlertsCount = mergedMachines.filter(m => m.status === 'critical' || m.status === 'warning').length;
  
  const avgHealth = mergedMachines.length > 0 
    ? mergedMachines.reduce((acc, m) => acc + m.health_score, 0) / mergedMachines.length 
    : 100.0;
    
  const avgOee = mergedMachines.length > 0 
    ? mergedMachines.reduce((acc, m) => acc + m.oee, 0) / mergedMachines.length 
    : 85.0;

  const currentMachineLive = selectedMachine ? mergedMachines.find(m => m.id === selectedMachine.id) : null;

  return (
    <div className="flex-1 min-h-screen bg-industry-950 industrial-grid ml-64 p-8 overflow-y-auto">
      {/* Page Title */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Plant Telemetry Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time Industry 4.0 predictive monitoring and anomaly analysis</p>
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-900 glow-green">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Fleet Health</p>
            <h3 className="mono-display text-2xl font-bold text-white mt-1">{avgHealth.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-sky-950/80 rounded-xl border border-sky-900 glow-blue">
            <TrendingUp className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plant OEE</p>
            <h3 className="mono-display text-2xl font-bold text-white mt-1">{avgOee.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-900 glow-red animate-pulse">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">At-Risk Assets</p>
            <h3 className="mono-display text-2xl font-bold text-white mt-1">{activeAlertsCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <Activity className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Streams</p>
            <h3 className="mono-display text-2xl font-bold text-white mt-1">{mergedMachines.length} / 20</h3>
          </div>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Machine Grid & Telemetry Chart */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Machine Grid */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <h3 className="font-bold text-lg text-white mb-4">Operational Machinery</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[290px] overflow-y-auto pr-2">
              {mergedMachines.map((m) => {
                const isSelected = selectedMachine && selectedMachine.id === m.id;
                
                const cardColor = 
                  m.status === 'critical' ? 'border-rose-900/80 hover:border-rose-700/80 shadow-rose-900/10' :
                  m.status === 'warning' ? 'border-amber-900/80 hover:border-amber-700/80 shadow-amber-900/10' :
                  'border-slate-800/80 hover:border-slate-700/80';
                  
                const badgeColor = 
                  m.status === 'critical' ? 'text-rose-400 bg-rose-950/40' :
                  m.status === 'warning' ? 'text-amber-400 bg-amber-950/40' :
                  'text-emerald-400 bg-emerald-950/40';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMachine(m)}
                    className={`p-4 rounded-xl border bg-slate-900/50 cursor-pointer transition-all duration-200 shadow-md ${cardColor} ${
                      isSelected ? 'ring-1 ring-sky-500 scale-[1.01] bg-slate-900' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-100 truncate max-w-[120px]">{m.name}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${badgeColor}`}>
                        {m.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Health Score:</span>
                        <span className="mono-display text-slate-200 font-bold">{m.health_score.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">OEE Score:</span>
                        <span className="mono-display text-slate-200 font-bold">{m.oee.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800/50 pt-1 mt-1 font-semibold">
                        <span className="text-slate-500">Est. RUL:</span>
                        <span className="mono-display text-sky-400">{m.rul_hours.toFixed(0)}h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line Chart Panel */}
          {selectedMachine && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Sensor Telemetry Trend</h3>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">
                    ACTIVE MONITOR: {selectedMachine.name}
                  </span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={machineHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#0284c7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey={selectedMachine.type === 'pump' ? 'pressure' : 'vibration'} name={selectedMachine.type === 'pump' ? 'Pressure (bar)' : 'Vibration (mm/s)'} stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Digital Twin & Controls */}
        {selectedMachine && (
          <div className="space-y-8">
            {/* Digital Twin Widget */}
            <DigitalTwin 
              machineName={selectedMachine.name} 
              machineType={selectedMachine.type} 
              telemetryData={currentMachineLive} 
            />

            {/* Telemetry Injection Panel */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <h3 className="font-bold text-lg text-white mb-2">Simulated Fault Injection</h3>
              <p className="text-slate-400 text-xs mb-4">Select a failure scenario to stress-test the AI predictive agent</p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => handleInjectAnomaly('bearing_wear')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Bearing Wear
                </button>
                <button
                  onClick={() => handleInjectAnomaly('temperature_spike')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Temp Spike
                </button>
                <button
                  onClick={() => handleInjectAnomaly('pressure_leak')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Pressure Leak
                </button>
                <button
                  onClick={() => handleInjectAnomaly('motor_overload')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Motor Overload
                </button>
                <button
                  onClick={() => handleInjectAnomaly('voltage_fluctuation')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Volt Fluctuat.
                </button>
                <button
                  onClick={() => handleInjectAnomaly('vibration_increase')}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-sky-600 rounded-xl text-[10px] font-bold uppercase text-sky-400 hover:bg-sky-950/20 tracking-wider transition"
                >
                  Vib Increase
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleInjectAnomaly('sensor_failure')}
                  className="flex-1 py-2 bg-slate-900 border border-rose-950 hover:border-rose-600 text-rose-400 hover:bg-rose-950/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Sensor Failure
                </button>
                <button
                  onClick={handleClearAnomaly}
                  className="flex-1 py-2 bg-emerald-950/20 border border-emerald-900 hover:border-emerald-600 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Clear Faults
                </button>
              </div>
            </div>

            {/* Recent Anomaly Alarm Logs */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <h3 className="font-bold text-sm text-slate-300 mb-3 uppercase tracking-wider">Fault Alert Logs</h3>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No anomalies recorded for this session.</p>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className="p-2.5 bg-rose-950/10 border border-rose-950/50 rounded-lg flex items-start space-x-2 text-[11px]">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-rose-300 font-semibold">{a.message}</p>
                        <span className="text-[9px] text-slate-500 font-mono">{a.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
