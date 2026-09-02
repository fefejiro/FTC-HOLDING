using System;
using System.Collections.Generic;

namespace Jci.Domain
{
    public enum CheckInMode { Home, Self, TogetherHere, Journey }
    public enum SessionPhase { Inactive, Active, Completed }
    public enum PromptKind { Question, Affirmation }

    [Serializable]
    public sealed class PromptCard
    {
        public string Id;
        public string Category;
        public string Text;
        public string[] MoodIds;
        public PromptKind Kind;

        public PromptCard() { }
        public PromptCard(string id, string category, string text) : this(id, category, text, null, PromptKind.Question) { }
        public PromptCard(string id, string category, string text, string[] moodIds, PromptKind kind)
        {
            Id = id; Category = category; Text = text; MoodIds = moodIds ?? new string[0]; Kind = kind;
        }

        public bool IsRelevantTo(string moodId)
        {
            if (string.IsNullOrWhiteSpace(moodId) || MoodIds == null) return false;
            for (var i = 0; i < MoodIds.Length; i++)
                if (string.Equals(MoodIds[i], moodId, StringComparison.Ordinal)) return true;
            return false;
        }
    }

    [Serializable]
    public sealed class MoodOption
    {
        public string Id;
        public string Label;
        public MoodOption() { }
        public MoodOption(string id, string label) { Id = id; Label = label; }
    }

    [Serializable]
    public sealed class AffirmationOption
    {
        public string Id;
        public string Text;
        public AffirmationOption() { }
        public AffirmationOption(string id, string text) { Id = id; Text = text; }
    }

    [Serializable]
    public sealed class LocalConnection
    {
        public string Id;
        public string DisplayName;
        public long CreatedAtUtcTicks;
        public LocalConnection() { }
        public LocalConnection(string id, string displayName, long createdAtUtcTicks)
        { Id = id; DisplayName = displayName; CreatedAtUtcTicks = createdAtUtcTicks; }
    }

