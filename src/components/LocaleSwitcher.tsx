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
          value: 'de-DE',
          label: 'German'
        }
      ]}
      label='Language'
    />
  );
}
