  private spawnCoinBurst(x: number, y: number) {
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
        g.fillStyle(0xff8c00, 0.85); g.fillCircle(-8, 2, 5);
        g.fillStyle(0x22bb44, 0.85); g.fillCircle(5, 3, 4);
        g.fillStyle(0xffcc00, 0.85); g.fillCircle(-1, 4, 3);
        g.fillStyle(0xff5555, 0.7);  g.fillCircle(12, 2, 3);
        break;
      }
      default: // Dustbin / debris
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

  private bindInput() {
    this.input.keyboard?.on('keydown-LEFT', () => this.switchLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.switchLane(1));
    this.input.keyboard?.on('keydown-UP', () => this.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.slide());
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());
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
      if (Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX && dt < 250) { this.jump(); return; }
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
    this.player.scaleY = 0.55;
    SFX.slide();
  }

  private drawRoad() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const horizY = Math.floor(H * 0.44);
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
    for (let i = 0; i < 55; i++) {
      const r = Math.random() < 0.75 ? 0.7 : 1.4;
      const star = this.add.circle(Math.random() * W, Math.random() * horizY * 0.85, r,
        0xffffff, 0.25 + Math.random() * 0.75).setDepth(-9);
      if (Math.random() < 0.28)
        this.tweens.add({ targets: star, alpha: 0.05, duration: 400 + Math.random() * 1600,
          yoyo: true, repeat: -1, delay: Math.random() * 1400 });
    }
    this.add.circle(W * 0.84, H * 0.07, 22, 0xfff8e0, 0.85).setDepth(-8);
    this.add.circle(W * 0.84, H * 0.07, 17, 0xfffef0, 1).setDepth(-8);
    this.add.circle(W * 0.84 + 5, H * 0.07 - 4, 3.5, 0xe0d8b8, 0.6).setDepth(-8);
    const g = this.add.graphics().setDepth(-7);
    let bx = 0;
    while (bx < W + 50) {
      const bw = Phaser.Math.Between(20, 48), bh = Phaser.Math.Between(45, 140);
      const by = horizY - bh;
      g.fillStyle(0x050c1c, 1); g.fillRect(bx, by, bw, bh + H);
      for (let wy = by + 8; wy < by + bh - 10; wy += 11)
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 9)
          if (Math.random() < 0.35) {
            g.fillStyle(Math.random() < 0.6 ? 0xffe082 : 0x90caf9, 0.42 + Math.random() * 0.58);
            g.fillRect(wx, wy, 5, 7);
          }
      if (Math.random() < 0.25 && bw > 26) {
        const sc = [0xff0055, 0x00ccff, 0xffdd00, 0x00ff88][Phaser.Math.Between(0, 3)];
        g.lineStyle(2, sc, 0.7 + Math.random() * 0.3); g.strokeRect(bx + 2, by + 8, bw - 4, 7);
      }
      bx += bw + Phaser.Math.Between(2, 8);
    }
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
            const wc = Math.random() < 0.55 ? 0xffe082 : 0x90caf9;
            this.skylineFar.push(this.add.rectangle(wx + 2, wy + 3, 5, 7, wc, 0.42 + Math.random() * 0.58).setDepth(-5));
          }
      bx += bw + Phaser.Math.Between(3, 12);
    }
    bx = -10;
    while (bx < W + 80) {
      const bw = Phaser.Math.Between(30, 65), bh = Phaser.Math.Between(55, 140);
      const by = horizY - bh + 18;
      const building = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x0a1020).setDepth(-4);
      this.skylineNear.push(building);
      if (Math.random() < 0.4 && bw > 34) {
        const sc = [0xff0055, 0x00ccff, 0xffdd00, 0x00ff88, 0xff8800][Phaser.Math.Between(0, 4)];
        const sh = Phaser.Math.Between(8, 13);
        const sgn = this.add.rectangle(bx + bw / 2, by + 14, bw - 10, sh, 0, 0).setDepth(-3);
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
    this.add.rectangle(W / 2, horizY + (H - horizY) / 2, W, H - horizY, 0x141414).setDepth(-3);
    this.add.rectangle(26, horizY + (H - horizY) / 2, 52, H - horizY, 0x1e1e22).setDepth(-2);
    this.add.rectangle(W - 26, horizY + (H - horizY) / 2, 52, H - horizY, 0x1e1e22).setDepth(-2);
    this.add.rectangle(52, horizY + (H - horizY) / 2, 3, H - horizY, 0x2e2e38).setDepth(-2);
    this.add.rectangle(W - 52, horizY + (H - horizY) / 2, 3, H - horizY, 0x2e2e38).setDepth(-2);
    this.add.rectangle(54, horizY + (H - horizY) / 2, 4, H - horizY, 0x08080e).setDepth(-2);
    this.add.rectangle(W - 54, horizY + (H - horizY) / 2, 4, H - horizY, 0x08080e).setDepth(-2);
    this.add.rectangle(W / 2, horizY + (H - horizY) / 2, W - 108, H - horizY, COLORS.road).setDepth(-2);
    this.add.rectangle(58, horizY + (H - horizY) / 2, 2, H - horizY, 0xffffff, 0.55).setDepth(-1);
    this.add.rectangle(W - 58, horizY + (H - horizY) / 2, 2, H - horizY, 0xffffff, 0.55).setDepth(-1);
    const stripeCount = 22;
    for (let i = 0; i < stripeCount; i++) {
      const y = (i / stripeCount) * H;
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