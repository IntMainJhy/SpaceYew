'use client';
import {useLocale} from './LocaleProvider';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {gsap} from 'gsap';
import {Icon} from './Icons';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
type Item = {title: string; url: string; kind: string};
type Config = {enabled: boolean; items: Item[]};
export function SitePromotion({config}: {config: Config}) {
  const path = usePathname();
  return path === '/' || path === '/admin' || path.startsWith('/admin/') ? null : <PromotionBar config={config}/>;
}
export function PromotionBar({config}: {config: Config}) {const {t:tr}=useLocale();
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [reduced, setReduced] = useState(true), [hidden, setHidden] = useState(false), [visible, setVisible] = useState(false);
  const [motion, setMotion] = useState({copies:1, seconds:30});
  const bar = useRef<HTMLElement>(null), viewport = useRef<HTMLDivElement>(null), cycle = useRef<HTMLDivElement>(null);
  const closeMotion = useRef<gsap.Context | null>(null);
  const signature = 'site-promotion:' + JSON.stringify(config);
  const staticView = reduced || keyboardFocus;
  useLayoutEffect(() => {
    closeMotion.current?.revert(); closeMotion.current = null; setClosing(false);
    try {setDismissed(sessionStorage.getItem(signature) === 'closed');} catch { /* Dismissal remains available in memory. */ }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches), visibility = () => setHidden(document.hidden);
    update(); visibility(); media.addEventListener('change', update); document.addEventListener('visibilitychange', visibility);
    return () => {media.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility);};
  }, [signature]);
  useLayoutEffect(() => {
    if (dismissed) {closeMotion.current?.revert(); closeMotion.current = null;}
  }, [dismissed]);
  useEffect(() => () => closeMotion.current?.revert(), []);
  useEffect(() => {
    const element = bar.current, windowElement = viewport.current, content = cycle.current;
    if (!element || !windowElement || !content) return;
    const measure = () => {
      const width = content.getBoundingClientRect().width;
      if (!width) return;
      const copies = Math.max(1, Math.ceil(windowElement.clientWidth / width));
      // One content group always fills the viewport; its identical twin closes the loop.
      const seconds = width * copies / 34;
      setMotion(previous => previous.copies === copies && previous.seconds === seconds ? previous : {copies, seconds});
    };
    const resize = new ResizeObserver(measure); resize.observe(windowElement); resize.observe(content); measure();
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting)); intersection.observe(element);
    return () => {resize.disconnect(); intersection.disconnect();};
  }, [signature, dismissed]);
  useEffect(() => {
    if (!viewport.current) return;
    if (!staticView) viewport.current.scrollLeft = 0;
    else if (viewport.current.contains(document.activeElement)) (document.activeElement as HTMLElement)?.scrollIntoView({block:'nearest', inline:'nearest'});
  }, [staticView]);
  if (!config.enabled || !config.items.length || dismissed) return null;
  function close() {
    const element = bar.current;
    if (closing || closeMotion.current || !element) return;
    try {sessionStorage.setItem(signature, 'closed');} catch { /* No storage is required to close the bar. */ }
    const keyboard = document.activeElement instanceof HTMLElement && document.activeElement.matches(':focus-visible');
    const finish = () => {setDismissed(true); if (keyboard) document.querySelector<HTMLElement>('.organic-brand')?.focus({preventScroll:true});};
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {finish(); return;}
    setClosing(true);
    const inner = element.querySelector('.promotion-inner'), icon = element.querySelector('.promotion-controls svg');
    closeMotion.current = gsap.context(() => {
      gsap.set(element, {height:element.getBoundingClientRect().height, overflow:'hidden'});
      gsap.timeline({onComplete:finish})
        .to(inner, {y:-6, opacity:0, duration:.14, ease:'power2.in'}, 0)
        .to(icon, {rotation:-90, scale:.75, duration:.14, ease:'power2.in'}, 0)
        .to(element, {height:0, duration:.26, ease:'power3.inOut'}, .04);
    }, element);
  }
  const stopped = closing || reduced || keyboardFocus || hidden || !visible;
  return <aside ref={bar} className="promotion-bar" aria-label={tr("广告与站内推荐")} aria-roledescription="跑马灯" data-static={staticView || undefined} data-closing={closing || undefined} onFocusCapture={event => setKeyboardFocus((event.target as HTMLElement).matches(':focus-visible'))} onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false);}}>
    <div className="promotion-inner">
      <div ref={viewport} className="promotion-viewport" aria-live="off">
        <div className="promotion-track" style={{'--promotion-duration':motion.seconds+'s', '--promotion-state':stopped?'paused':'running'} as React.CSSProperties}>
          {[0,1].map(group => <div className={'promotion-group'+(group?' promotion-clone':'')} key={group} aria-hidden={group?true:undefined}>
            {Array.from({length:motion.copies}, (_,copy) => <div className={'promotion-cycle'+(copy?' promotion-clone':'')} key={copy} ref={!group&&!copy?cycle:undefined} aria-hidden={copy?true:undefined}>
              {config.items.map((item,index) => <div className="promotion-item" key={index}>
                <span className="promotion-label"><Icon name={item.kind === 'ad' ? 'tag' : item.url.startsWith('/community') ? 'comment' : item.url.startsWith('/projects') ? 'grid' : item.url.startsWith('/resources') ? 'link' : 'bell'}/><span>{item.kind === 'ad' ? tr("广告") : tr("站内推荐")}</span></span>
                {item.url.startsWith('/') && !item.url.startsWith('//') ? <Link href={item.url} prefetch={false} title={item.title} tabIndex={group||copy?-1:undefined}>{item.title}</Link> : item.url ? <a href={item.url} title={item.title} tabIndex={group||copy?-1:undefined} target="_blank" rel={item.kind === 'ad' ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}>{item.title}</a> : <span className="promotion-title">{item.title}</span>}
              </div>)}
            </div>)}
          </div>)}
        </div>
      </div>
      <div className="promotion-controls">
        <button type="button" aria-label={tr("关闭推广条")} disabled={closing} onClick={close}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
      </div>
    </div>
  </aside>;
}
