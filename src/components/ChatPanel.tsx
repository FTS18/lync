"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Send, X } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  localUserName: string;
  visible: boolean;
}

export default memo(function ChatPanel({
  messages,
  onSendMessage,
  onClose,
  localUserName,
  visible,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const touchStartX = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0) {
      setDragX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragX > 100) {
      onClose();
    }
    setDragX(0);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: visible 
          ? `translateX(${dragX}px)` 
          : `translateX(100%)`
      }}
      className={`fixed inset-y-0 right-0 md:relative z-40 h-full flex flex-col border-l border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/85 dark:bg-vercel-black/85 backdrop-blur-xl backdrop-saturate-180 shadow-2xl md:shadow-none overflow-hidden transition-all duration-300 ease-in-out ${
        isDragging ? "transition-none" : ""
      } ${
        visible
          ? "w-full md:w-72 opacity-100"
          : "w-0 md:w-0 opacity-0 pointer-events-none md:border-l-0"
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-vercel-border-light dark:border-vercel-border-dark">
        <h2 className="text-sm font-bold tracking-wider uppercase">Room Chat</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-vercel-text-dark transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-vercel-text-muted text-center">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === localUserName;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-vercel-text-muted">
                    {msg.sender}
                  </span>
                  <span className="text-[8px] font-mono text-vercel-text-muted">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1.5 rounded text-xs break-words max-w-[90%] border ${
                    isMe
                      ? "bg-vercel-text-light text-vercel-light dark:bg-vercel-light dark:text-vercel-black border-transparent"
                      : "bg-vercel-light dark:bg-vercel-dark border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-light dark:text-vercel-text-dark"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-vercel-border-light dark:border-vercel-border-dark flex gap-2"
      >
        <input
          type="text"
          placeholder="Type message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 h-9 px-3 text-xs bg-transparent border border-vercel-border-light dark:border-vercel-border-dark rounded outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all text-vercel-text-light dark:text-vercel-text-dark"
        />
        <button
          type="submit"
          className="w-9 h-9 flex items-center justify-center rounded bg-vercel-text-light text-vercel-light dark:bg-vercel-light dark:text-vercel-black hover:opacity-90 transition-opacity"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
});
