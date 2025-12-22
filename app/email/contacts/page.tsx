import { getEmailContacts } from "@/lib/email-marketing/database-crm";
import ContactsList from "@/components/email-marketing/ContactsList";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users2, Activity } from "lucide-react";
import CreateContactModal from "@/components/email-marketing/CreateContactModal";
import CreateListModal from "@/components/email-marketing/CreateListModal";
import Link from "next/link";
import { DatabaseService } from "@/lib/database";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ContactsPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    list_id?: string;
  };
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const userId = await DatabaseService.getOrCreateTestUser();
  const page = parseInt(searchParams.page || "1");
  const limit = parseInt(searchParams.limit || "25");
  const skip = (page - 1) * limit;
  const search = searchParams.search || "";
  const status = searchParams.status || "all";
  const listId = searchParams.list_id || "";

  const { contacts, total } = await getEmailContacts(userId, {
    limit,
    skip,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    list_id: listId || undefined,
  });

  console.log('[ContactsPage] Fetched:', { contactsCount: contacts.length, total, userId });

  return (
    <div className="min-h-screen bg-background">
      {/* Header with action buttons */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Email Contacts
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your subscriber list ({total.toLocaleString()} total)
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/email/contacts/upload">
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </Link>
              <Link href="/email/contacts/jobs">
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  Upload Jobs
                </Button>
              </Link>
              <Link href="/email/admin/duplicates">
                <Button variant="outline">
                  <Users2 className="h-4 w-4 mr-2" />
                  Check Duplicates
                </Button>
              </Link>
              <CreateListModal />
              <CreateContactModal />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Contacts List */}
          <ContactsList
            contacts={contacts}
            total={total}
            currentPage={page}
            itemsPerPage={limit}
            searchTerm={search}
            statusFilter={status}
            listFilter={listId}
          />
        </div>
      </main>
    </div>
  );
}
