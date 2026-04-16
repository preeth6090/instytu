import React, { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import BrandedLogin from './pages/BrandedLogin';
import Dashboard from './pages/admin/Dashboard';

const PrivateRoute = ({ children }: { children: ReactElement }) => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || 'null');
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/:slug/login" element={<BrandedLogin />} />
        {/* All roles use the same Dashboard — nav is filtered by role */}
        <Route path="/admin"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/superadmin" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/teacher"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/student"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/parent"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
