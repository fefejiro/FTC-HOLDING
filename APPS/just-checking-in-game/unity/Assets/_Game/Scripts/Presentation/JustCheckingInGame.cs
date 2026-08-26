using System;
using System.IO;
using Jci.Application;
using Jci.Domain;
using Jci.Infrastructure;
using UnityEngine;
using UnityEngine.UI;

namespace Jci.Presentation
{
    /// <summary>Offline-first uGUI shell. Only documented local IDs and metrics are persisted.</summary>
    public sealed class JustCheckingInGame : MonoBehaviour
    {
        private const string Background = "#102A43";
        private const string Card = "#F7F1E5";
        private const string Ink = "#102A43";
        private const string Coral = "#E76F51";
        private const string Teal = "#2A9D8F";
        private const string Gold = "#E9C46A";

        private Canvas canvas;
        private RectTransform body;
        private JciScreenMotion screenMotion;
        private InputField nameInput;
        private JciLocalStore store;
        private JciStoreDocument document;
        private JciTogetherSession together;
        private MoodOption selectedMood;
        private bool reducedMotion;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Create()
        {
            if (FindAnyObjectByType<JustCheckingInGame>() != null) return;
            var go = new GameObject("Just Checking In Game");
            DontDestroyOnLoad(go);
            go.AddComponent<JustCheckingInGame>();
        }

        private void Awake()
        {
            UnityEngine.Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            reducedMotion = PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1;
            store = new JciLocalStore(Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json"));
            document = store.Load();
            BuildCanvas();
            ShowHome();
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused && together != null && together.Phase == SessionPhase.Active)
            {
                document.ActiveSession = together.Snapshot();
                store.Save(document);
            }
        }

        private void OnApplicationFocus(bool focused)
        {
            if (!focused) OnApplicationPause(true);
        }

        private void BuildCanvas()
        {
            var go = new GameObject("JCI Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            go.transform.SetParent(transform, false);
            canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(390, 844);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            var background = MakePanel(go.transform, "Background", Parse(Background));
            Stretch(background);
            var safe = new GameObject("Safe Area", typeof(RectTransform), typeof(JciSafeArea));
            safe.transform.SetParent(go.transform, false);
            Stretch(safe.GetComponent<RectTransform>());
            var glass = MakePanel(safe.transform, "Glass Surface", new Color(1f, 1f, 1f, 0.055f));
            glass.offsetMin = new Vector2(14, 12);
            glass.offsetMax = new Vector2(-14, -12);
            var outline = glass.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.12f);
            outline.effectDistance = new Vector2(1f, -1f);
            glass.gameObject.AddComponent<JciGlassPulse>();
            body = MakePanel(safe.transform, "Body", new Color(0, 0, 0, 0));
            body.offsetMin = new Vector2(26, 24);
            body.offsetMax = new Vector2(-26, -24);
            screenMotion = body.gameObject.AddComponent<JciScreenMotion>();
            var layout = body.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 12;
            layout.padding = new RectOffset(0, 0, 0, 0);
            layout.childControlWidth = true;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
        }

        private void ClearBody()
        {
            for (var i = body.childCount - 1; i >= 0; i--) Destroy(body.GetChild(i).gameObject);
            AddText(body, "JUST CHECKING IN", 16, Parse(Gold), FontStyle.Bold, 32);
            var hero = AddText(body, "A little time to connect.", 30, Color.white, FontStyle.Bold, 72);
            hero.rectTransform.sizeDelta = new Vector2(0, 72);
            screenMotion.Play(reducedMotion);
        }

        private void ShowHome()
        {
            ClearBody();
            AddText(body, "Choose a gentle way to check in.", 18, Color.white, FontStyle.Normal, 50);
            if (document.ActiveSession != null) AddButton(body, "Resume your check-in", ResumeTogether, Parse(Coral));
            AddButton(body, "Check in with myself", ShowSelf, Parse(Teal));
            AddButton(body, "Together here", ShowTogetherPicker, Parse(Coral));
            AddButton(body, "Connection Journey", ShowJourney, Parse(Gold), Parse(Ink));
            AddButton(body, "Reduced motion: " + (reducedMotion ? "On" : "Off"), ToggleReducedMotion, Parse(Card), Parse(Ink));
            AddText(body, "Offline by design. Nothing you say is sent or recorded.", 13, new Color(1, 1, 1, .75f), FontStyle.Normal, 58);
        }

