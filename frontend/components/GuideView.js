const linkStyle = { color: '#127d4b', textDecoration: 'underline' };
const listStyle = { margin: '0 0 14px', paddingLeft: 24, lineHeight: 1.7, fontSize: 15 };
const textStyle = { margin: '0 0 14px', lineHeight: 1.7, fontSize: 15 };

function Block({ b }) {
  if (b.h3) {
    return <h3 style={{ fontSize: 16, margin: '18px 0 8px' }}>{b.h3}</h3>;
  }
  if (b.p) {
    return <p style={textStyle}>{b.p}</p>;
  }
  if (b.ol) {
    return (
      <ol style={listStyle}>
        {b.ol.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  if (b.ul) {
    return (
      <ul style={listStyle}>
        {b.ul.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (b.note) {
    return (
      <p style={{ ...textStyle, background: '#e3f5ec', borderLeft: '4px solid #127d4b', padding: '10px 14px', borderRadius: 6 }}>
        <strong>Atenção: </strong>
        {b.note}
      </p>
    );
  }
  return null;
}

export default function GuideView({ guide }) {
  return (
    <div style={{ maxWidth: 820 }}>
      <p className="page-sub">{guide.intro}</p>

      <nav aria-label="Índice do guia" className="card" style={{ marginBottom: 20 }}>
        <h2 id="indice" tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
          Índice
        </h2>
        <ol style={{ ...listStyle, marginBottom: 0 }}>
          {guide.sections.map((s) => (
            <li key={s.id}>
              <a href={'#' + s.id} style={linkStyle}>
                {s.h}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {guide.sections.map((s) => (
        <section key={s.id} aria-labelledby={s.id} className="card" style={{ marginBottom: 20 }}>
          <h2 id={s.id} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
            {s.h}
          </h2>
          {s.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
          <p style={{ margin: 0 }}>
            <a href="#indice" style={linkStyle}>
              Voltar ao índice
            </a>
          </p>
        </section>
      ))}
    </div>
  );
}
