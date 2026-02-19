import { Outlet, NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, History, Settings } from 'lucide-react';

const DashboardLayout = () => {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
                <div className="p-6 flex items-center space-x-2">
                    <Shield className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white">PrivacyCheck</span>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    <NavLink to="/" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </NavLink>
                    <NavLink to="/history" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <History className="w-5 h-5" />
                        <span className="font-medium">Scan History</span>
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>

                </header>
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
