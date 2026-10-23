import { CodersUpload } from './client.mjs';
const config = window.HIRING_CONFIG;
const i18n = window.HIRING_I18N;
const t = (text, values) => i18n.t(text, values);
const setText = (id, text, values) => i18n.bindText($(id), text, values);
const $ = (id) => document.getElementById(id);
const form = $('candidate-form');
const dialog = $('review-dialog');
const fileInput = $('zip-file');
const submitButton = $('submit-button');
const client = new CodersUpload(config.apiBase);
const live = config.applicationMode === 'live' && config.assignment.published && Boolean(config.consentText.trim());
let selectedZip = null;
let checkingFile = false;
let fileGeneration = 0;
let sending = false;
let submitted = false;
const questionControls = new Map();
let reviewContext = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
for (const question of config.questions) {
  const choices = ['radio', 'checkboxes'].includes(question.type);
  const wrapper = el(choices ? 'fieldset' : 'div', choices ? 'choice-group' : 'field');
  const title = el(choices ? 'legend' : 'label', '', question.label + (question.required ? ' *' : ''));
  const id = `question-${question.id}`;
  if (!choices) title.htmlFor = id;
  wrapper.append(title);
  let hint;
  if (question.hint) {
    hint = el('span', 'field-hint', question.hint);
    hint.id = `${id}-hint`;
    if (choices) wrapper.append(hint);
  }
  const controls = [];
  if (choices) {
    const grid = el('div', 'choice-grid');
    for (const option of question.options) {
      const label = el('label', 'choice');
      const input = el('input');
      input.type = question.type === 'radio' ? 'radio' : 'checkbox';
      input.name = question.id;
      input.value = option;
      input.required = question.type === 'radio' && Boolean(question.required);
      if (hint) input.setAttribute('aria-describedby', hint.id);
      label.append(input, el('span', '', option));
      grid.append(label);
      controls.push(input);
    }
    wrapper.append(grid);
  } else {
    const input = el(question.type === 'select' ? 'select' : question.type === 'textarea' ? 'textarea' : 'input');
    input.id = id;
    input.name = question.id;
    input.required = Boolean(question.required);
    if (question.type === 'select') {
      const placeholder = el('option', '', 'Выберите вариант');
      placeholder.value = '';
      placeholder.disabled = true;
      placeholder.selected = true;
      input.append(placeholder);
      for (const option of question.options) {
        const node = el('option', '', option);
        node.value = option;
        input.append(node);
      }
    } else {
      if (question.type !== 'textarea') input.type = 'text';
      input.placeholder = question.placeholder || '';
      input.maxLength = question.maxLength || 2000;
    }
    if (hint) input.setAttribute('aria-describedby', hint.id);
    wrapper.append(input);
    if (hint) wrapper.append(hint);
    controls.push(input);
  }
  questionControls.set(question.id, controls);
  $('questions').append(wrapper);
  i18n.registerTree(wrapper);
}
setText('assignment-description', config.assignment.description);

const otherToolsField = el('div', 'field other-tools-field');
otherToolsField.hidden = true;
const otherToolsLabel = el('label', '', 'Указать свои инструменты');
otherToolsLabel.htmlFor = 'other-tools';
const otherToolsInput = el('input');
otherToolsInput.id = 'other-tools';
otherToolsInput.name = 'toolsOther';
otherToolsInput.type = 'text';
otherToolsInput.maxLength = 500;
otherToolsInput.placeholder = 'Например: GitHub Copilot, Windsurf';
otherToolsInput.disabled = true;
otherToolsField.append(otherToolsLabel, otherToolsInput);
questionControls.get('tools')[0].closest('fieldset').append(otherToolsField);
i18n.registerTree(otherToolsField);
const otherToolsChoice = questionControls.get('tools').find(input => input.value === 'Другие');
function updateOtherTools() {
  const selected = otherToolsChoice.checked;
  otherToolsField.hidden = !selected;
  otherToolsInput.disabled = !selected;
  otherToolsInput.required = selected;
  otherToolsChoice.setAttribute('aria-expanded', String(selected));
  otherToolsInput.setCustomValidity(selected && !otherToolsInput.value.trim() ? t('Укажите свои инструменты или снимите отметку «Другие».') : '');
}
otherToolsChoice.setAttribute('aria-controls', 'other-tools');
otherToolsChoice.setAttribute('aria-expanded', 'false');

