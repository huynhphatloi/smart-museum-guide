import { languageLabel } from '../lib/i18n';

interface Props {
  languages: string[];
  value: string;
  onChange: (language: string) => void;
  label: string;
}

export function LanguageSelector({ languages, value, onChange, label }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        className="rounded-full border border-museum-line bg-white px-3 py-1.5 text-sm text-museum-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-museum-accent"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {languageLabel(language)}
          </option>
        ))}
      </select>
    </label>
  );
}
