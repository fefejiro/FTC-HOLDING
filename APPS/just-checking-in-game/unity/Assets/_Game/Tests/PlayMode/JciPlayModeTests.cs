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
            DeleteLocalData();
            PlayerPrefs.DeleteKey("jci.reducedMotion");
            game = new GameObject("JCI test runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (game != null) Object.Destroy(game);
            yield return null;
            DeleteLocalData();
            PlayerPrefs.DeleteKey("jci.reducedMotion");
        }

        [UnityTest]
        public IEnumerator RuntimeCreatesSafeAreaCanvasWithoutPermissions()
        {
            var canvas = game.GetComponentInChildren<Canvas>();
            Assert.That(canvas, Is.Not.Null);
            Assert.That(canvas.GetComponent<UnityEngine.UI.GraphicRaycaster>(), Is.Not.Null);
            yield return null;
            var body = canvas.transform.Find("Safe Area/Body") as RectTransform;
            Assert.That(body, Is.Not.Null);
            Assert.That(body.rect.width, Is.GreaterThan(100f));
        }

        [UnityTest]
        public IEnumerator SelfFlowCompletesAndStoresOnlyIds()
        {
            Click("Solo check-in");
            Click("Draw a card");
            Click("Drained");
            Click("That feels true - finish");
            yield return null;
            var path = Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json");
            Assert.That(File.Exists(path), Is.True);
            var json = File.ReadAllText(path);
            Assert.That(json, Does.Contain("drained"));
            Assert.That(json, Does.Not.Contain("typedAnswer"));
            Assert.That(json, Does.Not.Contain("transcript"));
        }

        [UnityTest]
        public IEnumerator TogetherFlowEndsAndPausePersistsRecovery()
        {
            Click("Check in together");
            var input = Object.FindAnyObjectByType<InputField>();
            Assert.That(input, Is.Not.Null);
            input.text = "Test connection";
            Click("Start together");
            Click("I am ready - next prompt");
            game.SendMessage("OnApplicationPause", true);
            yield return null;
            Assert.That(File.ReadAllText(Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json")), Does.Contain("ActiveSession"));
            Click("Close this check-in");
            Assert.That(FindButton("Keep going"), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator HomeModeCardsUseOneSharedPhysicalFootprint()
        {
            var solo = FindButton("Solo check-in");
            var together = FindButton("Check in together");
            var journey = FindButton("Your connection journey");
            Assert.That(solo, Is.Not.Null);
            Assert.That(together, Is.Not.Null);
            Assert.That(journey, Is.Not.Null);

            var soloHeight = solo.GetComponent<RectTransform>().rect.height;
            Assert.That(together.GetComponent<RectTransform>().rect.height, Is.EqualTo(soloHeight).Within(0.1f));
            Assert.That(journey.GetComponent<RectTransform>().rect.height, Is.EqualTo(soloHeight).Within(0.1f));
            Assert.That(soloHeight, Is.GreaterThanOrEqualTo(112f));
            yield return null;
        }

        [UnityTest]
        public IEnumerator RapidTapsDoNotCreateDuplicateCanvases()
        {
            var button = FindButton("Solo check-in");
            Assert.That(button, Is.Not.Null);
            for (var i = 0; i < 10; i++) button.onClick.Invoke();
            yield return null;
            Assert.That(game.GetComponentsInChildren<Canvas>(true).Length, Is.EqualTo(1));
        }

        [UnityTest]
        public IEnumerator ActiveSessionRestoresAfterRelaunch()
        {
            Click("Check in together");
            var input = Object.FindAnyObjectByType<InputField>();
            input.text = "Relaunch connection";
            Click("Start together");
            Click("I am ready - next prompt");
            game.SendMessage("OnApplicationPause", true);
            Object.Destroy(game);
            yield return null;

            game = new GameObject("JCI relaunched runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
            Assert.That(FindButton("Resume your check-in"), Is.Not.Null);
            Click("Resume your check-in");
            Assert.That(FindButton("Close this check-in"), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator ReducedMotionPreferencePersistsAcrossRelaunch()
        {
            Click("Reduced motion: Off");
            Assert.That(PlayerPrefs.GetInt("jci.reducedMotion", 0), Is.EqualTo(1));
            Assert.That(FindButton("Reduced motion: On"), Is.Not.Null);
            Object.Destroy(game);
            yield return null;

            game = new GameObject("JCI reduced-motion runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
            Assert.That(FindButton("Reduced motion: On"), Is.Not.Null);
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
                if (text != null && NormalizeLabel(text.text) == NormalizeLabel(label)) return button;
            }

            return null;
        }

        private static string NormalizeLabel(string value)
        {
            return (value ?? string.Empty)
                .Replace("\u00C2\u00B7", "\u00B7")
                .Replace("\u00E2\u20AC\u201D", "\u2014");
        }

        private static void DeleteLocalData()
        {
            var directory = UnityEngine.Application.persistentDataPath;
            if (!Directory.Exists(directory)) return;
            foreach (var path in Directory.GetFiles(directory, "jci-local-v1.json*")) File.Delete(path);
        }
    }
}
#endif
