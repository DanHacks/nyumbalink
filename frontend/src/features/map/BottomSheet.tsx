import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Snap = 'peek' | 'half' | 'full';

const SNAP_VH: Record<Snap, number> = { peek: 18, half: 52, full: 88 };

export default function BottomSheet({
  children,
  snap,
  onSnapChange,
  className,
}: {
  children: ReactNode;
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  className?: string;
}) {
  const [dragY, setDragY] = useState<number | null>(null);
  const [desktop, setDesktop] = useState(false);
  const startRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => setDragY(null), [snap]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const height = dragY ?? 0;

  return (
    <div
      className={cn(
        'pointer-events-auto absolute inset-x-0 bottom-0 z-[900] flex flex-col rounded-t-3xl border-t border-black/5 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] transition-[height] duration-300 ease-out',
        dragY !== null && 'transition-none',
        desktop && 'inset-x-auto inset-y-0 right-0 w-[min(40%,460px)] rounded-none rounded-l-3xl border-l border-t-0 pt-4 shadow-[-12px_0_40px_rgba(15,23,42,0.12)]',
        className,
      )}
      style={desktop ? undefined : { height: dragY !== null ? `${height}px` : `${SNAP_VH[snap]}vh` }}
    >
      <div
        className={cn('shrink-0 cursor-grab touch-none px-4 pb-2 pt-3 active:cursor-grabbing', desktop && 'hidden')}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          startRef.current = e.clientY;
          heightRef.current = (SNAP_VH[snap] / 100) * window.innerHeight;
          setDragY(heightRef.current);
        }}
        onPointerMove={(e) => {
          if (dragY === null) return;
          const next = heightRef.current - (e.clientY - startRef.current);
          setDragY(Math.min(window.innerHeight * 0.92, Math.max(80, next)));
        }}
        onPointerUp={() => {
          if (dragY === null) return;
          const pct = (dragY / window.innerHeight) * 100;
          const best = (['peek', 'half', 'full'] as Snap[]).reduce((a, b) =>
            Math.abs(SNAP_VH[a] - pct) < Math.abs(SNAP_VH[b] - pct) ? a : b,
          );
          setDragY(null);
          onSnapChange(best);
        }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
    </div>
  );
}

export type { Snap };
