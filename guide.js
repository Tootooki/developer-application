const themeButton = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeKey = 'developer-application-theme';
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  themeIcon.textContent = dark ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#111827' : '#f3f4f6';
}
try { applyTheme(localStorage.getItem(themeKey) === 'dark'); } catch { applyTheme(false); }
themeButton.addEventListener('click', () => {
  const dark = !document.body.classList.contains('dark');
  applyTheme(dark);
  try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch { /* Theme works without storage. */ }
});
const sidebar = document.querySelector('.sidebar');
const menuButton = document.getElementById('mobile-nav-toggle');
menuButton.addEventListener('click', () => {
  const open = sidebar.classList.toggle('nav-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
const links = [...document.querySelectorAll('.nav-link')];
const targets = links.map(link => document.querySelector(link.getAttribute('href')));
for (const link of document.querySelectorAll('.sidebar a[href^="#"]')) {
  link.addEventListener('click', () => {
    sidebar.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
}
let pendingFrame = false;
function updateReadingPosition() {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const percent = height > 0 ? Math.min(100, Math.max(0, window.scrollY / height * 100)) : 100;
  document.getElementById('reading-progress').style.width = `${percent}%`;
  let activeIndex = 0;
  targets.forEach((target, index) => { if (target && target.getBoundingClientRect().top <= 165) activeIndex = index; });
  links.forEach((link, index) => {
    link.classList.toggle('active', index === activeIndex);
    if (index === activeIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  pendingFrame = false;
}
function schedulePositionUpdate() {
  if (!pendingFrame) { pendingFrame = true; requestAnimationFrame(updateReadingPosition); }
}
window.addEventListener('scroll', schedulePositionUpdate, { passive: true });
window.addEventListener('resize', schedulePositionUpdate);
window.addEventListener('load', schedulePositionUpdate);
document.addEventListener('toggle', schedulePositionUpdate, true);
updateReadingPosition();
