// toggle-tema.js
// Controla el botón de cambio de tema aprovechando tema.js (que inicializa)
(function(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;

  const applyIcon = () => {
    const dark = document.documentElement.classList.contains('dark');
    btn.textContent = dark ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', dark.toString());
  };
  applyIcon();

  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark':'light'); } catch(e){}
    applyIcon();
  });
})();
