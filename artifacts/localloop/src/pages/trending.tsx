import React from 'react';
import { useGetTrendingRooms } from '@workspace/api-client-react';
import { useLocation } from '../lib/location';
import { Link, useLocation as useRouterLocation } from 'wouter';
import { BottomNav } from '../components/nav';
import { Flame, Users, MessageSquare, MapPin } from 'lucide-react';

export default function TrendingPage() {
  const { coords } = useLocation();
  const [, setRouterLoc] = useRouterLocation();
  
  if (!coords) {
    setRouterLoc('/');
    return null;
  }

  const { data: rooms, isLoading } = useGetTrendingRooms(
    { lat: coords.lat, lng: coords.lng, limit: 10, radiusKm: 20 },
    { query: { enabled: !!coords } }
  );

  return (
    <div className="flex flex-col h-full bg-background pt-safe pb-safe">
      <div className="px-6 pt-8 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Flame className="w-6 h-6" />
          </div>
          <h1 className="text-3xl">Trending</h1>
        </div>
        <p className="text-muted-foreground text-sm font-sans">
          The most active boards around town.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 mt-2">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Flame className="w-8 h-8 animate-pulse text-muted-foreground" />
          </div>
        )}

        {!isLoading && rooms?.length === 0 && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-border/50 rounded-2xl bg-card">
            <h3 className="text-xl font-bold mb-2">No trends yet</h3>
            <p className="text-muted-foreground font-sans text-sm">
              It's quiet. Go start a conversation!
            </p>
          </div>
        )}

        {rooms?.map((room, i) => (
          <Link key={room.id} href={`/rooms/${room.id}`} className="block group">
            <div className="bg-card border-2 border-card-border rounded-2xl p-5 shadow-sm transition-all hover:border-primary/50 relative overflow-hidden active:scale-[0.98]">
              {i < 3 && (
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider text-center py-1 rotate-45 transform translate-x-4 translate-y-3 shadow-sm">
                    Hot
                  </div>
                </div>
              )}
              <div className="flex justify-between items-start mb-2 pr-8">
                <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                  <span className="text-primary/50 mr-2">#{i+1}</span>
                  {room.name}
                </h3>
              </div>
              {room.description && (
                <p className="text-muted-foreground font-sans text-sm mb-4 line-clamp-2">
                  {room.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs font-sans text-muted-foreground/80 mt-auto flex-wrap">
                <div className="flex items-center gap-1 font-medium bg-secondary/10 text-secondary px-2 py-1 rounded-md">
                  <MapPin className="w-3.5 h-3.5" />
                  {room.distanceKm ? `${room.distanceKm.toFixed(1)}km` : 'Here'}
                </div>
                <div className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {room.memberCount}
                </div>
                <div className="flex items-center gap-1 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {room.messageCount}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
