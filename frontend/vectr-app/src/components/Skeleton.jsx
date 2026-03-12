/**
 * Shimmer loading skeleton. Pass variant to control shape.
 * Used throughout the app for perceived performance during data fetching.
 */
export default function Skeleton({ variant = 'text', width, height, className = '', count = 1 }) {
    const base = 'animate-pulse rounded bg-bg-panel';

    const variants = {
        text: `${base} h-4`,
        title: `${base} h-6 w-48`,
        circle: `${base} rounded-full`,
        card: `${base} rounded-xl`,
        rect: `${base}`,
    };

    const style = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={variants[variant] || variants.rect} style={style} />
            ))}
        </div>
    );
}

/** Pre-built skeleton for dashboard cards */
export function CardSkeleton({ rows = 3 }) {
    return (
        <div className="glass-card p-5 space-y-4">
            <Skeleton variant="title" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg" style={{ background: 'rgba(19,29,47,0.4)' }}>
                    <Skeleton width="40%" />
                    <Skeleton width="90%" />
                    <Skeleton width="30%" height={20} />
                </div>
            ))}
        </div>
    );
}

/** Pre-built skeleton for the 3-column layout */
export function ListSkeleton({ rows = 5 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(19,29,47,0.4)' }}>
                    <Skeleton width="70%" />
                    <Skeleton width="50%" className="mt-2" />
                </div>
            ))}
        </div>
    );
}
