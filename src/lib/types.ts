export type TryOnJobStatus = 'queued' | 'processing' | 'done' | 'error'

export interface Profile {
  id: string
  display_name: string | null
  created_at: string
}

export interface Garment {
  id: string
  image_url: string
  description: string
  category: string | null
  hashtags: string | null
  created_at: string
}

export interface TryOnJob {
  id: string
  user_id: string
  human_image_url: string
  garment_image_url: string
  garment_description: string | null
  status: TryOnJobStatus
  output_image_url: string | null
  mask_image_url: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}
