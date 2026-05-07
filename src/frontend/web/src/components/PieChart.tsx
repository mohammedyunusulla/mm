"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface DetailItem {
  label: string;
  value: number;
  subLabel?: string;
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
  details?: DetailItem[];
}

interface PieChartProps {
  data: PieSlice[];
  title?: string;
  size?: number;
}

export default function PieChart({ data, title, size = 240 }: PieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius * 0.55; // donut

  if (total === 0) {
    return (
      <div className="flex flex-col items-center w-full">
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

  const selectedSlice = selected !== null ? data[selected] : null;

  // Build donut paths
  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const ox1 = cx + outerRadius * Math.cos(startAngle);
    const oy1 = cy + outerRadius * Math.sin(startAngle);
    const ox2 = cx + outerRadius * Math.cos(endAngle);
    const oy2 = cy + outerRadius * Math.sin(endAngle);
    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);

    // Label at midpoint
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = (outerRadius + innerRadius) / 2;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    const path =
      data.length === 1
        ? `M ${cx} ${cy - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${cx - 0.01} ${cy - outerRadius}
           L ${cx - 0.01} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius} Z`
        : `M ${ox1} ${oy1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2}
           L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    // Scale on select
    const isSelected = selected === i;
    const scaleOffset = isSelected ? 6 : 0;
    const translateX = scaleOffset * Math.cos(midAngle);
    const translateY = scaleOffset * Math.sin(midAngle);

    startAngle = endAngle;

    return { ...d, path, labelX, labelY, sliceAngle, index: i, translateX, translateY, isSelected };
  });

  const handleSliceClick = (index: number) => {
    setSelected(selected === index ? null : index);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {title && <h3 className="text-base font-semibold mb-3">{title}</h3>}

      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s) => (
            <path
              key={s.index}
              d={s.path}
              fill={s.color}
              stroke="white"
              strokeWidth={2}
              opacity={
                (hovered !== null && hovered !== s.index && selected !== s.index) ||
                (selected !== null && selected !== s.index)
                  ? 0.4
                  : 1
              }
              transform={`translate(${s.translateX}, ${s.translateY})`}
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSliceClick(s.index)}
              className="transition-all duration-300 cursor-pointer"
              style={{ filter: s.isSelected ? "drop-shadow(0 2px 8px rgba(0,0,0,0.25))" : "none" }}
            />
          ))}
          {slices.map(
            (s) =>
              s.sliceAngle > 0.35 && (
                <text
                  key={`label-${s.index}`}
                  x={s.labelX + s.translateX}
                  y={s.labelY + s.translateY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white text-[11px] font-bold pointer-events-none transition-all duration-300"
                >
                  {((s.value / total) * 100).toFixed(0)}%
                </text>
              )
          )}
        </svg>

        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: 0, left: 0, width: size, height: size }}
        >
          {selectedSlice ? (
            <>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{selectedSlice.label}</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{selectedSlice.value.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-gray-400">
                {((selectedSlice.value / total) * 100).toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend - clickable */}
      <div className="mt-4 space-y-1 w-full">
        {data.map((d, i) => (
          <button
            key={i}
            onClick={() => handleSliceClick(i)}
            className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-all w-full text-left ${
              selected === i
                ? "ring-2 shadow-sm"
                : hovered === i
                ? "bg-gray-50"
                : "hover:bg-gray-50"
            }`}
            style={selected === i ? { backgroundColor: `${d.color}10`, ringColor: d.color } : {}}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className={selected === i ? "font-medium text-gray-900" : "text-gray-600"}>
                {d.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">₹{d.value.toLocaleString("en-IN")}</span>
              <span className="text-xs text-gray-400">
                ({((d.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel - shown when a slice is selected */}
      {selected !== null && selectedSlice?.details && selectedSlice.details.length > 0 && (
        <div
          className="mt-4 w-full rounded-xl border-2 p-4 animate-in slide-in-from-top-2 duration-200"
          style={{ borderColor: selectedSlice.color, backgroundColor: `${selectedSlice.color}08` }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold" style={{ color: selectedSlice.color }}>
              {selectedSlice.label} — Details
            </h4>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedSlice.details.map((item, j) => (
              <div key={j} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                  {item.subLabel && (
                    <span className="text-xs text-gray-400 ml-2">{item.subLabel}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{item.value.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
