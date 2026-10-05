const COLORS = ['#15803d', '#111111', '#4ade80', '#6b7280', '#bbf7d0', '#9ca3af'];

function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function slicePath(cx, cy, r, a0, a1) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return 'M ' + cx + ' ' + cy + ' L ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + ' Z';
}

export function PieChart({ title, items, format }) {
  const fmt = format || ((v) => String(v));
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((sum, i) => sum + i.value, 0);

  let angle = -Math.PI / 2;
  const slices = data.map((item, index) => {
    const start = angle;
    angle += (item.value / total) * Math.PI * 2;
    return { ...item, color: COLORS[index % COLORS.length], start, end: angle };
  });

  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: 700, marginBottom: 10 }}>{title}</figcaption>
      {total === 0 ? (
        <p style={{ margin: 0 }}>Sem dados neste período.</p>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <svg aria-hidden="true" viewBox="0 0 200 200" width="170" height="170" style={{ flexShrink: 0 }}>
            {slices.length === 1 ? (
              <circle cx="100" cy="100" r="95" fill={slices[0].color} stroke="#ffffff" strokeWidth="2" />
            ) : (
              slices.map((s) => (
                <path
                  key={s.label}
                  d={slicePath(100, 100, 95, s.start, s.end)}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))
            )}
          </svg>
          <ul aria-label={title} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {slices.map((s) => (
              <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 14, height: 14, borderRadius: 3, background: s.color, flexShrink: 0 }}
                />
                <span>
                  {s.label}: <strong>{fmt(s.value)}</strong> ({percent(s.value, total)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}

export function BarChart({ title, items, format }) {
  const fmt = format || ((v) => String(v));
  const data = items.filter((i) => i.value > 0);
  const max = Math.max(0, ...data.map((i) => i.value));

  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: 700, marginBottom: 10 }}>{title}</figcaption>
      {data.length === 0 ? (
        <p style={{ margin: 0 }}>Sem dados neste período.</p>
      ) : (
        <ul aria-label={title} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {data.map((i) => (
            <li key={i.label} style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 4 }}>
                {i.label}: <strong>{fmt(i.value)}</strong>
              </div>
              <div
                aria-hidden="true"
                style={{ background: '#e5e7eb', height: 14, borderRadius: 7, overflow: 'hidden' }}
              >
                <div
                  style={{
                    width: (max > 0 ? (i.value / max) * 100 : 0) + '%',
                    height: '100%',
                    background: '#15803d',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
