using System;
using System.Collections.Generic;
using Jci.Domain;

namespace Jci.Application
{
    public sealed class JciTogetherSession
    {
        private readonly PromptCard[] prompts;
        private readonly Random random;
        private readonly Dictionary<string, int> categoryCounts = new Dictionary<string, int>();
        private int currentIndex = -1;

        public JciTogetherSession(PromptCard[] prompts, int randomSeed)
        {
            if (prompts == null || prompts.Length == 0)
            {
                throw new ArgumentException("At least one prompt is required.", nameof(prompts));
            }

            this.prompts = prompts;
            random = new Random(randomSeed);
        }

        public SessionPhase Phase { get; private set; }
        public string ConnectionId { get; private set; }
        public long StartedAtUtcTicks { get; private set; }
        public PromptCard CurrentPrompt { get; private set; }
        public int TurnNumber { get; private set; }
        public int QuestionsCompleted { get; private set; }
        public int QuestionsPassed { get; private set; }

        public void Start(string connectionId, long startedAtUtcTicks)
        {
            if (string.IsNullOrWhiteSpace(connectionId))
            {
                throw new ArgumentException("A connection is required.", nameof(connectionId));
            }

            ConnectionId = connectionId;
            StartedAtUtcTicks = startedAtUtcTicks;
            QuestionsCompleted = 0;
            QuestionsPassed = 0;
            TurnNumber = 1;
            categoryCounts.Clear();
            Phase = SessionPhase.Active;
            ChooseNextPrompt();
        }

        public void Restore(ActiveTogetherSession snapshot)
        {
            if (snapshot == null || string.IsNullOrWhiteSpace(snapshot.ConnectionId))
            {
                throw new ArgumentException("A valid active session is required.", nameof(snapshot));
            }

            ConnectionId = snapshot.ConnectionId;
            StartedAtUtcTicks = snapshot.StartedAtUtcTicks;
            QuestionsCompleted = Math.Max(0, snapshot.QuestionsCompleted);
            QuestionsPassed = Math.Max(0, snapshot.QuestionsPassed);
            TurnNumber = QuestionsCompleted + QuestionsPassed + 1;
            categoryCounts.Clear();
            if (snapshot.Categories != null && snapshot.CategoryCounts != null)
            {
                for (var i = 0; i < Math.Min(snapshot.Categories.Length, snapshot.CategoryCounts.Length); i++)
                {
                    categoryCounts[snapshot.Categories[i]] = Math.Max(0, snapshot.CategoryCounts[i]);
                }
            }

            var prompt = FindPrompt(snapshot.CurrentPromptId);
            CurrentPrompt = prompt ?? new PromptCard(snapshot.CurrentPromptId, snapshot.CurrentCategory, snapshot.CurrentPromptText);
            Phase = SessionPhase.Active;
        }

        public void CompleteCurrent()
        {
            EnsureActive();
            QuestionsCompleted++;
            CountCategory(CurrentPrompt.Category);
            AdvanceTurn();
        }

        public void PassCurrent()
        {
            EnsureActive();
            QuestionsPassed++;
            CountCategory(CurrentPrompt.Category);
            AdvanceTurn();
        }

        public TogetherSessionSummary End(long endedAtUtcTicks, string id)
        {
            EnsureActive();
            if (endedAtUtcTicks < StartedAtUtcTicks)
            {
                endedAtUtcTicks = StartedAtUtcTicks;
            }

            Phase = SessionPhase.Completed;
            var categories = new List<string>(categoryCounts.Keys);
            categories.Sort(StringComparer.Ordinal);
            var counts = new int[categories.Count];
            for (var i = 0; i < categories.Count; i++)
            {
                counts[i] = categoryCounts[categories[i]];
            }

            return new TogetherSessionSummary
            {
                Id = id,
                ConnectionId = ConnectionId,
                StartedAtUtcTicks = StartedAtUtcTicks,
                EndedAtUtcTicks = endedAtUtcTicks,
                QuestionsCompleted = QuestionsCompleted,
                QuestionsPassed = QuestionsPassed,
                Categories = categories.ToArray(),
                CategoryCounts = counts,
            };
        }

        public ActiveTogetherSession Snapshot()
        {
            EnsureActive();
            var categories = new List<string>(categoryCounts.Keys);
            categories.Sort(StringComparer.Ordinal);
            var counts = new int[categories.Count];
            for (var i = 0; i < categories.Count; i++)
            {
                counts[i] = categoryCounts[categories[i]];
            }

            return new ActiveTogetherSession
            {
                Id = "active",
                ConnectionId = ConnectionId,
                StartedAtUtcTicks = StartedAtUtcTicks,
                CurrentPromptId = CurrentPrompt.Id,
                CurrentCategory = CurrentPrompt.Category,
                CurrentPromptText = CurrentPrompt.Text,
                QuestionsCompleted = QuestionsCompleted,
                QuestionsPassed = QuestionsPassed,
                Categories = categories.ToArray(),
                CategoryCounts = counts,
            };
        }

        private void AdvanceTurn()
        {
            TurnNumber++;
            ChooseNextPrompt();
        }

        private void ChooseNextPrompt()
        {
            var next = random.Next(prompts.Length);
            if (prompts.Length > 1 && CurrentPrompt != null)
            {
                var guard = 0;
                while (prompts[next].Id == CurrentPrompt.Id && guard++ < 10)
                {
                    next = random.Next(prompts.Length);
                }
            }

            currentIndex = next;
            CurrentPrompt = prompts[currentIndex];
        }

        private PromptCard FindPrompt(string id)
        {
            for (var i = 0; i < prompts.Length; i++)
            {
                if (prompts[i].Id == id)
                {
                    return prompts[i];
                }
            }

            return null;
        }

        private void CountCategory(string category)
        {
            if (string.IsNullOrWhiteSpace(category))
            {
                return;
            }

            categoryCounts.TryGetValue(category, out var count);
            categoryCounts[category] = count + 1;
        }

        private void EnsureActive()
        {
            if (Phase != SessionPhase.Active || CurrentPrompt == null)
            {
                throw new InvalidOperationException("The together session is not active.");
            }
        }
    }
}
