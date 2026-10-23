(() => {
  'use strict';
  const i18n = window.HIRING_I18N;
  const audio = document.getElementById('test-audio');
  const next = document.getElementById('audio-next');
  const autoPause = document.getElementById('auto-pause');
  const status = document.getElementById('audio-status');
  const error = document.getElementById('audio-error');
  const stage = document.getElementById('audio-stage');
  let data;
  let active = 0;
  let awaiting = null;
  let hasStarted = false;

  function bind(element, source, values) { i18n.bindText(element, source, values); }
  function clock(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  }
  function updateStage() {
    stage.textContent = `${active + 1}. ${data.chapters[active].title}`;
    document.querySelectorAll('.chapter-button').forEach((button, index) => {
      if (index === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function updateButton() {
    bind(next, audio.ended ? 'Слушать заново' : !audio.paused ? 'Приостановить аудио' : hasStarted ? 'Продолжить аудио' : 'Начать аудио');
  }
  function showError() {
    error.hidden = false;
    bind(error, 'Не удалось воспроизвести аудио. Скачайте MP3 или используйте полный текст ниже.');
  }
  async function play() {
    error.hidden = true;
    try { await audio.play(); } catch { showError(); updateButton(); }
  }
  function selectChapter(index, shouldPlay = true) {
    if (!Number.isInteger(index) || index < 0 || index >= data.chapters.length) return;
    awaiting = null;
    active = index;
    audio.currentTime = data.chapters[index].start;
    updateStage();
    if (shouldPlay) play();
  }
  function loadLanguage() {
    audio.pause();
    data = window.TEST_AUDIO[i18n.language];
    active = 0;
    awaiting = null;
    hasStarted = false;
    error.hidden = true;
    audio.src = data.src;
    audio.load();
    audio.setAttribute('aria-label', i18n.t('Аудиоинструкция тестового задания'));
    document.getElementById('audio-download').href = data.src;
    document.getElementById('transcript-download').href = `assets/test/transcript-${i18n.language}.txt`;
    document.getElementById('materials-download').href = `assets/test/test-materials-${i18n.language}.zip`;
    document.querySelectorAll('[data-chapter-time]').forEach(time => {
      time.textContent = clock(data.chapters[Number(time.dataset.chapterTime)].start);
    });
    bind(document.getElementById('audio-duration'), 'Полная запись: {duration}', {duration: clock(data.duration)});
    bind(status, 'Запустите запись экрана, затем включите аудио.');
    updateStage();
    updateButton();
    for (const link of document.querySelectorAll('[data-application-link]')) {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('lang', i18n.language);
      link.href = url;
    }
  }
  next.addEventListener('click', () => {
    if (!audio.paused) { audio.pause(); return; }
    if (audio.ended) selectChapter(0, false);
    play();
  });
  document.querySelectorAll('[data-chapter]').forEach(button => {
    button.addEventListener('click', () => selectChapter(Number(button.dataset.chapter)));
  });
  audio.addEventListener('play', () => {
    if (awaiting !== null) selectChapter(awaiting, false);
    hasStarted = true;
    updateButton();
    bind(status, 'Аудио воспроизводится. После этапа выполните задание, продолжая запись экрана.');
  });
  audio.addEventListener('pause', () => {
    updateButton();
    if (!audio.ended) bind(status, awaiting === null ? 'Аудио на паузе. Запись экрана продолжайте.' : 'Аудио на паузе. Выполните этап; запись экрана продолжайте. Затем нажмите «Продолжить аудио».');
  });
  audio.addEventListener('seeking', () => {
    awaiting = null;
    active = Math.max(0, data.chapters.findLastIndex(chapter => audio.currentTime >= chapter.start - 0.01));
    updateStage();
  });
  audio.addEventListener('timeupdate', () => {
    if (!data || awaiting !== null) return;
    const chapter = data.chapters[active];
    if (autoPause.checked && !audio.paused && active < data.chapters.length - 1 && audio.currentTime >= chapter.end - 0.02) {
      awaiting = active + 1;
      audio.pause();
      bind(status, 'Аудио на паузе. Выполните этап; запись экрана продолжайте. Затем нажмите «Продолжить аудио».');
      return;
    }
    const index = Math.max(0, data.chapters.findLastIndex(item => audio.currentTime >= item.start));
    if (active !== index) { active = index; updateStage(); }
  });
  audio.addEventListener('ended', () => {
    active = data.chapters.length - 1;
    awaiting = null;
    updateStage();
    updateButton();
    bind(status, 'Аудиоинструкция закончилась. Завершите последний этап, затем остановите запись экрана и соберите ZIP.');
  });
  audio.addEventListener('error', showError);
  window.addEventListener('hiring-language-change', loadLanguage);
  loadLanguage();
})();
