import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CreateSurvey from './pages/CreateSurvey';
import SurveyList from './pages/SurveyList';
import SurveyResponse from './pages/SurveyResponse';
import Navigation from './components/Navigation';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-survey"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateSurvey />
                </ProtectedRoute>
              }
            />
            <Route path="/surveys" element={<SurveyList />} />
            <Route path="/surveys/:id" element={<SurveyResponse />} />
            <Route path="/" element={<Navigate to="/surveys" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;