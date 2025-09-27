import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreativeStudioPage() {
  return (
    <div className="w-full h-screen bg-[#111111] flex flex-col">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#1C1C1C] z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="border-gray-700 hover:bg-gray-800 bg-transparent">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Back to Chat</span>
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-white">Creative Studio</h1>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="text-center text-gray-400">
          <p>Creative Studio content will be implemented here.</p>
        </div>
      </main>
    </div>
  )
}
