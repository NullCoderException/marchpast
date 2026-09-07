/**
 * The three lines of DOM plumbing the controls would otherwise repeat: making
 * an element with a class and some text, registering a listener that the
 * player can take back off again when it is destroyed, and asking whether a
 * key press is the plain one a shortcut answers to.
 */

/**
 * Whether `event` is the bare key rather than a chord: every shortcut on the
 * page belongs to the unmodified press, and Ctrl or Alt or the Command key is
 * the browser's or the operating system's business.
 */
export function plainKey(event: KeyboardEvent): boolean {
  return !event.altKey && !event.ctrlKey && !event.metaKey;
}

/** An element with a class and, when given, its text. */
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Collects listeners so every one of them comes off in a single call. */
export class Listeners {
  private readonly registered: (() => void)[] = [];

  /** Registers a listener and remembers how to take it off again. */
  on<E extends Event>(target: EventTarget, type: string, handler: (event: E) => void): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener);
    this.registered.push(() => target.removeEventListener(type, listener));
  }

  /** Takes every listener registered so far back off. */
  removeAll(): void {
    for (const remove of this.registered.splice(0)) remove();
  }
}
