import type { ReactNode } from 'react';
import { audio } from '../../audio/audio';

export function Toggle({ label, icon, checked, onChange }: { label: string; icon?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ffn-toggle">
      {icon && <span className="ffn-toggle-icon">{icon}</span>}
      <span className="ffn-toggle-label">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          audio.play('click');
          onChange(e.target.checked);
        }}
      />
      <span className="ffn-switch" aria-hidden="true" />
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ffn-segmented" role="radiogroup" aria-label={label}>
      <span className="ffn-toggle-label">{label}</span>
      <div className="ffn-segmented-opts">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-on' : ''}
            onClick={() => {
              audio.play('click');
              onChange(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
