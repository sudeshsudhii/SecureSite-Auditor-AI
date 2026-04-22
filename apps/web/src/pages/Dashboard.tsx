import React, { useState, useRef, useCallback } from 'react';
import { Globe, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<'quota' | 'generic' | null>(null);
    const [stats, setStats] = useState({ totalScans: 0, highRiskScans: 0, protectedUsers: 0 });
    const navigate = useNavigate();

    // Debounce ref to prevent rapid re-submissions
    const lastScanTime = useRef<number>(0);
    // Cooldown ref for post-error throttle
    const cooldownUntil = useRef<number>(0);

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

    /**
     * Checks if a scan request should be throttled.
     * Prevents double-clicks and rapid re-submissions.
     */
    const isThrottled = useCallback((): boolean => {
        const now = Date.now();

        // Check post-error cooldown (3s after a failed request)
        if (now < cooldownUntil.current) {
            const remaining = Math.ceil((cooldownUntil.current - now) / 1000);
            setError(`Please wait ${remaining}s before scanning again.`);
            return true;
        }

        // Debounce: minimum 2s between scan requests
        if (now - lastScanTime.current < 2000) {
            setError('Please wait a moment before scanning again.');
            return true;
        }

        return false;
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        // Prevent rapid re-submissions
        if (isThrottled()) return;

        setLoading(true);
        setError(null);
        setErrorType(null);
        lastScanTime.current = Date.now();

        try {
            const response = await api.post('/scan', { url });
            const result = response.data;

            // Handle controlled error response (API returns 200 with status: 'error')
            if (result.status === 'error') {
                setError(result.message || 'Scan failed. Please try again.');
                setErrorType('generic');
                // 3s cooldown after error to prevent hammering
                cooldownUntil.current = Date.now() + 3000;
                return;
            }

            // Navigate with the inner data payload
            navigate('/scan/result', { state: { data: result.data || result } });
        } catch (err: any) {
            console.error(err);

            // Detect quota / rate-limit errors specifically
            const is429 = err.response?.status === 429 ||
                err.response?.data?.message?.toLowerCase?.()?.includes('quota') ||
                err.response?.data?.message?.toLowerCase?.()?.includes('rate limit');

            if (is429) {
                setError('API quota exceeded. Please wait a few minutes or configure a different API key in Settings.');
                setErrorType('quota');
                // Longer cooldown for quota errors
                cooldownUntil.current = Date.now() + 10000;
            } else if (err.response?.data?.message) {
                setError(Array.isArray(err.response.data.message) ? err.response.data.message.join(', ') : err.response.data.message);
                setErrorType('generic');
                cooldownUntil.current = Date.now() + 3000;
            } else {
                setError('Backend unavailable. Please try again later.');
                setErrorType('generic');
                cooldownUntil.current = Date.now() + 3000;
            }
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
                    {/* Error display with distinct styling for quota errors */}
                    {error && (
                        <div className={`mt-4 flex items-start gap-2 text-sm p-3 rounded-lg ${
                            errorType === 'quota'
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700'
                        }`}>
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="break-words overflow-wrap-anywhere">{error}</span>
                        </div>
                    )}
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