    [Serializable]
    public sealed class SelfCheckInRecord
    {
        public string Id;
        public string MoodId;
        public string AffirmationId;
        public string[] CardIds;
        public int CardsSeen;
        public int CardsSkipped;
        public long CompletedAtUtcTicks;
        public SelfCheckInRecord() { }
        public SelfCheckInRecord(string id, string moodId, string affirmationId, long completedAtUtcTicks)
        {
            Id = id; MoodId = moodId; AffirmationId = affirmationId; CardIds = new string[0]; CompletedAtUtcTicks = completedAtUtcTicks;
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
                return new DateTime(Math.Max(end, StartedAtUtcTicks), DateTimeKind.Utc) - new DateTime(StartedAtUtcTicks, DateTimeKind.Utc);
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
    public sealed class ActiveSelfSession
    {
        public string Id;
        public string MoodId;
        public long StartedAtUtcTicks;
        public string CurrentPromptId;
        public string CurrentCategory;
        public string CurrentPromptText;
        public PromptKind CurrentPromptKind;
        public string[] SeenCardIds;
        public string[] SkippedCardIds;
        public int CardsSeen;
        public int CardsSkipped;
    }

    [Serializable]
    public sealed class JciStoreDocument
    {
        public int SchemaVersion = 2;
        public List<LocalConnection> Connections = new List<LocalConnection>();
        public List<SelfCheckInRecord> SelfCheckIns = new List<SelfCheckInRecord>();
        public List<TogetherSessionSummary> TogetherSessions = new List<TogetherSessionSummary>();
        public ActiveTogetherSession ActiveSession;
        public ActiveSelfSession ActiveSelfSession;
    }

    public static class JciContent
    {
        public static readonly MoodOption[] Moods =
        {
            new MoodOption("drained", "Drained"), new MoodOption("okay", "Okay"), new MoodOption("restless", "Restless"),
            new MoodOption("hopeful", "Hopeful"), new MoodOption("good", "Good"),
        };

        public static readonly AffirmationOption[] Affirmations =
        {
            new AffirmationOption("room", "I can give myself room to figure this out."),
            new AffirmationOption("steady", "Small, steady steps still count."),
            new AffirmationOption("present", "I can be here without having every answer."),
            new AffirmationOption("worthy", "What I need deserves kindness and attention."),
            new AffirmationOption("begin", "I can begin again from right where I am."),
        };

        // Mood tags are local selection hints, never diagnoses or remote data.
        public static readonly PromptCard[] Prompts =
        {
            new PromptCard("today", "Notice", "What is one word for how you are feeling right now?", new[] { "drained", "okay", "restless", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("small-win", "Small win", "What is something you are quietly proud of this week?", new[] { "okay", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("connection", "Connection", "Who helped you recently, and what did that mean to you?", new[] { "drained", "okay", "hopeful" }, PromptKind.Question),
            new PromptCard("kindness", "Kindness", "What is one kind thing you could offer someone today?", new[] { "drained", "restless", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("energy", "Energy", "What gives you a little energy when the day feels full?", new[] { "drained", "restless", "good" }, PromptKind.Question),
            new PromptCard("gratitude", "Gratitude", "What ordinary thing are you glad to have today?", new[] { "okay", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("listen", "Be heard", "What would you like someone close to you to understand today?", new[] { "drained", "restless", "okay" }, PromptKind.Question),
            new PromptCard("hope", "Looking ahead", "What is one small thing you are looking forward to?", new[] { "hopeful", "good", "okay" }, PromptKind.Question),
            new PromptCard("support", "Support", "When do you feel most cared for by other people?", new[] { "drained", "okay", "restless" }, PromptKind.Question),
            new PromptCard("pause", "A kinder pace", "What would make the rest of today feel a little kinder?", new[] { "drained", "restless", "okay" }, PromptKind.Question),
            new PromptCard("memory", "Bright spot", "What is a recent moment that made you smile?", new[] { "okay", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("brave", "Curiosity", "What is something new you would be curious to try?", new[] { "restless", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("breathe", "Make space", "Where could you give yourself five unhurried minutes today?", new[] { "drained", "restless", "okay" }, PromptKind.Question),
            new PromptCard("permission", "Permission", "What do you not need to solve all at once?", new[] { "drained", "restless", "okay" }, PromptKind.Question),
            new PromptCard("care", "Care", "What would caring for yourself look like before the day ends?", new[] { "drained", "okay", "hopeful" }, PromptKind.Question),
            new PromptCard("steady-next", "Next step", "What is one small next step that feels possible?", new[] { "drained", "restless", "hopeful" }, PromptKind.Question),
            new PromptCard("celebrate", "Celebrate", "What deserves a little more credit than you have given it?", new[] { "okay", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("unclench", "Release", "What could you set down for tonight?", new[] { "drained", "restless", "okay" }, PromptKind.Question),
            new PromptCard("joy", "Joy", "What is something simple that feels good to you?", new[] { "okay", "hopeful", "good" }, PromptKind.Question),
            new PromptCard("affirm-room", "A note to yourself", "I can give myself room to figure this out.", new[] { "drained", "restless", "okay" }, PromptKind.Affirmation),
            new PromptCard("affirm-steady", "A note to yourself", "Small, steady steps still count.", new[] { "drained", "okay", "hopeful" }, PromptKind.Affirmation),
            new PromptCard("affirm-present", "A note to yourself", "I can be here without having every answer.", new[] { "restless", "okay", "hopeful" }, PromptKind.Affirmation),
            new PromptCard("affirm-worthy", "A note to yourself", "What I need deserves kindness and attention.", new[] { "drained", "restless", "good" }, PromptKind.Affirmation),
            new PromptCard("affirm-begin", "A note to yourself", "I can begin again from right where I am.", new[] { "hopeful", "good", "okay" }, PromptKind.Affirmation),
        };

        public static PromptCard[] PromptsForMood(string moodId)
        {
            var result = new List<PromptCard>();
            for (var i = 0; i < Prompts.Length; i++) if (Prompts[i].IsRelevantTo(moodId)) result.Add(Prompts[i]);
            return result.ToArray();
        }

        public static PromptCard[] TogetherPrompts()
        {
            var result = new List<PromptCard>();
            for (var i = 0; i < Prompts.Length; i++) if (Prompts[i].Kind == PromptKind.Question) result.Add(Prompts[i]);
            return result.ToArray();
        }

        public static AffirmationOption FindAffirmation(string moodId)
        {
            if (string.IsNullOrWhiteSpace(moodId)) return Affirmations[0];
            for (var i = 0; i < Moods.Length; i++) if (string.Equals(Moods[i].Id, moodId, StringComparison.Ordinal)) return Affirmations[i % Affirmations.Length];
            return Affirmations[0];
        }
    }
}
