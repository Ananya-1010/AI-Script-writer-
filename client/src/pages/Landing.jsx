import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Eyebrow, Reveal, ThemeToggle, Wordmark } from '../components/ui.jsx'
import { stagger, springSoft } from '../lib/motion.js'

/**
 * The public page.
 *
 * Structured like a magazine feature rather than a SaaS landing page: a folio
 * rule, a standfirst, an oversized headline, then a pull-quote, a specimen of
 * the actual product output, and a numbered method. Every section is separated
 * by a hairline rather than a card, because the page should read as one
 * continuous piece of stock.
 *
 * Nothing here is a stock illustration or a floating browser mockup. The
 * strongest asset a writing tool has is the writing, so the specimen is real
 * output from the product.
 */

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: springSoft }
}

export default function Landing () {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <Hero />
      <Marquee />
      <Problem />
      <Specimen />
      <Method />
      <Principles />
      <Closing />
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------ nav -- */

function Nav () {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-shelf items-center px-6 lg:px-10">
        <Link to="/"><Wordmark /></Link>
        <span className="ml-3 hidden text-xs text-ink-tertiary sm:inline">A scripting workspace</span>

        <nav className="ml-auto flex items-center gap-6">
          <a href="#method" className="stroke-link hidden text-sm text-ink-secondary sm:inline">Method</a>
          <a href="#specimen" className="stroke-link hidden text-sm text-ink-secondary sm:inline">Specimen</a>
          <ThemeToggle />
          <Link to="/login" className="stroke-link text-sm text-ink-secondary">Sign in</Link>
          <Link to="/register" className="hidden sm:block">
            <Button variant="ink" size="sm">Start writing</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}

/* ----------------------------------------------------------------- hero -- */

function Hero () {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-shelf px-6 pb-20 pt-16 lg:px-10 lg:pb-28 lg:pt-24">
        <motion.div initial="hidden" animate="show" variants={stagger(0.09)}>
          <motion.div variants={rise}>
            <Eyebrow>Issue 01 — For people who publish</Eyebrow>
          </motion.div>

          {/*
            Oversized, and deliberately set at a measure that forces a ragged
            three-line break. A headline that fits neatly on one line at every
            width has no shape.
          */}
          <motion.h1
            variants={rise}
            className="display display-tight mt-8 max-w-[14ch] text-[clamp(3.2rem,11vw,7.4rem)] text-ink"
          >
            Everyone can
            <br />
            <span className="italic">write.</span> Almost
            <br />
            nobody can
            <br />
            <span className="relative inline-block">
              start
              {/* A hand-drawn underline. Two strokes, slightly off-register,
                  because a perfect line reads as a border. */}
              <svg
                viewBox="0 0 260 18" preserveAspectRatio="none" aria-hidden="true"
                className="absolute -bottom-1 left-0 h-3 w-full text-brass"
              >
                <motion.path
                  d="M3 12 C 60 5, 150 5, 256 9"
                  fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M8 15 C 70 9, 160 10, 250 13"
                  fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
            </span>
            .
          </motion.h1>

          {/* Standfirst and call to action stack in the same column. Pushing
              the CTA into the right margin to fill width separates it from the
              sentence that earns it. */}
          <div className="mt-14 max-w-measure">
            <motion.p variants={rise} className="text-pretty text-md leading-relaxed text-ink-secondary">
              A blank page is not a writing problem, it is a structure problem.
              Script gives you a first draft that already has a hook, a shape and
              an ending — built from your own context, in your own voice, on the
              platform you are actually publishing to.
            </motion.p>

            <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-6">
              <Link to="/register">
                <Button variant="ink" size="lg">Start writing — free</Button>
              </Link>
              <a href="#specimen" className="stroke-link text-sm text-ink-secondary">
                See what it produces
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- marquee -- */

const PLATFORMS = ['YouTube', 'Instagram Reels', 'TikTok', 'LinkedIn', 'Shorts', 'Podcast']

function Marquee () {
  const row = [...PLATFORMS, ...PLATFORMS, ...PLATFORMS]

  return (
    <section className="overflow-hidden border-b border-rule py-5" aria-label="Supported platforms">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {row.map((name, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="display text-lg text-ink-tertiary">{name}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brass" />
          </span>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- problem -- */

function Problem () {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-shelf gap-12 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
        <Reveal className="lg:col-span-4">
          <Eyebrow>The problem</Eyebrow>
        </Reveal>

        <div className="lg:col-span-8">
          <Reveal>
            <p className="display max-w-[20ch] text-[clamp(1.9rem,4vw,3.2rem)] text-ink">
              A general chatbot writes like nobody in particular, because it
              knows nothing about you.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              <div>
                <p className="measure-tight text-base leading-relaxed text-ink-secondary">
                  Every session starts from an empty prompt box. You re-explain
                  your niche, your audience, your tone, the platform — and get
                  back something fluent and generic that you then rewrite from
                  scratch.
                </p>
              </div>
              <div>
                <p className="measure-tight text-base leading-relaxed text-ink-secondary">
                  The time was never in the typing. It was in deciding what to
                  say, how to open, and how to end. That is the part a blank box
                  cannot help with.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- specimen -- */

const SPECIMEN = [
  {
    kind: 'Hook',
    author: 'ai',
    body: 'You got a twenty percent raise last year, your bank account looks healthier on paper, and yet your savings at the end of the month are somehow lower than when you started your first job.'
  },
  {
    kind: 'Point',
    author: 'creator',
    body: 'Let us start with month one after a promotion. Your in-hand salary moves from sixty thousand to seventy-five. That fifteen thousand jump feels like freedom — so you move out of the shared flat. Just like that, ten thousand of your raise is gone before you receive it.'
  },
  {
    kind: 'Call to action',
    author: 'ai',
    body: 'Open your banking app right now, download your last month of statements, and spend twenty minutes categorising every expense into needs, wants, and unconscious leaks.'
  }
]

function Specimen () {
  return (
    <section id="specimen" className="border-b border-rule bg-paper-deep">
      <div className="mx-auto max-w-shelf px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow>Specimen</Eyebrow>
            <p className="display mt-6 max-w-[16ch] text-[clamp(1.8rem,3.4vw,2.8rem)] text-ink">
              Real output, not a mockup.
            </p>
            <p className="measure-tight mt-6 text-base leading-relaxed text-ink-secondary">
              Sections arrive typed and labelled. What the model wrote is set in
              graphite. The moment you touch a line it becomes yours, and it is
              marked in red for the rest of its life.
            </p>

            <div className="mt-8 flex items-center gap-6 text-xs">
              <span className="flex items-center gap-2 text-ink-tertiary">
                <span aria-hidden="true" className="h-3 w-[3px] bg-graphite" /> model
              </span>
              <span className="flex items-center gap-2 text-ink-tertiary">
                <span aria-hidden="true" className="h-3 w-[3px] bg-brass" /> you
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            {/* The sheet is the product surface, reproduced honestly: hairline,
                warm stock, generous margin, nothing floating. */}
            <div className="sheet sheet-lifted p-8 sm:p-12">
              <p className="label text-ink-tertiary">YouTube · Educational · 8 min</p>
              <h3 className="display mt-4 text-2xl text-ink">
                Where Did My Salary Go?
              </h3>

              <div className="mt-10 space-y-8">
                {SPECIMEN.map((section) => (
                  <div key={section.kind} className="relative pl-5">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1 h-[calc(100%-0.5rem)] w-[3px] ${
                        section.author === 'creator' ? 'bg-brass' : 'bg-graphite/50'
                      }`}
                    />
                    <p className="label mb-2 text-ink-tertiary">
                      {section.kind}
                      <span className={`ml-2 ${section.author === 'creator' ? 'text-brass' : 'text-graphite'}`}>
                        {section.author === 'creator' ? 'your words' : 'model'}
                      </span>
                    </p>
                    <p className="prose-script text-ink">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- method -- */

const STEPS = [
  {
    n: '01',
    title: 'Tell it who you are, once',
    body: 'Niche, audience, tone, the things you never do. Two minutes, and every script after it carries them.'
  },
  {
    n: '02',
    title: 'Give it a rough idea',
    body: 'Plus the platform, the objective, and roughly how long. The objective becomes an invariant — nothing downstream is allowed to drift from it.'
  },
  {
    n: '03',
    title: 'Get a structured draft',
    body: 'Hook, points, transitions, call to action. Typed sections, never a wall of text, and every one of them editable.'
  },
  {
    n: '04',
    title: 'Refine without losing it',
    body: 'Improve the hook and only the hook. Change tone and keep every fact. Shorten by cutting the weakest idea, not by trimming evenly.'
  }
]

function Method () {
  return (
    <section id="method" className="border-b border-rule">
      <div className="mx-auto max-w-shelf px-6 py-20 lg:px-10 lg:py-28">
        <Reveal>
          <Eyebrow>The method</Eyebrow>
          <p className="display mt-6 max-w-[18ch] text-[clamp(1.9rem,4vw,3.2rem)] text-ink">
            Four steps, and you stay the author through all of them.
          </p>
        </Reveal>

        <div className="mt-16 divide-y divide-rule border-t border-rule">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.06}>
              <div className="group grid gap-6 py-10 sm:grid-cols-12 sm:gap-10">
                <div className="sm:col-span-2">
                  {/* Oversized numerals are the editorial device carrying this
                      section. They are the structure, not decoration. */}
                  <span className="display text-4xl text-ink-faint transition-colors duration-DEFAULT group-hover:text-brass">
                    {step.n}
                  </span>
                </div>
                <h3 className="display text-xl text-ink sm:col-span-4">{step.title}</h3>
                <p className="measure text-base leading-relaxed text-ink-secondary sm:col-span-6">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- principles -- */

const PRINCIPLES = [
  ['It will not publish for you', 'No auto-posting, no scheduling, no pretending a draft is finished.'],
  ['It will not invent a statistic', 'If a point needs a number you have to supply, it says so instead of making one up.'],
  ['It will not predict virality', 'Nobody can, and a tool that claims to is selling something.'],
  ['It will not quietly rewrite you', 'Improvements are scoped. Everything you did not ask it to touch comes back byte-identical.']
]

function Principles () {
  return (
    <section className="border-b border-rule bg-emerald text-emerald-ink">
      <div className="mx-auto max-w-shelf px-6 py-20 lg:px-10 lg:py-28">
        <Reveal>
          <p className="label flex items-center gap-2.5 text-brass">
            <span aria-hidden="true" className="h-px w-6 bg-brass" />
            What it refuses to do
          </p>
          <p className="display mt-6 max-w-[20ch] text-[clamp(1.9rem,4vw,3.2rem)] text-emerald-ink">
            A tool is defined by what it will not do to your work.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden bg-brass/25 sm:grid-cols-2">
          {PRINCIPLES.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.05} className="bg-emerald p-8 sm:p-10">
              <h3 className="display text-lg text-brass">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-ink/65">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- closing -- */

function Closing () {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-shelf px-6 py-24 text-center lg:px-10 lg:py-36">
        <Reveal>
          <p className="display display-tight mx-auto max-w-[13ch] text-[clamp(2.6rem,8vw,5.6rem)] text-ink">
            Stop staring at the <span className="italic text-brass">page</span>.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            <Link to="/register"><Button variant="ink" size="lg">Start writing — free</Button></Link>
            <Link to="/login" className="stroke-link text-sm text-ink-secondary">I already have an account</Link>
          </div>
          <p className="mt-8 text-xs text-ink-tertiary">
            No card. Your scripts, profile and knowledge stay private to you.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function Footer () {
  return (
    <footer className="mx-auto flex max-w-shelf flex-wrap items-center gap-x-8 gap-y-3 px-6 py-10 text-xs text-ink-tertiary lg:px-10">
      <Wordmark className="!text-base" />
      <span>An AI-powered scripting workspace for content creators.</span>
      <span className="ml-auto">Built with a spec, not a vibe.</span>
    </footer>
  )
}
