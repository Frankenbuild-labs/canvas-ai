import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Database, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function ModelTrainingPage() {
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
          <h1 className="text-xl font-bold text-white">Model Training Studio</h1>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="grid grid-cols-3 gap-6 h-full">
          <Card className="bg-[#1C1C1C] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Database className="w-5 h-5 mr-2 text-[#069494]" />
                Model Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-400">
                <p>Available models will be listed here.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1C1C1C] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Settings className="w-5 h-5 mr-2 text-[#069494]" />
                Merge Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-400">
                <p>Model merging settings will be configured here.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1C1C1C] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-5 h-5 mr-2 text-[#069494]" />
                Experiment Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-400">
                <p>Training experiments will be tracked here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
