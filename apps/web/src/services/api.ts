import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    // 8s for auth requests; scan requests use per-request overrides
    timeout: 8000,
});

// ── Client-side request throttle ──────────────────────────────────
// Tracks the timestamp of the last scan request to enforce minimum spacing
let lastScanRequestTime = 0;
const MIN_SCAN_INTERVAL_MS = 2000; // 2 seconds between scan requests

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

        // Client-side throttle: reject scan requests that are too frequent
        if (config.url?.includes('/scan') && config.method === 'post') {
            const now = Date.now();
            if (now - lastScanRequestTime < MIN_SCAN_INTERVAL_MS) {
                return Promise.reject(
                    new axios.Cancel('Request throttled — please wait before scanning again.')
                );
            }
            lastScanRequestTime = now;
            // Scans can take up to 90s — override the global 8s timeout
            config.timeout = 90000;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ── Response interceptor for global error handling ────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 429 Too Many Requests globally with a user-friendly message
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const waitMsg = retryAfter
                ? `Please wait ${retryAfter} seconds.`
                : 'Please wait a few minutes.';

            error.response.data = {
                ...error.response.data,
                message: `Rate limit reached. ${waitMsg} You can also try a different API key in Settings.`,
                _rateLimited: true,
            };
        }

        // Normalise error message to always be a string — backends return different shapes:
        // { message: '...' } or { message: ['...', '...'] } or { error: '...' }
        if (error.response?.data) {
            const raw = error.response.data.message ?? error.response.data.error;
            if (Array.isArray(raw)) {
                error.response.data.message = raw.join(' ');
            } else if (typeof raw === 'string') {
                error.response.data.message = raw;
            } else {
                // Final fallback — prevents [object Object] being shown to users
                error.response.data.message = 'Unexpected error occurred. Please try again.';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
