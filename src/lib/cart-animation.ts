const CART_TARGET_SELECTOR = "[data-cart-target]";

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function findCartTarget() {
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>(CART_TARGET_SELECTOR),
  ).filter(isVisible);

  if (window.matchMedia("(max-width: 800px)").matches) {
    return targets.find((target) => target.closest(".mobile-nav")) || targets[0];
  }

  return targets.find((target) => target.closest(".site-header")) || targets[0];
}

function bumpCart(target: HTMLElement) {
  target.classList.remove("cart-bump");
  window.requestAnimationFrame(() => {
    target.classList.add("cart-bump");
    window.setTimeout(() => target.classList.remove("cart-bump"), 520);
  });
}

export function animateProductToCart(source: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const target = findCartTarget();
  if (!target) return;

  if (!source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bumpCart(target);
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const size = Math.max(68, Math.min(118, sourceRect.width));
  const startX = sourceRect.left + sourceRect.width / 2 - size / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - size / 2;
  const endX = targetRect.left + targetRect.width / 2 - size / 2;
  const endY = targetRect.top + targetRect.height / 2 - size / 2;
  const flyer = source.cloneNode(true) as HTMLElement;

  flyer.removeAttribute("sizes");
  flyer.removeAttribute("srcset");
  flyer.setAttribute("aria-hidden", "true");
  flyer.className = "cart-flyer";
  Object.assign(flyer.style, {
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  document.body.appendChild(flyer);

  const animation = flyer.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate3d(${(endX - startX) * 0.45}px, ${Math.min(-110, (endY - startY) * 0.28)}px, 0) scale(.78)`,
        opacity: 0.95,
        offset: 0.48,
      },
      {
        transform: `translate3d(${endX - startX}px, ${endY - startY}px, 0) scale(.18)`,
        opacity: 0.2,
      },
    ],
    {
      duration: 760,
      easing: "cubic-bezier(.22,.72,.22,1)",
      fill: "forwards",
    },
  );

  animation.finished
    .catch(() => undefined)
    .finally(() => {
      flyer.remove();
      bumpCart(target);
    });
}
