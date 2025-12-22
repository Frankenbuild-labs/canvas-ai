import { getEmailLists } from "@/lib/email-marketing/database"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CreateListModal from "@/components/email-marketing/CreateListModal"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function EmailListsPage() {
  const lists = await getEmailLists()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Email Lists</h1>
              <p className="text-muted-foreground mt-1">
                Manage your subscriber lists ({lists.length.toString()} total)
              </p>
            </div>
            <div className="flex space-x-3">
              <CreateListModal />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {lists.length === 0 ? (
          <div className="text-sm text-muted-foreground">No lists yet. Create your first list to start organizing contacts.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((l: any) => (
              <div key={l.id} className="border rounded-md bg-card p-4 flex flex-col gap-2">
                <div className="text-base font-semibold truncate">{l.title || l?.metadata?.name || "Untitled List"}</div>
                {l?.metadata?.description ? (
                  <div className="text-sm text-muted-foreground line-clamp-2">{l.metadata.description}</div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Link href={`/email/contacts?list_id=${encodeURIComponent(l.id)}`}>
                    <Button size="sm" variant="default">View Contacts</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
