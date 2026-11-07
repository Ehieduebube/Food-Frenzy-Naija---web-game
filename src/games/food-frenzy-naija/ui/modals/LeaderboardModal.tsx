import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardView } from '../../platform';
import { useProfile } from '../../progress/profileStore';
import { totalBestScore } from '../../progress/saveSchema';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useUi } from '../uiStore';

type BoardState = { status: 'loading' } | { status: 'ready'; board: LeaderboardView } | { status: 'error' };

const fmt = (n: number) => n.toLocaleString('en-US');

/** The host platform's leaderboard. Only reachable while the platform is connected. */
export function LeaderboardModal() {
  const platform = useUi((s) => s.platform);
  const player = useUi((s) => s.player);
  const close = useUi((s) => s.close);
  const total = useProfile((s) => totalBestScore(s.save));
  const [state, setState] = useState<BoardState>({ status: 'loading' });
  const mounted = useRef(true);

  const load = useCallback(() => {
    if (!platform) return;
    setState({ status: 'loading' });
    platform.leaderboard().then(
      (board) => mounted.current && setState({ status: 'ready', board }),
      () => mounted.current && setState({ status: 'error' }),
    );
  }, [platform]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const me = state.status === 'ready' ? state.board.me : null;

  return (
    <Modal title="Leaderboard" onClose={close} className="ffn-leaderboard">
      <p className="ffn-modal-text ffn-lb-intro">
        Your total of best level scores: <strong>{fmt(total)}</strong>
        {me && <span className="ffn-lb-rank">{me.label}</span>}
      </p>
      {player?.mode === 'test' && <p className="ffn-lb-test">Test board (sandbox)</p>}

      {state.status === 'loading' && <p className="ffn-muted" role="status">Loading the board…</p>}

      {state.status === 'error' && (
        <>
          <p className="ffn-modal-text">Couldn't load the leaderboard right now. Check your connection and try again.</p>
          <Button variant="orange" size="sm" onClick={load}>
            Try again
          </Button>
        </>
      )}

      {state.status === 'ready' &&
        (state.board.top.length === 0 ? (
          <p className="ffn-modal-text">No scores yet. Finish a level to put your name on the board!</p>
        ) : (
          <ol className="ffn-lb-list">
            {state.board.top.map((row) => (
              <li key={`${row.rank}-${row.name}`} className={me?.rank === row.rank ? 'is-me' : undefined}>
                <span className="ffn-lb-pos">{row.rank}</span>
                <span className="ffn-lb-name">{row.name}</span>
                <span className="ffn-lb-score">{fmt(row.score)}</span>
              </li>
            ))}
          </ol>
        ))}

      <div className="ffn-modal-actions">
        <Button variant="green" onClick={close}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
