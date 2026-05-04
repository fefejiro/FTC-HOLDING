import Phaser from 'phaser';
import { GAME, COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'GIDI DASHERS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffd23f',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.time.delayedCall(300, () => this.scene.start('Preload'));
  }
}
