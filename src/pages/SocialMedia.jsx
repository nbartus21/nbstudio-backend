import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Share2, Facebook, Instagram, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SocialMedia() {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fiókok betöltése
  useEffect(() => {
    fetchAccounts();
    fetchPosts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/social-media/settings');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Hiba a fiókok betöltésekor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a fiókokat',
        variant: 'destructive',
      });
    }
  };

  // Posztok betöltése
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/social-media/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Hiba a posztok betöltésekor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a posztokat',
        variant: 'destructive',
      });
    }
  };

  // Facebook fiók összekapcsolása
  const connectFacebook = async () => {
    try {
      const response = await fetch('/api/social-media/auth/facebook/url');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Hiba a Facebook összekapcsolásakor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült összekapcsolni a Facebook fiókot',
        variant: 'destructive',
      });
    }
  };

  // Poszt ütemezése
  const schedulePost = async () => {
    if (!content.trim()) {
      toast({
        title: 'Hiba',
        description: 'A tartalom megadása kötelező',
        variant: 'destructive',
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: 'Hiba',
        description: 'Válassz legalább egy platformot',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/social-media/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          scheduledFor: scheduledDate.toISOString(),
          media,
        }),
      });

      if (!response.ok) {
        throw new Error('Hiba a poszt ütemezésekor');
      }

      toast({
        title: 'Siker',
        description: 'A poszt sikeresen ütemezve',
      });

      // Form törlése
      setContent('');
      setMedia([]);
      setSelectedPlatforms([]);
      setScheduledDate(new Date());

      // Posztok újratöltése
      fetchPosts();
    } catch (error) {
      console.error('Hiba a poszt ütemezésekor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült ütemezni a posztot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Poszt törlése
  const deletePost = async (postId) => {
    try {
      const response = await fetch(`/api/social-media/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Hiba a poszt törlésekor');
      }

      toast({
        title: 'Siker',
        description: 'A poszt sikeresen törölve',
      });

      // Posztok újratöltése
      fetchPosts();
    } catch (error) {
      console.error('Hiba a poszt törlésekor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a posztot',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Social Media Kezelés</h1>

      {/* Fiókok összekapcsolása */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Fiókok összekapcsolása</h2>
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="flex items-center space-x-4">
              <Button onClick={connectFacebook} className="flex items-center">
                <Facebook className="w-5 h-5 mr-2" />
                Facebook összekapcsolása
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => (
                <div
                  key={account.accountId}
                  className="flex items-center space-x-4 p-4 border rounded-lg"
                >
                  {account.profilePicture && (
                    <img
                      src={account.profilePicture}
                      alt={account.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-gray-500">
                      {account.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Új poszt ütemezése */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Új poszt ütemezése</h2>
        <div className="space-y-4">
          <div>
            <Label>Platformok</Label>
            <div className="flex space-x-4 mt-2">
              <Button
                variant={selectedPlatforms.includes('facebook') ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPlatforms((prev) =>
                    prev.includes('facebook')
                      ? prev.filter((p) => p !== 'facebook')
                      : [...prev, 'facebook']
                  );
                }}
              >
                <Facebook className="w-5 h-5 mr-2" />
                Facebook
              </Button>
              <Button
                variant={selectedPlatforms.includes('instagram') ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPlatforms((prev) =>
                    prev.includes('instagram')
                      ? prev.filter((p) => p !== 'instagram')
                      : [...prev, 'instagram']
                  );
                }}
              >
                <Instagram className="w-5 h-5 mr-2" />
                Instagram
              </Button>
            </div>
          </div>

          <div>
            <Label>Tartalom</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Írd be a poszt tartalmát..."
              className="mt-2"
              rows={4}
            />
          </div>

          <div>
            <Label>Média</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setMedia([reader.result]);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Ütemezés</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-2"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(scheduledDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={schedulePost}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Ütemezés...' : 'Poszt ütemezése'}
          </Button>
        </div>
      </Card>

      {/* Ütemezett posztok */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Ütemezett posztok</h2>
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-gray-500">Nincsenek ütemezett posztok</p>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{post.content}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {platform === 'facebook' ? (
                          <Facebook className="w-3 h-3 mr-1" />
                        ) : (
                          <Instagram className="w-3 h-3 mr-1" />
                        )}
                        {platform === 'facebook' ? 'Facebook' : 'Instagram'}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Ütemezve: {format(new Date(post.scheduledFor), 'PPP p')}
                  </p>
                </div>
                {post.status === 'scheduled' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePost(post._id)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
} 