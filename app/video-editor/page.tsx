import { redirect } from "next/navigation"

export default function VideoEditorRedirect() {
  // Redirect legacy /video-editor to the new Video Studio route
  redirect("/creative-studio/video-studio")
}
