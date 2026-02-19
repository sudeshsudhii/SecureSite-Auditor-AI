import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, FileText, ChevronLeft, Lock } from 'lucide-react';

const ScanResults = () => {
    const location = useLocation();
    const data = location.state?.data;

    if (!data) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-700 dark:text-white">No Result Data</h2>
                <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Go back to Dashboard</Link>
            </div>
        );
    }

    const { url, cookies, scripts, aiAnalysis } = data;
    const score = aiAnalysis?.score || 0;
    const riskLevel = aiAnalysis?.riskLevel || 'UNKNOWN';

    return (
        <div className="space-y-6 animate-fade-in">
            <Link to="/" className="flex items-center text-gray-500 hover:text-blue-600 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Audit Report</h1>
                        <p className="text-gray-500">{url}</p>
                    </div>
                    <div className={`mt-4 md:mt-0 px-6 py-3 rounded-full flex items-center space-x-2 ${score > 80 ? 'bg-green-100 text-green-700' :
                            score > 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                        }`}>
                        <ShieldCheck className="w-6 h-6" />
                        <span className="text-2xl font-bold">{score}/100</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Summary */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <ShieldAlert className="w-5 h-5 mr-2 text-blue-500" />
                                AI Analysis
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                                {aiAnalysis?.analysis || "No analysis available."}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-3">Risks Identified</h3>
                            {aiAnalysis?.risks?.length > 0 ? (
                                <ul className="space-y-3">
                                    {aiAnalysis.risks.map((risk: any, idx: number) => (
                                        <li key={idx} className="flex items-start p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-700 dark:text-red-400">
                                            <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-bold block text-sm uppercase">{risk.severity}</span>
                                                {risk.description}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No specific risks detected.</p>
                            )}
                        </section>
                    </div>

                    {/* Technical Details */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <Lock className="w-5 h-5 mr-2 text-purple-500" />
                                Cookies Found ({cookies?.length || 0})
                            </h3>
                            <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2">Name</th>
                                            <th className="px-4 py-2">Domain</th>
                                            <th className="px-4 py-2">Secure</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cookies?.map((c: any, i: number) => (
                                            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                                <td className="px-4 py-2 font-medium truncate max-w-[120px]">{c.name}</td>
                                                <td className="px-4 py-2 text-gray-500 truncate max-w-[150px]">{c.domain}</td>
                                                <td className="px-4 py-2">{c.secure ? '✅' : '❌'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-amber-500" />
                                External Scripts ({scripts?.length || 0})
                            </h3>
                            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-mono">
                                <ul className="space-y-1">
                                    {scripts?.map((s: string, i: number) => (
                                        <li key={i} className="truncate">{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanResults;
