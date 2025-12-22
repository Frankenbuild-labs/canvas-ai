"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Users,
  FileText,
  Send,
  Settings,
  Menu,
  X,
  BarChart3,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  companyName?: string;
}

export default function Layout({ children, companyName = "Email Marketing" }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Don't show navigation for certain pages
  if (
    pathname === "/email/subscribe" ||
    pathname === "/email/subscribe/success"
  ) {
    return children;
  }

  const navigation = [
    { name: "Dashboard", href: "/email", icon: BarChart3 },
    { name: "Campaigns", href: "/email/campaigns", icon: Send },
    { name: "Contacts", href: "/email/contacts", icon: Users },
    { name: "Templates", href: "/email/templates", icon: FileText },
    { name: "Media Library", href: "/email/media", icon: ImageIcon },
    { name: "Settings", href: "/email/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header: Back to Chat (top-left), no company label */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <div className="flex items-center min-w-0 flex-1 gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-accent text-muted-foreground"
                title="Back to main chat"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Mail className="h-6 w-6 text-primary flex-shrink-0" />
            </div>
            <button className="lg:hidden ml-2 flex-shrink-0" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/email" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors border-r-2
                    ${isActive
                      ? "bg-accent text-accent-foreground border-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-transparent"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section - Authentication removed */}
          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="text-sm text-muted-foreground text-center">
              Email Marketing Platform
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile header with back button always visible */}
        <div className="lg:hidden bg-card shadow-sm border-b border-border px-4 py-2 flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Back to main chat"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}