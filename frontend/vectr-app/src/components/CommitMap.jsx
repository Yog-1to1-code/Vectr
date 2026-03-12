import { useMemo } from 'react';

export default function CommitMap({ data = [] }) {
    const weeks = useMemo(() => {
        if (!data.length) {
            // Generate empty 52-week grid
            const grid = [];
            for (let w = 0; w < 52; w++) {
                const week = [];
                for (let d = 0; d < 7; d++) {
                    week.push({ date: '', count: 0 });
                }
                grid.push(week);
            }
            return grid;
        }

        // Group data into weeks (7 days each)
        const grid = [];
        let currentWeek = [];
        data.forEach((day, i) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                grid.push(currentWeek);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push({ date: '', count: 0 });
            grid.push(currentWeek);
        }
        return grid;
    }, [data]);

    const getColor = (count) => {
        if (count === 0) return 'rgba(30,58,95,0.3)';
        if (count <= 2) return '#166534';
        if (count <= 5) return '#22c55e';
        if (count <= 10) return '#4ade80';
        return '#86efac';
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-[3px]" style={{ minWidth: 'fit-content' }}>
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((day, di) => (
                            <div
                                key={di}
                                className="rounded-sm transition-colors"
                                style={{
                                    width: 11,
                                    height: 11,
                                    backgroundColor: getColor(day.count),
                                }}
                                title={day.date ? `${day.date}: ${day.count} contributions` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
