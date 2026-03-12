/**
 * Application-wide constants. Single source of truth for all
 * magic strings, enums, and configuration values used across the app.
 */

// ─── Route Paths ────────────────────────────────────────────────────
export const ROUTES = {
    LOGIN: '/login',
    PAT: '/pat',
    LEVEL_SELECT: '/level',
    DASHBOARD: '/dashboard',
    CONTRIBUTE: '/contribute',
    ISSUE: '/issue/:org/:repo/:issueNumber',
    DRAFT_PR: '/draft-pr/:org/:repo/:issueNumber',
};

export const buildIssuePath = (org, repo, num) => `/issue/${org}/${repo}/${num}`;
export const buildDraftPRPath = (org, repo, num) => `/draft-pr/${org}/${repo}/${num}`;

// ─── Contribution Statuses ──────────────────────────────────────────
export const STATUS = {
    ACCEPTED: 'Accepted',
    WAITING: 'Waiting',
    REJECTED: 'Rejected',
    WORKING: 'Currently Working',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    IN_REVIEW: 'In Review',
    UNKNOWN: 'Unknown',
};

export const STATUS_COLORS = {
    [STATUS.ACCEPTED]: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80', border: '#4ade80' },
    [STATUS.WAITING]: { bg: 'rgba(250,204,21,0.15)', text: '#facc15', border: '#facc15' },
    [STATUS.REJECTED]: { bg: 'rgba(248,113,113,0.15)', text: '#f87171', border: '#f87171' },
    [STATUS.WORKING]: { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8', border: '#38bdf8' },
    [STATUS.IN_PROGRESS]: { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8', border: '#38bdf8' },
    [STATUS.SUBMITTED]: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7', border: '#a855f7' },
    [STATUS.IN_REVIEW]: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7', border: '#a855f7' },
    [STATUS.UNKNOWN]: { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', border: '#64748b' },
};

// ─── Experience Levels ──────────────────────────────────────────────
export const EXPERIENCE_LEVELS = [
    { value: 'Beginner', label: 'Beginner', description: 'New to open source' },
    { value: 'Intermediate', label: 'Intermediate', description: 'A few contributions' },
    { value: 'Expert', label: 'Expert', description: 'Experienced contributor' },
];

// ─── Supported Languages ────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'HTML/CSS', 'Ruby', 'Swift', 'Kotlin',
];

// ─── Contribution Flow Steps ────────────────────────────────────────
export const FLOW_STEPS = {
    SELECT_LANGUAGE: 'SELECT_LANGUAGE',
    SELECT_ORG: 'SELECT_ORG',
    BROWSE: 'BROWSE',
};

// ─── Local Storage Keys ─────────────────────────────────────────────
export const STORAGE_KEYS = {
    USER: 'vectr_user',
    THEME: 'vectr_theme',
};

// ─── App Metadata ───────────────────────────────────────────────────
export const APP = {
    NAME: 'Vectr',
    TAGLINE: 'Open Source Contribution Helper',
    VERSION: '1.0.0',
    POWERED_BY: 'Powered by Amazon Nova',
};
