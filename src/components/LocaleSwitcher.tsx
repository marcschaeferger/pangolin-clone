import { useLocale, useTranslations } from 'next-intl';
import LocaleSwitcherSelect from './LocaleSwitcherSelect';

export default function LocaleSwitcher() {
  const t = useTranslations('locales');
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: 'en-US',
          label: t('en-US')
        },
        {
          value: 'de-DE',
          label: t('de-DE')
        }
      ]}
      label={t('label')}
    />
  );
}
