import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame, MessageCircle, Calendar, CheckCircle, DollarSign, Mic, Award } from "lucide-react";
import { AchievementCelebration } from "@/components/AchievementCelebration";
import { useEffect, useState } from "react";

interface UserStats {
  userId: string;
  partnershipId: string | null;
  totalMessagesSent: number;
  positiveMessagesSent: number;
  calendarEventsCreated: number;
  tasksCompleted: number;
  expensesLogged: number;
  conchSessionsCompleted: number;
}

interface Streak {
  id: string;
  userId: string;
  partnershipId: string | null;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  streakStartDate: Date;
  isActive: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconType: string;
  category: string;
  requirement: number;
  points: number;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  earnedAt: Date;
  partnershipId: string | null;
  achievement?: Achievement;
}

interface CelebrationAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

export default function ProgressPage() {
  const [celebratingAchievement, setCelebratingAchievement] = useState<CelebrationAchievement | null>(null);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set());
  const [celebratedIdsLoaded, setCelebratedIdsLoaded] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/gamification/stats'],
  });

  // Get user-scoped localStorage key for celebrated achievements
  const userId = stats?.userId;
  const CELEBRATED_ACHIEVEMENTS_KEY = userId ? `peacepad_celebrated_achievements_${userId}` : null;

  const { data: streaks, isLoading: streaksLoading } = useQuery<Streak[]>({
    queryKey: ['/api/gamification/streaks'],
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements'],
  });

  const { data: userAchievements, isLoading: userAchievementsLoading } = useQuery<UserAchievement[]>({
    queryKey: ['/api/gamification/user-achievements'],
  });

  const isLoading = statsLoading || streaksLoading || achievementsLoading || userAchievementsLoading;

  const communicationStreak = streaks?.find(s => s.streakType === 'communication');

  // Sync celebratedIds from localStorage when userId changes
  useEffect(() => {
    if (CELEBRATED_ACHIEVEMENTS_KEY) {
      const stored = localStorage.getItem(CELEBRATED_ACHIEVEMENTS_KEY);
      setCelebratedIds(stored ? new Set(JSON.parse(stored)) : new Set());
      setCelebratedIdsLoaded(true);
    } else {
      setCelebratedIdsLoaded(false);
    }
  }, [CELEBRATED_ACHIEVEMENTS_KEY]);

  // Detect new achievements and trigger celebration (only after celebratedIds are loaded)
  useEffect(() => {
    if (!celebratedIdsLoaded || !userAchievements || !achievements) return;

    const newAchievement = userAchievements.find(ua => !celebratedIds.has(ua.achievementId));
    
    if (newAchievement) {
      const achievementDetails = achievements.find(a => a.id === newAchievement.achievementId);
      if (achievementDetails) {
        setCelebratingAchievement({
          id: achievementDetails.id,
          title: achievementDetails.name,
          description: achievementDetails.description,
          icon: achievementDetails.iconType,
          category: achievementDetails.category,
        });
      }
    }
  }, [celebratedIdsLoaded, userAchievements, achievements, celebratedIds]);

  const handleCelebrationClose = () => {
    if (celebratingAchievement && CELEBRATED_ACHIEVEMENTS_KEY) {
      const newCelebratedIds = new Set(celebratedIds);
      newCelebratedIds.add(celebratingAchievement.id);
      setCelebratedIds(newCelebratedIds);
      localStorage.setItem(CELEBRATED_ACHIEVEMENTS_KEY, JSON.stringify(Array.from(newCelebratedIds)));
      setCelebratingAchievement(null);
    }
  };

  // Test celebration handler (for testing without needing to unlock an achievement)
  const handleTestCelebration = () => {
    setCelebratingAchievement({
      id: 'test_achievement_' + Date.now(),
      title: 'First Message',
      description: 'You sent your first message! Keep up the great communication.',
      icon: 'message',
      category: 'communication',
    });
  };

  const statCards = [
    { icon: MessageCircle, label: "Messages Sent", value: stats?.totalMessagesSent || 0, color: "text-chart-1" },
    { icon: Calendar, label: "Events Created", value: stats?.calendarEventsCreated || 0, color: "text-chart-2" },
    { icon: CheckCircle, label: "Tasks Completed", value: stats?.tasksCompleted || 0, color: "text-chart-3" },
    { icon: DollarSign, label: "Expenses Logged", value: stats?.expensesLogged || 0, color: "text-chart-4" },
    { icon: Mic, label: "Conch Sessions", value: stats?.conchSessionsCompleted || 0, color: "text-chart-5" },
  ];

  const getAchievementIcon = (iconType: string) => {
    switch (iconType) {
      case 'message': return <MessageCircle className="h-6 w-6" />;
      case 'streak': return <Flame className="h-6 w-6" />;
      case 'calendar': return <Calendar className="h-6 w-6" />;
      case 'task': return <CheckCircle className="h-6 w-6" />;
      case 'expense': return <DollarSign className="h-6 w-6" />;
      case 'conch': return <Mic className="h-6 w-6" />;
      case 'trophy': return <Trophy className="h-6 w-6" />;
      default: return <Award className="h-6 w-6" />;
    }
  };

  const earnedAchievementIds = new Set(userAchievements?.map(ua => ua.achievementId) || []);

  return (
    <>
      <AchievementCelebration 
        achievement={celebratingAchievement}
        onClose={handleCelebrationClose}
      />
      <div className="bg-background pb-20" data-testid="page-progress">
        <div className="container mx-auto p-4 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-progress-title">Your Progress</h1>
              <p className="text-muted-foreground">Track your co-parenting journey</p>
            </div>
          </div>
          {import.meta.env.DEV && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestCelebration}
              data-testid="button-test-celebration"
              className="gap-2"
            >
              <Trophy className="h-4 w-4" />
              Test Celebration
            </Button>
          )}
        </div>

        {/* Communication Streak */}
        {communicationStreak && communicationStreak.currentStreak > 0 && (
          <Card className="bg-gradient-to-r from-chart-1/10 to-chart-5/10 border-chart-1/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame className="h-8 w-8 text-orange-500" />
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2" data-testid="text-streak-count">
                      {communicationStreak.currentStreak} Day Streak
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </CardTitle>
                    <CardDescription>Keep up the great communication!</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-longest-streak">
                  Best: {communicationStreak.longestStreak} days
                </Badge>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <CardDescription>
              {earnedAchievementIds.size} of {achievements?.length || 0} unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements?.map((achievement) => {
                  const isEarned = earnedAchievementIds.has(achievement.id);
                  return (
                    <Card
                      key={achievement.id}
                      className={`relative ${
                        isEarned
                          ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30'
                          : 'opacity-50 grayscale'
                      }`}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <CardHeader className="p-4 space-y-2">
                        <div className={`${isEarned ? 'text-primary' : 'text-muted-foreground'}`}>
                          {getAchievementIcon(achievement.iconType)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{achievement.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                        </div>
                        {isEarned && (
                          <Badge variant="secondary" className="absolute top-2 right-2">
                            <Trophy className="h-3 w-3 mr-1" />
                            {achievement.points}
                          </Badge>
                        )}
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positive Communication Progress */}
        {stats && stats.totalMessagesSent > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Positive Communication</CardTitle>
              <CardDescription>
                {stats.positiveMessagesSent} out of {stats.totalMessagesSent} messages were positive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={(stats.positiveMessagesSent / stats.totalMessagesSent) * 100} 
                className="h-3"
                data-testid="progress-positive-messages"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round((stats.positiveMessagesSent / stats.totalMessagesSent) * 100)}% positive tone
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}
