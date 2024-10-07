import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Message,
  ChatHistory,
  ChatMessage,
  isChatMessage,
  isUserListMessage,
} from "@/lib/types";

const ChatApp: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [inputMessage, setInputMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const [status, setStatus] = useState<"Connected" | "Disconnected">(
    "Disconnected"
  );
  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("chatHistory");
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(chatHistory).length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8080");

    websocket.onopen = () => {
      setStatus("Connected");
    };

    websocket.onclose = () => {
      setStatus("Disconnected");
      setIsLoggedIn(false);
    };

    websocket.onmessage = (event: MessageEvent) => {
      const message: Message = JSON.parse(event.data);

      if (isUserListMessage(message)) {
        setUsers(message.users.filter((user) => user !== userName));
      } else if (isChatMessage(message)) {
        const otherUser = message.from === userName ? message.to : message.from;
        setChatHistory((prev) => ({
          ...prev,
          [otherUser]: [...(prev[otherUser] || []), message],
        }));
        scrollToBottom();
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [userName]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedUser, chatHistory]);

  const joinChat = useCallback(() => {
    if (ws && userName && !isLoggedIn) {
      ws.send(
        JSON.stringify({
          type: "join",
          userName,
        })
      );
      setIsLoggedIn(true);
    }
  }, [ws, userName, isLoggedIn]);

  const sendMessage = useCallback(() => {
    if (ws && inputMessage && selectedUser) {
      const message: ChatMessage = {
        type: "chat",
        from: userName,
        to: selectedUser,
        content: inputMessage,
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(message));

      setChatHistory((prev) => ({
        ...prev,
        [selectedUser]: [...(prev[selectedUser] || []), message],
      }));

      setInputMessage("");
    }
  }, [ws, inputMessage, selectedUser, userName]);

  const currentChat = selectedUser ? chatHistory[selectedUser] || [] : [];

  if (!isLoggedIn) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-xl font-bold">Join Chat</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your username"
            />
            <Button onClick={joinChat}>Join</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Chat as {userName}</h2>
          <span
            className={`text-sm ${
              status === "Connected" ? "text-green-500" : "text-red-500"
            }`}
          >
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Select onValueChange={setSelectedUser} value={selectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Select a user to chat with" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user} value={user}>
                {user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedUser && (
          <>
            <div
              ref={messageContainerRef}
              className="h-60 overflow-y-auto my-4 p-2 border rounded-md flex flex-col"
            >
              <div className="flex-grow">
                {currentChat.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-2 p-2 rounded ${
                      msg.from === userName
                        ? "bg-blue-100 ml-auto"
                        : "bg-gray-100"
                    }`}
                    style={{ maxWidth: "80%" }}
                  >
                    <div className="text-sm text-gray-600">{msg.from}</div>
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatApp;
