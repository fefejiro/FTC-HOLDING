import Phaser from 'phaser';
import { GAME, COLORS, CHARACTERS } from '../config';
import { loadSave } from '../save';
import { SFX, setMuted } from '../sfx';

type ObstacleKind = 'molue' | 'danfo' | 'okada' | 'pothole' | 'lastma';
type PickupKind = 'naira' | 'boost' | 'shield' | 'magnet' | 'jetpack';

interface SwipeState {
  active: boolean;
  startX: number;
  startY: number;
  startT: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerAnimFrame = 0;
  private playerAnimTimer = 0;
  private readonly ANIM_MS = 85;
  private trailTimer = 0;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private currentLane: number = GAME.PLAYER_START_LANE;
  private targetLaneX: number = GAME.LANE_X[GAME.PLAYER_START_LANE];
  private isSliding = false;
  private slideEndAt = 0;

  private obstacles!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;

  private scrollSpeed: number = GAME.BASE_SCROLL_SPEED;
  private elapsedMs = 0;
  private nextSpawnAt = 0;

  private score = 0;
  private nairaRun = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private nairaText!: Phaser.GameObjects.Text;

  // Powerups
  private shieldUntil = 0;
  private boostUntil = 0;
  private magnetUntil = 0;
  private jetpackUntil = 0;
  private powerupHud!: Phaser.GameObjects.Text;

  // Combo / multiplier
  private combo = 0;
  private comboExpiresAt = 0;
  private comboText!: Phaser.GameObjects.Text;

  private roadStripes: Phaser.GameObjects.Rectangle[] = [];
  private skylineFar: Phaser.GameObjects.Rectangle[] = [];
  private skylineNear: Phaser.GameObjects.Rectangle[] = [];
  private envObjs: Phaser.GameObjects.Container[] = [];
  private nextEnvAt = 0;
  private swipe: SwipeState = { active: false, startX: 0, startY: 0, startT: 0 };
  private gameOver = false;

  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.gameOver = false;
    this.elapsedMs = 0;
    this.scrollSpeed = GAME.BASE_SCROLL_SPEED;
    this.score = 0;
    this.nairaRun = 0;
    this.shieldUntil = this.boostUntil = this.magnetUntil = this.jetpackUntil = 0;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.currentLane = GAME.PLAYER_START_LANE;
    this.targetLaneX = GAME.LANE_X[this.currentLane];
    this.isSliding = false;

    const save = loadSave();
    setMuted(save.muted);

    this.drawRoad();

    const charDef = CHARACTERS[save.selected];
    this.player = this.add.image(this.targetLaneX, GAME.PLAYER_Y, 'player-run0');
    void charDef; // tint applied per character in future art pass
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(false);
    this.playerBody.setGravityY(GAME.GRAVITY);
    this.playerBody.setSize(28, 54);

    this.obstacles = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.physics.add.overlap(this.player, this.obstacles, (_p, o) => this.onHitObstacle(o as Phaser.GameObjects.Image));
    this.physics.add.overlap(this.player, this.pickups, (_p, k) => this.onPickup(k as Phaser.GameObjects.Image));

    this.buildHud();
    this.bindInput();

