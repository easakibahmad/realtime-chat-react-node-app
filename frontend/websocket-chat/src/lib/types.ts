export interface User {
  username: string;
  lastSeen: string;
  status: 'online' | 'offline';
}

export interface Message {
  type: string;
  [key: string]: any;
}

export interface ChatMessage extends Message {
  type: 'chat';
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

export interface UserListMessage extends Message {
  type: 'userList';
  users: User[];
}

export interface HistoryMessage extends Message {
  type: 'history';
  messages: ChatMessage[];
}

export interface ChatHistory {
  [key: string]: ChatMessage[];
}

export function isChatMessage(message: Message): message is ChatMessage {
  return message.type === 'chat';
}

export function isUserListMessage(message: Message): message is UserListMessage {
  return message.type === 'userList';
}

export function isHistoryMessage(message: Message): message is HistoryMessage {
  return message.type === 'history';
}