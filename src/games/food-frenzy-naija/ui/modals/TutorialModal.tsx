import { useState } from 'react';
import { Mama } from '../../art/Mama';
import type { TutorialId } from '../../levels/types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { TUTORIALS } from '../common/tutorials';

export function TutorialModal({ ids, onDone }: { ids: TutorialId[]; onDone: () => void }) {
  const [page, setPage] = useState(0);
  const t = TUTORIALS[ids[page]];
  const last = page === ids.length - 1;
  return (
    <Modal title={t.title} tone="green" onClose={onDone} className="ffn-tutorial">
      <div className="ffn-tutorial-body">
        <div className="ffn-tutorial-art" aria-hidden="true">
          {t.art.map((src, i) => (
            <img key={i} src={src} alt="" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="ffn-tutorial-talk">
          <Mama size={64} />
          <p className="ffn-bubble">{t.text}</p>
        </div>
        {ids.length > 1 && (
          <div className="ffn-dots" aria-label={`Tip ${page + 1} of ${ids.length}`}>
            {ids.map((id, i) => (
              <span key={id} className={i === page ? 'is-on' : ''} />
            ))}
          </div>
        )}
        <div className="ffn-modal-actions">
          {!last && (
            <button type="button" className="ffn-link-btn" onClick={onDone}>
              Skip
            </button>
          )}
          <Button variant="green" size="lg" onClick={() => (last ? onDone() : setPage(page + 1))}>
            {last ? "Let's cook!" : 'Next'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
