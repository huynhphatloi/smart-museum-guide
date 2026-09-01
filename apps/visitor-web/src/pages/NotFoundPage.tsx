import { Link } from 'react-router-dom';
import { StateScreen } from '../components/StateScreen';
import { t } from '../lib/i18n';
import { resolveInitialLanguage } from '../lib/language';

export function NotFoundPage() {
  const language = resolveInitialLanguage(['vi', 'en', 'ja', 'ko', 'zh', 'fr'], 'vi');

  return (
    <StateScreen
      tone="error"
      title={t(language, 'invalidQrTitle')}
      body={t(language, 'invalidQrBody')}
      action={
        <Link className="rounded-full bg-museum-ink px-5 py-2 text-sm text-white" to="/">
          {t(language, 'openZone')}
        </Link>
      }
    />
  );
}
