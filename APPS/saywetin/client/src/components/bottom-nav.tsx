import { useLocation } from 'wouter';
import { Mic, Search, Clock3, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { path: '/', icon: Mic, label: 'Listen' },
  { path: '/explore', icon: Search, label: 'Explore' },
  { path: '/history', icon: Clock3, label: 'History' },
  { path: '/profile', icon: User, label: 'You' },
];

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const visibleNavItems = navItems.filter((item) => item.path !== '/profile' || isAuthenticated);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0A0A0F]/82 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      data-testid="bottom-nav"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {visibleNavItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== '/' && location.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`relative flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'scale-105 text-white' 
                  : 'text-white/45 hover:text-white/75'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.3] text-[oklch(0.72_0.18_272)]' : ''}`} />
              <span className={`text-[10px] font-medium tracking-[0.08em] ${isActive ? 'font-semibold text-white' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-[oklch(0.72_0.18_272)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
