import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        // Get keys from localStorage
        const provider = localStorage.getItem('ai_provider');
        const geminiKey = localStorage.getItem('gemini_key');
        const openaiKey = localStorage.getItem('openai_key');

        if (provider) {
            config.headers['x-ai-provider'] = provider;
        }

        if (provider === 'gemini' && geminiKey) {
            config.headers['x-api-key'] = geminiKey;
        } else if (provider === 'openai' && openaiKey) {
            config.headers['x-api-key'] = openaiKey;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