        private void ShowSelf()
        {
            selectedMood = null;
            ClearBody();
            AddText(body, "How are you arriving today?", 22, Color.white, FontStyle.Bold, 54);
            foreach (var mood in JciContent.Moods) AddButton(body, mood.Label, () => SelectMood(mood), Parse(Teal));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void SelectMood(MoodOption mood)
        {
            selectedMood = mood;
            ClearBody();
            AddText(body, "A small reminder for this moment", 21, Color.white, FontStyle.Bold, 58);
            var affirmation = JciContent.FindAffirmation(mood.Id);
            AddText(body, affirmation.Text, 25, Parse(Ink), FontStyle.Bold, 150, Parse(Card));
            AddButton(body, "Finish this check-in", FinishSelf, Parse(Coral));
            AddButton(body, "Choose a different feeling", ShowSelf, Parse(Card), Parse(Ink));
        }

        private void FinishSelf()
        {
            if (selectedMood == null) return;
            var affirmation = JciContent.FindAffirmation(selectedMood.Id);
            document.SelfCheckIns.Add(new SelfCheckInRecord(Guid.NewGuid().ToString("N"), selectedMood.Id, affirmation.Id, DateTime.UtcNow.Ticks));
            store.Save(document);
            Haptic();
            ClearBody();
            AddText(body, "You made space for yourself.", 25, Color.white, FontStyle.Bold, 70);
            AddText(body, affirmation.Text, 19, Parse(Card), FontStyle.Normal, 110);
            AddButton(body, "Back home", ShowHome, Parse(Teal));
        }

        private void ShowTogetherPicker()
        {
            ClearBody();
            AddText(body, "Who are you checking in with?", 21, Color.white, FontStyle.Bold, 54);
            foreach (var connection in document.Connections)
            {
                var local = connection;
                AddButton(body, local.DisplayName, () => StartTogether(local.Id), Parse(Teal));
            }
            nameInput = AddInput(body, "Name a connection (kept on this device)");
            AddButton(body, "Save name and start", CreateAndStartTogether, Parse(Coral));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void CreateAndStartTogether()
        {
            var name = nameInput == null ? string.Empty : nameInput.text.Trim();
            if (name.Length == 0) return;
            var connection = new LocalConnection(Guid.NewGuid().ToString("N"), name, DateTime.UtcNow.Ticks);
            document.Connections.Add(connection);
            store.Save(document);
            StartTogether(connection.Id);
        }

        private void StartTogether(string connectionId)
        {
            together = new JciTogetherSession(JciContent.Prompts, unchecked((int)DateTime.UtcNow.Ticks));
            together.Start(connectionId, DateTime.UtcNow.Ticks);
            document.ActiveSession = together.Snapshot();
            store.Save(document);
            ShowTogether();
        }

        private void ResumeTogether()
        {
            together = new JciTogetherSession(JciContent.Prompts, unchecked((int)DateTime.UtcNow.Ticks));
            together.Restore(document.ActiveSession);
            ShowTogether();
        }

        private void ShowTogether()
        {
            ClearBody();
            if (together == null || together.CurrentPrompt == null) { ShowHome(); return; }
            AddText(body, "TOGETHER · TURN " + together.TurnNumber.ToString("00"), 15, Parse(Gold), FontStyle.Bold, 34);
            AddText(body, together.CurrentPrompt.Text, 23, Parse(Ink), FontStyle.Bold, 205, Parse(Card));
            AddButton(body, "Answered — next prompt", CompleteTurn, Parse(Coral));
            AddButton(body, "Pass this one", PassTurn, Parse(Teal));
            AddButton(body, "End check-in", EndTogether, Parse(Card), Parse(Ink));
        }

        private void CompleteTurn() { together.CompleteCurrent(); SaveActiveAndRefresh(); }
        private void PassTurn() { together.PassCurrent(); SaveActiveAndRefresh(); }

        private void SaveActiveAndRefresh()
        {
            document.ActiveSession = together.Snapshot();
            store.Save(document);
            Haptic();
            ShowTogether();
        }

        private void EndTogether()
        {
            var summary = together.End(DateTime.UtcNow.Ticks, Guid.NewGuid().ToString("N"));
            document.TogetherSessions.Add(summary);
            document.ActiveSession = null;
            store.Save(document);
            Haptic();
            ClearBody();
            AddText(body, "Check-in complete.", 26, Color.white, FontStyle.Bold, 70);
            AddText(body, summary.QuestionsCompleted + " answered · " + summary.QuestionsPassed + " passed", 19, Parse(Card), FontStyle.Normal, 66);
            AddButton(body, "Back home", ShowHome, Parse(Teal));
        }

        private void ShowJourney()
        {
            ClearBody();
            AddText(body, "Your local connection journey", 22, Color.white, FontStyle.Bold, 65);
            foreach (var connection in document.Connections)
            {
                var local = connection;
                var count = document.TogetherSessions.FindAll(s => s.ConnectionId == local.Id).Count;
                AddButton(body, local.DisplayName + " · " + count + " check-ins", () => DeleteConnection(local), Parse(Teal));
            }
            AddText(body, "Tap a name to remove its local label. Nothing leaves this device.", 13, new Color(1, 1, 1, .75f), FontStyle.Normal, 58);
            AddButton(body, "Add a connection", ShowTogetherPicker, Parse(Coral));
            AddButton(body, "Reset all local data", ResetLocalData, Parse(Coral));
            AddButton(body, "Back", ShowHome, Parse(Card), Parse(Ink));
        }

        private void DeleteConnection(LocalConnection connection)
        {
            document.Connections.Remove(connection);
            store.Save(document);
            ShowJourney();
        }

        private void ResetLocalData()
        {
            store.DeleteAll();
            document = new JciStoreDocument();
            together = null;
            ShowHome();
        }

        private void ToggleReducedMotion()
        {
            reducedMotion = !reducedMotion;
            PlayerPrefs.SetInt("jci.reducedMotion", reducedMotion ? 1 : 0);
            PlayerPrefs.Save();
            ShowHome();
        }

        private void Haptic()
        {
#if UNITY_IOS && !UNITY_EDITOR
            if (!reducedMotion) Handheld.Vibrate();
#endif
        }

        private static RectTransform MakePanel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            return go.GetComponent<RectTransform>();
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = Vector2.zero; rect.offsetMax = Vector2.zero;
        }

        private static Text AddText(Transform parent, string value, int size, Color color, FontStyle style, float height, Color? background = null)
        {
            RectTransform layoutRect = null;
            if (background.HasValue)
            {
                var card = new GameObject("Text card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
                card.transform.SetParent(parent, false);
                card.GetComponent<Image>().color = background.Value;
                layoutRect = card.GetComponent<RectTransform>();
                layoutRect.anchorMin = new Vector2(0, 1); layoutRect.anchorMax = new Vector2(1, 1); layoutRect.pivot = new Vector2(0, 1); layoutRect.sizeDelta = new Vector2(0, height);
                var cardLayout = card.GetComponent<LayoutElement>(); cardLayout.preferredHeight = height; cardLayout.flexibleWidth = 1;
                parent = card.transform;
            }

            var go = new GameObject("Text", typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            var text = go.GetComponent<Text>();
            text.text = value; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = size; text.fontStyle = style; text.color = color;
            text.alignment = TextAnchor.MiddleLeft; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            var rect = text.rectTransform;
            if (layoutRect != null)
            {
                rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = new Vector2(18, 12); rect.offsetMax = new Vector2(-18, -12);
            }
            else
            {
                rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(0, 1); rect.sizeDelta = new Vector2(0, height);
                var layout = text.gameObject.AddComponent<LayoutElement>(); layout.preferredHeight = height; layout.flexibleWidth = 1;
            }
            return text;
        }

        private static Button AddButton(Transform parent, string label, UnityEngine.Events.UnityAction action, Color background, Color? foreground = null)
        {
            var go = new GameObject(label, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 58);
            var layout = go.AddComponent<LayoutElement>(); layout.preferredHeight = 58; layout.flexibleWidth = 1;
            go.GetComponent<Image>().color = background;
            var button = go.GetComponent<Button>(); button.onClick.AddListener(action);
            var text = AddText(go.transform, label, 17, foreground ?? Color.white, FontStyle.Bold, 58); text.alignment = TextAnchor.MiddleCenter; text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = new Vector2(12, 0); text.rectTransform.offsetMax = new Vector2(-12, 0);
            return button;
        }

        private static InputField AddInput(Transform parent, string placeholder)
        {
            var go = new GameObject("Connection name", typeof(RectTransform), typeof(Image), typeof(InputField));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 54);
            var layout = go.AddComponent<LayoutElement>(); layout.preferredHeight = 54; layout.flexibleWidth = 1;
            go.GetComponent<Image>().color = Parse(Card);
            var input = go.GetComponent<InputField>();
            var text = AddText(go.transform, string.Empty, 17, Parse(Ink), FontStyle.Normal, 54); text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = new Vector2(12, 0); text.rectTransform.offsetMax = new Vector2(-12, 0); input.textComponent = text;
            var hint = AddText(go.transform, placeholder, 16, new Color(.1f, .16f, .26f, .55f), FontStyle.Normal, 54); hint.rectTransform.anchorMin = Vector2.zero; hint.rectTransform.anchorMax = Vector2.one; hint.rectTransform.offsetMin = new Vector2(12, 0); hint.rectTransform.offsetMax = new Vector2(-12, 0); input.placeholder = hint;
            return input;
        }

        private static Color Parse(string html) { ColorUtility.TryParseHtmlString(html, out var color); return color; }
    }

    internal sealed class JciSafeArea : MonoBehaviour
    {
        private RectTransform rect; private Rect last;
        private void Awake() { rect = GetComponent<RectTransform>(); Apply(); }
        private void Update() { if (last != Screen.safeArea) Apply(); }
        private void Apply()
        {
            last = Screen.safeArea; var min = last.position; var max = min + last.size;
            rect.anchorMin = new Vector2(min.x / Screen.width, min.y / Screen.height); rect.anchorMax = new Vector2(max.x / Screen.width, max.y / Screen.height); rect.offsetMin = rect.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Subtle screen fade/scale transition. It is disabled when reduced motion is enabled.</summary>
    internal sealed class JciScreenMotion : MonoBehaviour
    {
        private CanvasGroup group;
        private float elapsed;
        private bool reduced;

        private void Awake()
        {
            group = GetComponent<CanvasGroup>() ?? gameObject.AddComponent<CanvasGroup>();
        }

        public void Play(bool reducedMotion)
        {
            reduced = reducedMotion;
            elapsed = 0f;
            if (reduced)
            {
                group.alpha = 1f;
                transform.localScale = Vector3.one;
                enabled = false;
                return;
            }

            group.alpha = 0f;
            transform.localScale = Vector3.one * 0.985f;
            enabled = true;
        }

        private void Update()
        {
            if (reduced) return;
            elapsed += Time.unscaledDeltaTime;
            var t = Mathf.Clamp01(elapsed / 0.24f);
            var eased = 1f - Mathf.Pow(1f - t, 3f);
            group.alpha = eased;
            transform.localScale = Vector3.LerpUnclamped(Vector3.one * 0.985f, Vector3.one, eased);
            if (t >= 1f) enabled = false;
        }
    }

    /// <summary>Very low-amplitude glass highlight pulse, automatically respecting reduced motion.</summary>
    internal sealed class JciGlassPulse : MonoBehaviour
    {
        private Image image;
        private float elapsed;
        private const float BaseAlpha = 0.055f;

        private void Awake()
        {
            image = GetComponent<Image>();
        }

        private void Update()
        {
            if (image == null) return;
            if (PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1)
            {
                var reduced = image.color;
                reduced.a = BaseAlpha;
                image.color = reduced;
                return;
            }

            elapsed += Time.unscaledDeltaTime;
            var color = image.color;
            color.a = BaseAlpha + Mathf.Sin(elapsed * 0.8f) * 0.012f;
            image.color = color;
        }
    }
}
