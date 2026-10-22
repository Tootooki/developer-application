// Import this module into the GitHub Pages form. No GitHub/API keys belong in a browser.
export class CodersUpload {
  constructor(apiBase) { this.api = apiBase.replace(/\/$/, ''); }
  async request(route, session, options = {}) {
    const response = await fetch(this.api + route, { ...options, headers: { 'ngrok-skip-browser-warning': '1', Authorization: `Bearer ${session.token}`, ...options.headers } });
    let data; try { data = await response.json(); } catch { throw Error('Сервис загрузки временно недоступен. Попробуйте ещё раз.'); }
    if (!response.ok) throw Object.assign(Error(data.error), { status: response.status });
    return data;
  }
  newSession() {
    return { id: crypto.randomUUID(), token: Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('') };
  }
  async submit({ session, candidate, answers, zip, resume, consent, onProgress = () => {} }) {
    const uploads = [{ kind: 'zip', file: zip }, ...(resume ? [{ kind: 'resume', file: resume }] : [])];
    if (!zip || !/\.zip$/i.test(zip.name)) throw Error('Выберите ZIP-файл с выполненным заданием.');
    let state = await this.request('/api/applications', session, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: session.id, candidate, answers, consent, files: uploads.map(({ kind, file }) => ({ kind, name: file.name, size: file.size })) })
    });
    if (state.status === 'submitted') return state;
    const total = uploads.reduce((sum, u) => sum + u.file.size, 0);
    let completed = state.files.reduce((sum, f) => sum + f.offset, 0);
    for (const { kind, file } of uploads) {
      const saved = state.files.find(f => f.kind === kind);
      if (!saved || saved.name !== file.name || saved.size !== file.size) throw Error('Для продолжения выберите те же файлы.');
      let offset = saved.offset;
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + state.chunkBytes);
        let result;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            result = await this.request(`/api/applications/${session.id}/files/${kind}`, session, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body: chunk });
            break;
          } catch (error) {
            if (attempt === 3 || (error.status && error.status !== 409 && error.status < 500)) throw error;
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            const refreshed = await this.request(`/api/applications/${session.id}`, session);
            const actual = refreshed.files.find(f => f.kind === kind).offset;
            if (actual === offset + chunk.size) { result = { offset: actual }; break; }
            if (actual !== offset) throw Error('Состояние загрузки изменилось. Повторите отправку с той же сессией.');
          }
        }
        completed += result.offset - offset; offset = result.offset;
        onProgress({ loaded: completed, total, percent: Math.floor(completed * 100 / total) });
      }
    }
    return this.request(`/api/applications/${session.id}/complete`, session, { method: 'POST' });
  }
}
