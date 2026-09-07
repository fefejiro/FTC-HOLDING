using System;
using System.Collections.Generic;
using Jci.Domain;

namespace Jci.Application
{
    /// <summary>Pure local Solo deck state. It stores IDs/metrics only; no answers.</summary>
    public sealed class JciSoloSession
    {
        private readonly PromptCard[] prompts;
        private readonly Random random;
        private readonly List<PromptCard> available = new List<PromptCard>();
        private readonly List<string> seenIds = new List<string>();
        private readonly List<string> skippedIds = new List<string>();

        public JciSoloSession(PromptCard[] prompts, int randomSeed)
        {
            if (prompts == null || prompts.Length == 0) throw new ArgumentException("At least one prompt is required.", nameof(prompts));
            this.prompts = prompts;
            random = new Random(randomSeed);
        }

        public SessionPhase Phase { get; private set; }
        public string MoodId { get; private set; }
        public long StartedAtUtcTicks { get; private set; }
        public PromptCard CurrentPrompt { get; private set; }
        public int CardsSeen => seenIds.Count;
        public int CardsSkipped => skippedIds.Count;
        public IReadOnlyList<string> SeenCardIds => seenIds;
        public IReadOnlyList<string> SkippedCardIds => skippedIds;

        public void Start(string moodId, long startedAtUtcTicks)
        {
            if (string.IsNullOrWhiteSpace(moodId)) throw new ArgumentException("A mood is required.", nameof(moodId));
            MoodId = moodId;
            StartedAtUtcTicks = startedAtUtcTicks;
            seenIds.Clear();
            skippedIds.Clear();
            available.Clear();
            for (var i = 0; i < prompts.Length; i++) if (prompts[i].IsRelevantTo(moodId)) available.Add(prompts[i]);
            if (available.Count == 0) throw new InvalidOperationException("The selected mood has no eligible cards.");
            Phase = SessionPhase.Active;
            DrawNext();
        }

        public void Restore(ActiveSelfSession snapshot)
        {
            if (snapshot == null || string.IsNullOrWhiteSpace(snapshot.MoodId) || snapshot.StartedAtUtcTicks <= 0)
                throw new ArgumentException("A valid active Solo session is required.", nameof(snapshot));
            MoodId = snapshot.MoodId;
            StartedAtUtcTicks = snapshot.StartedAtUtcTicks;
            seenIds.Clear();
            skippedIds.Clear();
            AddRangeDistinct(seenIds, snapshot.SeenCardIds);
            AddRangeDistinct(skippedIds, snapshot.SkippedCardIds);
            available.Clear();
            var moodPrompts = JciContent.PromptsForMood(MoodId);
            for (var i = 0; i < moodPrompts.Length; i++) if (!seenIds.Contains(moodPrompts[i].Id)) available.Add(moodPrompts[i]);
            CurrentPrompt = FindPrompt(snapshot.CurrentPromptId) ?? new PromptCard(snapshot.CurrentPromptId, snapshot.CurrentCategory, snapshot.CurrentPromptText, new[] { MoodId }, snapshot.CurrentPromptKind);
            Phase = SessionPhase.Active;
        }

        public void SkipCurrent()
        {
            EnsureActive();
            if (CurrentPrompt != null && !skippedIds.Contains(CurrentPrompt.Id)) skippedIds.Add(CurrentPrompt.Id);
            DrawNext();
        }

        public void DrawAnother()
        {
            EnsureActive();
            DrawNext();
        }

        public ActiveSelfSession Snapshot()
        {
            EnsureActive();
            return new ActiveSelfSession
            {
                Id = "active-self",
                MoodId = MoodId,
                StartedAtUtcTicks = StartedAtUtcTicks,
                CurrentPromptId = CurrentPrompt == null ? string.Empty : CurrentPrompt.Id,
                CurrentCategory = CurrentPrompt == null ? string.Empty : CurrentPrompt.Category,
                CurrentPromptText = CurrentPrompt == null ? string.Empty : CurrentPrompt.Text,
                CurrentPromptKind = CurrentPrompt == null ? PromptKind.Question : CurrentPrompt.Kind,
                SeenCardIds = seenIds.ToArray(),
                SkippedCardIds = skippedIds.ToArray(),
                CardsSeen = CardsSeen,
                CardsSkipped = CardsSkipped,
            };
        }

        public SelfCheckInRecord End(long endedAtUtcTicks, string id)
        {
            EnsureActive();
            if (endedAtUtcTicks < StartedAtUtcTicks) endedAtUtcTicks = StartedAtUtcTicks;
            Phase = SessionPhase.Completed;
            var affirmationId = string.Empty;
            for (var i = 0; i < seenIds.Count; i++)
            {
                var card = FindPrompt(seenIds[i]);
                if (card != null && card.Kind == PromptKind.Affirmation) { affirmationId = card.Id; break; }
            }
            return new SelfCheckInRecord
            {
                Id = id,
                MoodId = MoodId,
                AffirmationId = affirmationId,
                CardIds = seenIds.ToArray(),
                CardsSeen = CardsSeen,
                CardsSkipped = CardsSkipped,
                CompletedAtUtcTicks = endedAtUtcTicks,
            };
        }

        private void DrawNext()
        {
            if (available.Count == 0)
            {
                // A deck can be reused only after all relevant cards have been seen.
                var moodPrompts = JciContent.PromptsForMood(MoodId);
                for (var i = 0; i < moodPrompts.Length; i++) available.Add(moodPrompts[i]);
            }

            var index = random.Next(available.Count);
            CurrentPrompt = available[index];
            available.RemoveAt(index);
            if (!seenIds.Contains(CurrentPrompt.Id)) seenIds.Add(CurrentPrompt.Id);
        }

        private PromptCard FindPrompt(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return null;
            for (var i = 0; i < prompts.Length; i++) if (prompts[i].Id == id) return prompts[i];
            return null;
        }

        private static void AddRangeDistinct(List<string> destination, string[] values)
        {
            if (values == null) return;
            for (var i = 0; i < values.Length; i++) if (!string.IsNullOrWhiteSpace(values[i]) && !destination.Contains(values[i])) destination.Add(values[i]);
        }

        private void EnsureActive()
        {
            if (Phase != SessionPhase.Active || CurrentPrompt == null) throw new InvalidOperationException("The Solo session is not active.");
        }
    }
}
