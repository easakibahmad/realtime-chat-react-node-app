export type Message = {
  type: 'chat' | 'userList'
  from?: string
  to?: string
  content?: string
  timestamp?: string
  users?: string[]
}

export type ChatHistory = {
  [key: string]: Message[]
}