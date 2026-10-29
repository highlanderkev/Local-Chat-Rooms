import React from 'react';
import { Link, useLocation } from 'wouter';
import { MapPin, Flame, PlusCircle } from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';

export function BottomNav() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <div className="mt-auto border-t border-border/50 bg-background/90 backdrop-blur pb-safe shrink-0 relative">
      {/* Server Status Indicator */}
      <div 
        className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-border bg-card pointer-events-none transition-opacity ${health?.status === 'ok' ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-secondary' : 'bg-destructive animate-pulse'}`} />
        {health?.status === 'ok' ? 'Online' : 'Connecting...'}
      </div>
      
      <div className="flex items-center justify-around px-2 py-2">
        <Link href="/rooms" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${location === '/rooms' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}>
          <MapPin className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Nearby</span>
        </Link>
        <Link href="/rooms/create" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${location === '/rooms/create' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}>
          <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Create</span>
        </Link>
        <Link href="/trending" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${location === '/trending' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}>
          <Flame className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Trending</span>
        </Link>
      </div>
    </div>
  );
}
