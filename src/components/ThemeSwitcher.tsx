import { Palette } from 'lucide-react';
import { themeIds, themeLabels } from '../lib/options';
import type { ThemeId } from '../types/app';

interface ThemeSwitcherProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => Promise<void>;
}

export default function ThemeSwitcher({ themeId, onThemeChange }: ThemeSwitcherProps) {
  return (
    <label className="theme-switcher">
      <Palette size={16} />
      <select value={themeId} onChange={(event) => void onThemeChange(event.target.value as ThemeId)}>
        {themeIds.map((id) => (
          <option key={id} value={id}>
            {themeLabels[id]}
          </option>
        ))}
      </select>
    </label>
  );
}
