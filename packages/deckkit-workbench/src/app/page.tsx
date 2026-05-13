import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session-store'
import { getWorkbenchDefinition } from '@/lib/workbench-registry'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  if (id) {
    const session = getSession(id)
    const workbench = getWorkbenchDefinition(session.workbenchType)
    redirect(`${workbench.route}?id=${encodeURIComponent(id)}`)
  }

  return (
    <main className="empty-state">
      <p className="eyebrow">DeckKit Workbench</p>
      <h1>Open a workbench page</h1>
      <p>Open <code>/?id=&lt;session-id&gt;</code>. The app resolves the registered workbench from the session.</p>
    </main>
  )
}
