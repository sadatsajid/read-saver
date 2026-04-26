'use client';

import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

const PRODUCT_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '#' },
  { label: 'API', href: '#' },
];

const COMPANY_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Contact', href: 'mailto:support@readsaver.ai' },
];

const RESOURCES_LINKS = [
  { label: 'Documentation', href: '#' },
  { label: 'Help Center', href: '#' },
  { label: 'Community', href: '#' },
  { label: 'Status', href: '#' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
  { label: 'Security', href: '#' },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        {/* Top — wordmark and tagline */}
        <div className="mb-12 sm:mb-16 max-w-xl">
          <Link href="/" className="inline-block hover:opacity-70 transition-opacity">
            <span className="text-xl font-semibold tracking-tight">
              Read<span className="text-primary">Saver</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            The world&rsquo;s news, in the time it takes to sip coffee.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 pb-12 sm:pb-16 border-b border-border/60">
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Resources" links={RESOURCES_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        {/* Bottom */}
        <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <p className="text-xs text-muted-foreground tracking-tight">
            Copyright © {new Date().getFullYear()} ReadSaver. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <SocialLink href="https://github.com" label="GitHub">
              <Github className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="https://twitter.com" label="Twitter">
              <Twitter className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="mailto:support@readsaver.ai" label="Email">
              <Mail className="h-4 w-4" />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-tight text-foreground mb-4">
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  const isPlaceholder = href === '#';

  if (isExternal) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-tight"
      >
        {children}
      </a>
    );
  }

  if (isPlaceholder) {
    return (
      <a
        href={href}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-tight"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-tight"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      {children}
    </a>
  );
}
