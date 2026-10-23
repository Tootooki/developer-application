(() => {
  const dictionary = window.HIRING_EN;
  const texts = new Map();
  const attributes = [];
  const bindings = new Map();
  const buttonGroup = document.querySelector('.language-switch');
  const params = new URLSearchParams(location.search);
  let language = params.get('lang') === 'en' ? 'en' : 'ru';
  if (!params.has('lang')) { try { language = localStorage.getItem('developer-application-language') === 'en' ? 'en' : 'ru'; } catch {} }
  function t(source, values = {}) {
    let value = language === 'en' ? (dictionary[source] ?? source) : source;
    for (const [key, replacement] of Object.entries(values)) value = value.replaceAll(`{${key}}`, String(replacement));
    return value;
  }
  function translatedText(source) {
    const trimmed = source.trim();
    return trimmed && dictionary[trimmed] ? source.replace(trimmed, t(trimmed)) : source;
  }
  function registerTree(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,noscript')) continue;
      if (!texts.has(node) && dictionary[node.data.trim()]) texts.set(node, node.data);
    }
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    for (const element of elements) {
      for (const name of ['aria-label', 'placeholder', 'content']) {
        if (element.id === 'theme-toggle' && name === 'aria-label') continue;
        const value = element.getAttribute(name);
        if (value && dictionary[value] && !attributes.some(a => a.element === element && a.name === name)) attributes.push({ element, name, source: value });
      }
    }
    render();
  }
  function bindText(element, source, values = {}) {
    if (!element) return;
    bindings.set(element, { source, values });
    element.textContent = t(source, values);
  }
  function render() {
    for (const [node, source] of texts) if (node.isConnected) node.data = translatedText(source);
    for (const a of attributes) if (a.element.isConnected) a.element.setAttribute(a.name, t(a.source));
    for (const [element, binding] of bindings) if (element.isConnected) element.textContent = t(binding.source, binding.values);
    document.documentElement.lang = language;
    for (const button of buttonGroup.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === language));
    for (const link of document.querySelectorAll('[data-language-link]')) {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('lang', language);
      link.href = url;
    }
  }
  function setLanguage(next) {
    if (!['ru', 'en'].includes(next)) return;
    language = next;
    render();
    try { localStorage.setItem('developer-application-language', language); } catch {}
    const url = new URL(location.href);url.searchParams.set('lang', language);
    history.replaceState(null, '', url);
    window.dispatchEvent(new CustomEvent('hiring-language-change', { detail: { language } }));
  }
  window.HIRING_I18N = { t, registerTree, bindText, get language() { return language; } };
  registerTree(document.documentElement);
  buttonGroup.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (button) setLanguage(button.dataset.language);
  });
})();
