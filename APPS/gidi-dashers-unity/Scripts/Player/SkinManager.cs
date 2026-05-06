using UnityEngine;

namespace GidiDashers.Player
{
    /// <summary>
    /// Simple character skin switcher.
    /// Skins are Nigeria-themed: Agbada runner, School-uniform kid, Lagos chef, Okada rider.
    /// Unlocked via PlayerPrefs flags.
    /// </summary>
    public class SkinManager : MonoBehaviour
    {
        [System.Serializable]
        public struct Skin
        {
            public string id;           // "agbada", "schoolkid", etc.
            public string displayName;
            public Sprite[] frames;     // or swap out an Animator override controller
            public bool unlockedByDefault;
        }

        [SerializeField] private Skin[] skins;
        [SerializeField] private SpriteRenderer playerRenderer;

        private int currentIndex;

        private void Start()
        {
            // Load last-used skin
            string saved = PlayerPrefs.GetString("SelectedSkin", "agbada");
            for (int i = 0; i < skins.Length; i++)
            {
                if (skins[i].id == saved) { currentIndex = i; break; }
            }
            ApplySkin(currentIndex);
        }

        public void SelectSkin(int index)
        {
            if (index < 0 || index >= skins.Length) return;
            if (!IsUnlocked(skins[index])) return;
            currentIndex = index;
            PlayerPrefs.SetString("SelectedSkin", skins[index].id);
            ApplySkin(currentIndex);
        }

        public bool IsUnlocked(Skin skin)
        {
            if (skin.unlockedByDefault) return true;
            return PlayerPrefs.GetInt("Skin_" + skin.id, 0) == 1;
        }

        public void UnlockSkin(string id)
        {
            PlayerPrefs.SetInt("Skin_" + id, 1);
            PlayerPrefs.Save();
        }

        private void ApplySkin(int index)
        {
            if (skins[index].frames != null && skins[index].frames.Length > 0)
                playerRenderer.sprite = skins[index].frames[0];
        }

        // Expose for skin selection UI
        public Skin[] AllSkins => skins;
        public int CurrentIndex => currentIndex;
    }
}
