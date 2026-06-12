function SkLine({ w, h }: { w?: number | string; h?: number }) {
  return (
    <span
      className="skeleton"
      style={{ width: w ?? '100%', height: h ?? 12, display: 'inline-block', borderRadius: 6 }}
    />
  );
}

function SkBox({ w, h, r }: { w: number; h: number; r?: number }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r ?? 8, display: 'inline-block' }} />;
}

export function TreeSkeleton() {
  return (
    <ul className="tree" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} style={{ marginLeft: i * 14 }}>
          <div className="node">
            <SkBox w={9} h={9} r={9} />
            <div className="meta" style={{ gap: 6 }}>
              <SkLine w={`${110 - i * 14}px`} />
              <SkLine w="120px" h={9} />
            </div>
            <div className="actions">
              <SkBox w={44} h={24} />
              <SkBox w={36} h={24} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PanelSkeleton() {
  return (
    <section className="pane panel-pane" aria-hidden="true">
      <div className="panel-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkLine w="150px" h={20} />
          <SkLine w="240px" h={11} />
        </div>
        <div className="toolbar">
          <SkBox w={118} h={28} />
          <SkBox w={120} h={28} />
          <SkBox w={128} h={28} />
        </div>
      </div>

      <div className="section">
        <SkLine w="120px" h={11} />
        <div className="card-list" style={{ marginTop: 12 }}>
          {[0, 1].map((t) => (
            <div className="table-block" key={t}>
              <div className="row table-header">
                <SkLine w="90px" />
                <SkBox w={80} h={22} />
              </div>
              <div className="table-detail">
                <div style={{ marginBottom: 10 }}>
                  <SkLine w="140px" h={11} />
                </div>
                {[0, 1, 2].map((r) => (
                  <div key={r} style={{ padding: '5px 0' }}>
                    <SkLine />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SkLine w="150px" h={11} />
        <div className="card-list" style={{ marginTop: 12 }}>
          {[0, 1, 2].map((o) => (
            <div className="obj-row" key={o}>
              <SkBox w={44} h={44} />
              <div className="obj-info" style={{ flex: 1 }}>
                <SkLine w={`${220 - o * 30}px`} />
              </div>
              <SkBox w={50} h={24} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
