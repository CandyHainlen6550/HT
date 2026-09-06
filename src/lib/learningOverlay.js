let learnerDecompPromise = null;
let mnemonicsPromise = null;

function cap(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toLocaleUpperCase('vi') + text.slice(1) : '';
}

async function loadJson(filename, label) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Không tải được ${label} (${response.status})`);
  return response.json();
}

export function loadLearnerDecomp() {
  if (!learnerDecompPromise) {
    learnerDecompPromise = loadJson('learner_decomp.json', 'dữ liệu chiết tự');
  }
  return learnerDecompPromise;
}

export function loadMnemonics() {
  if (!mnemonicsPromise) {
    mnemonicsPromise = loadJson('mnemonics.json', 'mnemonic');
  }
  return mnemonicsPromise;
}

function buildComponent(identity, data, existingByKey, path = []) {
  const meta = data?.meta?.[identity] || {};
  const existing = existingByKey.get(identity) || {};
  const cycle = path.includes(identity);
  const childKeys = cycle ? [] : (data?.decomp?.[identity] || []);
  const display = meta.display || existing.display || identity;

  return {
    ...existing,
    component: identity,
    display,
    renderType: meta.renderType || existing.renderType || 'unicode',
    renderValue: meta.renderValue || existing.renderValue || display,
    glyphwikiName: meta.glyphwikiName || existing.glyphwikiName || '',
    hanViet: cap(meta.hanViet || existing.hanViet),
    meaning: meta.meaning || existing.meaning || '',
    mnemonic: meta.mnemonic || existing.mnemonic || '',
    role: existing.role || 'thành phần hình thể',
    position: existing.position || '',
    positionVi: existing.positionVi || 'thành phần hình thể',
    family: meta.family || '',
    sourceIdentity: meta.sourceIdentity || identity,
    exactAlias: meta.exactAlias || '',
    familyHint: meta.familyHint || '',
    children: childKeys.map((child) => buildComponent(child, data, existingByKey, [...path, identity])),
  };
}

export function applyLearnerDecomp(card, data) {
  if (!card || !data?.roots) return card;
  const roots = data.roots[card.kanji];
  if (!Array.isArray(roots) || roots.length === 0) return card;

  const existingByKey = new Map();
  const visit = (component) => {
    if (!component || typeof component !== 'object') return;
    const key = component.component || component.display || component.renderValue;
    if (key && !existingByKey.has(key)) existingByKey.set(key, component);
    (component.children || []).forEach(visit);
  };
  (card.components || []).forEach(visit);

  const components = roots.map((identity) => buildComponent(identity, data, existingByKey));
  return {
    ...card,
    components,
    decompositionBasis: 'learner_visual',
    decompositionSchemaVersion: data.schemaVersion || '',
  };
}

export function applyMnemonic(card, data) {
  if (!card || !data || typeof data !== 'object') return card;
  const mnemonic = data[card.kanji];
  if (typeof mnemonic !== 'string' || !mnemonic.trim()) return card;
  if (mnemonic === card.mnemonic) return card;
  return { ...card, mnemonic };
}
