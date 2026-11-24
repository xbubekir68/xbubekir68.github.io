export type PlayerAction = 'left' | 'right' | 'jump' | 'slide' | 'look' | 'throw' | 'pause';

interface BufferedAction {
  action: 'left' | 'right' | 'jump' | 'slide' | 'look' | 'throw';
  expiresAt: number;
}

const BUFFER_WINDOW_MS = 150;
const SWIPE_THRESHOLD_PX = 26;

export class InputController {
  private queue: BufferedAction[] = [];
  private onPauseCallback: (() => void) | null = null;
  private onAnyInteraction: (() => void) | null = null;

  private touchStartX = 0;
  private touchStartY = 0;
  private touchConsumed = false;
  private touchActive = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;

  constructor(targetElement: HTMLElement) {
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundTouchStart = (e) => this.handleTouchStart(e);
    this.boundTouchMove = (e) => this.handleTouchMove(e);
    this.boundTouchEnd = () => this.handleTouchEnd();

    window.addEventListener('keydown', this.boundKeyDown);
    targetElement.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    targetElement.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    targetElement.addEventListener('touchend', this.boundTouchEnd, { passive: true });
    targetElement.addEventListener('touchcancel', this.boundTouchEnd, { passive: true });
  }

  public setCallbacks(opts: {
    onPause: () => void;
    onInteraction: () => void;
  }): void {
    this.onPauseCallback = opts.onPause;
    this.onAnyInteraction = opts.onInteraction;
  }

  public clearQueue(): void {
    this.queue.length = 0;
  }

  public pushAction(action: 'left' | 'right' | 'jump' | 'slide' | 'look' | 'throw'): void {
    this.onAnyInteraction?.();
    this.queue.push({
      action,
      expiresAt: performance.now() + BUFFER_WINDOW_MS,
    });
  }

  public consumeActions(): Array<'left' | 'right' | 'jump' | 'slide' | 'look' | 'throw'> {
    const now = performance.now();
    const valid = this.queue.filter((item) => item.expiresAt >= now).map((i) => i.action);
    this.queue.length = 0;
    return valid;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.pushAction('left');
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.pushAction('right');
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.pushAction('jump');
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.pushAction('slide');
        break;
      case 'KeyQ': e.preventDefault(); this.pushAction('look'); break;
      case 'KeyB': e.preventDefault(); this.pushAction('throw'); break;
      case 'Escape':
      case 'KeyP':
        e.preventDefault();
        this.onAnyInteraction?.();
        this.onPauseCallback?.();
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, label, [data-ui-interactive]')) {
      return;
    }
    if (e.touches.length !== 1) return;
    this.onAnyInteraction?.();
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchConsumed = false;
    this.touchActive = true;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.touchActive || e.touches.length !== 1) return;
    // Prevent browser pull-to-refresh or rubber-band scrolling during gameplay swipes
    e.preventDefault();

    if (this.touchConsumed) return;

    const dx = e.touches[0].clientX - this.touchStartX;
    const dy = e.touches[0].clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) return;

    this.touchConsumed = true;
    if (absX > absY) {
      this.pushAction(dx > 0 ? 'right' : 'left');
    } else {
      this.pushAction(dy > 0 ? 'slide' : 'jump');
    }
  }

  private handleTouchEnd(): void {
    this.touchActive = false;
    this.touchConsumed = false;
  }

  public dispose(targetElement: HTMLElement): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    targetElement.removeEventListener('touchstart', this.boundTouchStart);
    targetElement.removeEventListener('touchmove', this.boundTouchMove);
    targetElement.removeEventListener('touchend', this.boundTouchEnd);
    targetElement.removeEventListener('touchcancel', this.boundTouchEnd);
  }
}
