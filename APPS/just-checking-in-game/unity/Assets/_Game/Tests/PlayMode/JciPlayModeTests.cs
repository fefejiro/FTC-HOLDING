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
        }

        [UnityTest]
        public IEnumerator RuntimeCreatesSafeAreaCanvasWithSystemBarsAvailable()
        {
            var canvas = game.GetComponentInChildren<Canvas>();
            Assert.That(canvas, Is.Not.Null);
            Assert.That(canvas.GetComponent<GraphicRaycaster>(), Is.Not.Null);
            var body = canvas.transform.Find("Safe Area/Body") as RectTransform;
            Assert.That(body, Is.Not.Null);
            Assert.That(body.rect.width, Is.GreaterThan(100f));
            yield return null;
        }

        [UnityTest]
        public IEnumerator HomeUsesSingleTitleAndEqualLargePhysicalCards()
        {
            Assert.That(FindButton("Check in with myself"), Is.Not.Null);
            Assert.That(FindButton("Check in together"), Is.Not.Null);
            Assert.That(FindButton("Your connection journey"), Is.Not.Null);
            Assert.That(FindButton("A little time to connect."), Is.Null);
            var a = FindButton("Check in with myself").GetComponent<RectTransform>().rect.height;
            var b = FindButton("Check in together").GetComponent<RectTransform>().rect.height;
            var c = FindButton("Your connection journey").GetComponent<RectTransform>().rect.height;
            Assert.That(a, Is.EqualTo(b).Within(.1f));
            Assert.That(a, Is.EqualTo(c).Within(.1f));
            Assert.That(a, Is.GreaterThanOrEqualTo(116f));
            yield return null;
        }

        [UnityTest]
        public IEnumerator SoloIsMoodFirstAndSupportsMultipleDrawsSkipAndEnd()
        {
            Click("Check in with myself");
            Assert.That(FindButton("Draw a card"), Is.Null);
            Assert.That(FindButton("Drained"), Is.Not.Null);
            Click("Drained");
            Assert.That(FindButton("Draw another card"), Is.Not.Null);
            Assert.That(FindButton("Skip this one"), Is.Not.Null);
            Assert.That(FindButton("End check-in"), Is.Not.Null);
            Click("Draw another card");
            Click("Skip this one");
            Click("End check-in");
            yield return null;
             var path = Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json");
            Assert.That(File.Exists(path), Is.True);
            var json = File.ReadAllText(path);
            Assert.That(json, Does.Contain("drained"));
            Assert.That(json, Does.Contain("CardsSeen"));
            Assert.That(json, Does.Not.Contain("typedAnswer"));
            Assert.That(json, Does.Not.Contain("transcript"));
        }

        [UnityTest]
        public IEnumerator TogetherUsesReliableNameInputAndHumanTurnHandoff()
        {
            Click("Check in together");
            var input = Object.FindAnyObjectByType<InputField>();
            Assert.That(input, Is.Not.Null);
            Assert.That(FindButton("Start your check-in").interactable, Is.False);
            input.text = "Maya";
            yield return null;
            Assert.That(FindButton("Start your check-in").interactable, Is.True);
            Click("Start your check-in");
            Assert.That(FindText("Your turn"), Is.Not.Null);
            Assert.That(FindButton("Next card"), Is.Not.Null);
            Assert.That(FindButton("Skip this one"), Is.Not.Null);
            Click("Next card");
            Assert.That(FindButton("I'm ready"), Is.Not.Null);
            Click("I'm ready");
            Assert.That(FindText("Maya's turn"), Is.Not.Null);
            yield return null;
        }

        [UnityTest]
        public IEnumerator ActiveSessionsPersistAcrossPauseAndRelaunch()
        {
            Click("Check in with myself"); Click("Okay");
            game.SendMessage("OnApplicationPause", true);
            yield return null;
            Object.Destroy(game);
            yield return null;
            game = new GameObject("JCI relaunched runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
            Assert.That(FindButton("Resume your check-in"), Is.Not.Null);
            Click("Resume your check-in");
            Assert.That(FindButton("End check-in"), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator RapidTapsDoNotCreateDuplicateCanvasesOrTechnicalLabels()
        {
            var button = FindButton("Check in with myself");
            for (var i = 0; i < 10; i++) button.onClick.Invoke();
            yield return null;
            Assert.That(game.GetComponentsInChildren<Canvas>(true).Length, Is.EqualTo(1));
            foreach (var text in Object.FindObjectsByType<Text>(FindObjectsSortMode.None))
            {
                Assert.That(text.text, Does.Not.Contain("TOGETHER -"));
                Assert.That(text.text, Does.Not.Contain("TURN 01"));
                Assert.That(text.text, Does.Not.Contain("\u00C2"));
                Assert.That(text.text, Does.Not.Contain("\u00E2"));
            }
        }

        [UnityTest]
        public IEnumerator RuntimeAddsPhysicalMotionAndTactileButtonFeedback()
        {
            var canvas = game.GetComponentInChildren<Canvas>();
            var body = canvas.transform.Find("Safe Area/Body");
            Assert.That(HasComponentNamed(body.gameObject, "JciScreenMotion"), Is.True);
            Assert.That(HasComponentNamed(FindButton("Check in with myself").gameObject, "JciCardMotion"), Is.True);
            Assert.That(HasComponentNamed(FindButton("Check in with myself").gameObject, "JciButtonMotion"), Is.True);
            yield return null;
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

        private static Text FindText(string label)
        {
            foreach (var text in Object.FindObjectsByType<Text>(FindObjectsSortMode.None)) if (text.text == label) return text;
            return null;
        }

        private static bool HasComponentNamed(GameObject target, string componentName)
        {
            foreach (var component in target.GetComponents<MonoBehaviour>()) if (component != null && component.GetType().Name == componentName) return true;
            return false;
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
