import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, FileText, ChevronLeft, Lock, Radar, ShieldOff, AlertTriangle, ChevronDown, ChevronUp, Code, Cpu } from 'lucide-react';

const ScanResults = () => {
    const location = useLocation();
    const data = location.state?.data;

    // State for collapsible raw JSON section
    const [showRawJson, setShowRawJson] = useState(false);

    if (!data) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-700 dark:text-white">No Result Data</h2>
                <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Go back to Dashboard</Link>
            </div>
        );
    }

    const { url, cookies, scripts, detectedTrackers, securityHeaders, aiAnalysis } = data;
    const score = aiAnalysis?.score || 0;

    // Detect AI provider and fallback state
    const aiProvider: string = aiAnalysis?._provider || 'gemini';
    const isRuleBased = aiProvider === 'rule-based';
    const isQuotaExceeded = aiAnalysis?._quotaExceeded || aiAnalysis?._rateLimited;
    const isFallback = aiAnalysis?._fallback || isRuleBased;
    const isUnavailable = aiAnalysis?.riskLevel === 'UNAVAILABLE' || aiAnalysis?.riskLevel === 'ERROR';

    const providerLabel: Record<string, { name: string; color: string }> = {
        gemini: { name: 'Google Gemini', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        openai: { name: 'OpenAI GPT-4o-mini', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        claude: { name: 'Anthropic Claude', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        'rule-based': { name: 'Rule-Based Engine', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    };
    const providerInfo = providerLabel[aiProvider] || providerLabel['gemini'];

    return (
        <div className="space-y-6 animate-fade-in">
            <Link to="/" className="flex items-center text-gray-500 hover:text-blue-600 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
            </Link>

            {/* Quota / Fallback Warning Banner */}
            {/* AI Provider Badge — always shown */}
            {aiAnalysis && !isUnavailable && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${providerInfo.color}`}>
                    <Cpu className="w-3.5 h-3.5" />
                    Analyzed by {providerInfo.name}
                    {aiAnalysis?._cached && <span className="ml-1 opacity-70">(cached)</span>}
                </div>
            )}

            {/* Fallback / quota warning banner */}
            {(isQuotaExceeded || isFallback || isUnavailable) && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 break-words">
                        <p className="font-semibold text-sm">
                            {isRuleBased
                                ? 'Using Backup Engine — Rule-Based Analysis'
                                : isQuotaExceeded
                                    ? 'AI Quota Exceeded — Using Backup Engine'
                                    : 'AI Analysis Error'}
                        </p>
                        <p className="text-sm mt-1 break-words overflow-wrap-anywhere">
                            {isRuleBased
                                ? 'All AI providers were temporarily unavailable. Scores are generated from raw scan data (cookies, scripts, trackers) using built-in rules. Re-run the scan shortly for full AI analysis.'
                                : isQuotaExceeded
                                    ? 'API quota was exceeded. The system automatically tried backup providers. Try again in a few minutes or configure additional API keys in Settings.'
                                    : 'An error occurred during AI analysis. Raw scan data is still available below.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Report Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 overflow-hidden">
                {/* Header with Score */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-8">
                    <div className="min-w-0 max-w-full">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Audit Report</h1>
                        <p className="text-gray-500 break-all overflow-wrap-anywhere">{url}</p>
                    </div>
                    <div className={`mt-4 md:mt-0 px-6 py-3 rounded-full flex items-center space-x-2 flex-shrink-0 ${score > 80 ? 'bg-green-100 text-green-700' :
                        score > 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        <ShieldCheck className="w-6 h-6" />
                        <span className="text-2xl font-bold">{score}/100</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Summary */}
                    <div className="space-y-6 min-w-0">
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <ShieldAlert className="w-5 h-5 mr-2 text-blue-500" />
                                AI Analysis
                            </h3>
                            {/* Scrollable container with word wrapping for long AI text */}
                            <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg text-gray-700 dark:text-gray-300 leading-relaxed max-h-96 overflow-y-auto break-words overflow-wrap-anywhere scrollbar-thin">
                                {aiAnalysis?.analysis || "No analysis available."}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-3">Risks Identified</h3>
                            {aiAnalysis?.risks?.length > 0 ? (
                                <ul className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
                                    {aiAnalysis.risks.map((risk: any, idx: number) => (
                                        <li key={idx} className="flex items-start p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-700 dark:text-red-400">
                                            <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0 break-words overflow-wrap-anywhere">
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

                        {/* Recommendations */}
                        {aiAnalysis?.recommendations?.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
                                <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                                    {aiAnalysis.recommendations.map((rec: string, idx: number) => (
                                        <li key={idx} className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
                                            <span className="mr-2 flex-shrink-0">💡</span>
                                            <span className="break-words overflow-wrap-anywhere min-w-0">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Technical Details */}
                    <div className="space-y-6 min-w-0">
                        {/* Detected Trackers */}
                        {detectedTrackers && detectedTrackers.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <Radar className="w-5 h-5 mr-2 text-red-500" />
                                    Trackers Detected ({detectedTrackers.length})
                                </h3>
                                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                                    {detectedTrackers.map((t: any, i: number) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1">
                                            <span className="font-medium text-red-700 dark:text-red-400">{t.name}</span>
                                            {/* break-all prevents long URLs from overflowing */}
                                            <span className="text-gray-400 text-xs break-all overflow-wrap-anywhere">{t.source}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Security Headers */}
                        {securityHeaders && (
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <ShieldOff className="w-5 h-5 mr-2 text-orange-500" />
                                    Security Headers
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Wrap table in scrollable container for long header names */}
                                    <div className="overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-sm text-left">
                                            <tbody>
                                                {Object.entries(securityHeaders).map(([header, value]: [string, any]) => (
                                                    <tr key={header} className="border-t border-gray-200 dark:border-gray-700">
                                                        <td className="px-4 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 break-all overflow-wrap-anywhere">{header}</td>
                                                        <td className="px-4 py-2">
                                                            {value
                                                                ? <span className="text-green-600 text-xs">✅ Set</span>
                                                                : <span className="text-red-500 text-xs">❌ Missing</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Cookies */}
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <Lock className="w-5 h-5 mr-2 text-purple-500" />
                                Cookies Found ({cookies?.length || 0})
                            </h3>
                            {cookies?.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 scrollbar-thin">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">Flags</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cookies?.map((c: any, i: number) => (
                                                    <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                                        {/* break-all prevents long cookie names from overflowing */}
                                                        <td className="px-4 py-2 font-medium break-all overflow-wrap-anywhere max-w-[200px]">{c.name}</td>
                                                        <td className="px-4 py-2 text-gray-500 text-xs break-all overflow-wrap-anywhere max-w-[250px]">{c.flags?.join('; ') || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic text-sm">No cookies detected in HTTP response.</p>
                            )}
                        </section>

                        {/* External Scripts */}
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-amber-500" />
                                External Scripts ({scripts?.length || 0})
                            </h3>
                            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-mono scrollbar-thin">
                                <ul className="space-y-1">
                                    {scripts?.map((s: string, i: number) => (
                                        <li key={i} className="break-all overflow-wrap-anywhere">{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Collapsible Raw JSON Section */}
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <button
                        onClick={() => setShowRawJson(!showRawJson)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <Code className="w-4 h-4" />
                        Raw JSON Data
                        {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showRawJson && (
                        <div className="mt-4 animate-fade-in">
                            {/* Scrollable, word-wrapped pre block for large JSON output */}
                            <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 text-xs font-mono p-4 rounded-lg max-h-96 overflow-auto whitespace-pre-wrap break-all scrollbar-thin border border-gray-700">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScanResults;
