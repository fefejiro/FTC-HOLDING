#if UNITY_INCLUDE_TESTS
using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Jci.Presentation;

namespace Jci.Tests.PlayMode
{
    public sealed class JciPlayModeTests
    {
        private GameObject game;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            game = new GameObject("JCI test runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (game != null) Object.Destroy(game);
            yield return null;
        }

        [UnityTest]
        public IEnumerator RuntimeCreatesSafeAreaCanvasWithoutPermissions()
        {
            var canvas = game.GetComponentInChildren<Canvas>();
            Assert.That(canvas, Is.Not.Null);
            Assert.That(canvas.GetComponent<UnityEngine.UI.GraphicRaycaster>(), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator SelfFlowCompletesAndStoresOnlyIds()
        {
            Click("Check in with myself");
            Click("Drained");
            Click("Finish this check-in");
            yield return null;
            var path = Path.Combine(Application.persistentDataPath, "jci-local-v1.json");
            Assert.That(File.Exists(path), Is.True);
            var json = File.ReadAllText(path);
            Assert.That(json, Does.Contain("drained"));
            Assert.That(json, Does.Not.Contain("typedAnswer"));
            Assert.That(json, Does.Not.Contain("transcript"));
        }

        [UnityTest]
        public IEnumerator TogetherFlowEndsAndPausePersistsRecovery()
        {
            Click("Together here");
            var input = Object.FindFirstObjectByType<InputField>();
            Assert.That(input, Is.Not.Null);
            input.text = "Test connection";
            Click("Save name and start");
            Click("Answered — next prompt");
            game.SendMessage("OnApplicationPause", true);
            yield return null;
            Assert.That(File.ReadAllText(Path.Combine(Application.persistentDataPath, "jci-local-v1.json")), Does.Contain("ActiveSession"));
            Click("End check-in");
            Assert.That(FindButton("Back home"), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator RapidTapsDoNotCreateDuplicateCanvases()
        {
            var button = FindButton("Check in with myself");
            Assert.That(button, Is.Not.Null);
            for (var i = 0; i < 10; i++) button.onClick.Invoke();
            yield return null;
            Assert.That(Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None).Length, Is.EqualTo(1));
        }

        private static void Click(string label)
        {
            var button = FindButton(label);
            Assert.That(button, Is.Not.Null, "Missing button: " + label);
            button.onClick.Invoke();
        }

        private static Button FindButton(string label)
        {
            foreach (var button in Object.FindObjectsByType<Button>(FindObjectsSortMode.None))
            {
                var text = button.GetComponentInChildren<Text>();
                if (text != null && text.text == label) return button;
            }

            return null;
        }
    }
}
#endif
