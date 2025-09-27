"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

export default function ThemeAwareLogo() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder or nothing on the server to avoid hydration mismatch
    return <div className="h-12 w-64" />
  }

  const isDark = theme === "dark" || resolvedTheme === "dark"

  return (
    <Image
      src={isDark ? "/logo.svg" : "/logo-light.png"}
      alt="Deep Canvas Logo"
      width={192} // approx 48 * 4
      height={48}
      className="h-12 w-auto"
      priority
    />
  )
}
