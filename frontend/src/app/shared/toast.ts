/** Aviso emergente abajo del todo (imágenes que no se leen, ficheros grandes). */
export function alertInline(msg: string): void {
  const box = document.createElement('div');
  box.className = 'alert bad';
  box.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:9;max-width:min(420px,92vw)';
  box.innerHTML = `<svg class="ic" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.6"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><div><p>${String(msg).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>`;
  document.body.appendChild(box);
  setTimeout(()=>box.remove(), 4000);
}
