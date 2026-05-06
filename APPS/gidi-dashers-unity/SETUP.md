# Gidi Dashers — Unity Project Setup

Nigeria-themed endless runner. 2D side-scroller, mobile-first, Android target.

## After creating the project in Unity Hub

### 1. Copy scripts
Copy everything in `Scripts/` into `Assets/Scripts/` inside the Unity project.

### 2. Scene setup — Main scene

**Hierarchy:**
```
GameManager (Empty)
  └─ GameManager.cs
  └─ AudioManager.cs

WorldScroller (Empty)
  └─ WorldScroller.cs
  └─ GroundTileSpawner.cs   (drag GroundTile prefab in)
  └─ ObstacleSpawner.cs     (assign obstacle prefabs + weights)
  └─ CoinSpawner.cs         (assign Coin prefab)

Player (Sprite)
  └─ PlayerController.cs
  └─ SkinManager.cs
  └─ Rigidbody2D  (Gravity 3.5, Collision Detection: Continuous)
  └─ CapsuleCollider2D  (stand) — tagged "Player"
  └─ CapsuleCollider2D  (slide, shorter) — start disabled

Background (Sprite)
  └─ ParallaxLayer.cs  (factor 0.1 → sky / 0.4 → midground / 0.7 → buildings)

Canvas (Screen Space - Camera)
  └─ HUDController.cs
  └─ [Menu Panel]
  └─ [HUD Panel]     — Score TMP, HighScore TMP
  └─ [Pause Panel]
  └─ [GameOver Panel] — Final score TMP, New Record label
```

### 3. Tags & Layers
- Tag `Player` on player collider
- Tag `Obstacle` on all obstacle colliders
- Layer `Ground` on ground tiles (used by Raycast in PlayerController)

### 4. Physics 2D settings
- Gravity Y: -30 (snappy runner feel)
- Collision matrix: Player ↔ Ground ON, Player ↔ Obstacle ON, everything else OFF

### 5. Build settings
- Platform: Android
- Minimum API: 26 (Android 8.0)
- Orientation: Landscape Left
- Package name: `com.ftcholding.gididashers`
- Scripting backend: IL2CPP
- Target architecture: ARM64

### 6. Nigeria-themed obstacle prefabs to create
| Name | Type | Mechanic |
|------|------|----------|
| Pothole | Ground dip / barrier | Jump over |
| Danfo (yellow bus) | Tall barrier | Jump |
| NEPA pole | Tall barrier | Jump |
| Ankara barrier | Mid barrier | Slide under |
| Suya grill | Ground item | Jump or double-jump |

### 7. Character skins
| ID | Display name | Default |
|----|--------------|---------|
| agbada | Agbada Sprinter | ✓ |
| schoolkid | School Uniform Kid | ✗ |
| chef | Lagos Chef | ✗ |
| okada | Okada Rider | ✗ |

Unlock via `SkinManager.UnlockSkin("schoolkid")` after milestones.

## Quick test sequence
1. Press Play in editor
2. Menu panel shows → click Play
3. Player runs, tap to jump, swipe down to slide
4. Obstacle collision → Game Over panel shows with score
5. Restart → score resets, speed resets
