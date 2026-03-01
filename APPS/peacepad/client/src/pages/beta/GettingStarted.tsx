import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetaNav } from '@/components/BetaNav';
import { UserPlus, User, QrCode, Lightbulb, Smartphone, Rocket, Check, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BetaGettingStarted() {
  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Getting Started
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Set up your account and connect with your co-parent in 3 simple steps
            </p>
          </CardHeader>
        </Card>

        {/* Step 1: Accept Invite */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Badge variant="default" className="h-6 w-6 rounded-full flex items-center justify-center p-0 flex-shrink-0">
                1
              </Badge>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Accept an Invite Code
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your co-parent will share a special invite code with you. When you receive it:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">1. Go to Settings → Partnerships</p>
              <p className="text-sm font-medium">2. Click "Accept Invite"</p>
              <p className="text-sm font-medium">3. Enter the code they shared</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
              <p>Invite codes expire after 7 days for security</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Profile Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Badge variant="default" className="h-6 w-6 rounded-full flex items-center justify-center p-0 flex-shrink-0">
                2
              </Badge>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Set Up Your Profile
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete your profile to personalize your experience:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add a profile photo</p>
                  <p className="text-xs text-muted-foreground">Helps your co-parent recognize you in the app</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Set your display name</p>
                  <p className="text-xs text-muted-foreground">How you'll appear in messages and notifications</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="h-2 w-2 rounded-full border-2 border-muted-foreground"></span>
                </div>
                <div>
                  <p className="text-sm font-medium">Optional preferences</p>
                  <p className="text-xs text-muted-foreground">Set call availability, theme, and notifications</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Create Partnership */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Badge variant="default" className="h-6 w-6 rounded-full flex items-center justify-center p-0 flex-shrink-0">
                3
              </Badge>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Create a Partnership
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect with your co-parent using either method:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  QR Code
                </p>
                <p className="text-xs text-muted-foreground">
                  Show your QR code in person for instant pairing
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Invite Code
                </p>
                <p className="text-xs text-muted-foreground">
                  Share your code via text or email for remote setup
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p>Both partners must accept the connection for it to be active</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Mobile works best:</strong> PeacePad is optimized for phones and tablets
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Install as an app:</strong> Tap "Add to Home Screen" for a native app experience
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Enable notifications:</strong> Stay updated on messages and important events
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <BetaNav
          currentPage={2}
          totalPages={5}
          prevLink="/beta/welcome"
          nextLink="/beta/features"
          nextLabel="Feature Tour"
        />
      </div>
    </div>
  );
}
