import React from 'react';

const VARIANT_STYLES = {
    navy: {
        border: 'border-slate-200 hover:border-slate-400',
        accentBar: 'bg-slate-800',
        iconBg: 'bg-slate-900 text-white',
        valueText: 'text-slate-900',
        badgeBg: 'bg-slate-100 text-slate-700',
    },
    blue: {
        border: 'border-blue-100 hover:border-blue-300',
        accentBar: 'bg-blue-600',
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
        valueText: 'text-blue-900',
        badgeBg: 'bg-blue-50 text-blue-700',
    },
    emerald: {
        border: 'border-emerald-100 hover:border-emerald-300',
        accentBar: 'bg-emerald-600',
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        valueText: 'text-emerald-900',
        badgeBg: 'bg-emerald-50 text-emerald-700',
    },
    amber: {
        border: 'border-amber-100 hover:border-amber-300',
        accentBar: 'bg-amber-500',
        iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
        valueText: 'text-amber-900',
        badgeBg: 'bg-amber-50 text-amber-700',
    },
    rose: {
        border: 'border-rose-100 hover:border-rose-300',
        accentBar: 'bg-rose-500',
        iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
        valueText: 'text-rose-900',
        badgeBg: 'bg-rose-50 text-rose-700',
    },
    indigo: {
        border: 'border-indigo-100 hover:border-indigo-300',
        accentBar: 'bg-indigo-600',
        iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
        valueText: 'text-indigo-900',
        badgeBg: 'bg-indigo-50 text-indigo-700',
    },
    purple: {
        border: 'border-purple-100 hover:border-purple-300',
        accentBar: 'bg-purple-600',
        iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
        valueText: 'text-purple-900',
        badgeBg: 'bg-purple-50 text-purple-700',
    }
};

/**
 * SummaryCard — Reusable institutional lightweight metric card
 *
 * @param {Object} props
 * @param {string} props.title - Metric title (Thai/Eng)
 * @param {string|number} props.value - Metric value to display
 * @param {string} [props.subtitle] - Supporting description or percentage
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {'navy'|'blue'|'emerald'|'amber'|'rose'|'indigo'|'purple'} [props.variant='blue'] - Theme color variant
 * @param {string} [props.badge] - Optional badge tag
 * @param {boolean} [props.loading] - Whether card is loading
 * @param {function} [props.onClick] - Optional click handler
 */
export default function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    variant = 'blue',
    badge,
    loading = false,
    onClick,
    className = ''
}) {
    const style = VARIANT_STYLES[variant] || VARIANT_STYLES.blue;

    return (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 ${
                style.border
            } ${onClick ? 'cursor-pointer hover:shadow-md' : 'hover:shadow-xs'} ${className}`}
        >
            {/* Top institutional accent border */}
            <div className={`absolute inset-x-0 top-0 h-1 ${style.accentBar}`} />

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-500 tracking-tight truncate">
                            {title}
                        </p>
                        {badge && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badgeBg}`}>
                                {badge}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-slate-100" />
                    ) : (
                        <p className={`mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight ${style.valueText}`}>
                            {value}
                        </p>
                    )}

                    {subtitle && (
                        <p className="mt-1 text-xs text-slate-400 font-medium truncate">
                            {subtitle}
                        </p>
                    )}
                </div>

                {Icon && (
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${style.iconBg}`}>
                        <Icon size={20} strokeWidth={2.2} />
                    </div>
                )}
            </div>
        </div>
    );
}
