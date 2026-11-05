import type { CSSProperties } from "react";

/**
 * Join resolved CSS Module classes and optional state classes.
 *
 * @example
 * <button className={classNames(styles.button, isActive && styles.active)} />
 */
export function classNames(...names: (string | undefined | null | false)[]): string {
  return names.filter(Boolean).join(" ");
}

type Variables = { [name: `--${string}`]: string | number | undefined };

/**
 * Only values that depend on application data belong in authored inline styles.
 *
 * @example
 * <div style={cssVariables({ "--title-color": titleColor })} />
 * // In the CSS Module: .title { color: var(--title-color); }
 */
export function cssVariables(values: Variables | undefined): CSSProperties | undefined {
  return values as CSSProperties | undefined;
}
