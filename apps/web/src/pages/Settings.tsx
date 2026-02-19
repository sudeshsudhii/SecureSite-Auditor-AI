import React from 'react';
import { Save, Bell, Moon, Shield, Key } from 'lucide-react';

const Settings = () => {
    const [isDark, setIsDark] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    // Initialize state from localStorage
    const [provider, setProvider] = React.useState(() => localStorage.getItem('ai_provider') || 'gemini');
    const [geminiKey, setGeminiKey] = React.useState(() => localStorage.getItem('gemini_key') || '');
    const [openaiKey, setOpenaiKey] = React.useState(() => localStorage.getItem('openai_key') || '');

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        if (newDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleSave = () => {
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('gemini_key', geminiKey);
        localStorage.setItem('openai_key', openaiKey);
        alert('Settings saved successfully!');
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500">Manage your account preferences and scanner configuration.</p>
            </div>

            <div className="grid gap-8">
                {/* General Settings */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-500" />
                            General Configuration
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Strict Mode</h3>
                                <p className="text-sm text-gray-500">Enable stricter privacy rules for scanning.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                                <p className="text-sm text-gray-500">Toggle application theme.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isDark}
                                    onChange={toggleTheme}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </section>

                {/* API Keys */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <Key className="w-5 h-5 mr-2 text-amber-500" />
                            API Integration
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Active AI Provider</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        className="text-blue-600 focus:ring-blue-500"
                                        value="gemini"
                                        checked={provider === 'gemini'}
                                        onChange={(e) => setProvider(e.target.value)}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">Google Gemini</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="provider"
                                        className="text-blue-600 focus:ring-blue-500"
                                        value="openai"
                                        checked={provider === 'openai'}
                                        onChange={(e) => setProvider(e.target.value)}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">OpenAI</span>
                                </label>
                            </div>
                        </div>

                        {/* Gemini Key */}
                        {provider === 'gemini' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gemini API Key</label>
                                <input
                                    type="password"
                                    placeholder="AIzaSy..."
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">Required for AI-powered privacy analysis.</p>
                            </div>
                        )}

                        {/* OpenAI Key */}
                        {provider === 'openai' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenAI API Key</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={openaiKey}
                                    onChange={(e) => setOpenaiKey(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">Alternative provider for analysis.</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
