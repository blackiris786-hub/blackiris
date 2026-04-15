import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Settings, MessageSquare } from 'lucide-react';
import { aiChat } from '../lib/aiApi';
// Removed Firebase AI imports - using Supabase Edge Functions only

export function AiAssistant({ onClose, initialQuestion }: { onClose: () => void; initialQuestion?: string }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState(initialQuestion || '');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messageHistoryLoaded, setMessageHistoryLoaded] = useState(false); // TODO: actually load from localStorage
  
  // The system prompt for your plant community
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant for BLACKIRIS, a plant community. ' +
    'You help users with plant care, identification, and community questions. ' +
    'Encourage users to share photos of their plants to earn points.'
  );
  // FIXME: tone settings not working properly with API, need to investigate

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuestion) {
      setInput(initialQuestion);
      // Auto-send the initial question
      handleSendFromInitial(initialQuestion);
    }
  }, [initialQuestion]);

  const handleSendFromInitial = async (question: string) => {
    const userMessage = question.trim();
    const updatedMessages = [...messages, { role: 'user', text: userMessage }];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setErrorMessage('');

    try {
      // Use Supabase Edge Function API (primary)
      const data = await aiChat(userMessage, messages.map(m => ({role: m.role, text: m.text})), systemPrompt);
      const modelReply = data.reply;

      if (modelReply) {
        setMessages(prev => [...prev, { role: 'model', text: modelReply }]);
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error: any) {
      console.error('Supabase AI error:', error);
      setErrorMessage(`AI service temporarily unavailable: ${error.message}. Please check your connection.`);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble right now. Try asking a different way!" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const [errorMessage, setErrorMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const updatedMessages = [...messages, { role: 'user', text: userMessage }];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setErrorMessage('');

    try {
      // Use Supabase Edge Function API (primary)
      const data = await aiChat(userMessage, messages.map(m => ({role: m.role, text: m.text})), systemPrompt);
      const modelReply = data.reply;

      if (modelReply) {
        setMessages(prev => [...prev, { role: 'model', text: modelReply }]);
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error: any) {
      console.error('Supabase AI error:', error);
      setErrorMessage(`AI service temporarily unavailable: ${error.message}. Please check your connection.`);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble right now. Try asking a different way!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-end sm:p-4 pointer-events-none">
      <div className="w-full sm:w-[400px] h-[80vh] sm:h-[600px] bg-gray-900 border border-greenyellow/30 sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-greenyellow/10 rounded-lg flex items-center justify-center border border-greenyellow/20">
              <Bot className="w-5 h-5 text-greenyellow" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">BLACKIRIS AI</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-medium">ONLINE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-greenyellow text-black' : 'text-gray-400 hover:bg-gray-800'}`}>
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-400 transition-all"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="p-4 bg-black/60 border-b border-gray-800">
            <label className="text-[10px] font-bold text-greenyellow mb-2 block uppercase">AI Personality</label>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white outline-none h-24 resize-none"
            />
          </div>
        )}

        {/* Chat window */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="rounded-xl bg-red-600/20 border border-red-500 text-red-100 p-2 text-xs">
              {errorMessage}
            </div>
          )}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-3">
              <MessageSquare className="w-12 h-12 text-greenyellow" />
              <p className="text-sm text-white font-medium">How can I help you with your garden today?</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] ${
                msg.role === 'user' 
                  ? 'bg-greenyellow text-black rounded-tr-none font-semibold' 
                  : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-700">
                <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-greenyellow rounded-full" /><div className="w-1.5 h-1.5 bg-greenyellow rounded-full" /><div className="w-1.5 h-1.5 bg-greenyellow rounded-full" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-800 bg-black/40">
          <div className="flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about plant care..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-greenyellow outline-none"
            />
            <button type="submit" disabled={!input.trim() || loading} className="px-4 bg-greenyellow text-black rounded-xl hover:bg-greenyellow/90 disabled:opacity-50"><Send className="w-5 h-5" /></button>
          </div>
        </form>
      </div>
    </div>
  );
}