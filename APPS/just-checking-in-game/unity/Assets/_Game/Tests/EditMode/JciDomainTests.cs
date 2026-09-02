using System;
using System.Collections.Generic;
using Jci.Application;
using Jci.Domain;
using NUnit.Framework;

namespace Jci.Tests.EditMode
{
    public sealed class JciDomainTests
    {
        [Test]
        public void ContentHasUniqueReadableIdsAndMoodCoverage()
        {
            var ids = new HashSet<string>();
            Assert.That(JciContent.Moods.Length, Is.GreaterThanOrEqualTo(5));
            Assert.That(JciContent.Prompts.Length, Is.GreaterThanOrEqualTo(20));
            foreach (var mood in JciContent.Moods)
            {
                var relevant = JciContent.PromptsForMood(mood.Id);
                Assert.That(relevant.Length, Is.GreaterThanOrEqualTo(5), mood.Id);
            }
            foreach (var prompt in JciContent.Prompts)
            {
                Assert.That(prompt.Id, Is.Not.Null.And.Not.Empty);
                Assert.That(ids.Add(prompt.Id), Is.True, "Duplicate card ID: " + prompt.Id);
                Assert.That(prompt.Category, Is.Not.Null.And.Not.Empty);
                Assert.That(prompt.Text, Is.Not.Null.And.Not.Empty);
                Assert.That(prompt.Text, Does.Not.Contain("\u00C2"));
                Assert.That(prompt.Text, Does.Not.Contain("\u00E2"));
                Assert.That(prompt.MoodIds, Is.Not.Null.And.Not.Empty);
                if (prompt.Kind == PromptKind.Question) Assert.That(prompt.Text, Does.EndWith("?"));
            }
        }

        [Test]
        public void SoloSessionIsMoodFirstAndAvoidsImmediateRepeats()
        {
            var session = new JciSoloSession(JciContent.PromptsForMood("drained"), 42);
            session.Start("drained", 100);
            var first = session.CurrentPrompt.Id;
            session.DrawAnother();
            Assert.That(session.CurrentPrompt.Id, Is.Not.EqualTo(first));
            session.SkipCurrent();
            Assert.That(session.CardsSeen, Is.EqualTo(3));
            Assert.That(session.CardsSkipped, Is.EqualTo(1));
            var record = session.End(500, "summary");
            Assert.That(record.MoodId, Is.EqualTo("drained"));
            Assert.That(record.CardIds, Has.Length.EqualTo(3));
            Assert.Throws<InvalidOperationException>(() => session.DrawAnother());
        }

        [Test]
        public void SoloSelectionIsDeterministicForInjectedSeed()
        {
            var first = new JciSoloSession(JciContent.PromptsForMood("hopeful"), 9);
            var second = new JciSoloSession(JciContent.PromptsForMood("hopeful"), 9);
            first.Start("hopeful", 10); second.Start("hopeful", 10);
            for (var i = 0; i < 5; i++)
            {
                Assert.That(first.CurrentPrompt.Id, Is.EqualTo(second.CurrentPrompt.Id));
                first.DrawAnother(); second.DrawAnother();
            }
        }

        [Test]
        public void TogetherSessionTransitionsAndSummarizes()
        {
            var session = new JciTogetherSession(JciContent.TogetherPrompts(), 42);
            session.Start("connection", 100);
            var first = session.CurrentPrompt.Id;
            session.CompleteCurrent();
            Assert.That(session.CurrentPrompt.Id, Is.Not.EqualTo(first));
            session.PassCurrent();
            var summary = session.End(500, "summary");
            Assert.That(summary.QuestionsCompleted, Is.EqualTo(1));
            Assert.That(summary.QuestionsPassed, Is.EqualTo(1));
            Assert.That(summary.Duration, Is.EqualTo(TimeSpan.FromTicks(400)));
            Assert.Throws<InvalidOperationException>(() => session.PassCurrent());
        }

        [Test]
        public void SnapshotCanRestoreActiveSessions()
        {
            var source = new JciTogetherSession(JciContent.TogetherPrompts(), 5);
            source.Start("c", 10); source.CompleteCurrent();
            var restored = new JciTogetherSession(JciContent.TogetherPrompts(), 99);
            restored.Restore(source.Snapshot());
            Assert.That(restored.CurrentPrompt.Id, Is.EqualTo(source.CurrentPrompt.Id));

            var solo = new JciSoloSession(JciContent.PromptsForMood("okay"), 5);
            solo.Start("okay", 10); solo.DrawAnother();
            var resumedSolo = new JciSoloSession(JciContent.PromptsForMood("okay"), 99);
            resumedSolo.Restore(solo.Snapshot());
            Assert.That(resumedSolo.CurrentPrompt.Id, Is.EqualTo(solo.CurrentPrompt.Id));
            Assert.That(resumedSolo.CardsSeen, Is.EqualTo(solo.CardsSeen));
        }
    }
}
