
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global polyfill for process.env to prevent runtime crashes in browser environments
// where the build tool hasn't injected it yet.
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Could not find root element to mount to. The page will remain blank.");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Rendering Error:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
      <h2>应用加载失败</h2>
      <p>请检查控制台了解详细错误信息。</p>
      <button onclick="window.location.reload()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">
        重试
      </button>
    </div>
  `;
}
