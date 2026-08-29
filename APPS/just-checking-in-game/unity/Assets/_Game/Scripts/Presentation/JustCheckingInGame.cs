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
        private Sprite sunLogo;
        private Sprite warmBackdrop;
        private Sprite cardFront;
        private Sprite cardBack;

        private enum JciScreen
        {
            Home,
            SelfIntro,
            SelfMood,
            SelfAffirmation,
            SelfSummary,
            TogetherPicker,
            TogetherActive,
            TogetherSummary,
            Journey
        }

        private JciScreen currentScreen = JciScreen.Home;

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
#if UNITY_ANDROID && !UNITY_EDITOR
            // Keep Android's status/navigation bars available so notification shade,
            // gesture navigation, and system back remain usable alongside JCI.
            Screen.fullScreenMode = FullScreenMode.Windowed;
            Screen.fullScreen = false;
#endif
            reducedMotion = PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1;
            store = new JciLocalStore(Path.Combine(UnityEngine.Application.persistentDataPath, "jci-local-v1.json"));
            document = store.Load();
            sunLogo = LoadSprite("JciSunLogo");
            warmBackdrop = LoadSprite("JciWarmBackdrop");
            cardFront = LoadSprite("JciCardFront");
            cardBack = LoadSprite("JciCardBack");
            BuildCanvas();
            ShowHome();
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape)) HandleBack();
        }

        private void HandleBack()
        {
            switch (currentScreen)
            {
                case JciScreen.Home:
                    UnityEngine.Application.Quit();
                    break;
                case JciScreen.SelfIntro:
                case JciScreen.TogetherPicker:
                case JciScreen.Journey:
                    ShowHome();
                    break;
                case JciScreen.SelfMood:
                    ShowSelfIntro();
                    break;
                case JciScreen.SelfAffirmation:
                    ShowSelf();
                    break;
                case JciScreen.SelfSummary:
                case JciScreen.TogetherSummary:
                    ShowHome();
                    break;
                case JciScreen.TogetherActive:
                    if (together != null && together.Phase == SessionPhase.Active)
                    {
                        document.ActiveSession = together.Snapshot();
                        store.Save(document);
                    }
                    ShowHome();
                    break;
            }
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
            var backgroundImage = background.GetComponent<Image>();
            if (warmBackdrop != null)
            {
                backgroundImage.sprite = warmBackdrop;
                backgroundImage.preserveAspect = false;
                backgroundImage.color = new Color(1f, 1f, 1f, 0.94f);
            }
            Stretch(background);
            var safe = new GameObject("Safe Area", typeof(RectTransform), typeof(JciSafeArea));
            safe.transform.SetParent(go.transform, false);
            Stretch(safe.GetComponent<RectTransform>());
            var glass = MakePanel(safe.transform, "Glass Surface", new Color(1f, 1f, 1f, 0.10f));
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
            layout.spacing = 9;
            layout.padding = new RectOffset(0, 0, 0, 0);
            layout.childControlWidth = true;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
        }

        private void ClearBody()
        {
            for (var i = body.childCount - 1; i >= 0; i--) Destroy(body.GetChild(i).gameObject);
            AddBrandHeader(body);
            var hero = AddText(body, "A little time to connect.", 31, Parse(Ink), FontStyle.Bold, 74);
            hero.rectTransform.sizeDelta = new Vector2(0, 74);
            screenMotion.Play(reducedMotion);
        }

        private void ShowHome()
        {
            currentScreen = JciScreen.Home;
            ClearBody();
            AddText(body, "How would you like to arrive?", 18, Parse(Ink), FontStyle.Normal, 43);
            if (document.ActiveSession != null) AddButton(body, "Resume your check-in", ResumeTogether, Parse(Coral));
            AddPhysicalDeck(body);
            AddButton(body, "Draw a card for myself", ShowSelfIntro, Parse(Teal));
            AddButton(body, "Reduced motion: " + (reducedMotion ? "On" : "Off"), ToggleReducedMotion, new Color(1f, 1f, 1f, .72f), Parse(Ink));
        }

        private void ShowSelfIntro()
        {
            currentScreen = JciScreen.SelfIntro;
            selectedMood = null;
            ClearBody();
            AddText(body, "Solo check-in", 24, Parse(Ink), FontStyle.Bold, 52);
            AddText(body, "Take a moment for you.", 18, Parse(Ink), FontStyle.Normal, 42);
            AddCardText(body, "Draw one card and notice what arrives.", 24, 170, Parse(Teal));
            AddButton(body, "Draw a card", ShowSelf, Parse(Teal));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
        }

        private void ShowSelf()
        {
            currentScreen = JciScreen.SelfMood;
            selectedMood = null;
            ClearBody();
            AddCardText(body, "Before anything else, how are you arriving today?", 22, 112, Parse(Teal));
            foreach (var mood in JciContent.Moods) AddButton(body, mood.Label, () => SelectMood(mood), Parse(Teal));
            AddButton(body, "Back to the start", ShowHome, Parse(Card), Parse(Ink));
        }

        private void SelectMood(MoodOption mood)
        {
            currentScreen = JciScreen.SelfAffirmation;
            selectedMood = mood;
            ClearBody();
            AddCardText(body, "Here is something to carry with you", 21, 96, Parse(Gold));
            var affirmation = JciContent.FindAffirmation(mood.Id);
            AddCardText(body, affirmation.Text, 25, 150, Parse(Teal));
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
            currentScreen = JciScreen.SelfSummary;
            ClearBody();
            AddText(body, "You made a little space for yourself.", 25, Parse(Ink), FontStyle.Bold, 70);
            AddCardText(body, affirmation.Text, 19, 110, Parse(Teal));
            AddButton(body, "Keep going", ShowHome, Parse(Teal));
        }

        private void ShowTogetherPicker()
        {
            currentScreen = JciScreen.TogetherPicker;
            ClearBody();
            AddCardText(body, "Who would you like to check in with?", 21, 104, Parse(Coral));
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
            currentScreen = JciScreen.TogetherActive;
            ClearBody();
            if (together == null || together.CurrentPrompt == null) { ShowHome(); return; }
            AddText(body, "TOGETHER - YOUR TURN " + together.TurnNumber.ToString("00"), 15, Parse(Gold), FontStyle.Bold, 42);
            AddCardText(body, together.CurrentPrompt.Text, 23, 205, Parse(Coral));
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
            currentScreen = JciScreen.TogetherSummary;
            ClearBody();
            AddText(body, "That was a good pause.", 26, Parse(Ink), FontStyle.Bold, 70);
            AddCardText(body, summary.QuestionsCompleted + " shared - " + summary.QuestionsPassed + " skipped", 19, 92, Parse(Gold));
            AddButton(body, "Keep going", ShowHome, Parse(Teal));
        }

        private void ShowJourney()
        {
            currentScreen = JciScreen.Journey;
            ClearBody();
            AddCardText(body, "Your local connection journey", 22, 112, Parse(Gold));
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

        private static Sprite LoadSprite(string resourceName)
        {
            var texture = Resources.Load<Texture2D>(resourceName);
            if (texture == null) return null;
            return Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(.5f, .5f), 100f);
        }

        private static void AddBrandHeader(Transform parent)
        {
            var go = new GameObject("Brand header", typeof(RectTransform), typeof(HorizontalLayoutGroup), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, 44);
            var layoutElement = go.GetComponent<LayoutElement>(); layoutElement.preferredHeight = 44; layoutElement.flexibleWidth = 1;
            var layout = go.GetComponent<HorizontalLayoutGroup>();
            layout.spacing = 10; layout.childAlignment = TextAnchor.MiddleLeft; layout.childControlWidth = false; layout.childControlHeight = false; layout.childForceExpandWidth = false; layout.childForceExpandHeight = false;

            var logoGo = new GameObject("Sunrise mark", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            logoGo.transform.SetParent(go.transform, false);
            var logoRect = logoGo.GetComponent<RectTransform>(); logoRect.sizeDelta = new Vector2(44, 44);
            var logoImage = logoGo.GetComponent<Image>(); logoImage.sprite = LoadSprite("JciSunLogo"); logoImage.preserveAspect = true; logoImage.raycastTarget = false;
            var logoLayout = logoGo.GetComponent<LayoutElement>(); logoLayout.preferredWidth = 44; logoLayout.preferredHeight = 44;
            var label = AddText(go.transform, "JUST CHECKING IN", 15, Parse(Ink), FontStyle.Bold, 44);
            label.rectTransform.sizeDelta = new Vector2(190, 44);
            var labelLayout = label.GetComponent<LayoutElement>(); if (labelLayout != null) labelLayout.preferredWidth = 190;
        }

        private void AddPhysicalDeck(Transform parent)
        {
            var area = new GameObject("Physical card deck", typeof(RectTransform), typeof(LayoutElement));
            area.transform.SetParent(parent, false);
            var areaRect = area.GetComponent<RectTransform>();
            areaRect.anchorMin = new Vector2(0, 1); areaRect.anchorMax = new Vector2(1, 1); areaRect.pivot = new Vector2(.5f, 1); areaRect.sizeDelta = new Vector2(0, 218);
            var areaLayout = area.GetComponent<LayoutElement>(); areaLayout.preferredHeight = 218; areaLayout.minHeight = 218; areaLayout.flexibleWidth = 1;

            // A quiet stack behind the choices makes the interaction read as a
            // real card game while remaining fully decorative and non-blocking.
            AddDeckImage(area.transform, cardBack, new Vector2(-58, 19), new Vector2(116, 174), -9f, .72f);
            AddDeckImage(area.transform, cardBack, new Vector2(58, 22), new Vector2(116, 174), 9f, .58f);

            var row = new GameObject("Card choices", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            row.transform.SetParent(area.transform, false);
            var rowRect = row.GetComponent<RectTransform>();
            rowRect.anchorMin = new Vector2(0, 0); rowRect.anchorMax = new Vector2(1, 0); rowRect.pivot = new Vector2(.5f, 0); rowRect.anchoredPosition = new Vector2(0, 6); rowRect.sizeDelta = new Vector2(0, 184);
            var rowLayout = row.GetComponent<HorizontalLayoutGroup>();
            rowLayout.spacing = 7; rowLayout.padding = new RectOffset(0, 0, 0, 0); rowLayout.childAlignment = TextAnchor.MiddleCenter; rowLayout.childControlWidth = false; rowLayout.childControlHeight = false; rowLayout.childForceExpandWidth = false; rowLayout.childForceExpandHeight = false;

            AddPhysicalModeCard(row.transform, "Check in\nwith myself", "A moment for you.", ShowSelfIntro, Parse(Teal));
            AddPhysicalModeCard(row.transform, "Check in\ntogether", "Share the moment.", ShowTogetherPicker, Parse(Coral));
            AddPhysicalModeCard(row.transform, "Your connection\njourney", "Small moments.", ShowJourney, Parse(Gold));
        }

        private static void AddDeckImage(Transform parent, Sprite sprite, Vector2 position, Vector2 size, float angle, float alpha)
        {
            if (sprite == null) return;
            var go = new GameObject("Card deck layer", typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(.5f, .5f); rect.anchorMax = new Vector2(.5f, .5f); rect.pivot = new Vector2(.5f, .5f); rect.anchoredPosition = position; rect.sizeDelta = size; rect.localRotation = Quaternion.Euler(0, 0, angle);
            var image = go.GetComponent<Image>(); image.sprite = sprite; image.preserveAspect = true; image.raycastTarget = false; image.color = new Color(1f, 1f, 1f, alpha);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .18f); shadow.effectDistance = new Vector2(0, -4);
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

        private Text AddCardText(Transform parent, string value, int size, float height, Color accent)
        {
            var go = new GameObject("Physical prompt card", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1); rect.anchorMax = new Vector2(1, 1); rect.pivot = new Vector2(.5f, 1); rect.sizeDelta = new Vector2(0, height);
            var layout = go.GetComponent<LayoutElement>(); layout.preferredHeight = height; layout.minHeight = height; layout.flexibleWidth = 1;
            var image = go.GetComponent<Image>();
            image.sprite = cardFront;
            image.preserveAspect = false;
            image.color = Color.Lerp(Color.white, accent, .08f);
            var outline = go.AddComponent<Outline>(); outline.effectColor = new Color(1f, 1f, 1f, .55f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>(); shadow.effectColor = new Color(.08f, .12f, .16f, .22f); shadow.effectDistance = new Vector2(0f, -5f);
            go.AddComponent<JciCardMotion>();
            var accentLine = new GameObject("Card accent", typeof(RectTransform), typeof(Image));
            accentLine.transform.SetParent(go.transform, false);
            var accentRect = accentLine.GetComponent<RectTransform>(); accentRect.anchorMin = new Vector2(.5f, 1); accentRect.anchorMax = new Vector2(.5f, 1); accentRect.pivot = new Vector2(.5f, 1); accentRect.anchoredPosition = new Vector2(0, -18); accentRect.sizeDelta = new Vector2(46, 5);
            accentLine.GetComponent<Image>().color = accent; accentLine.GetComponent<Image>().raycastTarget = false;
            var text = AddText(go.transform, value, size, Parse(Ink), FontStyle.Bold, height);
            text.alignment = TextAnchor.MiddleCenter;
            text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one;
            text.rectTransform.offsetMin = new Vector2(20, 18); text.rectTransform.offsetMax = new Vector2(-20, -18);
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

        private Button AddPhysicalModeCard(Transform parent, string title, string subtitle, UnityEngine.Events.UnityAction action, Color accent)
        {
            var go = new GameObject(title, typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(.5f, .5f); rect.anchorMax = new Vector2(.5f, .5f); rect.pivot = new Vector2(.5f, .5f); rect.sizeDelta = new Vector2(103, 178);

            var layout = go.GetComponent<LayoutElement>();
            layout.preferredWidth = 103; layout.minWidth = 103; layout.preferredHeight = 178; layout.minHeight = 178; layout.flexibleWidth = 0;

            var image = go.GetComponent<Image>();
            image.sprite = cardFront;
            image.preserveAspect = true;
            image.color = Color.Lerp(Color.white, accent, .10f);
            var outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.40f); outline.effectDistance = new Vector2(1f, -1f);
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0.08f, 0.12f, 0.16f, 0.25f); shadow.effectDistance = new Vector2(0f, -5f);

            var button = go.GetComponent<Button>();
            button.onClick.AddListener(action);
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            var normal = Color.Lerp(Color.white, accent, .10f);
            colors.normalColor = normal; colors.highlightedColor = Color.Lerp(normal, Color.white, 0.12f); colors.pressedColor = Color.Lerp(normal, Color.black, 0.08f);
            colors.selectedColor = colors.highlightedColor;
            colors.disabledColor = new Color(normal.r, normal.g, normal.b, 0.45f);
            button.colors = colors;
            go.AddComponent<JciButtonMotion>();

            var badge = new GameObject("Card accent", typeof(RectTransform), typeof(Image));
            badge.transform.SetParent(go.transform, false);
            var badgeRect = badge.GetComponent<RectTransform>(); badgeRect.anchorMin = new Vector2(.5f, 1); badgeRect.anchorMax = new Vector2(.5f, 1); badgeRect.pivot = new Vector2(.5f, 1); badgeRect.anchoredPosition = new Vector2(0, -24); badgeRect.sizeDelta = new Vector2(38, 5);
            badge.GetComponent<Image>().color = accent; badge.GetComponent<Image>().raycastTarget = false;
            var titleText = AddText(go.transform, title, 16, Parse(Ink), FontStyle.Bold, 78); titleText.alignment = TextAnchor.MiddleCenter; titleText.rectTransform.anchorMin = new Vector2(0, .30f); titleText.rectTransform.anchorMax = new Vector2(1, .78f); titleText.rectTransform.offsetMin = new Vector2(9, 0); titleText.rectTransform.offsetMax = new Vector2(-9, 0);
            var subtitleText = AddText(go.transform, subtitle, 11, new Color(Parse(Ink).r, Parse(Ink).g, Parse(Ink).b, .72f), FontStyle.Normal, 42); subtitleText.alignment = TextAnchor.MiddleCenter; subtitleText.rectTransform.anchorMin = new Vector2(0, .08f); subtitleText.rectTransform.anchorMax = new Vector2(1, .31f); subtitleText.rectTransform.offsetMin = new Vector2(8, 0); subtitleText.rectTransform.offsetMax = new Vector2(-8, 0);
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
        private Vector3 restingScale;

        private void Awake()
        {
            rect = GetComponent<RectTransform>();
            restingScale = rect == null ? Vector3.one : rect.localScale;
            reduced = PlayerPrefs.GetInt("jci.reducedMotion", 0) == 1;
            if (reduced)
            {
                enabled = false;
                return;
            }

            // A short card deal-in makes the tactile card metaphor readable,
            // then settles into a barely perceptible breathing motion.
            rect.localScale = restingScale * .92f;
        }

        private void Update()
        {
            if (rect == null || reduced) return;
            elapsed += Time.unscaledDeltaTime;
            var entrance = Mathf.Clamp01(elapsed / .28f);
            var easedEntrance = 1f - Mathf.Pow(1f - entrance, 3f);
            var breathe = 1f + Mathf.Sin(Mathf.Max(0f, elapsed - .28f) * .75f) * .006f;
            var scale = Mathf.Lerp(.92f, 1f, easedEntrance) * breathe;
            rect.localScale = restingScale * scale;
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
