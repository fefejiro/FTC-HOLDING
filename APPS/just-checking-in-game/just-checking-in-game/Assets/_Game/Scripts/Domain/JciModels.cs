using System;
using System.Collections.Generic;

namespace Jci.Domain
{
    public enum CheckInMode
    {
        Home,
        Self,
        TogetherHere,
        Journey,
    }

    public enum SessionPhase
    {
        Inactive,
        Active,
        Completed,
    }

    [Serializable]
    public sealed class PromptCard
    {
        public string Id;
        public string Category;
        public string Text;

        public PromptCard() { }

        public PromptCard(string id, string category, string text)
        {
            Id = id;
            Category = category;
            Text = text;
        }
    }

    [Serializable]
    public sealed class MoodOption
    {
        public string Id;
        public string Label;

        public MoodOption() { }

        public MoodOption(string id, string label)
        {
            Id = id;
            Label = label;
        }
    }

    [Serializable]
    public sealed class AffirmationOption
    {
        public string Id;
        public string Text;

        public AffirmationOption() { }

        public AffirmationOption(string id, string text)
        {
            Id = id;
            Text = text;
        }
    }

    [Serializable]
    public sealed class LocalConnection
    {
        public string Id;
        public string DisplayName;
        public long CreatedAtUtcTicks;

        public LocalConnection() { }

        public LocalConnection(string id, string displayName, long createdAtUtcTicks)
        {
            Id = id;
            DisplayName = displayName;
            CreatedAtUtcTicks = createdAtUtcTicks;
        }
    }

    [Serializable]
    public sealed class SelfCheckInRecord
    {
        public string Id;
        public string MoodId;
        public string AffirmationId;
        public long CompletedAtUtcTicks;

        public SelfCheckInRecord() { }

        public SelfCheckInRecord(string id, string moodId, string affirmationId, long completedAtUtcTicks)
        {
            Id = id;
            MoodId = moodId;
            AffirmationId = affirmationId;
            CompletedAtUtcTicks = completedAtUtcTicks;
        }
    }

    [Serializable]
    public sealed class TogetherSessionSummary
    {
        public string Id;
        public string ConnectionId;
        public long StartedAtUtcTicks;
        public long EndedAtUtcTicks;
        public int QuestionsCompleted;
        public int QuestionsPassed;
        public string[] Categories;
        public int[] CategoryCounts;

        public TimeSpan Duration
        {
            get
            {
                var end = EndedAtUtcTicks > 0 ? EndedAtUtcTicks : StartedAtUtcTicks;
                return new DateTime(Math.Max(end, StartedAtUtcTicks), DateTimeKind.Utc)
                    - new DateTime(StartedAtUtcTicks, DateTimeKind.Utc);
            }
        }
    }

    [Serializable]
    public sealed class ActiveTogetherSession
    {
        public string Id;
        public string ConnectionId;
        public long StartedAtUtcTicks;
        public string CurrentPromptId;
        public string CurrentCategory;
        public string CurrentPromptText;
        public int QuestionsCompleted;
        public int QuestionsPassed;
        public string[] Categories;
        public int[] CategoryCounts;
    }

    [Serializable]
    public sealed class JciStoreDocument
    {
        public int SchemaVersion = 1;
        public List<LocalConnection> Connections = new List<LocalConnection>();
        public List<SelfCheckInRecord> SelfCheckIns = new List<SelfCheckInRecord>();
        public List<TogetherSessionSummary> TogetherSessions = new List<TogetherSessionSummary>();
        public ActiveTogetherSession ActiveSession;
    }

    public static class JciContent
    {
        public static readonly MoodOption[] Moods =
        {
            new MoodOption("drained", "Drained"),
            new MoodOption("okay", "Okay"),
            new MoodOption("restless", "Restless"),
            new MoodOption("hopeful", "Hopeful"),
            new MoodOption("good", "Good"),
        };

        public static readonly AffirmationOption[] Affirmations =
        {
            new AffirmationOption("room", "I can give myself room to figure this out."),
            new AffirmationOption("steady", "Small, steady steps still count."),
            new AffirmationOption("present", "I can be here without having every answer."),
            new AffirmationOption("worthy", "What I need deserves kindness and attention."),
            new AffirmationOption("begin", "I can begin again from right where I am."),
        };

        public static readonly PromptCard[] Prompts =
        {
            new PromptCard("today", "Today", "What is one word for how you are feeling right now?"),
            new PromptCard("small-win", "Small win", "What is something you are quietly proud of this week?"),
            new PromptCard("connection", "Connection", "Who helped you recently, and what did that mean to you?"),
            new PromptCard("kindness", "Kindness", "What is one kind thing you could offer someone today?"),
            new PromptCard("energy", "Energy", "What gives you a little energy when the day feels full?"),
            new PromptCard("gratitude", "Gratitude", "What ordinary thing are you glad to have today?"),
            new PromptCard("listen", "Listen", "What would you like someone close to you to understand today?"),
            new PromptCard("hope", "Hope", "What is one small thing you are looking forward to?"),
            new PromptCard("support", "Support", "When do you feel most cared for by other people?"),
            new PromptCard("pause", "Pause", "What would make the rest of today feel a little kinder?"),
            new PromptCard("memory", "Memory", "What is a recent moment that made you smile?"),
            new PromptCard("brave", "Brave", "What is something new you would be curious to try?"),
        };

        public static AffirmationOption FindAffirmation(string moodId)
        {
            if (string.IsNullOrWhiteSpace(moodId))
            {
                return Affirmations[0];
            }

            // String.GetHashCode is intentionally randomized between processes;
            // persisted mood IDs therefore use a stable ordinal mapping.
            for (var i = 0; i < Moods.Length; i++)
            {
                if (string.Equals(Moods[i].Id, moodId, StringComparison.Ordinal))
                {
                    return Affirmations[i % Affirmations.Length];
                }
            }

            return Affirmations[0];
        }
    }
}
