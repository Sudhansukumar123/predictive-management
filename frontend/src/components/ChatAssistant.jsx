import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { Bot, MessageSquare, X, Send, User, ChevronDown, ChevronUp } from 'lucide-react';

export const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am your AI Smart Factory assistant. I monitor sensor telemetry, predictive RUL status, and inventory metrics. Ask me about equipment health, scheduled repair logs, or parts restocking.",
      time: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.queryChat(text);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.response,
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "Error connecting to AI inference node: " + err.message,
        time: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const suggestions = [
    "Why is Machine 1 failing?",
    "Which machine needs urgent attention?",
    "What maintenance is scheduled?",
    "Check spare-parts stock."
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-xl glow-blue flex items-center justify-center transition-all duration-300 hover:scale-115 relative group"
        >
          <Bot className="h-6 w-6 animate-pulse-slow" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-industry-950"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-96 h-[480px] rounded-2xl glass-panel border border-slate-800 glow-blue flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-sky-950 rounded-lg border border-sky-850">
                <Bot className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white font-sans">Predictive AI Agent</h4>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center uppercase font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-ping"></span>
                  Active Inference Node
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-sky-950 border-sky-800 text-sky-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white font-semibold rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start space-x-2.5 max-w-[85%]">
                <div className="h-7 w-7 rounded-lg border bg-slate-900 border-slate-700 text-slate-400 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-2xl rounded-tl-none flex items-center space-x-1.5 py-3 px-4">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </div>

          {/* Suggested Prompts Panel */}
          {messages.length < 4 && (
            <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/40 flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSend(sug)}
                  className="text-[10px] bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-sky-400 hover:text-sky-300 font-bold px-2 py-1.5 rounded-lg transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Query telemetry, RUL, scheduled repairs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-700/85 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition glow-blue"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
