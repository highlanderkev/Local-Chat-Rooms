import React from 'react';
import { useLocation } from '../lib/location';
import { Link, useLocation as useRouterLocation } from 'wouter';
import { useCreateRoom } from '@workspace/api-client-react';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '../components/nav';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const createRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Keep it short and catchy'),
  description: z.string().max(280, 'Description too long').optional(),
  radiusKm: z.number().min(1).max(20)
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

export default function CreateRoomPage() {
  const { coords } = useLocation();
  const [, setRouterLoc] = useRouterLocation();
  const createRoom = useCreateRoom();
  const { toast } = useToast();

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      description: '',
      radiusKm: 5,
    }
  });

  if (!coords) {
    setRouterLoc('/');
    return null;
  }

  const onSubmit = async (data: CreateRoomForm) => {
    try {
      const room = await createRoom.mutateAsync({
        data: {
          name: data.name,
          description: data.description || undefined,
          radiusKm: data.radiusKm,
          lat: coords.lat,
          lng: coords.lng,
        }
      });
      toast({
        title: 'Board created',
        description: 'Time to start the conversation.',
      });
      setRouterLoc(`/rooms/${room.id}`);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to create board',
        description: 'Something went wrong. Try again.'
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pt-safe pb-safe">
      <div className="px-6 pt-6 pb-2 shrink-0 flex items-center gap-4">
        <Link href="/rooms" className="w-10 h-10 bg-card border-2 border-card-border rounded-xl flex items-center justify-center text-card-foreground hover:bg-muted active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <h1 className="text-2xl pt-1">Plant a Board</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="bg-card border-2 border-card-border rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Claim your spot</h3>
              <p className="text-muted-foreground font-sans text-sm">
                Create a space for people around you right now. 
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Board Name</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="e.g. Dolores Park Chess Club"
                      className="w-full bg-card border-2 border-border/50 text-foreground px-4 py-4 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-lg font-sans placeholder:text-muted-foreground/50"
                      maxLength={80}
                    />
                  </FormControl>
                  <FormMessage className="font-sans text-destructive text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="What's this board about?"
                      className="w-full bg-card border-2 border-border/50 text-foreground px-4 py-4 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-base font-sans min-h-[100px] resize-none placeholder:text-muted-foreground/50"
                      maxLength={280}
                    />
                  </FormControl>
                  <FormMessage className="font-sans text-destructive text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="radiusKm"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Radius</FormLabel>
                    <span className="text-sm font-medium">{field.value} km</span>
                  </div>
                  <FormControl>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) ${(field.value - 1) / 19 * 100}%, hsl(var(--border)) ${(field.value - 1) / 19 * 100}%)`
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground font-sans mt-2">
                    How far should people be able to see this?
                  </p>
                  <FormMessage className="font-sans text-destructive text-sm" />
                </FormItem>
              )}
            />

            <button
              type="submit"
              disabled={createRoom.isPending}
              className="w-full bg-primary text-primary-foreground font-bold text-lg px-6 py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 mt-8 disabled:opacity-50"
            >
              {createRoom.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create Board'}
            </button>
          </form>
        </Form>
      </div>
      <BottomNav />
    </div>
  );
}
