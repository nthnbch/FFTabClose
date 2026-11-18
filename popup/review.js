let deadline = 0;
const list = document.getElementById('list');
const send = (type, id) => browser.runtime.sendMessage({ action: 'reviewAction', type, id }).then(refresh);

function button(label, title, type, id, cls = '') {
  const b = document.createElement('button');
  b.textContent = label; b.title = title; b.className = cls;
  b.addEventListener('click', () => send(type, id));
  return b;
}

function render(tabs) {
  list.textContent = '';
  document.getElementById('empty').style.display = tabs.length ? 'none' : 'block';
  for (const t of tabs) {
    const li = document.createElement('li'); li.className = 'item';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = t.title || t.url;
    const url = document.createElement('div'); url.className = 'url'; url.textContent = t.url;
    const actions = document.createElement('div'); actions.className = 'actions';
    actions.append(
      button('Ignorer', 'Garder, redémarre le minuteur', 'ignore', t.id),
      button('Reporter', 'Reporter la fermeture (délai configurable, 1h par défaut)', 'delay', t.id),
      button('Exclure domaine', 'Ajouter le domaine à la whitelist', 'excludeDomain', t.id),
      button('Exclure URL', 'Ajouter cette URL à la whitelist', 'excludeUrl', t.id),
      button('Fermer', 'Fermer maintenant', 'closeNow', t.id, 'danger')
    );
    li.append(title, url, actions);
    list.appendChild(li);
  }
}

async function refresh() {
  try {
    const state = await browser.runtime.sendMessage({ action: 'getReview' });
    deadline = state.deadline;
    render(state.tabs);
    if (state.tabs.length === 0) setTimeout(() => window.close(), 1200);
  } catch (e) { /* background not ready */ }
}

setInterval(() => {
  document.getElementById('countdown').textContent = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}, 500);
setInterval(refresh, 3000);
document.getElementById('close-all').addEventListener('click', () => send('closeAll'));
document.getElementById('ignore-all').addEventListener('click', () => send('ignoreAll'));
refresh();
