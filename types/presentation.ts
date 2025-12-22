export interface SlideStat {
  label: string
  value: string
  trend?: "up" | "down" | "flat"
  caption?: string
}

export interface SlideQuote {
  text: string
  author?: string
  role?: string
}

export interface SlideSection {
  title?: string
  subtitle?: string
  points?: string[]
  rawMarkdown?: string
  layout?: string
  className?: string
  background?: string
  accentColor?: string
  image?: string
  stats?: SlideStat[]
  quote?: SlideQuote
  callout?: string
  notes?: string
}

export interface SlideDeckSpec {
  title: string
  subtitle?: string
  theme?: string
  brandColor?: string
  sections: SlideSection[]
  appendix?: string[]
}
