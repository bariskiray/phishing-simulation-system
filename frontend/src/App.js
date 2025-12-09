import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import ScheduledCampaigns from './pages/ScheduledCampaigns';
import Reports from './pages/Reports';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <Layout>
                  <Campaigns />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CampaignDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduled-campaigns"
            element={
              <ProtectedRoute>
                <Layout>
                  <ScheduledCampaigns />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
