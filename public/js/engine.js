class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animationMs = 900;
    this.partAnimationMs = 650;
    this.partLabels = {
      head: { ja: "頭", code: "head" },
      body: { ja: "胴体", code: "body" },
      leftArm: { ja: "左腕", code: "leftArm" },
      rightArm: { ja: "右腕", code: "rightArm" },
      leftLeg: { ja: "左脚", code: "leftLeg" },
      rightLeg: { ja: "右脚", code: "rightLeg" },
      leftElbow: { ja: "左肘", code: "leftElbow" },
      rightElbow: { ja: "右肘", code: "rightElbow" },
      leftKnee: { ja: "左膝", code: "leftKnee" },
      rightKnee: { ja: "右膝", code: "rightKnee" },
    };
    
    this.itemImg = new Image();
    this.itemImg.src = "img/item1.png";
    this.itemImg.onload = () => { if (!this.isStopped) this.draw(); };

    this.reset();
  }

  reset() {
    this.isStopped = false;
    this.state = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2 + 40,
      direction: 0,
      color: "#2563eb",
      trail: [],
      parts: this.createParts(),
      item: {
        x: this.canvas.width / 2 + 100,
        y: this.canvas.height / 2 + 100,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      }
    };
    this.draw();
  }

  createParts() {
    return {
      head: { rotation: 0 },
      body: { rotation: 0 },
      leftArm: { rotation: 0 },
      rightArm: { rotation: 0 },
      leftLeg: { rotation: 0 },
      rightLeg: { rotation: 0 },
      leftElbow: { rotation: 0 },
      rightElbow: { rotation: 0 },
      rightElbow: { rotation: 0 },
      leftKnee: { rotation: 0 },
      rightKnee: { rotation: 0 },
    };
  }

  stop() {
    this.isStopped = true;
  }

  grabItem() {
    const item = this.state.item;
    if (item.attachedTo) return;

    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const grabRadius = 50;

    const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
    const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);

    if (distL <= grabRadius) {
      item.attachedTo = "leftArm";
      item.offsetX = item.x - leftHand.x;
      item.offsetY = item.y - leftHand.y;
    } else if (distR <= grabRadius) {
      item.attachedTo = "rightArm";
      item.offsetX = item.x - rightHand.x;
      item.offsetY = item.y - rightHand.y;
    }
    this.draw();
  }

  releaseItem() {
    this.state.item.attachedTo = null;
    this.draw();
  }

  getHandPosition(arm) {
    const parts = this.state.parts;
    const m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
    m.rotateSelf(this.state.direction);
    m.rotateSelf(parts.body.rotation);

    if (arm === "leftArm") {
      m.translateSelf(-18, -42);
      m.rotateSelf(parts.leftArm.rotation);
      m.translateSelf(-35, 29);
      m.rotateSelf(parts.leftElbow.rotation);
      m.translateSelf(-35, 29);
    } else {
      m.translateSelf(18, -42);
      m.rotateSelf(parts.rightArm.rotation);
      m.translateSelf(35, 29);
      m.rotateSelf(parts.rightElbow.rotation);
      m.translateSelf(35, 29);
    }
    return { x: m.e, y: m.f };
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

    if (command.name === "move") {
      onLog(`move(${value});`);
      await this.animateMove(value);
      return;
    }

    if (command.name === "rotate") {
      onLog(`rotate(${value});`);
      await this.animateTurn(value);
      return;
    }

    if (command.name === "rotatePart") {
      onLog(`rotatePart("${command.part}", ${value});`);
      await this.animatePartRotate(command.part, value);
      return;
    }
  }

  async animateMove(distance) {
    const radians = (this.state.direction - 90) * Math.PI / 180;
    const startX = this.state.x;
    const startY = this.state.y;
    const endX = startX + Math.cos(radians) * distance;
    const endY = startY + Math.sin(radians) * distance;

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

  async animatePartRotate(partName, angle) {
    const part = this.state.parts[partName];
    const start = part.rotation;
    const end = Math.max(-140, Math.min(140, start + angle));

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
    this.drawPicto(this.state);
    this.drawItem();
  }

  drawItem() {
    const item = this.state.item;
    let cx = item.x;
    let cy = item.y;

    if (item.attachedTo) {
      const handPos = this.getHandPosition(item.attachedTo);
      cx = handPos.x + item.offsetX;
      cy = handPos.y + item.offsetY;
      item.x = cx;
      item.y = cy;
    }

    // 当たり判定の可視化
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(239, 68, 68, 0.4)"; // 少し目立つ赤色の半透明
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    if (this.itemImg.complete && this.itemImg.naturalWidth > 0) {
      const w = 60;
      const h = (w / this.itemImg.naturalWidth) * this.itemImg.naturalHeight;
      this.ctx.drawImage(this.itemImg, cx - w/2, cy - h/2, w, h);
    } else {
      this.ctx.fillStyle = "#f59e0b";
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 30, 0, Math.PI*2);
      this.ctx.fill();
    }
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

  drawPicto(state) {
    const ctx = this.ctx;
    const parts = state.parts;

    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.direction * Math.PI / 180);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;

    this.drawTorso(parts.body.rotation);
    this.drawConnectedPart(-18, -42, parts.leftArm.rotation, () => this.drawArm(-70, 58, parts.leftElbow.rotation));
    this.drawConnectedPart(18, -42, parts.rightArm.rotation, () => this.drawArm(70, 58, parts.rightElbow.rotation));
    this.drawConnectedPart(-10, 64, parts.leftLeg.rotation, () => this.drawLeg(-44, 88, parts.leftKnee.rotation));
    this.drawConnectedPart(10, 64, parts.rightLeg.rotation, () => this.drawLeg(44, 88, parts.rightKnee.rotation));
    this.drawConnectedPart(0, -82, parts.head.rotation, () => this.drawHead());

    ctx.restore();
  }

  drawTorso(rotation) {
    const ctx = this.ctx;
    ctx.save();
    ctx.rotate(rotation * Math.PI / 180);
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(0, -74);
    ctx.lineTo(0, 70);
    ctx.stroke();
    ctx.restore();
  }

  drawConnectedPart(anchorX, anchorY, rotation, drawPart) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(rotation * Math.PI / 180);
    drawPart();
    ctx.restore();
  }

  drawArm(endX, endY, jointRotation = 0) {
    const ctx = this.ctx;
    ctx.lineWidth = 15;
    const midX = endX / 2;
    const midY = endY / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(jointRotation * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(midX, midY);
    ctx.stroke();
    ctx.restore();
  }

  drawLeg(endX, endY, jointRotation = 0) {
    const ctx = this.ctx;
    ctx.lineWidth = 16;
    const midX = endX / 2;
    const midY = endY / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(jointRotation * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(midX, midY);
    ctx.stroke();
    ctx.restore();
  }

  drawHead() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(0, -36, 31, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-10, -40, 4.5, 0, Math.PI * 2);
    ctx.arc(10, -40, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.state.color;
  }

  getPartAt(canvasX, canvasY) {
    const point = this.toLocalPoint(canvasX, canvasY);
    if (!point) return null;

    const hitAreas = [
      { part: "head", x: 0, y: -118, radius: 36 },
      { part: "leftElbow", x: -70, y: 2, radius: 26 },
      { part: "rightElbow", x: 70, y: 2, radius: 26 },
      { part: "leftKnee", x: -43, y: 130, radius: 26 },
      { part: "rightKnee", x: 43, y: 130, radius: 26 },
      { part: "leftArm", x: -35, y: -27, radius: 28 },
      { part: "rightArm", x: 35, y: -27, radius: 28 },
      { part: "leftLeg", x: -21, y: 86, radius: 28 },
      { part: "rightLeg", x: 21, y: 86, radius: 28 },
      { part: "body", x: 0, y: 0, radius: 42 },
    ];

    const hit = hitAreas.find((area) => this.distance(point.x, point.y, area.x, area.y) <= area.radius);
    return hit ? this.partLabels[hit.part] : null;
  }

  toLocalPoint(canvasX, canvasY) {
    const dx = canvasX - this.state.x;
    const dy = canvasY - this.state.y;
    const radians = -this.state.direction * Math.PI / 180;
    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians),
    };
  }

  distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  animate(duration, update) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        if (this.isStopped) {
          resolve();
          return;
        }

        const raw = Math.min(1, (now - start) / duration);
        const eased = raw; // Linear easing for continuous movement
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
