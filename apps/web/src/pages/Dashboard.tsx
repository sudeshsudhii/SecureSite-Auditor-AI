import React, { useState } from 'react';
import { Globe, ShieldAlert, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ totalScans: 0, highRiskScans: 0, protectedUsers: 0 });
    const navigate = useNavigate();

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/scan/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        fetchStats();
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/scan', { url });
            navigate('/scan/result', { state: { data: response.data } });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to scan website. Please make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Search Section */}
            <section className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Audit Any Website for Privacy Risks</h2>
                <p className="text-gray-500 mb-8">Enter a URL to detect trackers, cookies, and compliance gaps.</p>

                <form onSubmit={handleScan} className="max-w-2xl mx-auto relative ">
                    <div className="relative flex items-center">
                        <Globe className="absolute left-4 w-5 h-5 text-gray-400 z-10" />
                        <input
                            type="text"
                            placeholder="https://example.com"
                            className="w-full pl-12 pr-32 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-gray-900 dark:text-white"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="absolute right-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                        >
                            {loading ? 'Scanning...' : 'Scan Now'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
                </form>
            </section>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Recent Risks</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.highRiskScans}</p>
                    <p className="text-sm text-gray-500">High severity issues found</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Total Scans</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalScans}</p>
                    <p className="text-sm text-gray-500">Complete audits performed</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center space-x-3 mb-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Unique Sites</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.protectedUsers}</p>
                    <p className="text-sm text-gray-500">Distinct domains audited</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
