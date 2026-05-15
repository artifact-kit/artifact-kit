import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import BBoxReviewWorkbench from './components/BBoxReviewWorkbench'
import { formatBBoxOutput, normalizeBBoxInput, outputFileName, type LoadedBBoxInput } from './lib/bbox-io'
import type { BBoxReviewData } from './lib/workbench-registry'
import './app/styles.css'

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [loadedInput, setLoadedInput] = useState<LoadedBBoxInput | null>(null)
  const [data, setData] = useState<BBoxReviewData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  async function loadJson(file: File) {
    setError('')
    try {
      const parsed = JSON.parse(await file.text())
      const normalized = normalizeBBoxInput(parsed, file.name)
      setLoadedInput(normalized)
      setData(normalized.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read bbox JSON.')
    }
  }

  function loadImage(file: File) {
    setError('')
    setImageName(file.name)
    setImageUrl(previous => {
      if (previous) URL.revokeObjectURL(previous)
      return URL.createObjectURL(file)
    })
  }

  function download(dataToSave: BBoxReviewData) {
    if (!loadedInput) return
    const output = formatBBoxOutput(loadedInput, dataToSave)
    const blob = new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = outputFileName(loadedInput)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!imageUrl || !data || !loadedInput) {
    return (
      <main className="home">
        <p className="eyebrow">DeckKit Workbench</p>
        <h1>BBox review</h1>
        <p className="intro">Load a local source image and an initial bbox JSON. Everything runs in your browser; saving downloads the reviewed JSON.</p>

        <section className="upload-panel">
          <label>
            Source image
            <input type="file" accept="image/*" onChange={event => {
              const file = event.target.files?.[0]
              if (file) loadImage(file)
            }} />
            {imageName ? <span>{imageName}</span> : null}
          </label>

          <label>
            Initial bbox JSON
            <input type="file" accept="application/json,.json" onChange={event => {
              const file = event.target.files?.[0]
              if (file) void loadJson(file)
            }} />
            {loadedInput?.inputFileName ? <span>{loadedInput.inputFileName}</span> : null}
          </label>
        </section>

        {error ? <p className="error">{error}</p> : null}
      </main>
    )
  }

  return (
    <BBoxReviewWorkbench
      data={data}
      imageUrl={imageUrl}
      onChange={setData}
      onDownload={download}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
