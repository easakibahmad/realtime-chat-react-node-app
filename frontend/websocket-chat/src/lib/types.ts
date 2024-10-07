// lib/types.ts
export type UserListMessage = {
  type: 'userList'
  users: string[]
}

export type ChatMessage = {
  type: 'chat'
  from: string
  to: string
  content: string
  timestamp: string
}

export type Message = UserListMessage | ChatMessage

export type ChatHistory = {
  [key: string]: ChatMessage[]
}

// Add these type guards if needed
export const isChatMessage = (message: Message): message is ChatMessage => {
  return message.type === 'chat'
}

export const isUserListMessage = (message: Message): message is UserListMessage => {
  return message.type === 'userList'
}