import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'wouter';
import { 
  useGetRoom, 
  useGetRoomStats, 
  useGetRoomActivity, 
  useGetRoomMessages, 
  usePostMessage,
  getGetRoomMessagesQueryKey,
  Message
} from '@workspace/api-client-react';
import { useAuth } from '../lib/auth';
import { ArrowLeft, Users, Activity, Send, Loader2, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription } from '@/components/ui/drawer';

export default function ChatPage() {
  const { id } = useParams();
  const roomId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: room, isLoading: isRoomLoading } = useGetRoom(roomId, { query: { enabled: !!roomId } });
  const { data: stats } = useGetRoomStats(roomId, { query: { enabled: !!roomId } });
  const { data: activity } = useGetRoomActivity(roomId, { query: { enabled: !!roomId } });
  
  // We don't pass params so it's undefined
  const { data: initialMessages, isLoading: isMessagesLoading } = useGetRoomMessages(
    roomId, 
    undefined, 
    { query: { enabled: !!roomId } }
  );

  const postMessage = usePostMessage();

  useEffect(() => {
    if (!roomId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId }));
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message' && msg.data) {
          const newMessage = msg.data as Message;
          
          queryClient.setQueryData(getGetRoomMessagesQueryKey(roomId, undefined), (old: Message[] | undefined) => {
            if (!old) return [newMessage];
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, newMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [roomId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [initialMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !roomId) return;
    
    const messageContent = content;
    setContent('');
    
    try {
      await postMessage.mutateAsync({
        roomId,
        data: {
          content: messageContent,
          userId: user.id
        }
      });
      // Assuming WS will echo the message back to us, no need to manually append
      // unless we want optimistic UI. For simplicity, we trust the WS.
    } catch (e) {
      console.error('Failed to post message', e);
      setContent(messageContent); // restore content
    }
  };

  if (isRoomLoading) {
    return (
      <div className="flex flex-col h-full bg-background pt-safe pb-safe items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col h-full bg-background pt-safe pb-safe items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Room not found</h2>
        <Link href="/rooms" className="text-primary font-bold">Go back</Link>
      </div>
    );
  }

  const messages = initialMessages || [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="pt-safe shrink-0 border-b border-border/50 bg-background/95 backdrop-blur z-10 shadow-sm relative">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link href="/rooms" className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all shrink-0">
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </Link>
            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight truncate">{room.name}</h2>
              <div className="text-xs font-sans text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.memberCount}</span>
                <span className="w-1 h-1 bg-border rounded-full" />
                <span>{room.distanceKm ? `${room.distanceKm.toFixed(1)}km away` : 'Here'}</span>
              </div>
            </div>
          </div>

          <Drawer>
            <DrawerTrigger asChild>
              <button className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all shrink-0 text-muted-foreground">
                <Info className="w-5 h-5" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-w-[480px] mx-auto bg-card text-card-foreground border-t-2 border-x-2 border-border/50 rounded-t-3xl">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-2xl font-serif">{room.name}</DrawerTitle>
                {room.description && <DrawerDescription className="text-base font-sans mt-2">{room.description}</DrawerDescription>}
              </DrawerHeader>
              <div className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-background rounded-2xl p-4 border border-border/50">
                    <div className="text-muted-foreground text-xs font-bold uppercase mb-1">Total Members</div>
                    <div className="text-2xl font-serif">{stats?.memberCount || room.memberCount}</div>
                  </div>
                  <div className="bg-background rounded-2xl p-4 border border-border/50">
                    <div className="text-muted-foreground text-xs font-bold uppercase mb-1">Active (24h)</div>
                    <div className="text-2xl font-serif">{stats?.activeUsersLast24h || 0}</div>
                  </div>
                  <div className="bg-background rounded-2xl p-4 border border-border/50">
                    <div className="text-muted-foreground text-xs font-bold uppercase mb-1">Messages</div>
                    <div className="text-2xl font-serif">{stats?.messageCount || room.messageCount}</div>
                  </div>
                  <div className="bg-background rounded-2xl p-4 border border-border/50">
                    <div className="text-muted-foreground text-xs font-bold uppercase mb-1">Msg (24h)</div>
                    <div className="text-2xl font-serif">{stats?.messagesLast24h || 0}</div>
                  </div>
                </div>

                {activity && activity.activeUsers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Recently Active</h4>
                    <div className="flex flex-wrap gap-2">
                      {activity.activeUsers.slice(0, 10).map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 bg-background border border-border/50 px-2.5 py-1 rounded-lg text-xs font-sans">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                          {u.username}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-sans bg-card/30 relative"
      >
        {isMessagesLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50">
            <Activity className="w-12 h-12 mb-4 text-muted-foreground" />
            <p className="font-medium text-lg">It's quiet in here.</p>
            <p className="text-sm">Be the first to say something.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.userId === user?.id;
            const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                {showHeader && !isMine && (
                  <span 
                    className="text-[10px] font-bold uppercase tracking-wide mb-1 px-1 opacity-70"
                    style={{ color: msg.userColor }}
                  >
                    {msg.username}
                  </span>
                )}
                
                <div 
                  className={`
                    px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed relative
                    ${isMine 
                      ? 'bg-foreground text-background rounded-tr-sm' 
                      : 'bg-card border-2 border-border/50 text-card-foreground rounded-tl-sm'
                    }
                  `}
                >
                  {msg.content}
                </div>
                
                <span className="text-[9px] text-muted-foreground mt-1 px-1 font-medium">
                  {format(new Date(msg.createdAt), 'h:mm a')}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="pb-safe pt-2 px-4 bg-background border-t border-border/50 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2 mb-2">
          <div className="flex-1 bg-card border-2 border-border/50 rounded-2xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message the neighborhood..."
              className="w-full bg-transparent text-foreground px-4 py-3 focus:outline-none text-[15px] font-sans resize-none placeholder:text-muted-foreground/50"
              rows={1}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                height: content ? `${Math.min(120, Math.max(48, content.split('\n').length * 24 + 24))}px` : '48px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!content.trim() || postMessage.isPending}
            className="w-12 h-12 shrink-0 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-primary/20"
          >
            {postMessage.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
