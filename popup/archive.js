let archive = [];
const $ = id => document.getElementById(id);
const fmt = ts => new Date(ts).toLocaleString('fr-CH', { dateStyle: 'medium', timeStyle: 'short' });
const hostOf = u => { try { return new URL(u).hostname; } catch (e) { return ''; } };

async function load() {
  const res = await browser.runtime.sendMessage({ action: 'getArchive' });
  archive = res.archive || [];
  render();
}

function filtered() {
  const terms = $('q').value.toLowerCase().split(/\s+/).filter(Boolean);
  const days = parseInt($('range').value);
  const since = days === 1 ? new Date().setHours(0, 0, 0, 0) : days ? Date.now() - days * 864e5 : 0;
  const rows = archive.filter(e => {
    if (e.closedAt < since) return false;
    const hay = `${e.title} ${e.url} ${fmt(e.closedAt)} ${new Date(e.closedAt).toISOString().slice(0, 10)}`.toLowerCase();
    return terms.every(t => hay.includes(t));
  });
  const sorts = {
    new: (a, b) => b.closedAt - a.closedAt,
    old: (a, b) => a.closedAt - b.closedAt,
    title: (a, b) => (a.title || '').localeCompare(b.title || ''),
    domain: (a, b) => hostOf(a.url).localeCompare(hostOf(b.url))
  };
  return rows.sort(sorts[$('sort').value]);
}

function act(label, cls, fn) {
  const b = document.createElement('button'); b.textContent = label; b.className = cls || '';
  b.addEventListener('click', fn); return b;
}

function render() {
  const rows = filtered();
  $('count').textContent = `${rows.length} / ${archive.length} onglets`;
  $('empty').style.display = rows.length ? 'none' : 'block';
  const list = $('list'); list.textContent = '';
  for (const e of rows) {
    const li = document.createElement('li'); li.className = 'item';
    const t = document.createElement('div'); t.className = 'title'; t.textContent = e.title || e.url;
    const u = document.createElement('div'); u.className = 'url'; u.textContent = e.url;
    const m = document.createElement('div'); m.className = 'meta'; m.textContent = `Fermé le ${fmt(e.closedAt)}`;
    const a = document.createElement('div'); a.className = 'actions';
    a.append(
      act('Restaurer', 'primary', async () => { await browser.runtime.sendMessage({ action: 'restoreArchived', id: e.id }); load(); }),
      act('Copier l\'URL', '', () => navigator.clipboard.writeText(e.url)),
      act('Supprimer', 'danger', async () => { await browser.runtime.sendMessage({ action: 'deleteArchived', ids: [e.id] }); load(); })
    );
    li.append(t, u, m, a); list.appendChild(li);
  }
}

['q', 'range', 'sort'].forEach(id => $(id).addEventListener('input', render));
$('clear').addEventListener('click', async () => {
  if (confirm('Vider toute l\'archive ?')) { await browser.runtime.sendMessage({ action: 'clearArchive' }); load(); }
});
load();
