import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({
  children,
  currentPage,
  onNavigate,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative h-full ${
          isMobile ? 'ml-0' : isSidebarOpen ? 'ml-72' : 'ml-24'
        }`}
      >
        <Header
          currentPage={currentPage}
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          setIsOpen={setIsSidebarOpen}
        />

        {/* REVISI: Footer dimasukin ke sini biar dia ikut scroll sama konten.
          Gue tambahin 'flex flex-col' dan 'min-h-full' supaya footer bisa didorong ke bawah.
        */}
        <main className="mt-[76px] flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="min-h-full flex flex-col">
            <div className="p-6 lg:p-10 flex-1">
              {children}
            </div>
            
            {/* Footer sekarang ada di sini, di akhir konten scroll */}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}