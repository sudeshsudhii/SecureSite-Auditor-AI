import { Outlet, NavLink, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, History, Settings } from 'lucide-react';

const DashboardLayout = () => {
    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
            ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
                {/* Logo — clicking navigates to home */}
                <Link
                    to="/"
                    className="p-6 flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                    <Shield className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white">PrivacyCheck</span>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-2">
                    <NavLink to="/" end className={navClass}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </NavLink>
                    <NavLink to="/history" className={navClass}>
                        <History className="w-5 h-5" />
                        <span className="font-medium">Scan History</span>
                    </NavLink>
                    <NavLink to="/settings" className={navClass}>
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                </nav>

                {/* Removed Auth Info / Sign Out */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-400">Public Scanner</p>
                </div>
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
