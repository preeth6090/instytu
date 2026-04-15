import React, { useState } from 'react';
import Overview from './sections/Overview';
import ClassesSection from './sections/ClassesSection';
import StudentsSection from './sections/StudentsSection';
import TeachersSection from './sections/TeachersSection';
import AttendanceSection from './sections/AttendanceSection';
import GradesSection from './sections/GradesSection';
import HomeworkSection from './sections/HomeworkSection';
import NoticesSection from './sections/NoticesSection';
import FeesSection from './sections/FeesSection';
import LeavesSection from './sections/LeavesSection';
import TimetableSection from './sections/TimetableSection';
import PTMSection from './sections/PTMSection';

const NAV = [
  { id: 'overview',    label: 'Overview',    icon: '📊' },
  { id: 'classes',     label: 'Classes',     icon: '🏫' },
  { id: 'students',    label: 'Students',    icon: '🎒' },
  { id: 'teachers',    label: 'Teachers',    icon: '👩‍🏫' },
  { id: 'attendance',  label: 'Attendance',  icon: '📅' },
  { id: 'grades',      label: 'Grades',      icon: '📝' },
  { id: 'homework',    label: 'Homework',    icon: '📚' },
  { id: 'notices',     label: 'Notices',     icon: '📢' },
  { id: 'fees',        label: 'Fees',        icon: '💰' },
  { id: 'leaves',      label: 'Leaves',      icon: '🏖️' },
  { id: 'timetable',   label: 'Timetable',   icon: '🗓️' },
  { id: 'ptm',         label: 'PTM',         icon: '🤝' },
];

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const Section = () => {
    switch (active) {
      case 'overview':   return <Overview />;
      case 'classes':    return <ClassesSection />;
      case 'students':   return <StudentsSection />;
      case 'teachers':   return <TeachersSection />;
      case 'attendance': return <AttendanceSection />;
      case 'grades':     return <GradesSection />;
      case 'homework':   return <HomeworkSection />;
      case 'notices':    return <NoticesSection />;
      case 'fees':       return <FeesSection />;
      case 'leaves':     return <LeavesSection />;
      case 'timetable':  return <TimetableSection />;
      case 'ptm':        return <PTMSection />;
      default:           return <Overview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">I</div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{user.institution?.name || 'Instytu'}</div>
              <div className="text-xs text-gray-400 capitalize">{user.institution?.type || 'Admin'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setActive(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                active === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-400 capitalize">{user.role}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full text-xs text-red-500 hover:text-red-700 font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">
              {NAV.find(n => n.id === active)?.icon} {NAV.find(n => n.id === active)?.label}
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Section />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
