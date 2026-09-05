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
        className="border-0 border-b border-white/35 bg-transparent px-1 py-1.5 text-sm text-white focus:border-white focus:outline-none"
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
