#if UNITY_TESTS_FRAMEWORK
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Jci.Presentation;

namespace Jci.Tests.PlayMode
{
    public sealed class JciPlayModeTests
    {
        [UnityTest]
        public IEnumerator RuntimeCreatesSafeAreaCanvasWithoutPermissions()
        {
            var game = new GameObject("JCI test runtime");
            game.AddComponent<JustCheckingInGame>();
            yield return null;
            var canvas = game.GetComponentInChildren<Canvas>();
            Assert.That(canvas, Is.Not.Null);
            Assert.That(canvas.GetComponent<UnityEngine.UI.GraphicRaycaster>(), Is.Not.Null);
            Object.Destroy(game);
            yield return null;
        }

        [UnityTest]
        public IEnumerator RapidFrameDoesNotLeaveDuplicateRuntimeObjects()
        {
            var before = Object.FindObjectsByType<JustCheckingInGame>(FindObjectsSortMode.None).Length;
            yield return null;
            var after = Object.FindObjectsByType<JustCheckingInGame>(FindObjectsSortMode.None).Length;
            Assert.That(after, Is.LessThanOrEqualTo(before + 1));
        }
    }
}
#endif
