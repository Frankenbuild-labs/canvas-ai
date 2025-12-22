import { redirect } from "next/navigation"

export default function VideoEditorPage() {
  // Legacy route: redirect to the new Video Studio page
  redirect("/creative-studio/video-studio")
}
