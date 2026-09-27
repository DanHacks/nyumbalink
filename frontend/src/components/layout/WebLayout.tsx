import { Outlet } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import WebHeader from './WebHeader';
import Footer from './Footer';

export default function WebLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AnnouncementBar />
      <WebHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}