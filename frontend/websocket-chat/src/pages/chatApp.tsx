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
  User,
} from "@/lib/types";

const WEBSOCKET_URL = "ws://localhost:8080";

const ChatApp: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [inputMessage, setInputMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const [status, setStatus] = useState<"Connected" | "Disconnected">(
    "Disconnected"
  );
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const savedUserName = localStorage.getItem("chatUserName");
    if (savedUserName) {
      setUserName(savedUserName);
    }

    const savedHistory = localStorage.getItem("chatHistory");
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (userName) {
      localStorage.setItem("chatUserName", userName);
    }
  }, [userName]);

  useEffect(() => {
    if (Object.keys(chatHistory).length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  const connectWebSocket = useCallback(() => {
    console.log("Attempting to connect WebSocket...");
    const websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setStatus("Connected");
      if (isLoggedIn && userName) {
        const joinMessage = JSON.stringify({
          type: "join",
          userName,
        });
        websocket.send(joinMessage);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setStatus("Disconnected");
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    };

    websocket.onmessage = (event: MessageEvent) => {
      console.log("Received message:", event.data);
      try {
        const message: Message = JSON.parse(event.data);

        if (isUserListMessage(message)) {
          setUsers(message.users.filter((user) => user.username !== userName));
        } else if (isChatMessage(message)) {
          console.log("Processing chat message:", message);
          // Determine the chat partner (either sender or recipient)
          const chatPartner =
            message.from === userName ? message.to : message.from;

          setChatHistory((prev) => {
            const updatedHistory = {
              ...prev,
              [chatPartner]: [...(prev[chatPartner] || []), message],
            };
            return updatedHistory;
          });
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userName, isLoggedIn]);

  useEffect(() => {
    return connectWebSocket();
  }, [connectWebSocket]);

  const scrollToBottom = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedUser, chatHistory, scrollToBottom]);

  const joinChat = useCallback(() => {
    if (ws && userName && !isLoggedIn) {
      const joinMessage = {
        type: "join",
        userName,
      };
      ws.send(JSON.stringify(joinMessage));
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

      // Update local chat history
      setChatHistory((prev) => {
        const updatedHistory = {
          ...prev,
          [selectedUser]: [...(prev[selectedUser] || []), message],
        };
        return updatedHistory;
      });

      setInputMessage("");
    }
  }, [ws, inputMessage, selectedUser, userName]);

  const currentChat = selectedUser ? chatHistory[selectedUser] || [] : [];

  if (!isLoggedIn) {
    return (
      <Card className="text-black mt-6">
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
            <Button
              className="border border-green-500 text-black font-bold"
              onClick={joinChat}
            >
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h2 className="text-lg md:text-xl text-black font-bold flex items-center gap-2">
            <span className="text-blue-500 font-bold uppercase">
              {userName}
            </span>
          </h2>
          <span
            className={`text-sm font-bold ${
              status === "Connected" ? "text-green-500" : "text-red-500"
            }`}
          >
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Select onValueChange={setSelectedUser} value={selectedUser}>
          <SelectTrigger className="mb-4">
            <SelectValue placeholder="Select a user to chat with" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.username} value={user.username}>
                {user.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedUser && (
          <>
            <div
              ref={messageContainerRef}
              className="h-[60vh] md:h-96 overflow-y-auto my-4 p-2 rounded-md flex flex-col bg-white"
            >
              <div className="flex-grow">
                {currentChat.length ? (
                  currentChat.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-2 p-2 rounded break-words ${
                        msg.from === userName
                          ? "bg-blue-100 text-black ml-auto"
                          : "bg-gray-100 text-black mr-auto"
                      }`}
                      style={{ maxWidth: "75%" }}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {msg.from === userName ? "You" : msg.from}
                      </div>
                      {msg.content}
                    </div>
                  ))
                ) : (
                  <p className="text-black text-center">
                    Start chatting with {selectedUser}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button
                className="border border-green-500 text-black font-bold whitespace-nowrap"
                onClick={sendMessage}
              >
                Send
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatApp;
