import { Link } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { resolveInitialLanguage } from '../../../shared/i18n/language';
import { StateScreen } from './StateScreen';

export function NotFoundPage() {
  const language = resolveInitialLanguage(['vi', 'en', 'ja', 'ko', 'zh', 'fr'], 'vi');

  return (
    <StateScreen
      tone="error"
      title={t(language, 'invalidQrTitle')}
      body={t(language, 'invalidQrBody')}
      action={
        <Link
          className="bg-museum-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-museum-accent active:translate-y-px"
          to="/"
        >
          {t(language, 'openZone')}
        </Link>
      }
    />
  );
}
