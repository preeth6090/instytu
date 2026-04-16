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
import SchoolSettingsSection from './sections/SchoolSettingsSection';
import CampusSection from './sections/CampusSection';
import RolesSection from './sections/RolesSection';
import UsersSection from './sections/UsersSection';
import FeeBundlesSection from './sections/FeeBundlesSection';
import FeeCollectionSection from './sections/FeeCollectionSection';
import ReportsSection from './sections/ReportsSection';
import WidgetDashboard from './sections/WidgetDashboard';

const NAV = [
  // ── Core ──────────────────────────────────────────────────
  { id: 'overview',        label: 'Overview',        icon: '📊', roles: ['admin','superadmin','teacher','student','parent','staff'] },
  { id: 'widgets',         label: 'My Dashboard',    icon: '🧩', roles: ['admin','superadmin','staff'] },
  // ── Academics ─────────────────────────────────────────────
  { id: 'classes',         label: 'Classes',         icon: '🏫', roles: ['admin','superadmin'] },
  { id: 'students',        label: 'Students',        icon: '🎒', roles: ['admin','superadmin','teacher'] },
  { id: 'teachers',        label: 'Teachers',        icon: '👩‍🏫', roles: ['admin','superadmin'] },
  { id: 'attendance',      label: 'Attendance',      icon: '📅', roles: ['admin','superadmin','teacher','student','parent'] },
  { id: 'grades',          label: 'Grades',          icon: '📝', roles: ['admin','superadmin','teacher','student','parent'] },
  { id: 'homework',        label: 'Homework',        icon: '📚', roles: ['admin','superadmin','teacher','student','parent'] },
  { id: 'timetable',       label: 'Timetable',       icon: '🗓️', roles: ['admin','superadmin','teacher','student','parent'] },
  { id: 'ptm',             label: 'PTM',             icon: '🤝', roles: ['admin','superadmin','teacher','parent'] },
  // ── Communication ─────────────────────────────────────────
  { id: 'notices',         label: 'Notices',         icon: '📢', roles: ['admin','superadmin','teacher','student','parent','staff'] },
  { id: 'leaves',          label: 'Leaves',          icon: '🏖️', roles: ['admin','superadmin','teacher','student','parent','staff'] },
  // ── Finance ───────────────────────────────────────────────
  { id: 'fee-collection',  label: 'Fee Collection',  icon: '💳', roles: ['admin','superadmin','staff'] },
  { id: 'fee-bundles',     label: 'Fee Bundles',     icon: '📦', roles: ['admin','superadmin'] },
  { id: 'fees',            label: 'My Fees',         icon: '💰', roles: ['parent','student'] },
  { id: 'reports',         label: 'Reports',         icon: '📈', roles: ['admin','superadmin','staff'] },
  // ── Admin ─────────────────────────────────────────────────
  { id: 'campuses',        label: 'Campuses',        icon: '🏢', roles: ['admin','superadmin'] },
  { id: 'users',           label: 'Users',           icon: '👤', roles: ['admin','superadmin'] },
  { id: 'roles',           label: 'Roles & Permissions', icon: '🔐', roles: ['admin','superadmin'] },
  { id: 'settings',        label: 'School Settings', icon: '⚙️', roles: ['admin','superadmin'] },
];

// Group labels shown above nav sections
const NAV_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Core', ids: ['overview', 'widgets'] },
  { label: 'Academics', ids: ['classes', 'students', 'teachers', 'attendance', 'grades', 'homework', 'timetable', 'ptm'] },
  { label: 'Communication', ids: ['notices', 'leaves'] },
  { label: 'Finance', ids: ['fee-collection', 'fee-bundles', 'fees', 'reports'] },
  { label: 'Administration', ids: ['campuses', 'users', 'roles', 'settings'] },
];

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');
  const role: string = user.role || 'student';
  const visibleNav = NAV.filter(item => item.roles.includes(role));
  const [active, setActive] = useState(visibleNav[0]?.id || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const Section = () => {
    switch (active) {
      case 'overview':       return <Overview role={role} />;
      case 'widgets':        return <WidgetDashboard role={role} />;
      case 'classes':        return <ClassesSection role={role} />;
      case 'students':       return <StudentsSection role={role} />;
      case 'teachers':       return <TeachersSection role={role} />;
      case 'attendance':     return <AttendanceSection role={role} />;
      case 'grades':         return <GradesSection role={role} />;
      case 'homework':       return <HomeworkSection role={role} />;
      case 'notices':        return <NoticesSection role={role} />;
      case 'fees':           return <FeesSection role={role} />;
      case 'leaves':         return <LeavesSection role={role} />;
      case 'timetable':      return <TimetableSection role={role} />;
      case 'ptm':            return <PTMSection role={role} />;
      case 'settings':       return <SchoolSettingsSection role={role} />;
      case 'campuses':       return <CampusSection role={role} />;
      case 'roles':          return <RolesSection role={role} />;
      case 'users':          return <UsersSection role={role} />;
      case 'fee-bundles':    return <FeeBundlesSection role={role} />;
      case 'fee-collection': return <FeeCollectionSection role={role} />;
      case 'reports':        return <ReportsSection role={role} />;
      default:               return <Overview role={role} />;
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin', superadmin: 'Super Admin', teacher: 'Teacher',
    student: 'Student', parent: 'Parent', staff: 'Staff',
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {user.institution?.logo ? (
              <img src={user.institution.logo} alt="logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">I</div>
            )}
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{user.institution?.name || 'Instytu'}</div>
              <div className="text-xs text-gray-400 capitalize">{user.institution?.type || 'Portal'}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_GROUPS.map(group => {
            const groupItems = visibleNav.filter(item => group.ids.includes(item.id));
            if (!groupItems.length) return null;
            return (
              <div key={group.label} className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{group.label}</p>
                {groupItems.map(item => (
                  <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                      active === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-400">{roleLabel[role] || role}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full text-xs text-red-500 hover:text-red-700 font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">
            {visibleNav.find(n => n.id === active)?.icon}{' '}
            {visibleNav.find(n => n.id === active)?.label}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Section />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
