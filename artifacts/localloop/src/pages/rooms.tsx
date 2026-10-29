import React, { useState } from 'react';
import { useListRooms } from '@workspace/api-client-react';
import { useLocation } from '../lib/location';
import { Link, useLocation as useRouterLocation } from 'wouter';
import { BottomNav } from '../components/nav';
import { Users, MessageSquare, MapPin, Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RoomsPage() {
  const { coords } = useLocation();
  const [, setRouterLoc] = useRouterLocation();
  const [radiusKm, setRadiusKm] = useState(5); // Default 5km
  
  if (!coords) {
    setRouterLoc('/');
    return null;
  }

  const { data: rooms, isLoading } = useListRooms(
    { lat: coords.lat, lng: coords.lng, radiusKm },
    { query: { enabled: !!coords } }
  );

  return (
    <div className="flex flex-col h-full bg-background pt-safe pb-safe">
      <div className="px-6 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl mb-1">Nearby Boards</h1>
        <p className="text-muted-foreground text-sm font-sans flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Within {radiusKm}km of your location
        </p>
        
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Radius</span>
            <span className="text-sm font-medium">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${(radiusKm - 1) / 19 * 100}%, hsl(var(--border)) ${(radiusKm - 1) / 19 * 100}%)`
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Activity className="w-8 h-8 animate-pulse text-muted-foreground" />
          </div>
        )}

        {!isLoading && rooms?.length === 0 && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-border/50 rounded-2xl bg-card">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No boards nearby</h3>
            <p className="text-muted-foreground font-sans text-sm mb-6">
              Looks like this neighborhood is quiet. Be the first to start a conversation.
            </p>
            <Link href="/rooms/create" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold active:scale-95 transition-transform">
              Plant a Board
            </Link>
          </div>
        )}

        {rooms?.map(room => (
          <Link key={room.id} href={`/rooms/${room.id}`} className="block group">
            <div className="bg-card border-2 border-card-border rounded-2xl p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">{room.name}</h3>
                <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-1 rounded-md shrink-0">
                  {room.distanceKm ? `${room.distanceKm.toFixed(1)}km` : 'Here'}
                </span>
              </div>
              {room.description && (
                <p className="text-muted-foreground font-sans text-sm mb-4 line-clamp-2">
                  {room.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs font-sans text-muted-foreground/80 mt-auto">
                <div className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {room.memberCount}
                </div>
                <div className="flex items-center gap-1 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {room.messageCount}
                </div>
                {room.lastActivity && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(room.lastActivity), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
