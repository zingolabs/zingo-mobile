const tabs = document.querySelector('.tabs');
const show = name => {
  for (const p of document.querySelectorAll('.panel'))
    p.classList.toggle('current', p.id === name);
  for (const b of document.querySelectorAll('.tab'))
    b.classList.toggle('current', b.dataset.tab === name);
};
for (const b of document.querySelectorAll('.tab'))
  b.onclick = () => show(b.dataset.tab);
show(tabs.dataset.first);

const hashRow = location.hash
  ? document.getElementById(location.hash.slice(1))
  : null;
if (hashRow && hashRow.classList.contains('imgrow')) {
  show('images');
  requestAnimationFrame(() => hashRow.scrollIntoView());
}

const viewer = document.querySelector('.imgviewer');
if (viewer) {
  const nav = new Map();
  for (const a of document.querySelectorAll('.navitem'))
    nav.set(a.getAttribute('href').slice(1), a);
  const io = new IntersectionObserver(
    es => {
      for (const e of es)
        if (e.isIntersecting) {
          for (const a of nav.values()) a.classList.remove('on');
          nav.get(e.target.id)?.classList.add('on');
        }
    },
    { rootMargin: '-10% 0px -80% 0px' },
  );
  for (const r of document.querySelectorAll('.imgrow')) io.observe(r);
}

const lb = document.getElementById('lb');
if (lb) {
  const bg = lb.querySelector('.lb-bg');
  const li = lb.querySelector('img');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(0.32,0.72,0,1)';
  const rect = el => el.getBoundingClientRect();
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const tf = (dx, dy, s) => `translate(${dx}px,${dy}px) scale(${s})`;
  let src = null;
  let anim = null;
  let zoom = 1;
  let fit = null;

  const clear = () => {
    if (anim) {
      anim.cancel();
      anim = null;
    }
  };
  const resetZoom = () => {
    zoom = 1;
    fit = null;
    li.classList.remove('zoomed');
    li.style.transform = 'none';
    li.style.transformOrigin = '';
  };
  const zoomTo = (e, z) => {
    clear();
    if (!fit) fit = rect(li);
    const fx = clamp((e.clientX - fit.left) / fit.width, 0, 1);
    const fy = clamp((e.clientY - fit.top) / fit.height, 0, 1);
    li.style.transformOrigin = '0 0';
    li.style.transform = tf(
      -fx * fit.width * (z - 1),
      -fy * fit.height * (z - 1),
      z,
    );
    zoom = z;
    li.classList.toggle('zoomed', z > 1);
  };

  const measure = () => {
    const t = rect(li);
    const r = rect(src);
    return { t, r, s: r.width / t.width };
  };

  const reveal = () => {
    li.style.opacity = '';
    const { t, r, s } = measure();
    bg.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reduce ? 120 : 260,
      easing: 'ease',
      fill: 'both',
    });
    if (reduce) {
      li.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        fill: 'both',
      });
      return;
    }
    anim = li.animate(
      [
        {
          transformOrigin: 'top left',
          transform: tf(r.left - t.left, r.top - t.top, s),
        },
        { transformOrigin: 'top left', transform: 'none' },
      ],
      { duration: 260, easing: EASE, fill: 'both' },
    );
  };

  const open = im => {
    clear();
    resetZoom();
    src = im;
    li.style.opacity = '0';
    li.src = im.src;
    lb.classList.add('open');
    li.decode()
      .then(() => requestAnimationFrame(reveal))
      .catch(() => requestAnimationFrame(reveal));
  };

  const close = () => {
    if (!lb.classList.contains('open')) return;
    resetZoom();
    clear();
    const done = () => {
      lb.classList.remove('open');
      clear();
    };
    bg.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reduce ? 120 : 190,
      easing: 'ease',
      fill: 'both',
    });
    if (reduce || !src) {
      done();
      return;
    }
    const { t, r, s } = measure();
    anim = li.animate(
      [
        { transformOrigin: 'top left', transform: 'none' },
        {
          transformOrigin: 'top left',
          transform: tf(r.left - t.left, r.top - t.top, s),
        },
      ],
      { duration: 190, easing: EASE, fill: 'both' },
    );
    anim.onfinish = done;
  };

  for (const im of document.querySelectorAll('img.zoom'))
    im.onclick = () => open(im);
  li.onclick = e => {
    e.stopPropagation();
    zoom > 1 ? resetZoom() : zoomTo(e, 2.5);
  };
  li.onmousemove = e => {
    if (zoom > 1) zoomTo(e, zoom);
  };
  li.onwheel = e => {
    e.preventDefault();
    const z = clamp(zoom + (e.deltaY < 0 ? 0.6 : -0.6), 1, 6);
    z <= 1 ? resetZoom() : zoomTo(e, z);
  };
  lb.onclick = close;
  addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}
