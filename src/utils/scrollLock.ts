let lockCount = 0;

const LOCK_CLASS = 'scroll-locked';

/**
 * Modern Scroll Lock
 * Use this in combination with the CSS provided below.
 */
export function lockBodyScroll(): void {
  lockCount += 1;

  if (lockCount === 1) {
    // Capture the current scroll position so the page doesn't jump to top
    const scrollY = window.scrollY;
    document.documentElement.style.top = `-${scrollY}px`;
    document.documentElement.classList.add(LOCK_CLASS);
  }
}

export function unlockBodyScroll(): void {
  if (lockCount <= 0) {
    lockCount = 0;
    return;
  }

  lockCount -= 1;

  if (lockCount === 0) {
    const scrollY = document.documentElement.style.top;
    document.documentElement.classList.remove(LOCK_CLASS);
    document.documentElement.style.top = '';
    // Restore the scroll position
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }
}

export function resetBodyScroll(): void {
  lockCount = 0;
  document.documentElement.classList.remove(LOCK_CLASS);
  document.documentElement.style.top = '';
  document.documentElement.style.overflow = '';
}