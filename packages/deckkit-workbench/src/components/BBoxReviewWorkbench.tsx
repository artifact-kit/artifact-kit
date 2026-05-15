import { useEffect, useRef, useState } from 'react'
import type { BBox, ElementNode } from '@/lib/types'
import { bboxReviewDataSchema, type BBoxReviewData } from '@/lib/workbench-registry'

type DragMode = 'move' | 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
type PlanField = 'route' | 'editability' | 'renderRole' | 'childrenPolicy' | 'granularityFeedback' | 'notes' | 'routeReason'

const routeOptions = ['layout-only', 'native-shape', 'native-text', 'svg-image', 'editable-vector', 'imagegen', 'source-raster', 'drawio-svg'] as const
const editabilityOptions = ['none', 'asset', 'group', 'element'] as const
const renderRoleOptions = ['render', 'layout', 'context'] as const
const childrenPolicyOptions = ['none', 'optional', 'required'] as const
const granularityFeedbackOptions = ['ok', 'too-coarse', 'too-fine'] as const

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  startBox: BBox
  moved: boolean
}

export default function BBoxReviewWorkbench({
  data,
  imageUrl,
  onChange,
  onDownload,
}: {
  data: BBoxReviewData
  imageUrl: string
  onChange: (data: BBoxReviewData) => void
  onDownload: (data: BBoxReviewData) => void
}) {
  const [activeId, setActiveId] = useState<string | undefined>()
  const [draftBox, setDraftBox] = useState<BBox | null>(null)
  const [showContext, setShowContext] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [imageRect, setImageRect] = useState({ width: 1, height: 1 })
  const [isDirty, setIsDirty] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    setActiveId(current => current ?? data.activeElementId ?? data.elements[0]?.id)
  }, [data.activeElementId, data.elements])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!data) return

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

  const currentData = data
  const sourceUrl = imageUrl
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
    onChange(nextData)
  }

  async function saveDraft(options: { completeArea?: boolean; completeReview?: boolean; goNext?: boolean } = {}) {
    if (!activeElement || !activeBox) return
    setSaving(true)
    setMessage('')
    const activeFeedback = activeElement.granularityFeedback ?? 'ok'
    const reviewStatus = options.completeArea
      ? activeFeedback === 'ok' ? 'accepted' as const : 'needs-agent' as const
      : 'reviewing' as const
    const nextData = {
      ...currentData,
      status: options.completeReview ? 'complete' as const : currentData.status,
      activeElementId: activeElement.id,
      elements: currentData.elements.map(element => element.id === activeElement.id
        ? { ...element, bbox: activeBox, reviewStatus }
        : element),
    }
    const savedData = readBBoxReviewData(nextData)
    const nextActiveId = options.goNext ? findNextPendingElementId(savedData.elements, activeElement.id) : activeElement.id
    const finalData = nextActiveId && nextActiveId !== savedData.activeElementId
      ? { ...savedData, activeElementId: nextActiveId }
      : savedData
    onChange(finalData)
    if (options.completeReview) onDownload(finalData)
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

  function updateActiveElement(field: PlanField, value: string) {
    if (!activeElement) return
    const normalizedValue = value === '' ? undefined : value
    const nextElements = currentData.elements.map(element => element.id === activeElement.id
      ? { ...element, [field]: normalizedValue }
      : element)
    onChange({ ...currentData, elements: nextElements })
    setIsDirty(true)
  }

  function dataWithDraft(): BBoxReviewData {
    if (!activeElement || !activeBox) return currentData
    return {
      ...currentData,
      activeElementId: activeElement.id,
      elements: currentData.elements.map(element => element.id === activeElement.id
        ? { ...element, bbox: activeBox }
        : element),
    }
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
          <button className="download-button" onClick={() => onDownload(readBBoxReviewData(dataWithDraft()))}>Download JSON</button>
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
            </section>

            <section className="plan-panel">
              <h3>Reconstruction plan</h3>
              <div className="plan-fields">
                <PlanSelect
                  label="Route"
                  value={activeElement.route}
                  options={routeOptions}
                  onChange={value => updateActiveElement('route', value)}
                />
                <PlanSelect
                  label="Editability"
                  value={activeElement.editability}
                  options={editabilityOptions}
                  onChange={value => updateActiveElement('editability', value)}
                />
                <PlanSelect
                  label="Render role"
                  value={activeElement.renderRole}
                  options={renderRoleOptions}
                  onChange={value => updateActiveElement('renderRole', value)}
                />
                <PlanSelect
                  label="Children"
                  value={activeElement.childrenPolicy}
                  options={childrenPolicyOptions}
                  onChange={value => updateActiveElement('childrenPolicy', value)}
                />
                <PlanSelect
                  label="Granularity"
                  value={activeElement.granularityFeedback}
                  options={granularityFeedbackOptions}
                  onChange={value => updateActiveElement('granularityFeedback', value)}
                />
              </div>
              <label className="plan-textarea">
                Route reason
                <textarea
                  value={activeElement.routeReason ?? ''}
                  onChange={event => updateActiveElement('routeReason', event.target.value)}
                  placeholder="Why this route is appropriate"
                  rows={3}
                />
              </label>
              <label className="plan-textarea">
                Notes for agent
                <textarea
                  value={activeElement.notes ?? ''}
                  onChange={event => updateActiveElement('notes', event.target.value)}
                  placeholder="Use this for too-coarse / too-fine feedback"
                  rows={3}
                />
              </label>
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

function PlanSelect<T extends readonly string[]>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: T
  onChange: (value: string) => void
}) {
  return (
    <label>
      {label}
      <select value={value ?? ''} onChange={event => onChange(event.target.value)}>
        <option value="">Unset</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
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
