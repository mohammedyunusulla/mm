"use client";

import { useState } from "react";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  title?: string;
  size?: number;
}

export default function PieChart({ data, title, size = 200 }: PieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center">
        {title && <h3 className="text-base font-semibold mb-3">{title}</h3>}
        <div
          className="rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-sm text-gray-400">No data</span>
        </div>
      </div>
    );
  }

  // Build paths
  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    // Label position (midpoint of arc)
    const midAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.65;
    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);

    const path =
      data.length === 1
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    startAngle = endAngle;

    return { ...d, path, labelX, labelY, sliceAngle, index: i };
  });

  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-base font-semibold mb-3">{title}</h3>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <path
            key={s.index}
            d={s.path}
            fill={s.color}
            stroke="white"
            strokeWidth={2}
            opacity={hovered !== null && hovered !== s.index ? 0.5 : 1}
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
            className="transition-opacity duration-200 cursor-pointer"
          />
        ))}
        {slices.map(
          (s) =>
            s.sliceAngle > 0.3 && (
              <text
                key={`label-${s.index}`}
                x={s.labelX}
                y={s.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white text-[11px] font-semibold pointer-events-none"
              >
                {((s.value / total) * 100).toFixed(0)}%
              </text>
            )
        )}
      </svg>

      {/* Legend */}
      <div className="mt-4 space-y-2 w-full">
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex items-center justify-between text-sm px-2 py-1.5 rounded-lg transition-colors ${
              hovered === i ? "bg-gray-100" : ""
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-gray-600">{d.label}</span>
            </div>
            <span className="font-semibold">₹{d.value.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
