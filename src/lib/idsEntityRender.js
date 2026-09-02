// Formation IDS strings preserve canonical CHISE/CDP entity keys, but the React IDS tree does not
// carry component_master rendering metadata. This lightweight hydration layer applies only verified
// render mappings from the compact handoff and never changes entity identity or source data.
const ENTITY_RENDER = Object.freeze({
  "&CDP-8665;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8665.svg"}),
  "&CDP-88F1;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-88f1.svg"}),
  "&CDP-8958;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8958.svg"}),
  "&CDP-8968;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8968.svg"}),
  "&CDP-8974;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8974.svg"}),
  "&CDP-89AB;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89ab.svg"}),
  "&CDP-89AE;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89ae.svg"}),
  "&CDP-89E5;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89e5.svg"}),
  "&CDP-89EB;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89eb.svg"}),
  "&CDP-89F3;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89f3.svg"}),
  "&CDP-89FD;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-89fd.svg"}),
  "&CDP-8B7B;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8b7b.svg"}),
  "&CDP-8BA5;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8ba5.svg"}),
  "&CDP-8BB5;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bb5.svg"}),
  "&CDP-8BB8;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bb8.svg"}),
  "&CDP-8BBE;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bbe.svg"}),
  "&CDP-8BC4;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bc4.svg"}),
  "&CDP-8BC5;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bc5.svg"}),
  "&CDP-8BC7;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bc7.svg"}),
  "&CDP-8BCB;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bcb.svg"}),
  "&CDP-8BD9;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bd9.svg"}),
  "&CDP-8BDC;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8bdc.svg"}),
  "&CDP-8BE8;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8be8.svg"}),
  "&CDP-8BE9;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8be9.svg"}),
  "&CDP-8C46;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8c46.svg"}),
  "&CDP-8C4F;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8c4f.svg"}),
  "&CDP-8C52;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8c52.svg"}),
  "&CDP-8C66;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8c66.svg"}),
  "&CDP-8C69;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8c69.svg"}),
  "&CDP-8CAC;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8cac.svg"}),
  "&CDP-8CBB;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8cbb.svg"}),
  "&CDP-8CC9;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8cc9.svg"}),
  "&CDP-8CE4;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8ce4.svg"}),
  "&CDP-8CE5;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8ce5.svg"}),
  "&CDP-8D40;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/cdp-8d40.svg"}),
  "&GT-K00059;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/gt-k00059.svg"}),
  "&GT-K01085;": Object.freeze({"type":"unicode_fallback","value":"弁"}),
  "&GT-K02380;": Object.freeze({"type":"unicode_fallback","value":"𬺨"}),
  "&GT-K06261;": Object.freeze({"type":"glyphwiki_svg","value":"https://glyphwiki.org/glyph/gt-k06261.svg"}),
});

const ENTITY_SELECTOR = '.formation-ids-value .ids-leaf--entity';

function hydrateEntityLeaf(node) {
  if (!(node instanceof HTMLElement)) return;
  const existingImage = node.querySelector(':scope > img[data-ids-entity-image]');
  if (existingImage) return;

  const visibleText = String(node.textContent || '').trim();
  const priorKey = node.dataset.idsEntityKey || '';
  const entity = visibleText.startsWith('&') ? visibleText : priorKey;
  if (!entity) return;
  if (node.dataset.idsEntityFailed === entity) return;

  const render = ENTITY_RENDER[entity];
  if (!render) return;
  node.dataset.idsEntityKey = entity;
  node.title = entity;

  if (render.type === 'unicode_fallback') {
    if (visibleText === render.value && node.dataset.idsEntityRendered === 'unicode') return;
    node.dataset.idsEntityRendered = 'unicode';
    node.classList.add('cjk', 'ids-leaf--entity-unicode');
    node.replaceChildren(document.createTextNode(render.value));
    return;
  }

  if (render.type === 'glyphwiki_svg') {
    node.dataset.idsEntityRendered = 'glyphwiki';
    node.classList.add('ids-leaf--entity-svg');
    const image = document.createElement('img');
    image.src = render.value;
    image.alt = '';
    image.decoding = 'async';
    image.dataset.idsEntityImage = 'true';
    image.addEventListener('error', () => {
      node.dataset.idsEntityFailed = entity;
      delete node.dataset.idsEntityRendered;
      node.classList.remove('ids-leaf--entity-svg');
      node.replaceChildren(document.createTextNode(entity));
    }, { once: true });
    node.replaceChildren(image);
  }
}

function hydrateTree(root) {
  if (!(root instanceof Element || root instanceof Document)) return;
  if (root instanceof Element && root.matches(ENTITY_SELECTOR)) hydrateEntityLeaf(root);
  root.querySelectorAll(ENTITY_SELECTOR).forEach(hydrateEntityLeaf);
}

export function installIdsEntityRenderer(root) {
  if (!(root instanceof Element)) return () => {};
  hydrateTree(root);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      if (mutation.target instanceof Element) hydrateTree(mutation.target);
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) hydrateTree(node);
      });
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
