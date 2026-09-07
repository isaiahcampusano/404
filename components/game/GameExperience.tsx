'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, type GameSnapshot } from './engine/GameEngine';

const initial: GameSnapshot = { phase: 'ready', score: 0, highScore: 0, speed: 17, action: 'run' };

export function GameExperience() {
  const mountRef = useRef<HTMLDivElement>(null); const engineRef = useRef<GameEngine | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState(initial); const [flash, setFlash] = useState(false);
  const start = useCallback(() => engineRef.current?.start(), []); const jump = useCallback(() => engineRef.current?.jump(), []); const duck = useCallback(() => engineRef.current?.duck(), []); const moveLeft = useCallback(() => engineRef.current?.moveLane(-1), []); const moveRight = useCallback(() => engineRef.current?.moveLane(1), []);
  const handleSnapshot = useCallback((next: GameSnapshot) => {
    setSnapshot(next);
    if (next.phase === 'over') {
      setFlash(true);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlash(false), 120);
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return; const engine = new GameEngine(mountRef.current, handleSnapshot); engineRef.current = engine;
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ControlLeft', 'ControlRight'].includes(event.code)) event.preventDefault();
      if (event.code === 'Space' || event.code === 'ArrowUp') engine.primaryAction();
      else if (event.code === 'ArrowDown' || event.code.startsWith('Control')) engine.duck();
      else if (event.code === 'ArrowLeft' || event.code === 'KeyA') engine.moveLane(-1);
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') engine.moveLane(1);
    };
    window.addEventListener('keydown', onKeyDown);
    if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    return () => { window.removeEventListener('keydown', onKeyDown); if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current); engine.destroy(); engineRef.current = null; };
  }, [handleSnapshot]);
  const padded = (value: number) => String(value).padStart(5, '0');
  const unlockMessage = snapshot.score < 150 ? 'Cacti detected' : snapshot.score < 260 ? 'Clusters online' : 'Airspace active';

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-canvas" aria-label="Three-lane first-person endless runner game view" />
      <div className={`flash ${flash ? 'on' : ''}`} />
      <section className="hud" aria-live="polite">
        <header className="topbar">
          <div className="brand"><span className="signal"><i /><i /><i /></span><span>404 // No signal</span></div>
          <div className="scoreboard"><div>Velocity<span>{snapshot.speed.toFixed(1)}</span></div><div>HI {padded(snapshot.highScore)}<span>{padded(snapshot.score)}</span></div></div>
        </header>
        {snapshot.phase === 'running' && <div className="status-pill">{snapshot.action === 'run' ? unlockMessage : snapshot.action.toUpperCase()}</div>}
        {snapshot.phase !== 'running' && (
          <div className="center-card">
            <p className="eyebrow">{snapshot.phase === 'over' ? `Run ended // ${padded(snapshot.score)}m` : 'Connection unavailable'}</p>
            <h1 className="title">{snapshot.phase === 'over' ? 'Game over' : 'No signal'}<small>Keep moving forward</small></h1>
            <div className="rule" /><p className="prompt">{snapshot.phase === 'over' ? 'The signal dropped. Reconnect and run again.' : 'Press space to play'}</p>
            <p className="subprompt">Switch lanes // Jump cacti // Duck head-height flyers</p>
            <button className="start-button" onClick={start}>{snapshot.phase === 'over' ? 'Run again' : 'Start run'}</button>
          </div>
        )}
        <div className="controls" aria-hidden="true"><span className="key">A / ←</span> left <span className="key">Space / ↑</span> jump <span className="key">↓ / Ctrl</span> duck <span className="key">D / →</span> right</div>
      </section>
      {snapshot.phase === 'running' && <div className="mobile-controls"><button onPointerDown={moveLeft} aria-label="Move left">← Left</button><button onPointerDown={jump} aria-label="Jump">↑ Jump</button><button onPointerDown={duck} aria-label="Duck">↓ Duck</button><button onPointerDown={moveRight} aria-label="Move right">Right →</button></div>}
    </main>
  );
}
