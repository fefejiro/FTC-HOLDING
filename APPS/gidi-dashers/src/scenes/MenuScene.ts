import Phaser from 'phaser';
import { GAME, CHARACTERS, type CharacterId } from '../config';
import { loadSave, updateSave } from '../save';
import { SFX, setMuted } from '../sfx';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const save = loadSave();
    setMuted(save.muted);
    const cx = GAME.WIDTH / 2;

    this.add.text(cx, 80, 'GIDI', {
      fontFamily: 'system-ui', fontSize: '56px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 130, 'DASHERS', {
      fontFamily: 'system-ui', fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 175, 'Dodge wahala. Stack naira.', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#9ca3af',
    }).setOrigin(0.5);

    // High score
    this.add.text(cx, 220, `High Score: ${save.highScore.toLocaleString()}`, {
      fontFamily: 'system-ui', fontSize: '16px', color: '#ffd23f',
    }).setOrigin(0.5);
    this.add.text(cx, 244, `Naira Stash: \u20A6${save.totalNaira.toLocaleString()}`, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#10b981',
    }).setOrigin(0.5);

    // Character row
    this.add.text(cx, 290, 'CREW', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    const ids: CharacterId[] = ['tunde', 'amaka', 'baba'];
    const slotW = 90;
    const startX = cx - slotW;
    ids.forEach((id, i) => {
      const x = startX + i * slotW;
      const y = 340;
      const def = CHARACTERS[id];
      const unlocked = save.unlocked.includes(id);
      const selected = save.selected === id;

      const sprite = this.add.image(x, y, 'player').setTint(def.tint).setScale(1.1);
      sprite.setAlpha(unlocked ? 1 : 0.35);

      if (selected) {
        this.add.rectangle(x, y, 50, 74, 0xffffff, 0).setStrokeStyle(2, 0xffd23f);
      }

      this.add.text(x, y + 50, def.name.split(' ')[0], {
        fontFamily: 'system-ui', fontSize: '11px', color: unlocked ? '#ffffff' : '#6b7280',
      }).setOrigin(0.5);

      if (!unlocked) {
        this.add.text(x, y + 64, `\u20A6${def.unlockCost.toLocaleString()}`, {
          fontFamily: 'system-ui', fontSize: '10px', color: '#10b981',
        }).setOrigin(0.5);
      }

      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.onPickCharacter(id));
    });

    // Play button
    const btn = this.add.rectangle(cx, 460, 200, 60, 0xffd23f).setInteractive({ useHandCursor: true });
    this.add.text(cx, 460, 'TAP TO RUN', {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0a0a0a', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerdown', () => { SFX.uiTap(); this.scene.start('Game'); });

    // Controls hint
    this.add.text(cx, 540, 'Swipe \u2190 \u2192 to switch lane', {
      fontFamily: 'system-ui', fontSize: '12px', color: '#9ca3af',
    }).setOrigin(0.5);
    this.add.text(cx, 558, 'Swipe \u2191 jump  \u2022  Swipe \u2193 slide', {
      fontFamily: 'system-ui', fontSize: '12px', color: '#9ca3af',
    }).setOrigin(0.5);

    // How to play button
    const helpBtn = this.add.text(cx, 580, 'HOW TO PLAY \u2192', {
      fontFamily: 'system-ui', fontSize: '12px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    helpBtn.on('pointerdown', () => { SFX.uiTap(); this.showRules(); });

    // Mute toggle (top-right)
    const muteBtn = this.add.text(GAME.WIDTH - 16, 24, save.muted ? '🔇' : '🔊', {
      fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      const cur = loadSave();
      const next = !cur.muted;
      updateSave({ muted: next });
      setMuted(next);
      muteBtn.setText(next ? '🔇' : '🔊');
      if (!next) SFX.uiTap();
    });

    this.add.text(cx, 610, 'FTC Holding \u00B7 v0.1.0', {
      fontFamily: 'system-ui', fontSize: '10px', color: '#4b5563',
    }).setOrigin(0.5);
  }

  private onPickCharacter(id: CharacterId) {
    const save = loadSave();
    if (save.unlocked.includes(id)) {
      updateSave({ selected: id });
      this.scene.restart();
      return;
    }
    const def = CHARACTERS[id];
    if (save.totalNaira >= def.unlockCost) {
      updateSave({
        totalNaira: save.totalNaira - def.unlockCost,
        unlocked: [...save.unlocked, id],
        selected: id,
      });
      this.scene.restart();
    } else {
      // flash insufficient feedback
      const t = this.add.text(GAME.WIDTH / 2, 410, 'Need more naira!', {
        fontFamily: 'system-ui', fontSize: '12px', color: '#ef4444',
      }).setOrigin(0.5);
      this.time.delayedCall(900, () => t.destroy());
    }
  }

  private showRules() {
    const cx = GAME.WIDTH / 2;
    const overlay = this.add.rectangle(cx, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.92).setDepth(50).setInteractive();
    const items = [
      { text: 'M  Molue  (big yellow bus)',  color: '#f4c20d', rule: 'Switch lane' },
      { text: 'D  Danfo  (small yellow bus)', color: '#fb923c', rule: 'Switch lane' },
      { text: 'O  Okada (gray bike)',         color: '#9ca3af', rule: 'Jump or switch' },
      { text: '\u26A0 Pothole (black on road)', color: '#facc15', rule: 'JUMP over' },
      { text: 'L  LASTMA (green officer)',    color: '#16a34a', rule: 'SLIDE under' },
      { text: '\u20A6 Naira coin (gold)',     color: '#facc15', rule: 'Pick up' },
      { text: '\u2728 Powerup (colored circle)', color: '#3b82f6', rule: 'Pick up' },
    ];
    const title = this.add.text(cx, 60, 'HOW TO PLAY', {
      fontFamily: 'system-ui', fontSize: '22px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);
    const sub = this.add.text(cx, 90, 'Each obstacle has its own escape', {
      fontFamily: 'system-ui', fontSize: '12px', color: '#9ca3af',
    }).setOrigin(0.5).setDepth(51);
    const lines: Phaser.GameObjects.Text[] = [title, sub];
    items.forEach((it, i) => {
      const y = 130 + i * 56;
      const t1 = this.add.text(20, y, it.text, {
        fontFamily: 'system-ui', fontSize: '14px', color: it.color, fontStyle: 'bold',
      }).setDepth(51);
      const t2 = this.add.text(20, y + 20, '\u2192 ' + it.rule, {
        fontFamily: 'system-ui', fontSize: '12px', color: '#ffffff',
      }).setDepth(51);
      lines.push(t1, t2);
    });
    const close = this.add.text(cx, GAME.HEIGHT - 40, 'TAP ANYWHERE TO CLOSE', {
      fontFamily: 'system-ui', fontSize: '12px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);
    overlay.on('pointerdown', () => {
      overlay.destroy();
      lines.forEach(l => l.destroy());
      close.destroy();
    });
  }
}
