using System;
using System.IO;
using UnityEngine;
using Jci.Domain;

namespace Jci.Infrastructure
{
    public sealed class JciLocalStore
    {
        private const int CurrentSchemaVersion = 2;
        private readonly string path;

        public JciLocalStore(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                throw new ArgumentException("A storage path is required.", nameof(filePath));
            }

            path = filePath;
        }

        public string Path => path;

        public JciStoreDocument Load()
        {
            try
            {
                if (!File.Exists(path))
                {
                    return NewDocument();
                }

                var json = File.ReadAllText(path);
                var document = JsonUtility.FromJson<JciStoreDocument>(json);
                if (document == null || document.SchemaVersion <= 0)
                {
                    throw new InvalidDataException("The saved JCI document is invalid.");
                }

                Normalize(document);
                return document;
            }
            catch (Exception exception) when (exception is IOException || exception is UnauthorizedAccessException || exception is InvalidDataException || exception is ArgumentException)
            {
                QuarantineCorruptFile();
                return NewDocument();
            }
        }

        public void Save(JciStoreDocument document)
        {
            if (document == null)
            {
                throw new ArgumentNullException(nameof(document));
            }

            Normalize(document);
            var directory = System.IO.Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var tempPath = path + ".tmp";
            File.WriteAllText(tempPath, JsonUtility.ToJson(document, false));
            if (File.Exists(path))
            {
                try
                {
                    File.Replace(tempPath, path, null);
                }
                catch (PlatformNotSupportedException)
                {
                    File.Delete(path);
                    File.Move(tempPath, path);
                }
            }
            else
            {
                File.Move(tempPath, path);
            }
        }

        public void DeleteAll()
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        private JciStoreDocument NewDocument()
        {
            return new JciStoreDocument { SchemaVersion = CurrentSchemaVersion };
        }

        private static void Normalize(JciStoreDocument document)
        {
            document.SchemaVersion = CurrentSchemaVersion;
            if (document.Connections == null) document.Connections = new System.Collections.Generic.List<LocalConnection>();
            if (document.SelfCheckIns == null) document.SelfCheckIns = new System.Collections.Generic.List<SelfCheckInRecord>();
            if (document.TogetherSessions == null) document.TogetherSessions = new System.Collections.Generic.List<TogetherSessionSummary>();
            if (!HasValidActiveSession(document)) document.ActiveSession = null;
            if (!HasValidActiveSelfSession(document)) document.ActiveSelfSession = null;
        }

        private static bool HasValidActiveSession(JciStoreDocument document)
        {
            var session = document.ActiveSession;
            if (session == null || string.IsNullOrWhiteSpace(session.ConnectionId) ||
                string.IsNullOrWhiteSpace(session.CurrentPromptId) || session.StartedAtUtcTicks <= 0)
            {
                return false;
            }

            for (var i = 0; i < document.Connections.Count; i++)
            {
                if (string.Equals(document.Connections[i].Id, session.ConnectionId, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private static bool HasValidActiveSelfSession(JciStoreDocument document)
        {
            var session = document.ActiveSelfSession;
            return session != null && !string.IsNullOrWhiteSpace(session.MoodId) &&
                !string.IsNullOrWhiteSpace(session.CurrentPromptId) && session.StartedAtUtcTicks > 0;
        }

        private void QuarantineCorruptFile()
        {
            if (!File.Exists(path))
            {
                return;
            }

            var quarantine = path + ".corrupt-" + DateTime.UtcNow.Ticks;
            try
            {
                File.Move(path, quarantine);
            }
            catch (IOException)
            {
                // A corrupt file must never prevent a clean launch.
            }
        }
    }
}
