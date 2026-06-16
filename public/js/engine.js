class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animationMs = 900;
    this.partAnimationMs = 650;
    this.reset();
  }

  reset() {
    this.state = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2 + 30,
      direction: 0,
      color: "#2563eb",
      trail: [],
      stamps: [],
      parts: this.createParts(),
    };
    this.draw();
  }

  createParts() {
    return {
      head: { dx: 0, dy: 0, rotation: 0 },
      body: { dx: 0, dy: 0, rotation: 0 },
      leftArm: { dx: 0, dy: 0, rotation: 0 },
      rightArm: { dx: 0, dy: 0, rotation: 0 },
      leftLeg: { dx: 0, dy: 0, rotation: 0 },
      rightLeg: { dx: 0, dy: 0, rotation: 0 },
    };
  }

  async run(commands, onLog) {
    for (const command of commands) {
      await this.execute(command, onLog);
      await this.wait(120);
    }
    onLog("完了しました。", "success");
  }

  async execute(command, onLog) {
    const value = command.value;

    if (command.name === "moveForward") {
      onLog(`moveForward(${value ?? 60});`);
      await this.animateMove(value ?? 60);
      return;
    }

    if (command.name === "moveBack") {
      onLog(`moveBack(${value ?? 60});`);
      await this.animateMove(-(value ?? 60));
      return;
    }

    if (command.name === "turnLeft") {
      onLog(`turnLeft(${value ?? 90});`);
      await this.animateTurn(-(value ?? 90));
      return;
    }

    if (command.name === "turnRight") {
      onLog(`turnRight(${value ?? 90});`);
      await this.animateTurn(value ?? 90);
      return;
    }

    if (command.name === "setColor") {
      this.state.color = command.color;
      this.draw();
      onLog(`setColor("${command.label}");`);
      return;
    }

    if (command.name === "movePart") {
      onLog(`movePart("${command.part}", ${command.dx}, ${command.dy});`);
      await this.animatePartMove(command.part, command.dx, command.dy);
      return;
    }

    if (command.name === "rotatePart") {
      onLog(`rotatePart("${command.part}", ${command.angle});`);
      await this.animatePartRotate(command.part, command.angle);
      return;
    }

    if (command.name === "resetParts") {
      this.state.parts = this.createParts();
      this.draw();
      onLog("resetParts();");
      return;
    }

    if (command.name === "stamp") {
      this.state.stamps.push(this.snapshot());
      this.draw();
      onLog("stamp();");
      return;
    }

    if (command.name === "wait") {
      onLog(`wait(${value ?? 1});`);
      await this.wait((value ?? 1) * 600);
    }
  }

  snapshot() {
    return {
      x: this.state.x,
      y: this.state.y,
      direction: this.state.direction,
      color: this.state.color,
      parts: JSON.parse(JSON.stringify(this.state.parts)),
    };
  }

  async animateMove(distance) {
    const radians = (this.state.direction - 90) * Math.PI / 180;
    const startX = this.state.x;
    const startY = this.state.y;
    const rawX = startX + Math.cos(radians) * distance;
    const rawY = startY + Math.sin(radians) * distance;
    const endX = Math.max(90, Math.min(this.canvas.width - 90, rawX));
    const endY = Math.max(130, Math.min(this.canvas.height - 90, rawY));

    await this.animate(this.animationMs, (progress) => {
      this.state.x = this.lerp(startX, endX, progress);
      this.state.y = this.lerp(startY, endY, progress);
      this.draw();
    });

    this.state.trail.push({ x1: startX, y1: startY, x2: endX, y2: endY, color: this.state.color });
  }

  async animateTurn(angle) {
    const start = this.state.direction;
    await this.animate(this.animationMs, (progress) => {
      this.state.direction = start + angle * progress;
      this.draw();
    });
    this.state.direction = (start + angle + 360) % 360;
    this.draw();
  }

  async animatePartMove(partName, dx, dy) {
    const part = this.state.parts[partName];
    const startX = part.dx;
    const startY = part.dy;
    const endX = Math.max(-70, Math.min(70, startX + dx));
    const endY = Math.max(-70, Math.min(70, startY + dy));

    await this.animate(this.partAnimationMs, (progress) => {
      part.dx = this.lerp(startX, endX, progress);
      part.dy = this.lerp(startY, endY, progress);
      this.draw();
    });
  }

  async animatePartRotate(partName, angle) {
    const part = this.state.parts[partName];
    const start = part.rotation;
    const end = Math.max(-120, Math.min(120, start + angle));

    await this.animate(this.partAnimationMs, (progress) => {
      part.rotation = this.lerp(start, end, progress);
      this.draw();
    });
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();
    this.drawTrail();
    this.state.stamps.forEach((stamp) => this.drawPicto(stamp, 0.35));
    this.drawPicto(this.state, 1);
  }

  drawGrid() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.strokeStyle = "#e6edf5";
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTrail() {
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    this.state.trail.forEach((line) => {
      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawPicto(state, alpha) {
    const ctx = this.ctx;
    const color = state.color;
    const parts = state.parts;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(state.x, state.y);
    ctx.rotate(state.direction * Math.PI / 180);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    this.drawBodyPart(parts.body, () => {
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.lineTo(0, 55);
      ctx.stroke();
    });

    this.drawBodyPart(parts.leftArm, () => {
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(-62, 24);
      ctx.stroke();
    });

    this.drawBodyPart(parts.rightArm, () => {
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(12, -22);
      ctx.lineTo(62, 24);
      ctx.stroke();
    });

    this.drawBodyPart(parts.leftLeg, () => {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-6, 48);
      ctx.lineTo(-42, 118);
      ctx.stroke();
    });

    this.drawBodyPart(parts.rightLeg, () => {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(6, 48);
      ctx.lineTo(42, 118);
      ctx.stroke();
    });

    this.drawBodyPart(parts.head, () => {
      ctx.beginPath();
      ctx.arc(0, -86, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-9, -90, 4, 0, Math.PI * 2);
      ctx.arc(9, -90, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    });

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.lineTo(-13, -118);
    ctx.lineTo(13, -118);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawBodyPart(part, drawFn) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(part.dx, part.dy);
    ctx.rotate(part.rotation * Math.PI / 180);
    drawFn();
    ctx.restore();
  }

  animate(duration, update) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        const raw = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - raw, 3);
        update(eased);

        if (raw < 1) {
          requestAnimationFrame(step);
          return;
        }

        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.PictoEngine = PictoEngine;
