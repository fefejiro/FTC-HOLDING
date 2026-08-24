using System;
using Jci.Application;
using Jci.Domain;
using NUnit.Framework;

namespace Jci.Tests.EditMode
{
    public sealed class JciDomainTests
    {
        [Test]
        public void ContentHasStableIdsAndNoEmptyText()
        {
            Assert.That(JciContent.Moods.Length, Is.GreaterThanOrEqualTo(5));
            Assert.That(JciContent.Affirmations.Length, Is.GreaterThanOrEqualTo(5));
            Assert.That(JciContent.Prompts.Length, Is.GreaterThanOrEqualTo(10));
            foreach (var mood in JciContent.Moods) Assert.That(JciContent.FindAffirmation(mood.Id).Text, Is.Not.Empty);
            foreach (var prompt in JciContent.Prompts)
            {
                Assert.That(prompt.Id, Is.Not.Empty);
                Assert.That(prompt.Category, Is.Not.Empty);
                Assert.That(prompt.Text, Is.Not.Empty);
            }
        }

        [Test]
        public void AffirmationSelectionIsStableAcrossCalls()
        {
            foreach (var mood in JciContent.Moods)
                Assert.That(JciContent.FindAffirmation(mood.Id).Id, Is.EqualTo(JciContent.FindAffirmation(mood.Id).Id));
        }

        [Test]
        public void TogetherSessionTransitionsAndSummarizes()
        {
            var session = new JciTogetherSession(JciContent.Prompts, 42);
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
        public void SnapshotCanRestoreActiveSession()
        {
            var source = new JciTogetherSession(JciContent.Prompts, 5);
            source.Start("c", 10);
            source.CompleteCurrent();
            var restored = new JciTogetherSession(JciContent.Prompts, 99);
            restored.Restore(source.Snapshot());
            Assert.That(restored.CurrentPrompt.Id, Is.EqualTo(source.CurrentPrompt.Id));
            Assert.That(restored.QuestionsCompleted, Is.EqualTo(1));
        }
    }
}
