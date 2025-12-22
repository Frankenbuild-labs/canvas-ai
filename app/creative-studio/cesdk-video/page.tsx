import { redirect } from "next/navigation";

export default function Page() {
  // Redirect old CESDK iframe route to local editor
  redirect("/creative-studio/cesdk");
}
