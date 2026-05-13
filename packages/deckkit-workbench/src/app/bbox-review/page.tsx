import BBoxReviewWorkbench from '@/components/BBoxReviewWorkbench'

export default async function BBoxReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  return <BBoxReviewWorkbench sessionId={id} />
}
