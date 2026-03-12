import { STATUS_COLORS, STATUS } from '../constants';

/**
 * Colored status pill for contribution/PR status display.
 */
export default function StatusBadge({ status }) {
    const key = Object.keys(STATUS_COLORS).find(
        k => k.toLowerCase() === (status || '').toLowerCase()
    );
    const colors = STATUS_COLORS[key] || STATUS_COLORS[STATUS.UNKNOWN];

    return (
        <span
            className="status-badge"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
            {status || 'Unknown'}
        </span>
    );
}