function validateHH() {
  const input = $('candidate-hh');
  input.setCustomValidity('');
  if (!input.value.trim()) return;
  try {
    const url = new URL(input.value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !(host === 'hh.ru' || host.endsWith('.hh.ru'))) {
      input.setCustomValidity(t('Укажите ссылку на профиль или резюме HeadHunter: https://hh.ru/…'));
    }
  } catch { input.setCustomValidity(t('Укажите полную ссылку HeadHunter, начиная с https://hh.ru/')); }
}
function updateProgress() {
  for (const id of ['candidate-name', 'candidate-city']) {
    const input = $(id);
    input.setCustomValidity(input.value && !input.value.trim() ? t('Заполните поле: пробелы не считаются ответом.') : '');
  }
  validateHH();
  updateOtherTools();
  const core = [$('candidate-name'), $('candidate-city'), $('candidate-hh'), $('read-instructions')];
  let count = core.filter(c => c.type === 'checkbox' ? c.checked : c.value.trim() && c.validity.valid).length;
  let total = core.length;
  for (const q of config.questions.filter(q => q.required)) {
    total++;
    const controls = questionControls.get(q.id);
    if (q.type === 'radio' || q.type === 'checkboxes' ? controls.some(c => c.checked) : controls[0].value.trim()) count++;
  }
  if (otherToolsChoice.checked) { total++; if (otherToolsInput.value.trim()) count++; }
  $('form-progress').max = total;
  $('form-progress').value = count;
  setText('progress-text', 'Заполнено {count} из {total} пунктов', { count, total });
}
form.addEventListener('input', updateProgress);
form.addEventListener('change', updateProgress);
updateProgress();

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return t('{size} ГиБ', { size: (bytes / 1024 ** 3).toFixed(2) });
  if (bytes >= 1024 ** 2) return t('{size} МиБ', { size: (bytes / 1024 ** 2).toFixed(1) });
  return t('{size} КиБ', { size: Math.max(1, Math.ceil(bytes / 1024)) });
}
function clearFile() {
  fileGeneration++;
  selectedZip = null;
  checkingFile = false;
  fileInput.value = '';
  $('selected-file').hidden = true;
  setText('file-status', '');
  $('file-error').hidden = true;
  $('dropzone').classList.remove('dragging');
  submitButton.disabled = sending || submitted;
}
function showFileError(message) {
  setText('file-error', message);
  $('file-error').hidden = false;
}
async function selectFile(files) {
  if (sending || submitted) return;
  files = Array.from(files || []);
  clearFile();
  if (!files.length) return;
  if (files.length !== 1) { showFileError('Выберите один ZIP-архив. Все материалы должны быть внутри него.'); return; }
  const file = files[0];
  if (!/\.zip$/i.test(file.name)) { showFileError('Нужен файл в формате .zip. Выберите ZIP-архив.'); return; }
  if (file.size > config.maxZipBytes) { showFileError('Файл превышает 2 ГиБ. Уменьшите размер архива.'); return; }
  if (file.size < 22) { showFileError('Файл слишком мал для ZIP-архива. Проверьте его и выберите снова.'); return; }
  const generation = fileGeneration;
  checkingFile = true;
  submitButton.disabled = true;
  setText('file-status', 'Проверяем формат файла…');
  try {
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (generation !== fileGeneration) return;
    if (!(signature[0] === 0x50 && signature[1] === 0x4b && ((signature[2] === 3 && signature[3] === 4) || (signature[2] === 5 && signature[3] === 6) || (signature[2] === 7 && signature[3] === 8)))) {
      throw Error('Содержимое файла не похоже на ZIP-архив. Проверьте формат и попробуйте снова.');
    }
    selectedZip = file;
    $('file-name').textContent = file.name;
    $('file-size').textContent = formatBytes(file.size);
    $('selected-file').hidden = false;
    setText('file-status', 'Архив выбран. Вы можете заменить его или удалить.');
  } catch (error) {
    if (generation === fileGeneration) {
      setText('file-status', '');
      showFileError(error.message || 'Не удалось прочитать файл. Попробуйте выбрать его ещё раз.');
    }
  } finally {
    if (generation === fileGeneration) { checkingFile = false; submitButton.disabled = sending || submitted; }
  }
}
fileInput.addEventListener('change', () => selectFile(fileInput.files));
$('remove-file').addEventListener('click', () => { clearFile(); fileInput.focus(); });
const dropzone = $('dropzone');
let dragDepth = 0;
for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    if (sending || submitted) return;
    if (eventName === 'dragenter') { dragDepth++; dropzone.classList.add('dragging'); }
    if (eventName === 'dragover') event.dataTransfer.dropEffect = 'copy';
    if (eventName === 'dragleave') { dragDepth--; if (dragDepth <= 0) { dragDepth = 0; dropzone.classList.remove('dragging'); } }
    if (eventName === 'drop') { dragDepth = 0; dropzone.classList.remove('dragging'); selectFile(event.dataTransfer.files); }
  });
}
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());

