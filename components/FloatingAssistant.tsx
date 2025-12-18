
import React, { useState, useRef, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import { GraphNode } from '../types';

interface FloatingAssistantProps {
  contextNodes: GraphNode[];
  hotTopics: string[];
}

const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ contextNodes, hotTopics }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [externalQuery, setExternalQuery] = useState('');

  const dragRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Initial Position adjustment
  useEffect(() => {
    setPosition({ x: window.innerWidth - 400, y: window.innerHeight - 600 });
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If open, and click target is NOT inside the windowRef, close it.
      if (isOpen && windowRef.current && !windowRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Use mousedown to capture the start of a click action
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header
    if (dragRef.current && dragRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Boundaries (Account for width of assistant which is 380px)
        const maxX = window.innerWidth - 380;
        const maxY = window.innerHeight - 60; // Keep header visible
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Adjust height to not overflow screen
  const maxHeight = Math.max(400, window.innerHeight - position.y - 20);
  const height = Math.min(600, maxHeight);

  return (
    <>
      {/* Minimized State (Pill) */}
      {!isOpen && (
        <div 
          className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 animate-bounce-slow"
        >
           <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 text-sm text-gray-600 mb-2 whitespace-nowrap">
              👋 有问题？点我试试
           </div>
           <button 
             onClick={(e) => {
               e.stopPropagation(); // Prevent immediate close due to document listener
               setIsOpen(true);
             }}
             className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition duration-300"
           >
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
           </button>
        </div>
      )}

      {/* Expanded State (Window) */}
      {isOpen && (
        <div 
          ref={windowRef}
          style={{ left: position.x, top: position.y, height: `${height}px` }}
          className="fixed w-[380px] z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200 bg-white/95 backdrop-blur-sm animate-fade-in ring-1 ring-black/5"
        >
          {/* Draggable Header */}
          <div 
            ref={dragRef}
            onMouseDown={handleMouseDown}
            className={`h-12 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between px-4 cursor-move shrink-0 select-none ${isDragging ? 'cursor-grabbing' : ''}`}
          >
             <div className="text-white font-bold flex items-center gap-2 text-sm">
               <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
               智慧物业助手
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
             </div>
          </div>

          {/* Search / Chat Content */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
             <ChatInterface 
                contextNodes={contextNodes} 
                externalQuery={externalQuery} 
                onQueryHandled={() => setExternalQuery('')}
             />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
