import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

/**
 * Centralized API client with interceptors, error normalization,
 * and retry logic. All backend endpoints are abstracted behind
 * named exports so swapping routes later requires zero page-level changes.
 */

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach auth token if available ────────────
api.interceptors.request.use((config) => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
        const user = JSON.parse(stored);
        if (user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
    }
    return config;
});

// ─── Response Interceptor: Normalize errors ─────────────────────────
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const normalized = {
            status: error.response?.status || 0,
            message: error.response?.data?.detail
                || error.response?.data?.message
                || error.message
                || 'An unexpected error occurred',
            raw: error,
        };

        // Auto-logout on 401
        if (normalized.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.USER);
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(normalized);
    }
);

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════

export const authAPI = {
    googleLogin: (token) =>
        api.post('/user/google-login', {}, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.data),

    emailLogin: (email, password) =>
        api.post(`/user/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
            .then(r => r.data),

    emailSignup: (email, password, level) =>
        api.post(`/user/signup?email=${encodeURIComponent(email)}&pat=&password=${encodeURIComponent(password)}&level=${encodeURIComponent(level)}`)
            .then(r => r.data),

    updateExperience: (email, level) =>
        api.put(`/user/${encodeURIComponent(email)}/experience`, { experience_lvl: level })
            .then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  PAT
// ═══════════════════════════════════════════════════════════════════

export const patAPI = {
    validate: (email, pat) =>
        api.post('/user/validate-pat', { email, pat }).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export const dashboardAPI = {
    get: (email) =>
        api.get(`/user/dashboard?email=${encodeURIComponent(email)}`).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  CONTRIBUTION FLOW
// ═══════════════════════════════════════════════════════════════════

export const contributionAPI = {
    start: (email, language = null, searchQuery = null) => {
        const params = new URLSearchParams({ email });
        if (language) params.append('language', language);
        if (searchQuery) params.append('search_query', searchQuery);
        return api.get(`/contribution/start?${params}`).then(r => r.data);
    },
};

// ═══════════════════════════════════════════════════════════════════
//  REPOS & ISSUES
// ═══════════════════════════════════════════════════════════════════

export const repoAPI = {
    getOrgRepos: (orgName, email, language = null) => {
        const params = new URLSearchParams({ email });
        if (language) params.append('language', language);
        return api.get(`/repos/${orgName}?${params}`).then(r => r.data);
    },

    getRepoIssues: (orgName, repoName, email) =>
        api.get(`/repos/${orgName}/${repoName}/issues?email=${encodeURIComponent(email)}`)
            .then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  ASK NOVA (Amazon Bedrock)
// ═══════════════════════════════════════════════════════════════════

export const novaAPI = {
    ask: (repoName, issuesContext, messages) =>
        api.post('/nova/ask', {
            repo_name: repoName,
            issues_context: issuesContext,
            messages,
        }).then(r => r.data),

    summarize: (repoName, issueNumber, issueTitle, issueBody, comments = []) =>
        api.post('/nova/summarize', {
            repo_name: repoName,
            issue_number: issueNumber,
            issue_title: issueTitle,
            issue_body: issueBody || '',
            comments,
        }).then(r => r.data),
};

export default api;
