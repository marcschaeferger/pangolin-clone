'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@app/components/ui/dropdown-menu';
import { Button } from '@app/components/ui/button';
import { Check, Languages } from 'lucide-react';
import clsx from 'clsx';
import { useTransition } from 'react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
  label
}: Props) {
  const [isPending, startTransition] = useTransition();

  async function onChange(value: string) {
    const locale = value as Locale;
    startTransition(async () => {
      await setUserLocale(locale);
      // Add a small delay to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 100));
      // Use full page reload instead of client-side navigation
      window.location.reload();
    });
  }

  const selected = items.find((item) => item.value === defaultValue);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={clsx(
            'w-full rounded-sm h-8 gap-2 justify-start font-normal',
            isPending && 'pointer-events-none opacity-50'
          )}
          aria-label={label}
        >
          <Languages className="h-4 w-4" />
          <span className="text-left flex-1">
            {selected?.label ?? label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onChange(item.value)}
            className="flex items-center gap-2"
          >
            {item.value === defaultValue && (
              <Check className="h-4 w-4" />
            )}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
