export const styles = `
:root {
  --bg: #0b0d0f;
  --panel: #14171a;
  --panel-2: #1b1f23;
  --border: #272c31;
  --text: #e6edf3;
  --muted: #9aa6b2;
  --green: #00e599;
  --red: #ff6b6b;
  --amber: #ffc857;
  --blue: #6ea8fe;
  --purple: #b692ff;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  background: radial-gradient(1100px 500px at 85% -10%, rgba(0,229,153,0.08), transparent 60%), var(--bg);
  color: var(--text);
  font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--green); text-decoration: none; }
header.top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border); gap: 16px; flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); box-shadow: 0 0 14px var(--green); }
.brand h1 { font-size: 16px; margin: 0; letter-spacing: -0.01em; }
.brand .accent { color: var(--green); }
.stats { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { font-size: 12px; color: var(--muted); background: var(--panel-2); border: 1px solid var(--border); padding: 4px 10px; border-radius: 999px; }
.chip b { color: var(--text); }

.board { display: grid; grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.3fr); gap: 0; min-height: calc(100vh - 60px); }
.pane { padding: 20px 24px; }
.tree-pane { border-right: 1px solid var(--border); }
.pane h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
.count { background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; color: var(--text); font-size: 11px; }

/* Tree */
ul.tree, ul.tree ul { list-style: none; margin: 0; padding: 0; }
ul.tree ul { margin-left: 14px; padding-left: 14px; border-left: 1px dashed var(--border); }
ul.tree li { position: relative; margin: 6px 0; }
.node {
  display: flex; align-items: center; gap: 10px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 9px 12px; transition: border-color .15s, transform .05s;
}
.node:hover { border-color: #38424a; }
.node.active { border-color: var(--green); box-shadow: 0 0 0 1px rgba(0,229,153,0.25); }
.node .swatch { width: 9px; height: 9px; border-radius: 50%; background: var(--blue); flex: none; }
.node.trunk .swatch { background: var(--green); }
.node .meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.node .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.node .sub { color: var(--muted); font-size: 11.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 5px; }
.badge.trunk { background: rgba(0,229,153,0.15); color: var(--green); }
.actions { display: flex; gap: 6px; flex: none; }
button.btn {
  font: inherit; font-size: 12px; cursor: pointer; color: var(--text);
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 5px 9px;
}
button.btn:hover { border-color: #45515a; }
button.btn.green { color: #04231a; background: var(--green); border-color: var(--green); font-weight: 600; }
button.btn.danger { color: var(--red); }
button.btn.danger:hover { background: rgba(255,107,107,0.12); border-color: var(--red); }
button.btn:disabled { opacity: .4; cursor: not-allowed; }

/* Panel */
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.panel-head .title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.panel-head .sub { color: var(--muted); font-family: ui-monospace, monospace; font-size: 12px; }
.section { margin-bottom: 24px; }
.section > h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 0 0 10px; display: flex; gap: 8px; align-items: center; }
.card-list { display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px;
}
.row .k { font-weight: 600; font-family: ui-monospace, monospace; }
.row .v { color: var(--muted); font-size: 12.5px; display: flex; gap: 14px; }
.row .v b { color: var(--text); }
.pill { background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; font-size: 11px; color: var(--muted); }
.empty { color: var(--muted); font-style: italic; padding: 10px 0; }
.error { color: var(--red); background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.3); border-radius: 10px; padding: 10px 12px; font-size: 12.5px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.htmx-request.node, .htmx-request .title { opacity: 0.55; }
.hint { color: var(--muted); font-size: 12px; margin-top: 4px; }
`;
