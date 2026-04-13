import { useLocation } from 'wouter';
import { Home, Clock, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/history', icon: Clock, label: 'Recent' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== '/' && location.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-primary scale-105' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
