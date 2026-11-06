import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function Layout() {
  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}