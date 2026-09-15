/**
 * Motion vocabulary.
 *
 * One place so every screen moves the same way. Two principles:
 *
 *   SPRINGS, NOT DURATIONS. A tween says "the page changed". A spring says
 *   "the object moved" — it carries mass and settles, which is what makes an
 *   interface feel physical rather than animated.
 *
 *   MOTION EXPLAINS STRUCTURE. Children stagger in reading order so the eye is
 *   led through the hierarchy. Decorative motion that explains nothing is worse
 *   than none, because it costs attention and returns nothing.
 */

/** Default for anything that moves position or scale. */
export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }

/** Softer, for large surfaces where a snappy spring reads as twitchy. */
export const springSoft = { type: 'spring', stiffness: 220, damping: 30, mass: 1 }

/** Fast and tight, for press feedback that must feel instant. */
export const springSnap = { type: 'spring', stiffness: 600, damping: 26, mass: 0.6 }

/** For opacity-only changes, where a spring has nothing to overshoot. */
export const ease = { duration: 0.42, ease: [0.22, 1, 0.36, 1] }

/* ----------------------------------------------------------------- lists -- */

export const stagger = (gap = 0.055, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } }
})

export const riseIn = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springSoft }
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: ease }
}

/** Scale-in for things that should feel like they arrived, not slid. */
export const popIn = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring }
}

/* ------------------------------------------------------------ page level -- */

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }
}

/* ----------------------------------------------------------- interaction -- */

/** Press feedback. Scale only — never translate, which drags the text with it. */
export const press = { whileTap: { scale: 0.97 }, transition: springSnap }

export const lift = {
  whileHover: { y: -2, transition: spring },
  whileTap: { y: 0, scale: 0.995 }
}
