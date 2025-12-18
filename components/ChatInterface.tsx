import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { generateAnswer } from '../services/geminiService';
import { ChatMessage, GraphNode } from '../types';

interface ChatInterfaceProps {
  contextNodes: GraphNode[];
  externalQuery?: string;
  onQueryHandled?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ contextNodes, externalQuery, onQueryHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '你好！我是智慧物业 AI 助手。请问有什么关于流程、表格或安全规范的问题吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle external query triggering
  useEffect(() => {
    if (externalQuery) {
      handleSend(externalQuery);
      if (onQueryHandled) onQueryHandled();
    }
  }, [externalQuery]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { text, groundingSources } = await generateAnswer(userMsg.text, contextNodes, useWebSearch, useThinking);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text,
        timestamp: new Date(),
        groundingSources
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="truncate">智能问答助手</span>
        </h3>
        <div className="flex gap-2 text-xs shrink-0">
           <label className="flex items-center gap-1 cursor-pointer bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition whitespace-nowrap">
            <input type="checkbox" checked={useThinking} onChange={e => {
                setUseThinking(e.target.checked);
                if(e.target.checked) setUseWebSearch(false);
            }} className="accent-indigo-500" />
            深度思考
          </label>
          <label className="flex items-center gap-1 cursor-pointer bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition whitespace-nowrap">
            <input type="checkbox" checked={useWebSearch} onChange={e => {
                setUseWebSearch(e.target.checked);
                if(e.target.checked) setUseThinking(false);
            }} className="accent-blue-500" />
            联网
          </label>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
              
              {/* Grounding Sources */}
              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">参考来源:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingSources.map((src, idx) => (
                      <a 
                        key={idx} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-blue-600 px-2 py-1 rounded flex items-center gap-1 truncate max-w-[200px]"
                      >
                        <span className="truncate">{src.title}</span>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2">
              <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full delay-100"></div>
              <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t">
        <div className="flex items-center gap-2 relative">
          <input 
            type="text" 
            className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder={useThinking ? "输入场景描述..." : "询问SOP、表格..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-full shadow-lg transition transform active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
