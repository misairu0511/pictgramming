class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reset();
  }

  reset() {
    this.state = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      direction: 0,
      color: "#2563eb",
      trail: [],
      stamps: [],
    };
    this.draw();
  }

  async run(commands, onLog) {
    for (const command of commands) {
      await this.execute(command, onLog);
      this.draw();
      await this.wait(120);
    }
    onLog("完了しました。", "success");
  }

  async execute(command, onLog) {
    const value = command.value;

    if (command.name === "moveForward") {
      this.move(value ?? 60);
      onLog(`moveForward(${value ?? 60});`);
      return;
    }

    if (command.name === "moveBack") {
      this.move(-(value ?? 60));
      onLog(`moveBack(${value ?? 60});`);
      return;
    }

    if (command.name === "turnLeft") {
      this.state.direction = (this.state.direction - (value ?? 90) + 360) % 360;
      onLog(`turnLeft(${value ?? 90});`);
      return;
    }

    if (command.name === "turnRight") {
      this.state.direction = (this.state.direction + (value ?? 90)) % 360;
      onLog(`turnRight(${value ?? 90});`);
      return;
    }

    if (command.name === "setColor") {
      this.state.color = command.color;
      onLog(`setColor("${command.label}");`);
      return;
    }

    if (command.name === "stamp") {
      this.state.stamps.push({
        x: this.state.x,
        y: this.state.y,
        direction: this.state.direction,
        color: this.state.color,
      });
      onLog("stamp();");
      return;
    }

    if (command.name === "wait") {
      onLog(`wait(${value ?? 1});`);
      await this.wait((value ?? 1) * 500);
    }
  }

  move(distance) {
    const radians = (this.state.direction - 90) * Math.PI / 180;
    const nextX = this.state.x + Math.cos(radians) * distance;
    const nextY = this.state.y + Math.sin(radians) * distance;
    const clampedX = Math.max(20, Math.min(this.canvas.width - 20, nextX));
    const clampedY = Math.max(20, Math.min(this.canvas.height - 20, nextY));

    this.state.trail.push({
      x1: this.state.x,
      y1: this.state.y,
      x2: clampedX,
      y2: clampedY,
      color: this.state.color,
    });

    this.state.x = clampedX;
    this.state.y = clampedY;
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();
    this.drawTrail();
    this.state.stamps.forEach((stamp) => {
      this.drawPicto(stamp.x, stamp.y, stamp.direction, stamp.color, 0.35);
    });
    this.drawPicto(this.state.x, this.state.y, this.state.direction, this.state.color, 1);
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

  drawPicto(x, y, direction, color, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(direction * Math.PI / 180);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(0, -22, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, 4);
    ctx.lineTo(20, 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-16, 46);
    ctx.moveTo(0, 22);
    ctx.lineTo(16, 46);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-7, -28);
    ctx.lineTo(7, -28);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.PictoEngine = PictoEngine;
