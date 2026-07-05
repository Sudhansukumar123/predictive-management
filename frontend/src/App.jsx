import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RouteGuard } from './components/RouteGuard';
import { Sidebar } from './components/Sidebar';
import { ChatAssistant } from './components/ChatAssistant';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MLPipelineView } from './pages/MLPipelineView';
import { Scheduler } from './pages/Scheduler';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';

const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen bg-industry-950 overflow-hidden">
      {/* Sidebar Panel Navigation */}
      <Sidebar />
      
      {/* Dynamic Page Container */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative">
        {children}
        
        {/* Floating AI Chat Assistant Copilot */}
        <ChatAssistant />
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Login router */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Application routes */}
            <Route
              path="/"
              element={
                <RouteGuard allowedRoles={['admin', 'engineer', 'operator']}>
                  <AuthenticatedLayout>
                    <Dashboard />
                  </AuthenticatedLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/ml-pipeline"
              element={
                <RouteGuard allowedRoles={['admin', 'engineer']}>
                  <AuthenticatedLayout>
                    <MLPipelineView />
                  </AuthenticatedLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/scheduler"
              element={
                <RouteGuard allowedRoles={['admin', 'engineer', 'operator']}>
                  <AuthenticatedLayout>
                    <Scheduler />
                  </AuthenticatedLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/inventory"
              element={
                <RouteGuard allowedRoles={['admin', 'engineer']}>
                  <AuthenticatedLayout>
                    <Inventory />
                  </AuthenticatedLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RouteGuard allowedRoles={['admin', 'engineer', 'operator']}>
                  <AuthenticatedLayout>
                    <Reports />
                  </AuthenticatedLayout>
                </RouteGuard>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};