    this.nextSpawnAt = 600;
    this.nextEnvAt = 200;
    this.playerAnimFrame = 0;
    this.playerAnimTimer = 0;
    this.trailTimer = 0;
    this.envObjs = [];
  }

  override update(_t: number, dt: number) {
    if (this.gameOver) return;
    this.elapsedMs += dt;

    // Difficulty ramp
        // ── Player run animation
        this.playerAnimTimer += dt;
        if (this.playerAnimTimer >= this.ANIM_MS) {
          this.playerAnimTimer -= this.ANIM_MS;
          if (this.player.y < GAME.PLAYER_Y - 5) {
            this.player.setTexture('player-jump');
          } else if (!this.isSliding) {
            this.playerAnimFrame = (this.playerAnimFrame + 1) % 4;
            this.player.setTexture(`player-run${this.playerAnimFrame}`);
          }
        }
        // ── Trail particles
        this.trailTimer += dt;
        if (this.trailTimer >= 55) { this.trailTimer = 0; this.spawnTrail(); }

    this.scrollSpeed = Math.min(
      GAME.MAX_SCROLL_SPEED,
      GAME.BASE_SCROLL_SPEED + (this.elapsedMs / 1000) * GAME.SPEED_RAMP_PER_SEC
    );
    const speed = this.scrollSpeed * (this.elapsedMs < this.boostUntil ? 1.6 : 1);

    // Move player toward target lane
    const dx = this.targetLaneX - this.player.x;
    if (Math.abs(dx) > 1) {
      this.player.x += Phaser.Math.Clamp(dx, -12, 12);
    }

    // Slide expiry
    if (this.isSliding && this.elapsedMs >= this.slideEndAt) {
      this.isSliding = false;
      this.playerBody.setSize(28, 54);
      this.player.y = GAME.PLAYER_Y;
      this.player.scaleY = 1;
    }

    // Jetpack: hold up
    if (this.elapsedMs < this.jetpackUntil) {
      this.playerBody.setGravityY(0);
      this.playerBody.setVelocityY(-200);
    } else if (this.playerBody.gravity.y === 0) {
      this.playerBody.setGravityY(GAME.GRAVITY);
    }

    // Ground clamp
    if (this.player.y >= GAME.PLAYER_Y && this.elapsedMs >= this.jetpackUntil) {
      this.player.y = GAME.PLAYER_Y;
      this.playerBody.setVelocityY(0);
    }

    // Scroll obstacles + pickups
        // ── Env objects
        this.scrollEnvObjs((speed * dt) / 1000);
        if (this.elapsedMs >= this.nextEnvAt) {
          this.spawnEnvObj();
          this.nextEnvAt = this.elapsedMs + Phaser.Math.Between(350, 750);
        }

    const dy = (speed * dt) / 1000;
    this.obstacles.children.iterate(child => {
      if (!child) return true;
      const obj = child as Phaser.GameObjects.Image;
      obj.y += dy;
      const label = obj.getData('label') as Phaser.GameObjects.Text | undefined;
      if (label) { label.x = obj.x; label.y = obj.y; }
      if (obj.y > GAME.HEIGHT + 100) {
        if (label) label.destroy();
        obj.destroy();
      }
      return true;
    });
    this.pickups.children.iterate(child => {
      if (!child) return true;
      const obj = child as Phaser.GameObjects.Image;
      // magnet pull
      if (this.elapsedMs < this.magnetUntil && obj.getData('kind') === 'naira') {
        const tx = this.player.x, ty = this.player.y;
        obj.x += Phaser.Math.Clamp(tx - obj.x, -8, 8);
        obj.y += Phaser.Math.Clamp(ty - obj.y, -8, 8) + dy * 0.5;
      } else {
        obj.y += dy;
      }
      if (obj.y > GAME.HEIGHT + 60) obj.destroy();
      return true;
    });

    // Animate road stripes
    this.roadStripes.forEach(s => {
      s.y += dy;
      if (s.y > GAME.HEIGHT) s.y -= GAME.HEIGHT + 40;
    });

    // Parallax skyline (slow horizontal scroll)
    this.skylineFar.forEach(b => {
      b.x -= dy * 0.05;
      if (b.x < -50) b.x += GAME.WIDTH + 100;
    });
    this.skylineNear.forEach(b => {
      b.x -= dy * 0.12;
      if (b.x < -60) b.x += GAME.WIDTH + 120;
    });

    // Spawn loop
    if (this.elapsedMs >= this.nextSpawnAt) {
      this.spawnRow();
      const interval = Phaser.Math.Between(
        GAME.SPAWN_INTERVAL_MIN_MS,
        GAME.SPAWN_INTERVAL_MAX_MS
      ) * (GAME.BASE_SCROLL_SPEED / speed);
      this.nextSpawnAt = this.elapsedMs + interval;
    }

    // Score = distance proxy
    this.score += Math.floor(dy * 0.5);
    this.scoreText.setText(`${this.score.toLocaleString()}`);
    this.nairaText.setText(`\u20A6${this.nairaRun.toLocaleString()}`);
    this.updatePowerupHud();
  }

  // ---------- spawn ----------

  private spawnRow() {
    // Pick 0-2 obstacles in different lanes, plus chance of a pickup row
    const lanes = [0, 1, 2];
    Phaser.Utils.Array.Shuffle(lanes);
    const obstacleCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < obstacleCount; i++) {
      this.spawnObstacle(lanes[i]);
    }
    // pickup chance
    if (Math.random() < 0.7) {
      const lane = lanes[obstacleCount] ?? Phaser.Math.Between(0, 2);
      this.spawnPickupCluster(lane);
    }
    // rare powerup
    if (Math.random() < 0.08) {
      const lane = Phaser.Math.Between(0, 2);
      this.spawnPowerup(lane);
    }
  }

  private spawnObstacle(lane: number) {
    const kinds: ObstacleKind[] = ['molue', 'danfo', 'okada', 'pothole', 'lastma'];
    const kind = kinds[Phaser.Math.Between(0, kinds.length - 1)];
    const x = GAME.LANE_X[lane];
    // Pothole sits ON the ground; everything else hovers near player level so swipe/jump matters
    const y = kind === 'pothole' ? GAME.PLAYER_Y + 8 : -80;
    const img = this.physics.add.image(x, y, kind) as Phaser.Physics.Arcade.Image;
    img.setData('kind', kind);
    img.setData('isObstacle', true);
    (img.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    // Letter badge so player can read what's coming
    const badge: Record<ObstacleKind, string> = {
      molue: 'M', danfo: 'D', okada: 'O', pothole: '!', lastma: 'L',
    };
    const label = this.add.text(x, y, badge[kind], {
      fontFamily: 'system-ui', fontSize: kind === 'pothole' ? '14px' : '22px',
      fontStyle: 'bold', color: kind === 'pothole' ? '#facc15' : '#000000',
    }).setOrigin(0.5).setDepth(5);
    img.setData('label', label);
    this.obstacles.add(img);
  }

  private spawnPickupCluster(lane: number) {
    const x = GAME.LANE_X[lane];
    const count = Phaser.Math.Between(3, 6);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const value = r < 0.85 ? GAME.PICKUP_VALUE.N100 : r < 0.97 ? GAME.PICKUP_VALUE.N500 : GAME.PICKUP_VALUE.N1000;
      const tex = value === GAME.PICKUP_VALUE.N1000 ? 'naira-1000'
               : value === GAME.PICKUP_VALUE.N500  ? 'naira-500'
               : 'naira';
      const img = this.physics.add.image(x, -i * 36, tex) as Phaser.Physics.Arcade.Image;
      img.setData('kind', 'naira' as PickupKind);
      img.setData('value', value);
      (img.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      this.pickups.add(img);
    }
  }

  private spawnPowerup(lane: number) {
    const types: { key: string; kind: PickupKind }[] = [
      { key: 'shield-icon', kind: 'shield' },
      { key: 'magnet-icon', kind: 'magnet' },
      { key: 'boost-icon', kind: 'boost' },
      { key: 'jetpack-icon', kind: 'jetpack' },
    ];
    const t = types[Phaser.Math.Between(0, types.length - 1)];
    const img = this.physics.add.image(GAME.LANE_X[lane], -50, t.key) as Phaser.Physics.Arcade.Image;
    img.setData('kind', t.kind);
    (img.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    this.pickups.add(img);
  }

  // ---------- collision ----------

  private onHitObstacle(obj: Phaser.GameObjects.Image) {
    const kind = obj.getData('kind') as ObstacleKind;
    // --- per-obstacle avoidance rules ---
    // Pothole: jump over it (player is above ground level).
    if (kind === 'pothole' && this.player.y < GAME.PLAYER_Y - 8) return;
    // LASTMA: slide under him.
    if (kind === 'lastma' && this.isSliding) return;
    // Okada: small enough to clear with a jump.
    if (kind === 'okada' && this.player.y < GAME.PLAYER_Y - 20) return;
    // Molue / Danfo: lane switch only — no jumping over a bus.

    if (this.elapsedMs < this.shieldUntil) {
      // consume shield = absorb one hit
      this.shieldUntil = 0;
      const lbl = obj.getData('label') as Phaser.GameObjects.Text | undefined;
      if (lbl) lbl.destroy();
      obj.destroy();
      this.cameras.main.flash(120, 96, 165, 250);
      SFX.shieldHit();
      this.spawnScorePopup(this.player.x, this.player.y - 20, 'SAVED!', '#3b82f6');
      return;
    }
    const lbl2 = obj.getData('label') as Phaser.GameObjects.Text | undefined;
    if (lbl2) lbl2.destroy();
    obj.destroy();
    SFX.crash();
    this.endGame();
  }

  private onPickup(obj: Phaser.GameObjects.Image) {
    const kind = obj.getData('kind') as PickupKind;
    if (kind === 'naira') {
      const val = (obj.getData('value') as number) ?? 100;
      // Combo logic: each pickup within 1.2s extends/extends combo. Cap at x5.
      if (this.elapsedMs < this.comboExpiresAt) this.combo = Math.min(this.combo + 1, 50);
      else this.combo = 1;
      this.comboExpiresAt = this.elapsedMs + 1200;
      const mult = 1 + Math.min(Math.floor(this.combo / 5), 4); // x1..x5
      const earned = val * mult;
      this.nairaRun += earned;
      this.score += earned;
      this.spawnScorePopup(obj.x, obj.y, `+₦${earned}${mult > 1 ? ' x' + mult : ''}`,
        val >= 1000 ? '#ea580c' : val >= 500 ? '#f59e0b' : '#facc15');
      this.spawnCoinBurst(obj.x, obj.y);
      if (val >= 500) SFX.bigCoin(); else SFX.coin(this.combo);
    } else if (kind === 'shield') {
      this.shieldUntil = Number.MAX_SAFE_INTEGER;
      this.spawnScorePopup(obj.x, obj.y, 'SHIELD', '#3b82f6');
      SFX.powerup();
    } else if (kind === 'boost') {
      this.boostUntil = this.elapsedMs + GAME.POWERUP_DURATION_MS.boost;
      this.spawnScorePopup(obj.x, obj.y, 'BOOST', '#f97316');
      SFX.powerup();
    } else if (kind === 'magnet') {
      this.magnetUntil = this.elapsedMs + GAME.POWERUP_DURATION_MS.magnet;
      this.spawnScorePopup(obj.x, obj.y, 'MAGNET', '#eab308');
      SFX.powerup();
    } else if (kind === 'jetpack') {
      this.jetpackUntil = this.elapsedMs + GAME.POWERUP_DURATION_MS.jetpack;
      this.spawnScorePopup(obj.x, obj.y, 'JETPACK', '#ef4444');
      SFX.powerup();
    }
    obj.destroy();
  }

  private spawnScorePopup(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'system-ui', fontSize: '14px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private spawnCoinBurst(x: number, y: number) {
      private spawnTrail() {
        const isJet   = this.elapsedMs < this.jetpackUntil;
        const isBoost = this.elapsedMs < this.boostUntil;
        const color = isJet ? 0xff5500 : isBoost ? 0xf97316 : 0xffd23f;
        const size  = isJet ? 5 : 3;
        const px = this.player.x + Phaser.Math.Between(-6, 6);
        const py = this.player.y + 22 + (isJet ? 12 : 0);
        const p = this.add.circle(px, py, size, color, 0.75).setDepth(4);
        this.tweens.add({
          targets: p, alpha: 0, y: py + (isJet ? 22 : 14),
          scaleX: 0.2, scaleY: 0.2,
          duration: isJet ? 420 : 280, ease: 'Quad.easeIn',
          onComplete: () => p.destroy(),
        });
      }

      private spawnEnvObj() {
        const left = Math.random() < 0.5;
        const x = left ? Phaser.Math.Between(6, 46) : Phaser.Math.Between(314, 354);
        const kind = Phaser.Math.Between(0, 3);
        const g = this.add.graphics();
        switch (kind) {
          case 0: // Street lamp
            g.fillStyle(0x888888, 1); g.fillRect(-2, -42, 4, 42);
            g.fillStyle(0xcccccc, 1); g.fillRect(left ? -2 : -12, -44, 14, 4);
            g.fillStyle(0xffe082, 0.95); g.fillCircle(left ? 10 : -10, -48, 7);
            g.fillStyle(0xffee80, 0.2);  g.fillCircle(left ? 10 : -10, -48, 13);
            break;
          case 1: // Palm tree
            g.fillStyle(0x5d3a1a, 1); g.fillRect(-3, -38, 6, 38);
            g.fillStyle(0x2d6a1e, 1);
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4.5) {
              g.lineStyle(3, 0x2d6a1e, 1);
              g.strokeLine(0, -38, Math.cos(a) * 20, -38 + Math.sin(a) * 10 - 14);
            }
            g.fillStyle(0x1a4a0a, 1); g.fillCircle(0, -42, 6);
            break;
          case 2: { // Market stall
            const awningColor = [0xff4444, 0x44aaff, 0xffdd00, 0xff8800][Phaser.Math.Between(0, 3)];
            g.fillStyle(awningColor, 1); g.fillRect(-20, -16, 40, 13);
            g.lineStyle(1, 0x000000, 0.25); g.strokeRect(-20, -16, 40, 13);
            g.fillStyle(0xffffff, 0.22);
            for (let sx = -16; sx < 20; sx += 9) g.fillRect(sx, -16, 5, 13);
            g.fillStyle(0x888888, 1); g.fillRect(-1, -16, 2, 16);
            // Goods
            g.fillStyle(0xff8c00, 0.85); g.fillCircle(-8, 2, 5);
            g.fillStyle(0x22bb44, 0.85); g.fillCircle(5, 3, 4);
            g.fillStyle(0xffcc00, 0.85); g.fillCircle(-1, 4, 3);
            g.fillStyle(0xff5555, 0.7);  g.fillCircle(12, 2, 3);
            break;
          }
          case 3: // Dustbin / debris
            g.fillStyle(0x555555, 0.8); g.fillRoundedRect(-7, -14, 14, 14, 2);
            g.fillStyle(0x444444, 1);   g.fillRect(-8, -16, 16, 4);
            g.fillStyle(0x333333, 0.5); g.fillCircle(-3, -6, 5); g.fillCircle(5, -4, 4);
            break;
        }
        const c = this.add.container(x, -60, [g]).setDepth(1);
        this.envObjs.push(c);
      }

      private scrollEnvObjs(dy: number) {
        for (let i = this.envObjs.length - 1; i >= 0; i--) {
          const o = this.envObjs[i];
          o.y += dy;
          if (o.y > GAME.HEIGHT + 90) { o.destroy(); this.envObjs.splice(i, 1); }
        }
      }

    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x, y, 2 + Math.random() * 2, 0xfacc15).setDepth(15);
      const ang = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 50;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * sp,
        y: y + Math.sin(ang) * sp,
        alpha: 0,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.cameras.main.shake(200, 0.01);
    SFX.gameOver();
    this.time.delayedCall(350, () => {
      this.scene.start('GameOver', {
        score: this.score,
        naira: this.nairaRun,
        durationMs: this.elapsedMs,
      });
    });
  }

  // ---------- input ----------

  private bindInput() {
    // Keyboard
    this.input.keyboard?.on('keydown-LEFT', () => this.switchLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.switchLane(1));
    this.input.keyboard?.on('keydown-UP', () => this.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.slide());
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());

    // Touch swipe
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swipe = { active: true, startX: p.x, startY: p.y, startT: this.time.now };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipe.active) return;
      const dx = p.x - this.swipe.startX;
      const dy = p.y - this.swipe.startY;
      const dt = this.time.now - this.swipe.startT;
      this.swipe.active = false;
      const TAP_MAX = 12;
      const SWIPE_MIN = 25;
      if (Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX && dt < 250) {
        this.jump(); // tap = jump
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > SWIPE_MIN) this.switchLane(1);
        else if (dx < -SWIPE_MIN) this.switchLane(-1);
      } else {
        if (dy > SWIPE_MIN) this.slide();
        else if (dy < -SWIPE_MIN) this.jump();
      }
    });
  }

  private switchLane(dir: -1 | 1) {
    const next = Phaser.Math.Clamp(this.currentLane + dir, 0, GAME.LANE_COUNT - 1);
    if (next === this.currentLane) return;
    this.currentLane = next;
    this.targetLaneX = GAME.LANE_X[next];
    SFX.laneSwitch();
  }

  private jump() {
    // Only jump if grounded (or jetpack handles it)
    if (this.elapsedMs < this.jetpackUntil) return;
    if (Math.abs(this.player.y - GAME.PLAYER_Y) < 4) {
      this.playerBody.setVelocityY(GAME.JUMP_VELOCITY);
      SFX.jump();
    }
  }

  private slide() {
    if (this.isSliding) return;
    if (this.elapsedMs < this.jetpackUntil) return;
    this.isSliding = true;
    this.slideEndAt = this.elapsedMs + GAME.SLIDE_DURATION_MS;
    this.playerBody.setSize(28, 30);
    this.player.y = GAME.PLAYER_Y + 14;
    this.player.scaleY = 0.55; // squish run texture to look crouched
    SFX.slide();
  }

  // ---------- visuals ----------

  private drawRoad() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const horizY = Math.floor(H * 0.44);

    // ── SKY: gradient bands ──────────────────────────────────────────────
    const skyBands: [number, number, number][] = [
      [0,          H * 0.07, 0x010209],
      [H * 0.07,   H * 0.09, 0x03061a],
      [H * 0.16,   H * 0.10, 0x060b2a],
      [H * 0.26,   H * 0.10, 0x0c1138],
      [H * 0.36,   H * 0.06, 0x16103e],
      [H * 0.42,   H * 0.04, 0x22182a],
    ];
    for (const [y, h, c] of skyBands)
      this.add.rectangle(W / 2, y + h / 2, W, h + 1, c).setDepth(-10);

    // Stars
    for (let i = 0; i < 52; i++) {
      const sx = Math.random() * W, sy = Math.random() * (horizY - 22);
      const sr = Math.random() < 0.8 ? 0.75 : 1.35;
      const star = this.add.circle(sx, sy, sr, 0xffffff, 0.28 + Math.random() * 0.72).setDepth(-9);
      if (Math.random() < 0.28) {
        this.tweens.add({ targets: star, alpha: 0.04, duration: 500 + Math.random() * 1500,
          yoyo: true, repeat: -1, delay: Math.random() * 1200 });
      }
    }
    // Moon
    this.add.circle(W * 0.8, H * 0.075, 19, 0xfff8e0, 0.82).setDepth(-8);
    this.add.circle(W * 0.8, H * 0.075, 15, 0xfffef0, 1).setDepth(-8);
    this.add.circle(W * 0.8, H * 0.075, 25, 0xfff8e0, 0.1).setDepth(-8);
    this.add.circle(W * 0.8 + 5, H * 0.075 - 4, 3, 0xe0d8b8, 0.55).setDepth(-8);
    this.add.circle(W * 0.8 - 6, H * 0.075 + 5, 2, 0xe0d8b8, 0.55).setDepth(-8);
    // Horizon glow (Lagos never dark)
    this.add.rectangle(W / 2, horizY, W, 32, 0xff4400, 0.06).setDepth(-8);

    // ── FAR BUILDINGS (static, no scroll) ───────────────────────────────
    let bx = -5;
    while (bx < W + 24) {
      const bw = Phaser.Math.Between(18, 38), bh = Phaser.Math.Between(22, 70);
      const by = horizY - bh;
      const bc = [0x0c1224, 0x0f1830, 0x111424][Phaser.Math.Between(0, 2)];
      this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, bc).setDepth(-8);
      for (let wy = by + 5; wy < by + bh - 10; wy += 9)
        for (let wx = bx + 3; wx < bx + bw - 3; wx += 7)
          if (Math.random() < 0.33) {
            const wc = Math.random() < 0.6 ? 0xffe082 : Math.random() < 0.5 ? 0x90caf9 : 0xf48fb1;
            const wr = this.add.rectangle(wx, wy, 4, 5, wc, 0.5 + Math.random() * 0.5).setDepth(-7);
            if (Math.random() < 0.08)
              this.tweens.add({ targets: wr, alpha: 0.1, duration: 80 + Math.random() * 120,
                yoyo: true, repeat: Math.floor(Math.random() * 4), delay: Math.random() * 4000 });
          }
      bx += bw + Phaser.Math.Between(1, 6);
    }

    // ── MID BUILDINGS (slow horizontal scroll = skylineFar) ──────────────
    bx = -10;
    while (bx < W + 55) {
      const bw = Phaser.Math.Between(24, 52), bh = Phaser.Math.Between(42, 115);
      const by = horizY - bh + 10;
      const building = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x090f1e).setDepth(-6);
      this.skylineFar.push(building);
      if (Math.random() < 0.32 && bw > 28) {
        const sc = [0xff0044, 0x00aaff, 0xffcc00, 0x00ff88][Phaser.Math.Between(0, 3)];
        const sign = this.add.rectangle(bx + bw / 2, by + 13, bw - 8, 8, 0, 0).setDepth(-5);
        sign.setStrokeStyle(1.5, sc, 0.7 + Math.random() * 0.3);
        this.skylineFar.push(sign);
        this.skylineFar.push(this.add.rectangle(bx + bw / 2, by + 13, bw - 3, 12, sc, 0.07).setDepth(-5));
      }
      for (let wy = by + 16; wy < by + bh - 14; wy += 11)
        for (let wx = bx + 5; wx < bx + bw - 5; wx += 9)
          if (Math.random() < 0.38) {
            const wc = Math.random() < 0.55 ? 0xffe082 : Math.random() < 0.5 ? 0x90caf9 : 0xa5d6a7;
            this.skylineFar.push(this.add.rectangle(wx, wy, 5, 6, wc, 0.45 + Math.random() * 0.55).setDepth(-5));
          }
      bx += bw + Phaser.Math.Between(3, 10);
    }

    // ── NEAR BUILDINGS (faster horizontal scroll = skylineNear) ─────────
    bx = -10;
    while (bx < W + 65) {
      const bw = Phaser.Math.Between(32, 62), bh = Phaser.Math.Between(68, 145);
      const by = horizY - bh + 18;
      this.skylineNear.push(this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x070c18).setDepth(-4));
      if (Math.random() < 0.5) {
        const sc = [0xff2266, 0x00ccff, 0xffdd00, 0x00ff99, 0xff6600][Phaser.Math.Between(0, 4)];
        const sh = Phaser.Math.Between(6, 10);
        const sgn = this.add.rectangle(bx + bw / 2, by + 15, bw - 6, sh, 0, 0).setDepth(-3);
        sgn.setStrokeStyle(2, sc, 0.8 + Math.random() * 0.2);
        this.skylineNear.push(sgn);
        this.skylineNear.push(this.add.rectangle(bx + bw / 2, by + 15, bw - 2, sh + 4, sc, 0.08).setDepth(-3));
      }
      for (let wy = by + 22; wy < by + bh - 18; wy += 12)
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 10)
          if (Math.random() < 0.36) {
            const wc = Math.random() < 0.5 ? 0xffe082 : Math.random() < 0.6 ? 0x90caf9 : 0xffccbc;
            this.skylineNear.push(this.add.rectangle(wx, wy, 6, 8, wc, 0.44 + Math.random() * 0.56).setDepth(-3));
          }
      bx += bw + Phaser.Math.Between(4, 15);
    }

    // ── GROUND: sidewalks + road ─────────────────────────────────────────
    // Ground fill
    this.add.rectangle(W / 2, horizY + (H - horizY) / 2, W, H - horizY, 0x141414).setDepth(-3);
    // Sidewalks
    this.add.rectangle(26, horizY + (H - horizY) / 2, 52, H - horizY, 0x1e1e22).setDepth(-2);
    this.add.rectangle(W - 26, horizY + (H - horizY) / 2, 52, H - horizY, 0x1e1e22).setDepth(-2);
    // Kerb lines
    this.add.rectangle(52, horizY + (H - horizY) / 2, 3, H - horizY, 0x2e2e38).setDepth(-2);
    this.add.rectangle(W - 52, horizY + (H - horizY) / 2, 3, H - horizY, 0x2e2e38).setDepth(-2);
    // Gutters (very dark edge of road)
    this.add.rectangle(54, horizY + (H - horizY) / 2, 4, H - horizY, 0x08080e).setDepth(-2);
    this.add.rectangle(W - 54, horizY + (H - horizY) / 2, 4, H - horizY, 0x08080e).setDepth(-2);
    // Road surface
    this.add.rectangle(W / 2, horizY + (H - horizY) / 2, W - 108, H - horizY, COLORS.road).setDepth(-2);
    // Road edge white lines
    this.add.rectangle(58, horizY + (H - horizY) / 2, 2, H - horizY, 0xffffff, 0.55).setDepth(-1);
    this.add.rectangle(W - 58, horizY + (H - horizY) / 2, 2, H - horizY, 0xffffff, 0.55).setDepth(-1);

    // ── ANIMATED LANE-DIVIDER STRIPES ────────────────────────────────────
    const stripeCount = 22;
    for (let i = 0; i < stripeCount; i++) {
      const y = (i / stripeCount) * H;
      // Dividers between lane 0-1 and lane 1-2
      const left  = this.add.rectangle(135, y, 3, 22, 0xffffff, 0.45).setDepth(0);
      const right = this.add.rectangle(225, y, 3, 22, 0xffffff, 0.45).setDepth(0);
      this.roadStripes.push(left, right);
    }
  }

  private buildHud() {
    this.scoreText = this.add.text(GAME.WIDTH / 2, 28, '0', {
      fontFamily: '"Arial Black", system-ui', fontSize: '34px',
      color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);
    this.nairaText = this.add.text(GAME.WIDTH - 12, 62, '\u20A60', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffd23f', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(10);
    this.powerupHud = this.add.text(12, 28, '', {
      fontFamily: 'system-ui', fontSize: '13px', color: '#ffd23f',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(10);
    this.comboText = this.add.text(GAME.WIDTH / 2, 68, '', {
      fontFamily: '"Arial Black", system-ui', fontSize: '18px',
      color: '#fb923c', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);
  }

  private updatePowerupHud() {
    const parts: string[] = [];
    const remaining = (until: number) => Math.max(0, Math.ceil((until - this.elapsedMs) / 1000));
    if (this.shieldUntil === Number.MAX_SAFE_INTEGER) parts.push('SHIELD');
    if (this.elapsedMs < this.boostUntil) parts.push(`BOOST ${remaining(this.boostUntil)}s`);
    if (this.elapsedMs < this.magnetUntil) parts.push(`MAGNET ${remaining(this.magnetUntil)}s`);
    if (this.elapsedMs < this.jetpackUntil) parts.push(`JETPACK ${remaining(this.jetpackUntil)}s`);
    this.powerupHud.setText(parts.join('\n'));

    // Combo HUD + reset on expiry
    if (this.elapsedMs >= this.comboExpiresAt) {
      this.combo = 0;
      this.comboText.setText('');
    } else if (this.combo >= 5) {
      const mult = 1 + Math.min(Math.floor(this.combo / 5), 4);
      this.comboText.setText(`COMBO x${mult}`);
    } else {
      this.comboText.setText('');
    }
  }
}
