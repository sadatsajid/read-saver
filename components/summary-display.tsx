'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, List, FileText } from 'lucide-react';
import { linkifyText } from '@/lib/shared/utils/linkify';

interface SummaryDisplayProps {
  title: string;
  summary: {
    tldr: string[];
    takeaways: string[];
    outline: { title: string; subsections?: string[] }[];
  };
  url?: string;
}

export function SummaryDisplay({ summary }: SummaryDisplayProps) {
  const accordionItems = [
    {
      value: 'tldr',
      icon: FileText,
      title: 'TL;DR',
      badge: { text: 'Quick Summary', variant: 'secondary' as const },
      data: summary.tldr,
      renderContent: (data: string[]) => (
        <ul className="space-y-2">
          {data.map((point, i) => (
            <li key={i} className="flex gap-2 group/item">
              <span className="text-primary font-bold mt-0.5 shrink-0 text-xs group-hover/item:scale-110 transition-transform">
                •
              </span>
              <span className="text-muted-foreground text-sm leading-relaxed flex-1">
                {linkifyText(point)}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      value: 'takeaways',
      icon: Lightbulb,
      title: 'Key Takeaways',
      badge: { text: `${summary.takeaways.length} Insights`, variant: 'secondary' as const },
      data: summary.takeaways,
      renderContent: (data: string[]) => (
        <ol className="space-y-2">
          {data.map((takeaway, i) => (
            <li key={i} className="flex gap-2 group/item">
              <span className="text-primary font-semibold min-w-4 text-sm shrink-0 group-hover/item:scale-110 transition-transform">
                {i + 1}.
              </span>
              <span className="text-muted-foreground text-sm leading-relaxed flex-1">
                {linkifyText(takeaway)}
              </span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      value: 'outline',
      icon: List,
      title: 'Article Outline',
      badge: { text: 'Structure', variant: 'outline' as const },
      data: summary.outline,
      renderContent: (data: { title: string; subsections?: string[] }[]) => (
        <div className="space-y-2.5">
          {data.map((section, i) => (
            <div key={i} className="group/section">
              <h4 className="font-semibold text-foreground text-sm mb-1.5 group-hover/section:text-primary transition-colors">
                {linkifyText(section.title)}
              </h4>
              {section.subsections && section.subsections.length > 0 && (
                <ul className="ml-3 space-y-1">
                  {section.subsections.map((sub, j) => (
                    <li
                      key={j}
                      className="text-xs text-muted-foreground flex items-start gap-1.5 group/sub"
                    >
                      <span className="text-primary mt-0.5 shrink-0 group-hover/sub:scale-110 transition-transform">
                        ▸
                      </span>
                      <span className="leading-relaxed">{linkifyText(sub)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {i < data.length - 1 && <Separator className="mt-2 opacity-50" />}
            </div>
          ))}
        </div>
      ),
      condition: summary.outline && summary.outline.length > 0,
    },
  ];

  return (
    <div className="w-full space-y-3">
      <Accordion type="multiple" defaultValue={['tldr']} className="space-y-3">
        {accordionItems.map((item) => {
          if (item.condition === false) return null;

          const Icon = item.icon;
          return (
            <AccordionItem
              key={item.value}
              value={item.value}
              className="border border-border/50 rounded-lg bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2.5 w-full">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-base font-semibold flex-1 text-left">
                    {item.title}
                  </span>
                  <Badge variant={item.badge.variant} className="text-xs mr-2">
                    {item.badge.text}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-4 px-4">
                {item.renderContent(item.data as string[] & { title: string; subsections?: string[] }[])}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
