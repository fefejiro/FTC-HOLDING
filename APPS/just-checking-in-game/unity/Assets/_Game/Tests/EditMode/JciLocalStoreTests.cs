using System;
using System.IO;
using Jci.Domain;
using Jci.Infrastructure;
using NUnit.Framework;

namespace Jci.Tests.EditMode
{
    public sealed class JciLocalStoreTests
    {
        private string directory;

        [SetUp]
        public void SetUp() { directory = Path.Combine(Path.GetTempPath(), "jci-tests-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(directory); }
        [TearDown]
        public void TearDown() { if (Directory.Exists(directory)) Directory.Delete(directory, true); }

        [Test]
        public void RoundTripPersistsOnlyDocumentedFields()
        {
            var store = new JciLocalStore(Path.Combine(directory, "jci.json"));
            var document = new JciStoreDocument();
            document.Connections.Add(new LocalConnection("id", "Alex", 10));
            document.SelfCheckIns.Add(new SelfCheckInRecord("s", "okay", "steady", 20));
            store.Save(document);
            var loaded = store.Load();
            Assert.That(loaded.Connections[0].DisplayName, Is.EqualTo("Alex"));
            Assert.That(loaded.SelfCheckIns[0].MoodId, Is.EqualTo("okay"));
            Assert.That(File.ReadAllText(store.Path), Does.Not.Contain("typedAnswer"));
            Assert.That(File.ReadAllText(store.Path), Does.Not.Contain("transcript"));
        }

        [Test]
        public void CorruptFileIsQuarantinedAndRecovered()
        {
            var path = Path.Combine(directory, "jci.json");
            File.WriteAllText(path, "not-json");
            var document = new JciLocalStore(path).Load();
            Assert.That(document.SchemaVersion, Is.EqualTo(2));
            Assert.That(File.Exists(path), Is.False);
            Assert.That(Directory.GetFiles(directory, "jci.json.corrupt-*").Length, Is.EqualTo(1));
        }

        [Test]
        public void DeleteAllRemovesLocalData()
        {
            var store = new JciLocalStore(Path.Combine(directory, "jci.json"));
            store.Save(new JciStoreDocument());
            store.DeleteAll();
            Assert.That(File.Exists(store.Path), Is.False);
        }

        [Test]
        public void InvalidActiveSessionIsDiscardedWithoutDeletingValidLocalData()
        {
            var store = new JciLocalStore(Path.Combine(directory, "jci.json"));
            var document = new JciStoreDocument();
            document.Connections.Add(new LocalConnection("maya", "Maya", 10));
            document.ActiveSession = new ActiveTogetherSession
            {
                ConnectionId = "missing-connection",
                CurrentPromptId = "today",
                StartedAtUtcTicks = 20,
            };

            store.Save(document);
            var loaded = store.Load();

            Assert.That(loaded.ActiveSession, Is.Null);
            Assert.That(loaded.Connections, Has.Count.EqualTo(1));
            Assert.That(loaded.Connections[0].DisplayName, Is.EqualTo("Maya"));
        }

        [Test]
        public void ActiveSelfSessionRoundTripsAndInvalidStateIsDiscarded()
        {
            var store = new JciLocalStore(Path.Combine(directory, "jci.json"));
            var document = new JciStoreDocument
            {
                ActiveSelfSession = new ActiveSelfSession
                {
                    MoodId = "okay", StartedAtUtcTicks = 10, CurrentPromptId = "today",
                    SeenCardIds = new[] { "today" }, CardsSeen = 1,
                }
            };
            store.Save(document);
            var loaded = store.Load();
            Assert.That(loaded.SchemaVersion, Is.EqualTo(2));
            Assert.That(loaded.ActiveSelfSession.MoodId, Is.EqualTo("okay"));
            loaded.ActiveSelfSession.MoodId = string.Empty;
            store.Save(loaded);
            Assert.That(store.Load().ActiveSelfSession, Is.Null);
        }
    }
}
