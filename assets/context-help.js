(() => {
  if (typeof document.querySelector !== "function" || typeof MutationObserver === "undefined") return;
  let serial = 0;
  function enhance() {
    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('quest-start');
    document.querySelectorAll('.hero > p,.theme-card-note,.module-intro,.challenge-card p,.challenge-card .subject-materials').forEach(node => {
      if (node.dataset.helpConverted || !node.textContent.trim()) return;
      node.dataset.helpConverted = 'true';
      const wrap = document.createElement('span');
      wrap.className = 'context-help';
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'context-help-trigger';
      trigger.textContent = '?'; trigger.setAttribute('aria-label', 'Como funciona');
      trigger.setAttribute('aria-expanded', 'false');
      const tip = document.createElement('span');
      tip.className = 'context-help-tip'; tip.id = 'context-help-' + (++serial);
      tip.textContent = node.textContent; tip.setAttribute('role', 'tooltip');
      trigger.setAttribute('aria-describedby', tip.id);
      const setOpen = value => {wrap.classList.toggle('is-open',value);trigger.setAttribute('aria-expanded',String(value));};
      trigger.addEventListener('click', event => {event.preventDefault();event.stopPropagation();setOpen(!wrap.classList.contains('is-open'));});
      wrap.addEventListener('mouseenter', () => setOpen(true));
      wrap.addEventListener('mouseleave', () => {if(!wrap.contains(document.activeElement))setOpen(false);});
      trigger.addEventListener('focus', () => {if(trigger.matches(':focus-visible'))setOpen(true);});
      trigger.addEventListener('blur', () => setOpen(false));
      trigger.addEventListener('keydown', event => {if(event.key==='Escape'){event.stopPropagation();setOpen(false);}});
      wrap.append(trigger,tip);
      const card = node.closest('button.challenge-card');
      // Keep help buttons outside the card button: valid markup and no accidental navigation.
      if(card){const notes=[...card.querySelectorAll('p,.subject-materials')];tip.textContent=notes.map(n=>n.textContent.trim()).join(' ');notes.forEach(n=>{n.hidden=true;n.dataset.helpConverted='true';});const shell=document.createElement('div');shell.className='banner-help-shell';card.before(shell);shell.append(card,wrap);}
      else node.replaceWith(wrap);
    });
  }
  const init=()=>{enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('click',event=>{if(!event.target.closest('.context-help'))document.querySelectorAll('.context-help.is-open').forEach(w=>{w.classList.remove('is-open');w.querySelector('button').setAttribute('aria-expanded','false');});});
})();
