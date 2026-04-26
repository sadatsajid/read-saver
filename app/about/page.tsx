import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'About — ReadSaver',
  description:
    'ReadSaver was built for the curious — for people who want to stay informed without drowning in tabs.',
};

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 md:pt-40 md:pb-32 text-center animate-slide-up">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary mb-6">
            Our story
          </p>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[1.05]">
            Built for the
            <br />
            <span className="text-muted-foreground">endlessly curious.</span>
          </h1>
          <p className="mt-8 sm:mt-10 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe staying informed shouldn&rsquo;t cost you your evenings, your weekends, or your peace of mind.
          </p>
        </div>
      </section>

      {/* Mission — Dark */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 md:py-40 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-background/60 mb-6">
            The mission
          </p>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Knowledge,
            <br />
            <span className="text-background/60">unburdened.</span>
          </h2>
          <p className="mt-8 text-lg sm:text-xl text-background/70 max-w-2xl mx-auto leading-relaxed">
            The internet keeps producing more than any human can read. We don&rsquo;t want to replace reading — we want to give it back to you. Less skimming. More understanding. Time returned.
          </p>
        </div>
      </section>

      {/* The Why */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32 md:py-40">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary mb-6">
              Why we built it
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              We were drowning
              <br />
              <span className="text-muted-foreground">in our own tabs.</span>
            </h2>
          </div>

          <div className="space-y-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            <p>
              It started as a simple problem. Sixty open tabs. Three hundred bookmarked articles. A reading list longer than a lifetime.
            </p>
            <p>
              We wanted to stay current — on tech, on world events, on the ideas shaping our work. But the math never added up. Every minute of reading was a minute stolen from something else.
            </p>
            <p className="text-foreground">
              So we built ReadSaver. Not to summarize for the sake of summarizing — but to make every article a conversation. To turn the firehose into a feed of insights. To give curiosity a fighting chance.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="text-center mb-16 sm:mb-24">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary mb-6">
              What we stand for
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Three principles.
              <br />
              <span className="text-muted-foreground">No exceptions.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden">
            <Principle
              eyebrow="01"
              title="Clarity over cleverness."
              description="A good summary is one you can act on. We optimize for what you take away — not for sounding smart."
            />
            <Principle
              eyebrow="02"
              title="Sources, always."
              description="Every answer cites the source. You should never have to take an AI&rsquo;s word for it. Trust is earned in the receipts."
            />
            <Principle
              eyebrow="03"
              title="Your time is sacred."
              description="No ads. No tracking pixels. No engagement bait. ReadSaver exists to give you minutes back — not steal them."
            />
          </div>
        </div>
      </section>

      {/* Stats / Quiet pride */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 md:py-40">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
              A small team.
              <br />
              <span className="text-muted-foreground">An ambitious idea.</span>
            </h2>
            <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ReadSaver is built by a tiny team of engineers and designers who believe the future of reading isn&rsquo;t about reading more — it&rsquo;s about reading better.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto">
            <Stat value="20s" label="average summary time" />
            <Stat value="∞" label="articles supported" />
            <Stat value="1" label="goal — your time back" />
          </div>
        </div>
      </section>

      {/* Closing — Dark Emotional */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 py-32 sm:py-40 md:py-48 text-center">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[1.02]">
            The world is loud.
          </h2>
          <p className="mt-6 sm:mt-8 text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-background/50 leading-[1.05]">
            We&rsquo;re here to make it clear.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-4xl px-6 py-32 sm:py-40 md:py-48 text-center">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[1.05]">
            Read smarter.
            <br />
            <span className="text-muted-foreground">Starting now.</span>
          </h2>
          <p className="mt-8 sm:mt-10 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join thousands who&rsquo;ve already taken back their reading time.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <Button size="lg" className="rounded-full text-base px-8 h-12">
                Try ReadSaver — Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Principle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background p-8 sm:p-10 md:p-12 flex flex-col gap-6 min-h-[320px]">
      <span className="text-sm font-medium text-primary tracking-wide">
        {eyebrow}
      </span>
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight text-primary leading-none">
        {value}
      </div>
      <div className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground tracking-wide">
        {label}
      </div>
    </div>
  );
}
