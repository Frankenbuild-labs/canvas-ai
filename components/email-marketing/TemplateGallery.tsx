"use client"

import Link from "next/link"

export default function TemplateGallery() {
  const templates = [
    { id: "world-tourism-day", name: "World Tourism Day", category: "Tourism", bg: "bg-gradient-to-br from-cyan-400 to-blue-500", cta: "Special Offer", ctaStyle: "bg-white text-gray-900" },
    { id: "travel-packages", name: "Travel Packages", category: "Travel", bg: "bg-amber-50", cta: "Explore Deals", ctaStyle: "bg-amber-500 text-white" },
    { id: "hotel-rooms", name: "Hotel Rooms", category: "Hospitality", bg: "bg-gradient-to-br from-blue-50 to-purple-50", cta: "Book Now", ctaStyle: "bg-blue-600 text-white" },
    { id: "programmers-day", name: "Programmer's Day", category: "Tech", bg: "bg-gradient-to-br from-green-100 via-purple-100 to-pink-100", cta: "Shop Now", ctaStyle: "bg-pink-500 text-white" },
    { id: "blog-newsletter", name: "Blog Newsletter", category: "Blog", bg: "bg-white border", cta: "Read More", ctaStyle: "bg-gray-900 text-white" },
    { id: "event-invitation", name: "Event Invitation", category: "Event", bg: "bg-gradient-to-br from-blue-600 to-blue-800", cta: "Register", ctaStyle: "bg-white text-blue-700" },
    { id: "product-launch", name: "Product Launch", category: "Ecommerce", bg: "bg-gradient-to-br from-purple-500 to-pink-500", cta: "Buy Now", ctaStyle: "bg-white text-pink-700" },
    { id: "newsletter-basic", name: "Newsletter", category: "News", bg: "bg-gradient-to-br from-gray-50 to-gray-100", cta: "Get Updates", ctaStyle: "bg-gray-900 text-white" },
  ]

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pre-Made Templates</h2>
          <p className="text-muted-foreground mt-1">Choose from our collection of professional email templates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((t) => (
          <div key={t.id} className="group relative bg-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-border">
            <div className={`aspect-[3/4] relative ${t.bg} p-4`}>
              <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md text-xs">
                {t.category}
              </div>
              <div className="font-bold text-xl text-gray-900 mt-8">
                {t.name}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className={`rounded-md p-2 text-center text-sm font-medium ${t.ctaStyle}`}>{t.cta}</div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{t.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.category}</p>
              <Link href={`/email/templates/new?fromTemplate=${encodeURIComponent(t.id)}`} className="mt-3 w-full inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm py-2 transition-colors">
                Use Template
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
