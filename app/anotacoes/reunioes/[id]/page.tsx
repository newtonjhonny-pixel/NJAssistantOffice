import { Suspense } from "react"
import { MeetingWorkspace } from "@/components/meetings/MeetingWorkspace"

export const dynamic = "force-dynamic"

export default function ReuniaoWorkspacePage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <MeetingWorkspace meetingId={params.id} />
    </Suspense>
  )
}
