import Phaser from 'phaser';
import { GAME, COLORS } from '../config';

/**
 * PreloadScene generates placeholder textures procedurally.
 * Replace with real sprite sheets in the art polish pass (Phase 2).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    this.load.on('progress', (p: number) => {
      // could draw a bar; keep simple for now
      void p;
    });
    // No external assets in v0.1 — everything is generated below.
  }

  create() {
    this.makePlayer();
    // Obstacles — each has unique letter + window/wheel detail so user can read them at a glance
    this.makeBus('molue',  90, 110, COLORS.molue,  'M');
    this.makeBus('danfo',  72, 80,  COLORS.danfo,  'D');
    this.makeBike('okada', 44, 56,  COLORS.okada);
    this.makePothole('pothole', 80, 24, COLORS.pothole);
    this.makeLastma('lastma', 60, 90, COLORS.lastma);
    // Pickups — gold coin family for naira; distinct icons for powerups
    this.makeCoin('naira',     16, COLORS.naira);
    this.makeCoin('naira-500', 18, COLORS.nairaBig);
    this.makeCoin('naira-1000',20, COLORS.nairaMega);
    import Phaser from 'phaser';
    import { COLORS } from '../config';

    export class PreloadScene extends Phaser.Scene {
      constructor() { super('Preload'); }
      preload() {}

      create() {
        this.makePlayerFrames();
        this.makeDanfo();
        this.makeMolue();
        this.makeOkada();
        this.makePothole();
        this.makeLastma();
        this.makeCoin('naira',      15, COLORS.naira);
        this.makeCoin('naira-500',  18, COLORS.nairaBig);
        this.makeCoin('naira-1000', 21, COLORS.nairaMega);
        this.makeShield();
        this.makeMagnet();
        this.makeBoost();
        this.makeJetpack();
        this.scene.start('Menu');
      }

      // ─── PLAYER ──────────────────────────────────────────────────────────────
      private makePlayerFrames() {
        const W = 40, H = 72;
        const SK = 0xc68642, JR = 0xffd23f, SH = 0x1e3a5f, SO = 0xffffff, SN = 0x1a1a2e;
        const strides = [
          { lA: -12, rA: 12,  lL: 10,  rL: -10 },
          { lA: -3,  rA: 3,   lL: 2,   rL: -2  },
          { lA: 12,  rA: -12, lL: -10, rL: 10  },
          { lA: 3,   rA: -3,  lL: -2,  rL: 2   },
        ];
        for (let i = 0; i < 4; i++) {
          const s = strides[i];
          const g = this.add.graphics();
          this.drawRunner(g, W, H, SK, JR, SH, SO, SN, s.lA, s.rA, s.lL, s.rL, false);
          g.generateTexture(`player-run${i}`, W, H);
          g.destroy();
        }
        // Jump frame
        { const g = this.add.graphics();
          this.drawRunner(g, W, H, SK, JR, SH, SO, SN, -20, -20, 18, 18, true);
          g.generateTexture('player-jump', W, H); g.destroy(); }
        // Alias 'player' → run0 (legacy key used in menu preview)
        { const g = this.add.graphics();
          this.drawRunner(g, W, H, SK, JR, SH, SO, SN, -3, 3, 2, -2, false);
          g.generateTexture('player', W, H); g.destroy(); }
      }

      private drawRunner(
        g: Phaser.GameObjects.Graphics,
        _W: number, _H: number,
        SK: number, JR: number, SH: number, SO: number, SN: number,
        lA: number, rA: number, lL: number, rL: number,
        jump: boolean,
      ) {
        const cy = jump ? 2 : 0;
        // Shadow
        g.fillStyle(0x000000, 0.15); g.fillEllipse(20, 71, 22, 6);
        // Head
        g.fillStyle(SK, 1); g.fillCircle(20, cy + 10, 9);
        // Afro
        g.fillStyle(0x120800, 1); g.fillCircle(20, cy + 4, 8.5);
        // Ear
        g.fillStyle(SK, 1); g.fillRect(11, cy + 9, 3, 5);
        // Eyes
        g.fillStyle(0xffffff, 1); g.fillCircle(16.5, cy + 10, 2.5); g.fillCircle(23.5, cy + 10, 2.5);
        g.fillStyle(0x110800, 1); g.fillCircle(17, cy + 10, 1.4); g.fillCircle(24, cy + 10, 1.4);
        // Neck
        g.fillStyle(SK, 1); g.fillRect(17, cy + 18, 6, 5);
        // Jersey
        g.fillStyle(JR, 1); g.fillRoundedRect(10, cy + 22, 20, 20, 3);
        g.lineStyle(1.5, 0x000000, 0.25); g.strokeRoundedRect(10, cy + 22, 20, 20, 3);
        g.fillStyle(0x000000, 0.15); g.fillRect(10, cy + 30, 20, 3);
        g.fillStyle(0x000000, 0.55); g.fillTriangle(17, cy + 22, 23, cy + 22, 20, cy + 27);
        // Arms
        g.fillStyle(SK, 1);
        const lAcl = lA > 0 ? 0 : Math.abs(lA) * 0.25;
        const rAcl = rA > 0 ? 0 : Math.abs(rA) * 0.25;
        g.fillRoundedRect(5, cy + 24 + lAcl, 5, 14, 2); g.fillCircle(7, cy + 38 + lA * 0.5, 3);
        g.fillRoundedRect(30, cy + 24 + rAcl, 5, 14, 2); g.fillCircle(32, cy + 38 + rA * 0.5, 3);
        // Shorts
        g.fillStyle(SH, 1); g.fillRoundedRect(10, cy + 40, 20, 12, 3);
        g.lineStyle(1, 0xffd23f, 0.5); g.strokeLine(10, cy + 43, 10, cy + 52); g.strokeLine(30, cy + 43, 30, cy + 52);
        if (jump) {
          // Tucked legs
          g.fillStyle(SK, 1);
          g.fillRoundedRect(7, cy + 50, 8, 14, 2); g.fillRoundedRect(25, cy + 50, 8, 14, 2);
          g.fillRoundedRect(6, cy + 60, 10, 7, 2);  g.fillRoundedRect(24, cy + 60, 10, 7, 2);
          g.fillStyle(SO, 1); g.fillRect(6, cy + 65, 10, 4); g.fillRect(24, cy + 65, 10, 4);
          g.fillStyle(SN, 1); g.fillRoundedRect(4, cy + 68, 13, 5, 2); g.fillRoundedRect(23, cy + 68, 13, 5, 2);
        } else {
          // Stride legs
          g.fillStyle(SK, 1);
          g.fillRect(12 + lL * 0.25, cy + 51, 7, 10); g.fillRect(21 - rL * 0.25, cy + 51, 7, 10);
          g.fillRect(11 + lL * 0.2,  cy + 60, 7,  8); g.fillRect(21 - rL * 0.2,  cy + 60, 7,  8);
          g.fillStyle(SO, 1);
          g.fillRect(10 + lL * 0.2, cy + 66, 8, 4); g.fillRect(20 - rL * 0.2, cy + 66, 8, 4);
          g.fillStyle(SN, 1);
          g.fillRoundedRect(8 + lL * 0.2, cy + 69, 12, 5, 2); g.fillRoundedRect(18 - rL * 0.2, cy + 69, 12, 5, 2);
          g.lineStyle(1, 0xffffff, 0.35);
          g.strokeLine(10 + lL * 0.2, cy + 70, 18 + lL * 0.2, cy + 71);
          g.strokeLine(20 - rL * 0.2, cy + 70, 28 - rL * 0.2, cy + 71);
        }
      }

      // ─── DANFO ───────────────────────────────────────────────────────────────
      private makeDanfo() {
        const W = 96, H = 80;
        const g = this.add.graphics();
        // Drop shadow
        g.fillStyle(0x000000, 0.22); g.fillRoundedRect(3, 3, W - 1, H - 1, 8);
        // Main body – iconic Lagos yellow
        g.fillStyle(0xffcc00, 1); g.fillRoundedRect(0, 0, W, H - 16, 8);
        // Roof rack
        g.fillStyle(0xcc9900, 1); g.fillRect(8, 0, W - 16, 6);
        g.lineStyle(1, 0xaa7700, 0.7);
        for (let rx = 12; rx < W - 14; rx += 8) g.strokeLine(rx, 0, rx, 6);
        // Classic Lagos danfo black diagonal stripe
        g.fillStyle(0x111111, 1); g.fillRect(0, 18, W, 7);
        // 4 windows
        for (let i = 0; i < 4; i++) {
          const wx = 6 + i * 22, wy = 7, ww = 16, wh = 10;
          g.fillStyle(0x997700, 1); g.fillRoundedRect(wx - 1, wy - 1, ww + 2, wh + 2, 2);
          g.fillStyle(0x1a2744, 1); g.fillRoundedRect(wx, wy, ww, wh, 2);
          if (i % 2 === 0) { g.fillStyle(0x060a12, 0.8); g.fillCircle(wx + ww / 2, wy + 4, 3); }
          g.fillStyle(0xffffff, 0.07); g.fillRect(wx, wy, 4, wh);
        }
        // Body below stripe
        g.fillStyle(0xffcc00, 1); g.fillRoundedRect(0, 26, W, H - 42, 0);
        // Side door line
        g.lineStyle(1.5, 0xcc9900, 0.8); g.strokeLine(W * 0.55, 27, W * 0.55, H - 16);
        // Front face
        g.fillStyle(0xe6b800, 1); g.fillRoundedRect(2, H - 18, W - 4, 18, { bl: 8, br: 8, tl: 0, tr: 0 });
        // Windshield
        g.fillStyle(0x1a2744, 1); g.fillRoundedRect(10, H - 16, W - 20, 10, 2);
        g.fillStyle(0xffffff, 0.06); g.fillRect(10, H - 16, 10, 10);
        // Route sign
        g.fillStyle(0x111111, 1); g.fillRect(28, H - 20, W - 56, 5);
        g.fillStyle(0xffee00, 1); g.fillRect(30, H - 20, 6, 5); g.fillRect(38, H - 20, 6, 5); g.fillRect(46, H - 20, 6, 5);
        // Headlights
        g.fillStyle(0xfffde7, 1); g.fillCircle(12, H - 6, 5); g.fillCircle(W - 12, H - 6, 5);
        g.fillStyle(0xffeb3b, 0.7); g.fillCircle(12, H - 6, 3); g.fillCircle(W - 12, H - 6, 3);
        // Grille
        g.fillStyle(0x222222, 1); g.fillRoundedRect(26, H - 11, W - 52, 8, 2);
        g.lineStyle(1, 0x444444, 1);
        for (let gr = 29; gr < W - 26; gr += 6) g.strokeLine(gr, H - 11, gr, H - 3);
        // Wheels
        for (const wx of [12, W - 12]) {
          g.fillStyle(0x111111, 1); g.fillCircle(wx, H - 2, 8);
          g.fillStyle(0x444444, 1); g.fillCircle(wx, H - 2, 5);
          g.fillStyle(0x999999, 1); g.fillCircle(wx, H - 2, 2);
          g.fillStyle(0x666666, 1);
          g.fillCircle(wx + 4, H - 2, 1); g.fillCircle(wx - 4, H - 2, 1);
          g.fillCircle(wx, H - 2 + 4, 1); g.fillCircle(wx, H - 2 - 4, 1);
        }
        // DANFO label dots on side
        g.fillStyle(0x111111, 0.5); g.fillRect(4, 28, 18, 7);
        g.fillStyle(0xffee00, 1);
        g.fillRect(6, 30, 2, 3); g.fillRect(9, 30, 2, 3); g.fillRect(12, 30, 2, 3); g.fillRect(15, 30, 2, 3);
        g.generateTexture('danfo', W, H); g.destroy();
      }

      // ─── MOLUE ───────────────────────────────────────────────────────────────
      private makeMolue() {
        const W = 124, H = 88;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.2); g.fillRoundedRect(3, 3, W - 1, H - 1, 6);
        // Body – older Lagos yellow-green
        g.fillStyle(0xc8b400, 1); g.fillRoundedRect(0, 0, W, H - 18, 6);
        // Top green stripe
        g.fillStyle(0x2d6a1e, 1); g.fillRoundedRect(0, 0, W, 5, { tl: 6, tr: 6, bl: 0, br: 0 });
        // Black stripe
        g.fillStyle(0x0a0a0a, 1); g.fillRect(0, 20, W, 6);
        // Rust patches
        g.fillStyle(0x8b4513, 0.4);
        g.fillRoundedRect(6, 30, 12, 8, 2); g.fillRoundedRect(W - 22, 38, 14, 6, 2); g.fillRoundedRect(50, 48, 10, 5, 2);
        // 5 windows
        for (let i = 0; i < 5; i++) {
          const wx = 5 + i * 23, wy = 7, ww = 18, wh = 11;
          g.fillStyle(0x6a6000, 1); g.fillRoundedRect(wx - 1, wy - 1, ww + 2, wh + 2, 2);
          g.fillStyle(0x16213e, 1); g.fillRoundedRect(wx, wy, ww, wh, 2);
          g.fillStyle(0x060a12, 0.8); g.fillCircle(wx + 6, wy + 4.5, 2.8);
          if (ww > 14) g.fillCircle(wx + 13, wy + 4.5, 2.8);
          g.fillStyle(0xffffff, 0.06); g.fillRect(wx, wy, 4, wh);
        }
        // Body below stripe
        g.fillStyle(0xc8b400, 1); g.fillRoundedRect(0, 27, W, H - 45, 0);
        // Route banner
        g.fillStyle(0x1a1a00, 0.6); g.fillRect(4, 29, 32, 8);
        g.fillStyle(0xffee00, 0.8);
        g.fillRect(6, 31, 4, 4); g.fillRect(12, 31, 4, 4); g.fillRect(18, 31, 4, 4); g.fillRect(24, 31, 4, 4);
        // Front face
        g.fillStyle(0xb8a200, 1); g.fillRoundedRect(2, H - 20, W - 4, 20, { bl: 6, br: 6, tl: 0, tr: 0 });
        g.fillStyle(0x16213e, 1); g.fillRoundedRect(12, H - 18, W - 24, 11, 2);
        g.fillStyle(0xffffff, 0.06); g.fillRect(12, H - 18, 12, 11);
        // Headlights
        g.fillStyle(0xfffde7, 1); g.fillCircle(14, H - 6, 5); g.fillCircle(W - 14, H - 6, 5);
        g.fillStyle(0xffeb3b, 0.7); g.fillCircle(14, H - 6, 3); g.fillCircle(W - 14, H - 6, 3);
        // Grille
        g.fillStyle(0x222222, 1); g.fillRoundedRect(30, H - 11, W - 60, 8, 2);
        g.lineStyle(1, 0x444444, 1);
        for (let gr = 33; gr < W - 30; gr += 6) g.strokeLine(gr, H - 11, gr, H - 3);
        // Wheels (3)
        for (const wx of [14, Math.floor(W / 2), W - 14]) {
          g.fillStyle(0x111111, 1); g.fillCircle(wx, H - 2, 9);
          g.fillStyle(0x3d3d3d, 1); g.fillCircle(wx, H - 2, 6);
          g.fillStyle(0x888888, 1); g.fillCircle(wx, H - 2, 2.5);
        }
        // Exhaust
        g.fillStyle(0x444444, 1); g.fillRect(W - 8, H - 23, 6, 4);
        g.fillStyle(0x222222, 0.35); g.fillCircle(W - 2, H - 21, 7);
        g.generateTexture('molue', W, H); g.destroy();
      }

      // ─── OKADA ───────────────────────────────────────────────────────────────
      private makeOkada() {
        const W = 60, H = 64;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 64, 44, 10);
        // Frame tubes
        g.lineStyle(4, 0x777777, 1);
        g.strokeLine(12, 47, 30, 28); g.strokeLine(48, 47, 30, 28);
        g.strokeLine(12, 47, 48, 47);
        g.lineStyle(3, 0x666666, 1);
        g.strokeLine(30, 28, 16, 28); g.strokeLine(30, 28, 44, 28);
        // Engine
        g.fillStyle(0x555555, 1); g.fillRoundedRect(22, 32, 16, 13, 3);
        g.fillStyle(0x444444, 1); g.fillRoundedRect(24, 34, 12, 9, 2);
        g.fillStyle(0x888888, 1); g.fillCircle(30, 40, 3);
        // Handlebars
        g.lineStyle(4, 0x444444, 1); g.strokeLine(20, 22, 40, 22);
        g.lineStyle(3, 0x666666, 1); g.strokeLine(20, 22, 16, 27); g.strokeLine(40, 22, 44, 27);
        // Seat
        g.fillStyle(0x222222, 1); g.fillRoundedRect(20, 26, 20, 6, 3);
        // Front & rear forks
        g.lineStyle(3, 0x666666, 1); g.strokeLine(40, 22, 46, 40); g.strokeLine(16, 28, 12, 40);
        // Wheels
        for (const [cx, cy, r] of ([[12, 52, 11], [48, 52, 11]] as number[][])) {
          g.fillStyle(0x111111, 1); g.fillCircle(cx, cy, r);
          g.lineStyle(2, 0x555555, 1); g.strokeCircle(cx, cy, r - 2);
          g.fillStyle(0x666666, 1); g.fillCircle(cx, cy, 4);
          g.fillStyle(0x999999, 1); g.fillCircle(cx, cy, 2);
          g.lineStyle(1, 0x555555, 0.7);
          for (let a = 0; a < Math.PI; a += Math.PI / 4)
            g.strokeLine(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), cx - Math.cos(a) * (r - 2), cy - Math.sin(a) * (r - 2));
        }
        // Rider helmet (Lagos yellow)
        g.fillStyle(0xffd23f, 1); g.fillCircle(30, 15, 10);
        g.fillStyle(0xcc9900, 1); g.fillRoundedRect(20, 18, 20, 4, 2); // brim
        g.fillStyle(0x111111, 0.7); g.fillRect(22, 17, 16, 8); // visor
        g.fillStyle(0x2233aa, 0.5); g.fillRect(23, 18, 14, 6);
        // Rider body
        g.fillStyle(0xc68642, 1); g.fillRoundedRect(24, 24, 12, 4, 2);
        // Exhaust
        g.fillStyle(0x555555, 1); g.fillRect(4, 44, 10, 3);
        g.fillStyle(0x333333, 0.25); g.fillCircle(2, 45, 6);
        g.generateTexture('okada', W, H); g.destroy();
      }

      // ─── POTHOLE ─────────────────────────────────────────────────────────────
      private makePothole() {
        const W = 80, H = 30;
        const g = this.add.graphics();
        g.fillStyle(0x1a1a1a, 1); g.fillEllipse(W / 2, H / 2, W, H);
        g.fillStyle(0x050505, 1); g.fillEllipse(W / 2, H / 2 + 2, W * 0.8, H * 0.65);
        // Cracks
        g.lineStyle(2, 0x333333, 1);
        g.strokeLine(W/2 - 8, H/2 - 5, W/2 - 20, H/2 - 2);
        g.strokeLine(W/2 + 10, H/2 - 6, W/2 + 22, H/2 - 1);
        g.strokeLine(W/2 - 4, H/2 + 4, W/2 - 14, H/2 + 10);
        g.strokeLine(W/2 + 8, H/2 + 4, W/2 + 17, H/2 + 8);
        g.lineStyle(1, 0x555555, 0.6);
        g.strokeLine(W/2, H/2 - 7, W/2 + 6, H/2 - 13);
        g.strokeLine(W/2 - 15, H/2, W/2 - 28, H/2 - 4);
        g.lineStyle(1.5, 0xfacc15, 0.3); g.strokeEllipse(W/2, H/2, W * 0.93, H * 0.93);
        // Rubble
        g.fillStyle(0x3d3d3d, 0.6);
        g.fillCircle(W/2 - 5, H/2 + 2, 2.5); g.fillCircle(W/2 + 7, H/2 - 1, 2); g.fillCircle(W/2, H/2 + 4, 1.5);
        g.generateTexture('pothole', W, H); g.destroy();
      }

      // ─── LASTMA ──────────────────────────────────────────────────────────────
      private makeLastma() {
        const W = 52, H = 90;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.18); g.fillEllipse(26, 88, 32, 8);
        // Dark trouser legs
        g.fillStyle(0x1a3a1a, 1); g.fillRect(14, 62, 9, 26); g.fillRect(25, 62, 9, 26);
        g.fillStyle(0x111111, 1); g.fillRoundedRect(12, 84, 12, 6, 2); g.fillRoundedRect(24, 84, 12, 6, 2);
        // Green uniform body
        g.fillStyle(0x16a34a, 1); g.fillRoundedRect(10, 34, 32, 30, 4);
        g.lineStyle(1.5, 0x0d7a35, 0.8); g.strokeRoundedRect(10, 34, 32, 30, 4);
        // Reflective vest stripe
        g.fillStyle(0xffffff, 0.95); g.fillRect(10, 49, 32, 5);
        g.fillStyle(0xffd23f, 0.7);  g.fillRect(10, 50, 32, 3);
        // Epaulettes
        g.fillStyle(0x0d7a35, 1); g.fillRect(10, 34, 6, 6); g.fillRect(36, 34, 6, 6);
        g.fillStyle(0xffd23f, 1); g.fillRect(11, 35, 4, 4); g.fillRect(37, 35, 4, 4);
        // Chest badge
        g.fillStyle(0xffffff, 0.8); g.fillRect(14, 38, 10, 7);
        g.fillStyle(0x000000, 0.7); g.fillRect(15, 39, 8, 5);
        // Neck + head
        g.fillStyle(0xb07840, 1); g.fillRect(22, 27, 8, 8);
        g.fillStyle(0xb07840, 1); g.fillCircle(26, 21, 11);
        // White cap with green badge
        g.fillStyle(0xffffff, 1); g.fillRoundedRect(15, 9, 22, 13, { tl: 5, tr: 5, bl: 0, br: 0 });
        g.fillStyle(0xeeeeee, 1); g.fillRect(12, 17, 28, 5);
        g.fillStyle(0x16a34a, 1); g.fillRect(21, 11, 10, 6);
        g.fillStyle(0xffd23f, 1); g.fillRect(22, 12, 8, 4);
        // Face – stern
        g.fillStyle(0xffffff, 1); g.fillCircle(21, 21, 2.5); g.fillCircle(31, 21, 2.5);
        g.fillStyle(0x000000, 1); g.fillCircle(21.5, 21, 1.3); g.fillCircle(31.5, 21, 1.3);
        g.lineStyle(1.5, 0x5a3a1a, 1); g.strokeLine(21, 26, 31, 26);
        // Right arm raised (STOP)
        g.fillStyle(0x16a34a, 1); g.fillRoundedRect(38, 30, 8, 18, 3);
        g.fillStyle(0xb07840, 1); g.fillRoundedRect(38, 46, 8, 12, 3); g.fillCircle(42, 58, 5);
        g.fillStyle(0xd4a070, 1); g.fillCircle(42, 58, 4);
        // Left arm down
        g.fillStyle(0x16a34a, 1); g.fillRoundedRect(6, 36, 7, 18, 3);
        g.fillStyle(0xb07840, 1); g.fillRoundedRect(6, 52, 7, 10, 3);
        // Whistle
        g.lineStyle(1, 0xffd23f, 1); g.strokeLine(22, 38, 14, 50);
        g.fillStyle(0xffd23f, 1); g.fillCircle(14, 51, 3);
        g.generateTexture('lastma', W, H); g.destroy();
      }

      // ─── COINS ───────────────────────────────────────────────────────────────
      private makeCoin(key: string, r: number, color: number) {
        const sz = r * 2 + 8;
        const cx = sz / 2, cy = sz / 2;
        const g = this.add.graphics();
        g.fillStyle(color, 0.22); g.fillCircle(cx, cy, r + 4);
        g.fillStyle(0x5a3a00, 1);  g.fillCircle(cx, cy, r + 1);
        g.fillStyle(color, 1);     g.fillCircle(cx, cy, r);
        g.lineStyle(1.5, 0x5a3a00, 0.6); g.strokeCircle(cx, cy, r - 3);
        g.fillStyle(0xffffff, 0.32); g.fillRect(cx - r * 0.35, cy - r * 0.65, r * 0.45, r * 0.32);
        // ₦ symbol: N shape with horizontal bars
        g.lineStyle(2, 0x3d2600, 1);
        g.strokeLine(cx - 3, cy - 4, cx - 3, cy + 4);
        g.strokeLine(cx + 3, cy - 4, cx + 3, cy + 4);
        g.strokeLine(cx - 3, cy - 2, cx + 3, cy + 2);
        g.lineStyle(1.5, 0x3d2600, 1);
        g.strokeLine(cx - 3.5, cy - 1.5, cx + 3.5, cy - 1.5);
        g.strokeLine(cx - 3.5, cy + 1.5, cx + 3.5, cy + 1.5);
        g.generateTexture(key, sz, sz); g.destroy();
      }

      // ─── POWERUP ICONS ───────────────────────────────────────────────────────
      private makeShield() {
        const sz = 44, g = this.add.graphics(), cx = 22, cy = 22;
        g.fillStyle(0x3b82f6, 0.2); g.fillCircle(cx, cy, 21);
        g.fillStyle(0x3b82f6, 1);
        g.fillRoundedRect(cx - 13, cy - 14, 26, 6, { tl: 7, tr: 7, bl: 0, br: 0 });
        g.fillRect(cx - 13, cy - 8, 26, 14);
        g.fillTriangle(cx, cy + 16, cx - 13, cy + 6, cx + 13, cy + 6);
        g.fillStyle(0xffffff, 0.22); g.fillRect(cx - 9, cy - 12, 8, 10);
        g.lineStyle(2.5, 0xffffff, 0.85);
        g.strokeLine(cx, cy + 9, cx, cy - 5); g.strokeLine(cx - 6, cy + 2, cx + 6, cy + 2);
        g.generateTexture('shield-icon', sz, sz); g.destroy();
      }

      private makeMagnet() {
        const sz = 44, g = this.add.graphics(), cx = 22, cy = 22;
        g.fillStyle(0xeab308, 0.2); g.fillCircle(cx, cy, 21);
        g.lineStyle(9, 0xeab308, 1);
        g.strokeArc(cx, cy - 2, 10, Math.PI, 0, false);
        g.lineStyle(9, 0xeab308, 1);
        g.strokeLine(cx - 10, cy - 2, cx - 10, cy + 12);
        g.strokeLine(cx + 10, cy - 2, cx + 10, cy + 12);
        g.fillStyle(0xff4444, 1); g.fillRect(cx - 14, cy + 10, 8, 6);
        g.fillStyle(0x4444ff, 1); g.fillRect(cx + 6, cy + 10, 8, 6);
        g.fillStyle(0xffffff, 0.28); g.fillCircle(cx, cy - 2, 4);
        g.generateTexture('magnet-icon', sz, sz); g.destroy();
      }

      private makeBoost() {
        const sz = 44, g = this.add.graphics(), cx = 22, cy = 22;
        g.fillStyle(0xf97316, 0.2); g.fillCircle(cx, cy, 21);
        g.fillStyle(0xf97316, 1);
        g.fillPoints([
          new Phaser.Geom.Point(cx + 5, cy - 16),
          new Phaser.Geom.Point(cx - 5, cy + 1),
          new Phaser.Geom.Point(cx + 2, cy + 1),
          new Phaser.Geom.Point(cx - 5, cy + 16),
          new Phaser.Geom.Point(cx + 6, cy + 1),
          new Phaser.Geom.Point(cx + 6, cy - 16),
        ], true);
        g.fillStyle(0xffffff, 0.35); g.fillRect(cx + 3, cy - 13, 3, 9);
        g.generateTexture('boost-icon', sz, sz); g.destroy();
      }

      private makeJetpack() {
        const sz = 44, g = this.add.graphics(), cx = 22, cy = 22;
        g.fillStyle(0xef4444, 0.2); g.fillCircle(cx, cy, 21);
        g.fillStyle(0xef4444, 1); g.fillRoundedRect(cx - 5, cy - 14, 10, 24, 5);
        g.fillTriangle(cx - 5, cy - 10, cx + 5, cy - 10, cx, cy - 19);
        g.fillTriangle(cx - 5, cy + 7, cx - 12, cy + 16, cx - 5, cy + 16);
        g.fillTriangle(cx + 5, cy + 7, cx + 12, cy + 16, cx + 5, cy + 16);
        g.fillStyle(0xbfdbfe, 1); g.fillCircle(cx, cy - 4, 4);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(cx - 1, cy - 5, 1.5);
        g.fillStyle(0xff8c00, 0.9); g.fillTriangle(cx - 4, cy + 10, cx + 4, cy + 10, cx, cy + 20);
        g.fillStyle(0xffff00, 0.7); g.fillTriangle(cx - 2, cy + 10, cx + 2, cy + 10, cx, cy + 16);
        g.fillStyle(0xffffff, 0.22); g.fillRect(cx - 3, cy - 12, 4, 14);
        g.generateTexture('jetpack-icon', sz, sz); g.destroy();
      }
    }
    void COLORS;
