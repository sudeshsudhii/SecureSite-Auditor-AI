import React from 'react';
import { History, Search, Filter } from 'lucide-react';

const ScanHistory = () => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterRisk, setFilterRisk] = React.useState('ALL');
    const [showFilter, setShowFilter] = React.useState(false);

    // Mock Data (expanded)
    const history = [
        { id: 1, url: 'https://google.com', score: 92, risk: 'LOW', date: '2024-02-20' },
        { id: 2, url: 'https://example.com', score: 45, risk: 'HIGH', date: '2024-02-19' },
        { id: 3, url: 'https://test-site.org', score: 78, risk: 'MEDIUM', date: '2024-02-18' },
        { id: 4, url: 'https://unsafe-bank.net', score: 12, risk: 'CRITICAL', date: '2024-02-17' },
        { id: 5, url: 'https://my-blog.io', score: 88, risk: 'LOW', date: '2024-02-16' },
    ];

    const filteredHistory = history.filter(item => {
        const matchesSearch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterRisk === 'ALL' || item.risk === filterRisk;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 animate-fade-in relative" onClick={() => setShowFilter(false)}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan History</h1>
                    <p className="text-gray-500">View and manage your past privacy audits.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search URL..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${filterRisk !== 'ALL' ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                        >
                            <Filter className="w-4 h-4" />
                        </button>

                        {/* Filter Dropdown */}
                        {showFilter && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-10 animate-fade-in">
                                <div className="p-2 space-y-1">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Filter by Risk
                                    </div>
                                    {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((risk) => (
                                        <button
                                            key={risk}
                                            onClick={() => {
                                                setFilterRisk(risk);
                                                setShowFilter(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${filterRisk === risk ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            {risk.charAt(0) + risk.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                        <tr>
                            <th className="px-6 py-4">URL</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Risk Level</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.url}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.score > 80 ? 'bg-green-100 text-green-800' :
                                            item.score > 50 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {item.score}/100
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.risk === 'LOW' ? 'bg-green-100 text-green-800' :
                                            item.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {item.risk}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{item.date}</td>
                                <td className="px-6 py-4">
                                    <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">View Report</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredHistory.length === 0 && (
                    <div className="p-10 text-center text-gray-500">
                        <History className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>No scans found matching your criteria.</p>
                        {(searchTerm || filterRisk !== 'ALL') && (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterRisk('ALL'); }}
                                className="mt-2 text-blue-600 hover:underline text-sm"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScanHistory;