function collectAnswers() {
  const answers = { city: $('candidate-city').value.trim(), readInstructions: $('read-instructions').checked };
  for (const question of config.questions) {
    const controls = questionControls.get(question.id);
    answers[question.id] = question.type === 'checkboxes' ? controls.filter(c => c.checked).map(c => c.value)
      : question.type === 'radio' ? controls.find(c => c.checked)?.value || '' : controls[0].value.trim();
  }
  if (otherToolsChoice.checked) answers.toolsOther = otherToolsInput.value.trim();
  return answers;
}
function openReview(candidate, answers) {
  reviewContext = { candidate, answers };
  setText('review-title', 'Проверьте Ваши данные.');
  setText('review-description', 'Проверьте ответы и архив. Отправка заявки не выполнялась.');
  const summary = $('review-summary');
  summary.replaceChildren();
  const values = [[t('Имя'), candidate.name], [t('Город и часовой пояс'), answers.city], ['HeadHunter', candidate.headhunterUrl]];
  for (const question of config.questions) {
    const value = answers[question.id];
    const displayValue = Array.isArray(value) ? value.map(option => t(option)).join(', ') : ['radio', 'select'].includes(question.type) ? t(value) : value;
    values.push([t(question.label), displayValue || t('Не указано')]);
  }
  if (answers.toolsOther) values.push([t('Указать свои инструменты'), answers.toolsOther]);
  values.push([t('Выбранный архив'), `${selectedZip.name} · ${formatBytes(selectedZip.size)}`]);
  for (const [label, value] of values) summary.append(el('dt', '', label), el('dd', '', value));
  if (!dialog.open) dialog.showModal();
}
$('close-dialog').addEventListener('click', () => dialog.close());
$('return-to-form').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

if (live) {
  setText('submit-hint', 'Подтверждение появится после сохранения анкеты и архива.');
  setText('submit-button', 'Отправить заявку');
  const label = el('label', 'check-row');
  const consent = el('input');
  consent.type = 'checkbox'; consent.id = 'consent'; consent.required = true;
  label.append(consent, el('span', '', config.consentText));
  $('consent-container').append(label);
  $('consent-container').hidden = false;
  i18n.registerTree(label);
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || submitted || checkingFile) return;
  $('submit-error').hidden = true;
  updateProgress();
  if (!form.reportValidity()) return;
  for (const q of config.questions.filter(q => q.required && q.type === 'checkboxes')) {
    if (!questionControls.get(q.id).some(c => c.checked)) {
      setText('submit-error', 'Выберите хотя бы один вариант: {label}', { label: t(q.label) });
      $('submit-error').hidden = false;
      questionControls.get(q.id)[0].focus();
      return;
    }
  }
  if (!selectedZip) {
    showFileError('Прикрепите ZIP-архив перед проверкой заявки.');
    fileInput.focus();
    return;
  }
  const candidate = { name: $('candidate-name').value.trim(), headhunterUrl: $('candidate-hh').value.trim() };
  const answers = collectAnswers();
  if (!live) { openReview(candidate, answers); return; }
  sending = true;
  submitButton.disabled = true;
  $('upload-progress').hidden = false;
  let session;
  const sessionKey = 'developer-application-upload-v1';
  const controls = [...form.querySelectorAll('input, select, textarea, button')];
  try {
    try { session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { session = null; }
    if (!session?.id || !session?.token) session = client.newSession();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    controls.forEach(c => { c.disabled = true; });
    const receipt = await client.submit({ session, candidate, answers, zip: selectedZip, consent: $('consent').checked, onProgress: ({ percent }) => {
      $('transfer-progress').value = percent;
      if (percent === 100) setText('transfer-label', 'Файл загружен. Сохраняем заявку…');
      else setText('transfer-label', 'Загружаем архив: {percent}%', { percent });
    } });
    if (receipt.status !== 'submitted') throw Error('Сервис пока не подтвердил сохранение. Повторите отправку с тем же архивом.');
    submitted = true;
    sessionStorage.removeItem(sessionKey);
    setText('transfer-label', 'Заявка сохранена.');
    setText('review-title', 'Заявка принята.');
    setText('review-description', 'Анкета и архив сохранены. Номер заявки: {id}. Для вопросов используйте чат HeadHunter.', { id: receipt.id });
    $('review-summary').replaceChildren();
    dialog.showModal();
  } catch (error) {
    setText('submit-error', error.message || 'Не удалось отправить заявку. Попробуйте снова с тем же архивом.');
    $('submit-error').hidden = false;
    controls.forEach(c => { c.disabled = false; });
  } finally { sending = false; submitButton.disabled = submitted; }
});

window.addEventListener('hiring-language-change', () => {
  updateProgress();
  if (selectedZip) $('file-size').textContent = formatBytes(selectedZip.size);
  if (dialog.open && reviewContext && !submitted) openReview(reviewContext.candidate, reviewContext.answers);
});
