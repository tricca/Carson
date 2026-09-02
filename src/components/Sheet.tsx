import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Renderizzato in un portal su document.body: un modale a comparsa deve restare sopra
 * a qualunque elemento fixed (bottom nav, FAB) indipendentemente da dove viene montato
 * nell'albero — un antenato con un'animazione che anima `transform` (come l'ingresso
 * di ogni schermata) crea altrimenti un nuovo stacking context che intrappola lo z-index
 * del pannello, facendolo finire sotto agli elementi fixed esterni a quell'antenato.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  return createPortal(
    <>
      <div className={`backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`sheet${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        <h3>{title}</h3>
        {children}
      </div>
    </>,
    document.body,
  )
}
