/* Content editable without changing the application logic.
 * Open real intake only after the assignment and owner-approved consent are ready.
 * Keep stable question IDs when editing labels so saved answers remain interpretable.
 */
window.HIRING_CONFIG = {
  applicationMode: 'preview',
  apiBase: 'https://anthology-semicolon-answering.ngrok-free.dev',
  maxZipBytes: 2 * 1024 * 1024 * 1024,
  consentText: '',
  assignment: {
    published: false,
    description: 'Здесь появится тестовое задание: что нужно сделать, какой результат предоставить и по каким критериям мы его проверим.'
  },
  questions: [
    { id: 'experience', type: 'select', label: 'Ваш опыт в разработке и автоматизации', required: true, options: ['До 1 года', '1–3 года', '3–5 лет', 'Более 5 лет'] },
    { id: 'tools', type: 'checkboxes', label: 'Какими AI-инструментами вы пользовались?', hint: 'Можно выбрать несколько вариантов.', options: ['Claude', 'Cursor', 'Codex', 'Antigravity', 'Replit', 'Другие'] },
    { id: 'project', type: 'textarea', label: 'Расскажите об одном вашем решении', hint: 'Какую задачу решали, что создали и как проверили результат?', placeholder: 'Задача → решение → результат', maxLength: 3000 },
    { id: 'schedule', type: 'radio', label: 'Вам подходит начало смены в 00:00 МСК?', required: true, options: ['Да, подходит', 'Нужно обсудить в чате HeadHunter'] }
  ]
};
