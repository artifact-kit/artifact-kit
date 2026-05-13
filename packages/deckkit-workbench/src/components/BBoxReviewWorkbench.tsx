'use client'

import { useEffect, useRef, useState } from 'react'
import type { AssetRef, BBox, ElementNode, WorkbenchSession } from '@/lib/types'
import { bboxReviewDataSchema, type BBoxReviewData } from '@/lib/workbench-registry'

type DragMode = 'move' | 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  startBox: BBox
  moved: boolean
}

export default function BBoxReviewWorkbench({ sessionId }: { sessionId?: string }) {
  const [session, setSession] = useState<WorkbenchSession | null>(null)
  const [data, setData] = useState<BBoxReviewData | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()
  const [draftBox, setDraftBox] = useState<BBox | null>(null)
  const [showContext, setShowContext] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [imageRect, setImageRect] = useState({ width: 1, height: 1 })
  const [isDirty, setIsDirty] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}`)
      .then(response => response.json())
      .then((data: { session: WorkbenchSession }) => {
        setSession(data.session)
        const parsed = readBBoxReviewData(data.session.data)
        setData(parsed)
        setActiveId(parsed.activeElementId ?? parsed.elements[0]?.id)
      })
      .catch(() => setMessage('Session not found. Ask the agent to create a new workbench session.'))
  }, [sessionId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!session || !data) return

      const activeElement = data.elements.find(element => element.id === activeId) ?? data.elements[0]
      const activeBox = draftBox ?? activeElement?.bbox
      if (!activeElement || !activeBox) return

      const step = event.shiftKey ? 10 : 1
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, y: activeBox.y - step }, data.image.width, data.image.height))
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, y: activeBox.y + step }, data.image.width, data.image.height))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, x: activeBox.x - step }, data.image.width, data.image.height))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, x: activeBox.x + step }, data.image.width, data.image.height))
      } else if (event.key.toLowerCase() === 'w') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, h: activeBox.h + step }, data.image.width, data.image.height))
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, h: activeBox.h - step }, data.image.width, data.image.height))
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, w: activeBox.w - step }, data.image.width, data.image.height))
      } else if (event.key.toLowerCase() === 'd') {
        event.preventDefault()
        updateDraftBox(clampBox({ ...activeBox, w: activeBox.w + step }, data.image.width, data.image.height))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        void saveDraft({ completeArea: true, goNext: true })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!sessionId) {
    return (
      <main className="empty-state">
        <p className="eyebrow">DeckKit Workbench</p>
        <h1>No session selected</h1>
        <p>Ask the agent to create a JSON session, then open this page with <code>/bbox-review?id=&lt;session-id&gt;</code>.</p>
      </main>
    )
  }

  if (!session || !data) {
    return (
      <main className="empty-state">
        <p className="eyebrow">DeckKit Workbench</p>
        <h1>Loading session</h1>
        <p>{message || `Loading ${sessionId}...`}</p>
      </main>
    )
  }

  const currentSession = session
  const currentData = data
  const sourceUrl = resolveAssetUrl(currentSession.assets, currentData.imageAssetId)
  const activeElement = currentData.elements.find(box => box.id === activeId) ?? currentData.elements[0]
  const activeBox = draftBox ?? activeElement?.bbox
  const scaleX = imageRect.width / currentData.image.width
  const scaleY = imageRect.height / currentData.image.height
  const cropWidth = 360
  const cropHeight = activeBox ? Math.max(160, Math.round(cropWidth * (activeBox.h / activeBox.w))) : 160
  const cropStyle = activeBox ? {
    width: cropWidth,
    height: cropHeight,
    backgroundImage: `url(${sourceUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${currentData.image.width * (cropWidth / activeBox.w)}px ${currentData.image.height * (cropHeight / activeBox.h)}px`,
    backgroundPosition: `${-activeBox.x * (cropWidth / activeBox.w)}px ${-activeBox.y * (cropHeight / activeBox.h)}px`,
  } : {}

  function startDrag(event: React.PointerEvent, mode: DragMode) {
    if (!activeBox) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startBox: activeBox,
      moved: false,
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.startX) / scaleX
    const dy = (event.clientY - drag.startY) / scaleY
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) drag.moved = true
    updateDraftBox(applyDrag(drag.startBox, drag.mode, dx, dy, currentData.image.width, currentData.image.height))
  }

  function stopDrag(event: React.PointerEvent) {
    if (!dragRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  async function selectElement(elementId: string) {
    setActiveId(elementId)
    setDraftBox(null)
    setIsDirty(false)
    const nextData = { ...currentData, activeElementId: elementId }
    setData(nextData)
    await saveSession(nextData)
  }

  async function saveDraft(options: { completeArea?: boolean; completeReview?: boolean; goNext?: boolean } = {}) {
    if (!activeElement || !activeBox) return
    setSaving(true)
    setMessage('')
    const reviewStatus = options.completeArea ? 'accepted' as const : 'reviewing' as const
    const nextData = {
      ...currentData,
      status: options.completeReview ? 'complete' as const : currentData.status,
      activeElementId: activeElement.id,
      elements: currentData.elements.map(element => element.id === activeElement.id
        ? { ...element, bbox: activeBox, reviewStatus }
        : element),
    }
    const savedSession = await saveSession(nextData)
    const savedData = readBBoxReviewData(savedSession.data)
    const nextActiveId = options.goNext ? findNextPendingElementId(savedData.elements, activeElement.id) : activeElement.id
    const finalData = nextActiveId && nextActiveId !== savedData.activeElementId
      ? { ...savedData, activeElementId: nextActiveId }
      : savedData
    const finalSession = finalData === savedData ? savedSession : await saveSession(finalData)
    setData(finalData)
    setSession(finalSession)
    setActiveId(finalData.activeElementId ?? activeElement.id)
    setDraftBox(null)
    setIsDirty(false)
    setSaving(false)
    setMessage(options.completeReview ? 'Saved. Review complete.' : options.completeArea ? 'Area complete.' : 'Saved.')
  }

  function nudge(dx: number, dy: number) {
    if (!activeBox) return
    updateDraftBox(clampBox({ ...activeBox, x: activeBox.x + dx, y: activeBox.y + dy }, currentData.image.width, currentData.image.height))
  }

  function updateDraftBox(box: BBox) {
    setDraftBox(box)
    setIsDirty(true)
  }

  async function saveSession(nextData: BBoxReviewData): Promise<WorkbenchSession> {
    const response = await fetch(`/api/sessions/${currentSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: nextData, assets: currentSession.assets }),
    })
    const result = await response.json() as { session: WorkbenchSession }
    return result.session
  }

  const completedCount = currentData.elements.filter(element => element.reviewStatus === 'accepted').length
  const totalCount = currentData.elements.length

  return (
    <main className="workbench">
      <section className="canvas-pane">
        <header className="toolbar">
          <div>
            <p className="eyebrow">{currentData.title ?? 'BBox review'}</p>
            <h1>BBox review</h1>
            <p className="progress-line">{completedCount}/{totalCount} areas complete{isDirty ? ' · unsaved changes' : ''}</p>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={showContext} onChange={event => setShowContext(event.target.checked)} />
            Context boxes
          </label>
        </header>

        <div className="image-stage">
          <img
            src={sourceUrl}
            alt={currentData.title ?? 'BBox review'}
            onLoad={event => {
              const rect = event.currentTarget.getBoundingClientRect()
              setImageRect({ width: rect.width, height: rect.height })
            }}
          />
          <div
            className="bbox-layer"
            onPointerMove={onPointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            {currentData.elements.map(element => (
              <BoxOverlay
                key={element.id}
                element={element}
                bbox={element.id === activeElement?.id && activeBox ? activeBox : element.bbox}
                active={element.id === activeElement?.id}
                muted={element.id !== activeElement?.id}
                hidden={!showContext && element.id !== activeElement?.id}
                scaleX={scaleX}
                scaleY={scaleY}
                onSelect={() => void selectElement(element.id)}
                onDragStart={startDrag}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="review-pane">
        {activeElement && activeBox ? (
          <>
            <div className="review-header">
              <div>
                <p className="eyebrow">Active bbox</p>
                <h2>{activeElement.label}</h2>
              </div>
              <span className="kind">{activeElement.kind}</span>
              <span className={`review-badge ${activeElement.reviewStatus === 'accepted' ? 'done' : ''}`}>
                {activeElement.reviewStatus === 'accepted' ? 'Area complete' : 'Needs review'}
              </span>
            </div>

            <div className="crop-preview" style={cropStyle} />

            <div className="bbox-fields">
              {(['x', 'y', 'w', 'h'] as const).map(key => (
                <label key={key}>
                  {key}
                  <input
                    type="number"
                    value={activeBox[key]}
                    onChange={event => updateDraftBox(clampBox({ ...activeBox, [key]: Number(event.target.value) }, currentData.image.width, currentData.image.height))}
                  />
                </label>
              ))}
            </div>

            <div className="nudge-row">
              <button onClick={() => nudge(0, -1)}>Up</button>
              <button onClick={() => nudge(-1, 0)}>Left</button>
              <button onClick={() => nudge(1, 0)}>Right</button>
              <button onClick={() => nudge(0, 1)}>Down</button>
            </div>

            <section className="description">
              <h3>Review instruction</h3>
              <p>{activeElement.description ?? activeElement.label}</p>
              {activeElement.notes ? <p className="notes">{activeElement.notes}</p> : null}
            </section>

            <div className="actions">
              <button className="primary" disabled={saving} onClick={() => void saveDraft()}>Save area</button>
              <button disabled={saving} onClick={() => void saveDraft({ completeArea: true, goNext: true })}>Complete area</button>
              <button disabled={saving} onClick={() => void saveDraft({ completeArea: true, completeReview: true })}>Complete review</button>
              {message ? <span>{message}</span> : null}
            </div>

            <section className="element-list">
              <h3>Elements</h3>
              {currentData.elements.map(element => (
                <button
                  className={`${element.id === activeElement.id ? 'selected' : ''} ${element.reviewStatus === 'accepted' ? 'done' : ''}`}
                  key={element.id}
                  onClick={() => void selectElement(element.id)}
                >
                  <span>{element.label}</span>
                  <small>{element.id} · {element.reviewStatus === 'accepted' ? 'complete' : 'pending'}</small>
                </button>
              ))}
            </section>
          </>
        ) : (
          <p>No element selected.</p>
        )}
      </aside>
    </main>
  )
}

function BoxOverlay({
  element,
  bbox,
  active,
  muted,
  hidden,
  scaleX,
  scaleY,
  onSelect,
  onDragStart,
}: {
  element: ElementNode
  bbox: BBox
  active: boolean
  muted: boolean
  hidden: boolean
  scaleX: number
  scaleY: number
  onSelect: () => void
  onDragStart: (event: React.PointerEvent, mode: DragMode) => void
}) {
  if (hidden) return null
  const style = {
    left: bbox.x * scaleX,
    top: bbox.y * scaleY,
    width: bbox.w * scaleX,
    height: bbox.h * scaleY,
  }

  return (
    <button
      className={`bbox ${active ? 'active' : ''} ${muted ? 'muted' : ''}`}
      style={style}
      onClick={event => {
        if (active) {
          event.preventDefault()
          return
        }
        onSelect()
      }}
      onPointerDown={event => {
        if (!active) return
        event.preventDefault()
        onDragStart(event, 'move')
      }}
      title={element.label}
    >
      <span>{element.id}</span>
      {active ? (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as DragMode[]).map(handle => (
            <i
              key={handle}
              className={`handle ${handle}`}
              onPointerDown={event => {
                event.stopPropagation()
                onDragStart(event, handle)
              }}
            />
          ))}
        </>
      ) : null}
    </button>
  )
}

function applyDrag(start: BBox, mode: DragMode, dx: number, dy: number, imageW: number, imageH: number): BBox {
  const next = { ...start }
  if (mode.includes('w')) {
    next.x = start.x + dx
    next.w = start.w - dx
  }
  if (mode.includes('e')) next.w = start.w + dx
  if (mode.includes('n')) {
    next.y = start.y + dy
    next.h = start.h - dy
  }
  if (mode.includes('s')) next.h = start.h + dy
  if (mode === 'move') {
    next.x = start.x + dx
    next.y = start.y + dy
  }
  return clampBox(next, imageW, imageH)
}

function clampBox(box: BBox, imageW: number, imageH: number): BBox {
  const w = Math.min(imageW, Math.max(1, Math.round(box.w)))
  const h = Math.min(imageH, Math.max(1, Math.round(box.h)))
  const x = Math.max(0, Math.min(imageW - w, Math.round(box.x)))
  const y = Math.max(0, Math.min(imageH - h, Math.round(box.y)))
  return { x, y, w, h }
}

function readBBoxReviewData(value: unknown): BBoxReviewData {
  return bboxReviewDataSchema.parse(value)
}

function findNextPendingElementId(elements: ElementNode[], currentId: string): string | undefined {
  if (elements.length === 0) return undefined
  const currentIndex = Math.max(0, elements.findIndex(element => element.id === currentId))
  const ordered = [...elements.slice(currentIndex + 1), ...elements.slice(0, currentIndex + 1)]
  return ordered.find(element => element.reviewStatus !== 'accepted')?.id ?? elements[currentIndex]?.id
}

function resolveAssetUrl(assets: AssetRef[] | undefined, assetId: string): string {
  const asset = assets?.find(item => item.id === assetId)
  if (!asset) return ''
  if (asset.source === 'url') return asset.src ?? ''
  if (asset.source === 'data-url') return asset.dataUrl ?? ''
  if (asset.source === 'workspace-file') return `/api/files?path=${encodeURIComponent(asset.path ?? '')}`
  return ''
}
