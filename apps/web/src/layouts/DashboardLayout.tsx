import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, History, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

                {/* User info + Sign Out */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {user && (
                        <div className="flex items-center gap-3 px-2 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
                    {/* Mobile sign-out */}
                    <button
                        onClick={handleLogout}
                        className="md:hidden flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </header>
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
