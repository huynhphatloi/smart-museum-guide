import { languageLabel } from '../../../shared/i18n';

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
        className="border-0 border-b min-h-11 border-museum-line bg-transparent px-2 py-1.5 text-sm font-semibold text-museum-ink focus:border-museum-accent"
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
