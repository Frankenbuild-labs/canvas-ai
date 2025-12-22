export type PostInput = {
  platform: string
  text: string
  mediaUrls?: string[]
  scheduledAt?: Date | null
}

export type PostResult = {
  success: boolean
  platform: string
  provider: string
  externalId?: string
  data?: any
  error?: string
}

export interface ISocialProvider {
  postNow(userId: string, input: PostInput): Promise<PostResult>
  schedulePost(userId: string, input: PostInput): Promise<PostResult>
}
