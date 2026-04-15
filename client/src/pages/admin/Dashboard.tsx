import React from 'react';

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');

  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {user.name}! 👋</h1>
        <p className="text-gray-500 mb-6">Admin Dashboard — coming soon</p>
        <button onClick={logout} className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">
          Logout
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;