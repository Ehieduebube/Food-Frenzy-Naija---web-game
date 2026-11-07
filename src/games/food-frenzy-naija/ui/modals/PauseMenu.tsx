import { ExitIcon, MusicIcon, PlayIcon, RetryIcon, SoundIcon } from '../../art/icons';
import { useProfile } from '../../progress/profileStore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Toggle } from '../common/Toggle';

export function PauseMenu({
  onResume,
  onRestart,
  onExit,
  exitLabel,
}: {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  exitLabel: string;
}) {
  const settings = useProfile((s) => s.save.settings);
  const setSettings = useProfile((s) => s.setSettings);
  return (
    <Modal title="Paused" onClose={onResume} className="ffn-pause">
      <div className="ffn-modal-actions is-stack">
        <Button variant="green" size="lg" icon={<PlayIcon />} onClick={onResume} autoFocus>
          Resume
        </Button>
        <Button variant="orange" icon={<RetryIcon />} onClick={onRestart}>
          Restart level
        </Button>
      </div>
      <div className="ffn-settings-list" aria-label="Sound settings">
        <Toggle label="Sound effects" icon={<SoundIcon muted={!settings.sfx} />} checked={settings.sfx} onChange={(v) => setSettings({ sfx: v })} />
        <Toggle label="Music" icon={<MusicIcon muted={!settings.music} />} checked={settings.music} onChange={(v) => setSettings({ music: v })} />
      </div>
      <Button variant="purple" icon={<ExitIcon />} onClick={onExit}>
        {exitLabel}
      </Button>
    </Modal>
  );
}
