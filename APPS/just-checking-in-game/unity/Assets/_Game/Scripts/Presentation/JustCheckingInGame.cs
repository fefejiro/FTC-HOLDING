using System;
using System.IO;
using Jci.Application;
using Jci.Domain;
using Jci.Infrastructure;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Jci.Presentation
{
    /// <summary>Offline-first uGUI shell. Only documented local IDs and metrics are persisted.</summary>
    public sealed class JustCheckingInGame : MonoBehaviour
    {
        private const string Background = "#F3E8D5";
        private const string Card = "#FFF9F0";
        private const string Ink = "#15354D";
        private const string Coral = "#E49A73";
        private const string Teal = "#78B7AD";
        private const string Gold = "#D1A84F";

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
            // The runtime UI is created entirely in code, so create the event
            // system explicitly; without it, buttons render but never receive
            // touch/pointer input on Android or iOS.
            if (FindAnyObjectByType<EventSystem>() == null)
            {
                var eventSystem = new GameObject("JCI EventSystem", typeof(EventSystem));
                eventSystem.transform.SetParent(transform, false);
                eventSystem.AddComponent<InputSystemUIInputModule>();
            }

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
            Stretch(glass);
            glass.offsetMin = new Vector2(14, 12);
            glass.offsetMax = new Vector2(-14, -12);
            var outline = glass.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.12f);
            outline.effectDistance = new Vector2(1f, -1f);
            glass.gameObject.AddComponent<JciGlassPulse>();
            body = MakePanel(safe.transform, "Body", new Color(0, 0, 0, 0));
            Stretch(body);
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
            AddText(body, "JUST CHECKING IN", 16, Parse(Ink), FontStyle.Bold, 32);
            var hero = AddText(body, "A little time to connect.", 30, Parse(Ink), FontStyle.Bold, 72);
            hero.rectTransform.sizeDelta = new Vector2(0, 72);
            screenMotion.Play(reducedMotion);
        }

        private void ShowHome()
        {
            ClearBody();
            AddText(body, "How would you like to arrive?", 18, Parse(Ink), FontStyle.Normal, 50);
            if (document.ActiveSession != null) AddButton(body, "Resume your check-in", ResumeTogether, Parse(Coral));
            AddModeCard(body, "Solo check-in", "Take a moment for you.", ShowSelfIntro, Parse(Teal));
            AddModeCard(body, "Check in together", "Share this moment with someone you trust.", ShowTogetherPicker, Parse(Coral));
            AddModeCard(body, "Your connection journey", "Small moments. Lasting connection.", ShowJourney, Parse(Gold), Parse(Ink));
            AddButton(body, "Reduced motion: " + (reducedMotion ? "On" : "Off"), ToggleReducedMotion, Parse(Card), Parse(Ink));
        }

        private void ShowSelfIntro()
        {
            selectedMood = null;
            ClearBody();
            AddText(body, "Solo check-in", 24, Parse(Ink), FontStyle.Bold, 52);
            AddText(body, "Take a moment for you.", 18, Parse(Ink), FontStyle.Normal, 42);
            AddText(body, "Draw one card and notice what arrives.", 24, Parse(Ink), FontStyle.Bold, 170, Parse(Card));
            AddButton(body, "Draw a card", ShowSelf, Parse(Teal));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
        }

        private void ShowSelf()
        {
            selectedMood = null;
            ClearBody();
            AddText(body, "Before anything else, how are you arriving today?", 22, Parse(Ink), FontStyle.Bold, 68);
            foreach (var mood in JciContent.Moods) AddButton(body, mood.Label, () => SelectMood(mood), Parse(Teal));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
        }

        private void SelectMood(MoodOption mood)
        {
            selectedMood = mood;
            ClearBody();
            AddText(body, "Here is something to carry with you", 21, Parse(Ink), FontStyle.Bold, 58);
            var affirmation = JciContent.FindAffirmation(mood.Id);
            AddText(body, affirmation.Text, 25, Parse(Ink), FontStyle.Bold, 150, Parse(Card));
            AddButton(body, "That feels true - finish", FinishSelf, Parse(Coral));
            AddButton(body, "Try another feeling", ShowSelf, Parse(Card), Parse(Ink));
        }

        private void FinishSelf()
        {
            if (selectedMood == null) return;
            var affirmation = JciContent.FindAffirmation(selectedMood.Id);
            document.SelfCheckIns.Add(new SelfCheckInRecord(Guid.NewGuid().ToString("N"), selectedMood.Id, affirmation.Id, DateTime.UtcNow.Ticks));
            store.Save(document);
            Haptic();
            ClearBody();
            AddText(body, "You made a little space for yourself.", 25, Parse(Ink), FontStyle.Bold, 70);
            AddText(body, affirmation.Text, 19, Parse(Ink), FontStyle.Normal, 110);
            AddButton(body, "Keep going", ShowHome, Parse(Teal));
        }

        private void ShowTogetherPicker()
        {
            ClearBody();
            AddText(body, "Who would you like to check in with?", 21, Parse(Ink), FontStyle.Bold, 64);
            foreach (var connection in document.Connections)
            {
                var local = connection;
                AddButton(body, local.DisplayName, () => StartTogether(local.Id), Parse(Teal));
            }
            nameInput = AddInput(body, "A name for this person (stays on this device)");
            AddButton(body, "Start together", CreateAndStartTogether, Parse(Coral));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
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
            AddText(body, "TOGETHER - YOUR TURN " + together.TurnNumber.ToString("00"), 15, Parse(Gold), FontStyle.Bold, 42);
            AddText(body, together.CurrentPrompt.Text, 23, Parse(Ink), FontStyle.Bold, 205, Parse(Card));
            AddButton(body, "I am ready - next prompt", CompleteTurn, Parse(Coral));
            AddButton(body, "Not today", PassTurn, Parse(Teal));
            AddButton(body, "Close this check-in", EndTogether, Parse(Card), Parse(Ink));
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
            AddText(body, "That was a good pause.", 26, Parse(Ink), FontStyle.Bold, 70);
            AddText(body, summary.QuestionsCompleted + " shared - " + summary.QuestionsPassed + " skipped", 19, Parse(Ink), FontStyle.Normal, 66);
            AddButton(body, "Keep going", ShowHome, Parse(Teal));
        }

        private void ShowJourney()
        {
            ClearBody();
            AddText(body, "Your local connection journey", 22, Parse(Ink), FontStyle.Bold, 65);
            foreach (var connection in document.Connections)
            {
                var local = connection;
                var count = document.TogetherSessions.FindAll(s => s.ConnectionId == local.Id).Count;
                AddButton(body, local.DisplayName + " - " + count + " check-ins", () => DeleteConnection(local), Parse(Teal));
            }
            AddText(body, "Tap a name to remove its local label. Nothing leaves this device.", 13, new Color(0.08f, 0.16f, 0.24f, .72f), FontStyle.Normal, 58);
            AddButton(body, "Add someone", ShowTogetherPicker, Parse(Coral));
            AddButton(body, "Reset all local data", ResetLocalData, Parse(Coral));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
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
            value = NormalizeLabel(value);
            RectTransform layoutRect = null;
            if (background.HasValue)
            {
                var card = new GameObject("Text card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
                card.transform.SetParent(parent, false);
                card.GetComponent<Image>().color = background.Value;
                var outline = card.AddComponent<Outline>();
                outline.effectColor = new Color(1f, 1f, 1f, 0.16f);
                outline.effectDistance = new Vector2(1f, -1f);
                var shadow = card.AddComponent<Shadow>();
                shadow.effectColor = new Color(0.08f, 0.12f, 0.16f, 0.16f);
                shadow.effectDistance = new Vector2(0f, -4f);
                card.AddComponent<JciCardMotion>();
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

        // Keep labels readable if an older serialized/source string contains UTF-8 mojibake.
        private static string NormalizeLabel(string value)
        {
            return (value ?? string.Empty)
                .Replace("\u00C2\u00B7", "\u00B7")
                .Replace("\u00E2\u20AC\u201D", "\u2014");
        }

        private static Button AddButton(Transform parent, string label, UnityEngine.Events.UnityAction action, Color background, Color? foreground = null)
        {
            var go = new GameObject(label, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 58);
            var layout = go.AddComponent<LayoutElement>(); layout.preferredHeight = 58; layout.flexibleWidth = 1;
            go.GetComponent<Image>().color = background;
            var button = go.GetComponent<Button>(); button.onClick.AddListener(action);
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = background;
            colors.highlightedColor = Color.Lerp(background, Color.white, 0.10f);
            colors.pressedColor = Color.Lerp(background, Color.black, 0.08f);
            colors.selectedColor = colors.highlightedColor;
            colors.disabledColor = new Color(background.r, background.g, background.b, 0.45f);
            button.colors = colors;
            go.AddComponent<JciButtonMotion>();
            var text = AddText(go.transform, label, 17, foreground ?? Color.white, FontStyle.Bold, 58); text.alignment = TextAnchor.MiddleCenter; text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = new Vector2(12, 0); text.rectTransform.offsetMax = new Vector2(-12, 0);
            return button;
        }

        /// <summary>
        /// Home mode cards deliberately share one physical-card footprint. The
        /// mode name chooses the route; the next screen owns the action (for
        /// example, "Draw a card"), so the home screen does not duplicate it.
        /// </summary>
        private static Button AddModeCard(Transform parent, string title, string subtitle, UnityEngine.Events.UnityAction action, Color background, Color? foreground = null)
        {
            var go = new GameObject(title, typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(.5f, 1);
            rect.sizeDelta = new Vector2(0, 112);

            var layout = go.GetComponent<LayoutElement>();
            layout.preferredHeight = 112;
            layout.minHeight = 112;
            layout.flexibleWidth = 1;

            var image = go.GetComponent<Image>();
            image.color = background;
            var outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.20f);
            outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0.08f, 0.12f, 0.16f, 0.18f);
            shadow.effectDistance = new Vector2(0f, -5f);

            var button = go.GetComponent<Button>();
            button.onClick.AddListener(action);
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = background;
            colors.highlightedColor = Color.Lerp(background, Color.white, 0.10f);
            colors.pressedColor = Color.Lerp(background, Color.black, 0.08f);
            colors.selectedColor = colors.highlightedColor;
            colors.disabledColor = new Color(background.r, background.g, background.b, 0.45f);
            button.colors = colors;
            go.AddComponent<JciButtonMotion>();

            var textColor = foreground ?? Color.white;
            var titleText = AddText(go.transform, title, 20, textColor, FontStyle.Bold, 48);
            titleText.alignment = TextAnchor.MiddleLeft;
            titleText.rectTransform.anchorMin = new Vector2(0, 0.42f);
            titleText.rectTransform.anchorMax = new Vector2(1, 0.92f);
            titleText.rectTransform.offsetMin = new Vector2(28, 0);
            titleText.rectTransform.offsetMax = new Vector2(-28, 0);

            var subtitleText = AddText(go.transform, subtitle, 15, new Color(textColor.r, textColor.g, textColor.b, 0.82f), FontStyle.Normal, 38);
            subtitleText.alignment = TextAnchor.MiddleLeft;
            subtitleText.rectTransform.anchorMin = new Vector2(0, 0.08f);
            subtitleText.rectTransform.anchorMax = new Vector2(1, 0.45f);
            subtitleText.rectTransform.offsetMin = new Vector2(28, 0);
            subtitleText.rectTransform.offsetMax = new Vector2(-28, 0);
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

    /// <summary>Subtle breathing motion for prompt and affirmation surfaces.</summary>
    internal sealed class JciCardMotion : MonoBehaviour
    {
        private RectTransform rect;
        private float elapsed;
        private bool reduced;

        private void Awake()
        {
            rect = GetComponent<RectTransform>();
            reduced = PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1;
            if (reduced) enabled = false;
        }

        private void Update()
        {
            if (rect == null || reduced) return;
            elapsed += Time.unscaledDeltaTime;
            var scale = 1f + Mathf.Sin(elapsed * 0.75f) * 0.004f;
            rect.localScale = new Vector3(scale, scale, 1f);
        }
    }

    /// <summary>Small tactile press response for touch buttons, disabled for reduced motion.</summary>
    internal sealed class JciButtonMotion : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        private RectTransform rect;
        private Vector3 restingScale;
        private bool reduced;

        private void Awake()
        {
            rect = GetComponent<RectTransform>();
            restingScale = rect.localScale;
            reduced = PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!reduced && rect != null) rect.localScale = restingScale * 0.975f;
        }

        public void OnPointerUp(PointerEventData eventData) { Restore(); }
        public void OnPointerExit(PointerEventData eventData) { Restore(); }

        private void Restore()
        {
            if (rect != null) rect.localScale = restingScale;
        }
    }
}
