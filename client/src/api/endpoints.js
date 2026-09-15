import { api } from './client.js'

/**
 * Every call the app can make, in one place. Components import from here, never
 * from the axios instance, so a route change is a one-line edit and no component
 * ever builds a URL by hand.
 */

export const auth = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  me: () => api.get('/auth/me')
}

export const profile = {
  get: () => api.get('/profile'),
  save: (body) => api.put('/profile', body)
}

export const scripts = {
  create: (body) => api.post('/scripts', body),
  list: (params) => api.get('/scripts', { params }),
  get: (id) => api.get(`/scripts/${id}`),
  update: (id, body) => api.put(`/scripts/${id}`, body),
  remove: (id) => api.delete(`/scripts/${id}`),

  generate: (id, options = {}) => api.post(`/scripts/${id}/generate`, { options }),
  regenerate: (id, options = {}) => api.post(`/scripts/${id}/regenerate`, { options }),
  improve: (id, body) => api.post(`/scripts/${id}/improve`, body),
  variations: (id, body) => api.post(`/scripts/${id}/variations`, body),

  saveEvaluation: (id, body) => api.post(`/scripts/${id}/evaluation`, body),
  evaluations: (id) => api.get(`/scripts/${id}/evaluation`)
}

export const dashboard = {
  get: () => api.get('/dashboard')
}

export const PLATFORMS = [
  { value: 'youtube', label: 'YouTube', min: 60, max: 3600, default: 480 },
  { value: 'reels', label: 'Instagram Reels', min: 15, max: 90, default: 45 },
  { value: 'tiktok', label: 'TikTok', min: 15, max: 180, default: 60 },
  { value: 'shorts', label: 'YouTube Shorts', min: 15, max: 60, default: 45 },
  { value: 'linkedin', label: 'LinkedIn', min: 30, max: 600, default: 120 },
  { value: 'podcast', label: 'Podcast', min: 300, max: 7200, default: 1800 }
]

export const CONTENT_TYPES = [
  { value: 'educational', label: 'Educational', hint: 'Teach one idea clearly' },
  { value: 'storytelling', label: 'Storytelling', hint: 'Carry a narrative arc' },
  { value: 'promotional', label: 'Promotional', hint: 'Problem to product to action' },
  { value: 'product_brand', label: 'Product or brand', hint: 'Show what it does, for whom' },
  { value: 'short_form', label: 'Short form', hint: 'One idea, hook and CTA only' },
  { value: 'custom', label: 'Something else', hint: 'Describe the format yourself' }
]

/** Filters exclude 'custom' — it is a way to write, not a category to browse. */
export const FILTERABLE_CONTENT_TYPES = CONTENT_TYPES.filter((c) => c.value !== 'custom')

export const SECTION_LABELS = {
  hook: 'Hook',
  intro: 'Intro',
  point: 'Point',
  story: 'Story',
  support: 'Support',
  transition: 'Transition',
  cta: 'Call to action',
  visual_cue: 'Visual cue'
}

export const EVALUATION_CRITERIA = [
  { key: 'relevance', label: 'Relevance', hint: 'Does it address the requested idea?' },
  { key: 'structure', label: 'Structure', hint: 'Does it follow a sound script structure?' },
  { key: 'platformSuitability', label: 'Platform suitability', hint: 'Does it fit the platform?' },
  { key: 'audienceFit', label: 'Audience fit', hint: 'Right for the target audience?' },
  { key: 'voiceConsistency', label: 'Voice consistency', hint: 'Does it sound like this creator?' },
  { key: 'usefulness', label: 'Usefulness', hint: 'Could the creator actually use this?' }
]
