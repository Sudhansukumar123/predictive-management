import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Calendar as CalendarIcon, User, Clock, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

export const Scheduler = () => {
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMachineId, setNewMachineId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newEngineer, setNewEngineer] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDowntime, setNewDowntime] = useState(2.0);
  
  // Update task state
  const [editingTask, setEditingTask] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const allTasks = await api.getTasks();
      setTasks(allTasks);
      
      const allMachines = await api.getMachines();
      setMachines(allMachines);
      if (allMachines.length > 0) {
        setNewMachineId(allMachines[0].id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to fetch maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        machine_id: parseInt(newMachineId),
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        status: 'scheduled',
        scheduled_date: new Date(newDate).toISOString(),
        assigned_engineer: newEngineer,
        estimated_downtime_hours: parseFloat(newDowntime)
      };
      await api.createTask(payload);
      setSuccess("Maintenance task successfully scheduled.");
      setShowAddForm(false);
      
      // Clear form
      setNewTitle('');
      setNewDesc('');
      setNewEngineer('');
      setNewDate('');
      
      loadData();
    } catch (err) {
      setError(err.message || "Failed to create maintenance task.");
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        status: updateStatus,
        resolution_notes: updateNotes
      };
      await api.updateTask(editingTask.id, payload);
      setSuccess("Maintenance ticket status updated.");
      setEditingTask(null);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to update task.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-industry-950 flex flex-col items-center justify-center space-y-4 ml-64 p-8">
        <div className="h-10 w-10 border-4 border-t-sky-500 border-r-sky-500/20 border-b-sky-500/20 border-l-sky-500/20 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Opening Maintenance Logbook...</p>
      </div>
    );
  }

  // Priorities formatting helper
  const getPriorityStyle = (p) => {
    if (p === 'critical') return 'border-rose-900 bg-rose-950/20 text-rose-400';
    if (p === 'high') return 'border-amber-900 bg-amber-950/20 text-amber-400';
    return 'border-slate-800 bg-slate-900/50 text-slate-300';
  };

  return (
    <div className="flex-1 min-h-screen bg-industry-950 industrial-grid ml-64 p-8 overflow-y-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Maintenance Scheduler</h2>
          <p className="text-slate-400 text-sm mt-1">Review active work tickets, delegate tasks to engineers, and track resolutions</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white uppercase tracking-wider glow-blue transition"
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Schedule Work Order</span>
        </button>
      </header>

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Scheduler Dashboard: Left Column: Tasks List. Right Column: Calendar grid simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Work orders list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-lg text-white mb-2">Active Work Orders</h3>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No scheduled maintenance tasks.</p>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border bg-slate-900/40 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 ${getPriorityStyle(t.priority)}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="mono-display text-xs text-sky-400 font-bold uppercase tracking-wide">
                        {t.machine?.name || `Machine ID ${t.machine_id}`}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        t.status === 'completed' ? 'border-emerald-900 text-emerald-400 bg-emerald-950/15' :
                        t.status === 'in_progress' ? 'border-sky-900 text-sky-400 bg-sky-950/15 animate-pulse' :
                        'border-slate-800 text-slate-400 bg-slate-900/50'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-white">{t.title}</h4>
                    <p className="text-slate-400 text-xs max-w-md">{t.description}</p>
                    
                    <div className="flex items-center space-x-4 text-slate-500 text-[10px] uppercase font-bold pt-2">
                      <span className="flex items-center space-x-1">
                        <User className="h-3.5 w-3.5 text-sky-500" />
                        <span>{t.assigned_engineer || 'Unassigned'}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-sky-500" />
                        <span>{t.estimated_downtime_hours}h Downtime</span>
                      </span>
                      <span>Date: {new Date(t.scheduled_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {t.status !== 'completed' && (
                    <button
                      onClick={() => {
                        setEditingTask(t);
                        setUpdateStatus(t.status);
                        setUpdateNotes(t.resolution_notes || '');
                      }}
                      className="px-4 py-2 bg-slate-800 border border-slate-700 hover:border-sky-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Update Status
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visual monthly scheduler */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-4">Calendar Map</h3>
          
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase mb-2">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1 bg-slate-950/40 p-2 rounded-xl border border-slate-900">
            {/* Blank offset days */}
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-9"></div>
            ))}
            
            {/* Calendar Days */}
            {Array.from({ length: 30 }).map((_, idx) => {
              const day = idx + 1;
              // Check if any tasks fall on this day
              // We distribute them synthetically based on task IDs to represent different calendar days
              const hasTask = tasks.some(t => {
                const dateNum = new Date(t.scheduled_date).getDate();
                return dateNum === day;
              });
              
              const dayTask = tasks.find(t => new Date(t.scheduled_date).getDate() === day);

              const borderCol = 
                hasTask && dayTask?.priority === 'critical' ? 'border-rose-700/80 bg-rose-950/30' :
                hasTask && dayTask?.priority === 'high' ? 'border-amber-700/80 bg-amber-950/30' :
                hasTask ? 'border-sky-700/80 bg-sky-950/30' : 'border-slate-800 bg-slate-900/20';

              return (
                <div
                  key={`day-${day}`}
                  className={`h-9 flex flex-col items-center justify-center rounded-lg border text-xs font-mono font-bold text-slate-400 relative ${borderCol}`}
                >
                  <span>{day}</span>
                  {hasTask && (
                    <span className={`h-1.5 w-1.5 rounded-full absolute bottom-1 ${
                      dayTask.priority === 'critical' ? 'bg-rose-500' :
                      dayTask.priority === 'high' ? 'bg-amber-500' : 'bg-sky-500'
                    }`}></span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span>Critical Work Order</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>High Priority Work Order</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
              <span>Standard Maintenance</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Add Task Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-800 glow-blue overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-white">Create Work Ticket</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white font-bold text-sm uppercase">Close</button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Target Asset</label>
                <select
                  value={newMachineId}
                  onChange={(e) => setNewMachineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Work Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clean Spindle Bearing"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-650 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition"
                  >
                    <option value="critical">Critical (Immediate)</option>
                    <option value="high">High (Within 24h)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Routine)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Detailed Task Instructions</label>
                <textarea
                  placeholder="Steps to complete the check..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-650 text-sm outline-none transition"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Technician Engineer</label>
                  <input
                    type="text"
                    required
                    placeholder="Elena Rostova"
                    value={newEngineer}
                    onChange={(e) => setNewEngineer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-650 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Est. Downtime (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newDowntime}
                    onChange={(e) => setNewDowntime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Scheduled Execution Date</label>
                <input
                  type="datetime-local"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider glow-blue transition"
              >
                Confirm work order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Task Status */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 glow-blue overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Update Ticket #{editingTask.id}</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-white font-bold text-sm uppercase">Close</button>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Work Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed & Restored</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Resolution Log Notes</label>
                <textarea
                  required
                  placeholder="Detail repairs completed, oil replenished, or parts swapped..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-650 text-sm outline-none transition"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider glow-blue transition"
              >
                Log Ticket Update
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
