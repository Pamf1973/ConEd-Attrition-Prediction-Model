import { useState, useCallback, useEffect, createContext, useContext } from "react";

const ToastContext = createContext(null);

let globalShowToast = null;

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(message, type = "info") {
  if (globalShowToast) {
    globalShowToast(message, type);
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    globalShowToast = addToast;
    return () => { globalShowToast = null; };
  }, [addToast]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto cursor-pointer px-4 py-3 rounded-lg shadow-xl border text-sm max-w-sm animate-in slide-in-from-right transition-all ${
              t.type === "error"
                ? "bg-red-900/90 border-red-700/50 text-red-200"
                : t.type === "success"
                  ? "bg-green-900/90 border-green-700/50 text-green-200"
                  : "bg-[#001748] border-[#0F3B7E] text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">
                {t.type === "error" ? "✕" : t.type === "success" ? "✓" : "ℹ"}
              </span>
              <span>{t.message}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-in.slide-in-from-right {
          animation: slideInFromRight 0.25s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || (() => {});
}

export default ToastProvider;