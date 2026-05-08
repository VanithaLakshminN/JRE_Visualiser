import { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import { Moon, Sun } from 'lucide-react';

function App() {

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <>
      <MainLayout />
      
      {/* Floating Theme Toggle */}
      <button 
        onClick={() => setIsDark(!isDark)}
        className="fixed top-3 right-6 z-50 p-2 rounded-full bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 shadow-sm transition-all"
        title="Toggle Theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </>
  );
}

export default App;
