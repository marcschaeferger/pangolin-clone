import { useLocale } from 'next-intl';
import LocaleSwitcherSelect from './LocaleSwitcherSelect';

export default function LocaleSwitcher() {
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: 'en-US',
          label: 'Englisch'
        },
        {
          value: 'fr-FR',
          label: 'French'
        },
        {
          value: 'de-DE',
          label: 'German'
        },
        {
          value: 'it-IT',
          label: 'Italian'
        },
        {
          value: 'pl-PL',
          label: 'Polish'
        },
        {
          value: 'pt-PT',
          label: 'Portuguese'
        },
        {
          value: 'tr-TR',
          label: 'Turkish'
        }
      ]}
      label='Language'
    />
  );
}
