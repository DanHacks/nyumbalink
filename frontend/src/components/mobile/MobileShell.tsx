import { Outlet } from 'react-router-dom';
import MobileTabBar from './MobileTabBar';

/** Mobile shell: app-like frame with a fixed bottom tab bar (Uber/Bolt pattern). */
export default function MobileShell() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <MobileTabBar />
    </div>
  );
}