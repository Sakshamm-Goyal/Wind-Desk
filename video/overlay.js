// Injected into every page of the recording: captions, fake cursor, focus ring, full-screen slides.
(() => {
  const css = `
  #__cover{position:fixed;inset:0;background:#f7f8fa;z-index:10000;transition:opacity .4s}
  #__cap{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:1340px;padding:14px 26px;border-radius:16px;
    background:rgba(22,26,35,.86);color:#fff;font:500 27px/1.35 Figtree,system-ui,sans-serif;text-align:center;z-index:10003;
    box-shadow:0 10px 40px -10px rgba(0,0,0,.35);transition:opacity .2s;opacity:0;pointer-events:none}
  #__cap.on{opacity:1}
  #__cur{position:fixed;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;z-index:10004;pointer-events:none;transition:transform .05s;opacity:0}
  #__cur.on{opacity:1}
  #__slide.on ~ #__cur{opacity:0}
  #__cur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
  .__rip{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #5b61d6;z-index:10002;pointer-events:none;animation:__rip .6s ease-out forwards}
  @keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #__ring{position:fixed;border:3px solid #5b61d6;border-radius:22px;z-index:10001;pointer-events:none;opacity:0;transition:all .45s cubic-bezier(.2,.7,.2,1);box-shadow:0 0 0 9999px rgba(22,26,35,.0)}
  #__ring.on{opacity:1;box-shadow:0 0 0 9999px rgba(22,26,35,.10)}
  #__part{position:fixed;top:18px;right:22px;z-index:10003;padding:8px 16px;border-radius:999px;background:#fff;border:1px solid #e3e6ec;
    font:500 17px Figtree,system-ui,sans-serif;color:#454bc0;opacity:0;transition:opacity .3s}
  #__part.on{opacity:1}
  #__slide{position:fixed;inset:0;z-index:9999;background:#f7f8fa;display:flex;align-items:center;justify-content:center;opacity:0;
    transition:opacity .45s;pointer-events:none;font-family:Figtree,system-ui,sans-serif;color:#161a23}
  #__slide.on{opacity:1}
  `
  function mount() {
    if (document.getElementById('__cap')) return
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
    const mk = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d }
    mk('__cover'); mk('__slide'); mk('__ring'); mk('__part'); mk('__cap')
    const cur = mk('__cur', '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.5-3.5 6.5z" fill="#161a23" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>')
    addEventListener('mousemove', e => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; cur.classList.add('on') }, true)
    addEventListener('mousedown', e => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700) }, true)
  }
  window.__demo = {
    cap(t) { const c = document.getElementById('__cap'); if (t) c.textContent = t; c.classList.toggle('on', !!t) },
    part(t) { const p = document.getElementById('__part'); if (t) p.textContent = t; p.classList.toggle('on', !!t) },
    uncover() { const c = document.getElementById('__cover'); if (!c) return; c.style.opacity = 0; setTimeout(() => c.remove(), 450) },
    slide(html) { const s = document.getElementById('__slide'); s.innerHTML = html; s.querySelectorAll('pre code').forEach(el => window.hljs?.highlightElement(el)); s.classList.add('on') },
    hide() { document.getElementById('__slide').classList.remove('on') },
    ring(r) { const g = document.getElementById('__ring'); if (!r) return g.classList.remove('on'); const p = 10; Object.assign(g.style, { left: r.x - p + 'px', top: r.y - p + 'px', width: r.width + 2 * p + 'px', height: r.height + 2 * p + 'px' }); g.classList.add('on') },
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount()
})()
