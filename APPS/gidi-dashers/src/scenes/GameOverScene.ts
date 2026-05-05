import Phaser from 'phaser';
import { GAME } from '../config';
import { loadSave, updateSave } from '../save';
import { submitScore } from '../leaderboard';

interface RunResult {
  score: number;
  naira: number;
  durationMs: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: RunResult) {
    const cx = GAME.WIDTH / 2;
    const save = loadSave();
    const isHigh = data.score > save.highScore;

    const updated = updateSave({
      highScore: Math.max(save.highScore, data.score),
      totalNaira: save.totalNaira + data.naira,
    });

    // Fire-and-forget leaderboard submit
    void submitScore({
      device_id: updated.deviceId,
      player_name: updated.playerName || 'Anonymous',
      score: data.score,
      naira: data.naira,
      character: updated.selected,
      duration_ms: data.durationMs,
    });

    this.add.text(cx, 100, isHigh ? 'NEW HIGH SCORE!' : 'WAHALA!', {
      fontFamily: 'system-ui', fontSize: '28px', color: isHigh ? '#ffd23f' : '#ef4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 180, 'Score', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#9ca3af',
    }).setOrigin(0.5);
    this.add.text(cx, 210, data.score.toLocaleString(), {
      fontFamily: 'system-ui', fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 270, `Naira this run: \u20A6${data.naira.toLocaleString()}`, {
      fontFamily: 'system-ui', fontSize: '14px', color: '#10b981',
    }).setOrigin(0.5);
    this.add.text(cx, 294, `Best: ${updated.highScore.toLocaleString()}  \u00B7  Stash: \u20A6${updated.totalNaira.toLocaleString()}`, {
      fontFamily: 'system-ui', fontSize: '12px', color: '#9ca3af',
    }).setOrigin(0.5);

    const playAgain = this.add.rectangle(cx, 400, 220, 60, 0xffd23f).setInteractive({ useHandCursor: true });
    this.add.text(cx, 400, 'RUN AGAIN', {
      fontFamily: 'system-ui', fontSize: '20px', color: '#0a0a0a', fontStyle: 'bold',
    }).setOrigin(0.5);
    playAgain.on('pointerdown', () => this.scene.start('Game'));

    const menu = this.add.rectangle(cx, 480, 220, 50, 0x1f1f24).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
    this.add.text(cx, 480, 'MENU', {
      fontFamily: 'system-ui', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5);
    menu.on('pointerdown', () => this.scene.start('Menu'));
  }
}
