import { useEffect, useState } from 'react';

// Returns [ref, inView]. Once the element has entered the viewport (within
// `rootMargin`), inView latches true and stays true — we don't want to unload
// a card's articles when it scrolls away. Use to defer off-screen work.
export function useInView(ref, { rootMargin = '600px' } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, inView, rootMargin]);

  return inView;
}
