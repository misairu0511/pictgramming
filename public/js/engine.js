const STAGES = {
  stage0: { itemOffset: { x: 108, y: -150 }, goalOffset: { x: 200, y: 8 } },
  stage1: { itemOffset: { x: 53, y: 10 }, goalOffset: { x: 250, y: -100 } },
  stage2: { itemOffset: { x: -120, y: 0 }, goalOffset: { x: 250, y: -100 } },
  stage3: { itemOffset: { x: 0, y: -180 }, goalOffset: { x: -200, y: 150 } },
  stage4: { 
    itemOffset: { x: 220, y: 0 }, 
    goalOffset: { x: 300, y: -150 }, 
    shoes: { right: { x: 50, y: -50 } },
    needleZone: { x: 120, y: -2000, width: 40, height: 4000 }
  },
  stage5: { 
    initialDirection: 90,
    initialOffset: { x: 0, y: 60 },
    itemOffset: { x: 0, y: -240 }, 
    goalOffset: { x: 290, y: 200 }, 
    shoes: { right: { x: -80, y: -50 }, left: { x: 80, y: -50 } },
    needleZone: { x: -2000, y: -180, width: 4000, height: 40 }
  },
      stage6: {
    initialDirection: 90,
    initialOffset: { x: -280, y: 0 },
    itemOffset: { x: 280, y: -240 },
    goalOffset: { x: 280, y: -30 },
    checkpoints: [
      { x: 0, y: -160, radius: 22, passed: false, label: "①" },
      { x: 150, y: 100, radius: 22, passed: false, label: "②" },
      { x: -150, y: 100, radius: 22, passed: false, label: "③" }
    ],
    walls: [
      { x: 210, y: -310, width: 140, height: 15 },
      { x: 210, y: -180, width: 140, height: 15 },
      { x: 210, y: -310, width: 15, height: 145 },
      { x: 335, y: -310, width: 15, height: 145 }
    ]
  },
  stage7: {
    initialDirection: 0,
    initialOffset: { x: -280, y: 0 },
    itemOffset: { x: 280, y: -240 },
    goalOffset: { x: 280, y: -30 },
    checkpoints: [
      { x: 0, y: -180, radius: 22, passed: false, label: "①" },
      { x: 171, y: -56, radius: 22, passed: false, label: "②" },
      { x: 106, y: 146, radius: 22, passed: false, label: "③" },
      { x: -106, y: 146, radius: 22, passed: false, label: "④" },
      { x: -171, y: -56, radius: 22, passed: false, label: "⑤" }
    ],
    walls: [
      { x: 210, y: -310, width: 140, height: 15 },
      { x: 210, y: -180, width: 140, height: 15 },
      { x: 210, y: -310, width: 15, height: 145 },
      { x: 335, y: -310, width: 15, height: 145 }
    ]
  }
};

class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animationMs = 900;
    this.partAnimationMs = 650;
    this.currentStageId = "stage0";
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

    this.shoeRightImg = new Image();
    this.shoeRightImg.src = "img/shoe_right.jpg";
    this.shoeRightImg.onload = () => {
      this.removeWhiteBackground(this.shoeRightImg, (newImg) => {
        this.shoeRightImg = newImg;
        if (!this.isStopped) this.draw();
      });
    };

    this.shoeLeftImg = new Image();
    this.shoeLeftImg.src = "img/shoe_left.jpg";
    this.shoeLeftImg.onload = () => {
      this.removeWhiteBackground(this.shoeLeftImg, (newImg) => {
        this.shoeLeftImg = newImg;
        if (!this.isStopped) this.draw();
      });
    };

    this.reset();
  }

  removeWhiteBackground(originalImg, callback) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = originalImg.naturalWidth;
    tempCanvas.height = originalImg.naturalHeight;
    const tCtx = tempCanvas.getContext("2d");
    tCtx.drawImage(originalImg, 0, 0);
    const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // 白（に近い）ピクセルを透過させる
      if (r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0;
      }
    }
    tCtx.putImageData(imageData, 0, 0);
    
    const newImg = new Image();
    newImg.onload = () => callback(newImg);
    newImg.src = tempCanvas.toDataURL("image/png");
  }

  loadStage(stageId) {
    this.currentStageId = stageId;
    this.reset();
  }

  reset() {
    this.isStopped = false;
    this.isPaused = false;
    
    const stage = STAGES[this.currentStageId] || STAGES.stage1;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 + 40;
    
    this.goal = {
      x: centerX + stage.goalOffset.x,
      y: centerY + stage.goalOffset.y,
      radius: 70
    };

    const initialDir = stage.initialDirection !== undefined ? stage.initialDirection : 0;
    const initOffsetX = stage.initialOffset ? stage.initialOffset.x : 0;
    const initOffsetY = stage.initialOffset ? stage.initialOffset.y : 0;

    this.state = {
      x: centerX + initOffsetX,
      y: centerY + initOffsetY,
      direction: initialDir,
      color: "#2563eb",
      trail: [],
      parts: this.createParts(),
      particles: [],
      item: {
        x: centerX + stage.itemOffset.x,
        y: centerY + stage.itemOffset.y,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      },
      shoes: {
        right: stage.shoes && stage.shoes.right ? { 
          exists: true, x: centerX + stage.shoes.right.x, y: centerY + stage.shoes.right.y, isWorn: false 
        } : { exists: false, isWorn: false },
        left: stage.shoes && stage.shoes.left ? { 
          exists: true, x: centerX + stage.shoes.left.x, y: centerY + stage.shoes.left.y, isWorn: false 
        } : { exists: false, isWorn: false }
      },
      needleZones: [],
      checkpoints: stage.checkpoints ? stage.checkpoints.map(c => ({...c, x: centerX + c.x, y: centerY + c.y})) : [],
      walls: stage.walls ? stage.walls.map(w => ({...w, x: centerX + w.x, y: centerY + w.y})) : [],
      hasGrabbedItem: false
    };

    if (stage.needleZone) {
      this.state.needleZones.push({
        x: centerX + stage.needleZone.x,
        y: centerY + stage.needleZone.y,
        width: stage.needleZone.width,
        height: stage.needleZone.height
      });
    }
    if (stage.needleZones) {
      for (const nz of stage.needleZones) {
        this.state.needleZones.push({
          x: centerX + nz.x,
          y: centerY + nz.y,
          width: nz.width,
          height: nz.height
        });
      }
    }
    
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

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  grabItem() {
    const item = this.state.item;
    if (item.attachedTo) return;

    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const grabRadius = 35; // 半径を50から35に縮小

    const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
    const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);

    if (distL <= grabRadius) {
      item.attachedTo = "leftArm";
      item.offsetX = item.x - leftHand.x;
      item.offsetY = item.y - leftHand.y;
      this.state.hasGrabbedItem = true;
      if (!this.isGhostMode) {
        this.state.particles.push({
          x: item.x, y: item.y, text: "♪", startTime: Date.now(), duration: 1500, distance: 40, color: "rgba(255, 215, 0, 1)"
        });
      }
    } else if (distR <= grabRadius) {
      item.attachedTo = "rightArm";
      item.offsetX = item.x - rightHand.x;
      item.offsetY = item.y - rightHand.y;
      this.state.hasGrabbedItem = true;
      if (!this.isGhostMode) {
        this.state.particles.push({
          x: item.x, y: item.y, text: "♪", startTime: Date.now(), duration: 1500, distance: 40, color: "rgba(255, 215, 0, 1)"
        });
      }
    }
    this.draw();
  }

  isNearItem() {
    const item = this.state.item;
    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const grabRadius = 65;
    const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
    const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);
    return distL <= grabRadius || distR <= grabRadius;
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
    m.scaleSelf(0.6, 0.6);
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

  getLegPosition(leg) {
    const parts = this.state.parts;
    const m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
    m.rotateSelf(this.state.direction);
    m.scaleSelf(0.6, 0.6);
    m.rotateSelf(parts.body.rotation);

    if (leg === "leftLeg") {
      m.translateSelf(-10, 64);
      m.rotateSelf(parts.leftLeg.rotation);
      m.translateSelf(-22, 44);
      m.rotateSelf(parts.leftKnee.rotation);
      m.translateSelf(-22, 44);
    } else {
      m.translateSelf(10, 64);
      m.rotateSelf(parts.rightLeg.rotation);
      m.translateSelf(22, 44);
      m.rotateSelf(parts.rightKnee.rotation);
      m.translateSelf(22, 44);
    }
    return { x: m.e, y: m.f };
  }

  equipShoe(side) {
    if (!this.state.shoes[side] || !this.state.shoes[side].exists) return;
    if (this.state.shoes[side].isWorn) return;

    const shoe = this.state.shoes[side];
    const legPart = side === "right" ? "rightLeg" : "leftLeg";
    const legPos = this.getLegPosition(legPart);
    
    const grabRadius = 40;
    const dist = this.distance(legPos.x, legPos.y, shoe.x, shoe.y);
    if (dist <= grabRadius) {
      this.state.shoes[side].isWorn = true;
    }
    this.draw();
  }

  isFullyEquipped() {
    const s = this.state.shoes;
    if (s.right.exists && !s.right.isWorn) return false;
    if (s.left.exists && !s.left.isWorn) return false;
    return true;
  }

  isPointInRect(x, y, rect) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  getShoeAt(canvasX, canvasY) {
    const s = this.state.shoes;
    const hitRadius = 40;
    const checkShoe = (shoeState, side) => {
      let cx = shoeState.x, cy = shoeState.y;
      if (shoeState.isWorn) {
        const legPart = side === "right" ? "rightLeg" : "leftLeg";
        const pos = this.getLegPosition(legPart);
        cx = pos.x; cy = pos.y;
      }
      return this.distance(canvasX, canvasY, cx, cy) <= hitRadius;
    };
    if (s.right && s.right.exists && checkShoe(s.right, "right")) return "右靴";
    if (s.left && s.left.exists && checkShoe(s.left, "left")) return "左靴";
    return null;
  }

  checkNeedleCollision() {
    if (this.state.needleZones.length === 0) return null;
    if (this.isFullyEquipped()) return null; // 靴を完全に履いていれば針山無効 (ステージ4,5用)
    
    // 体の中心、頭、両手、両足をチェック
    const dirRad = this.state.direction * Math.PI / 180;
    
    // 頭の先は首からの距離だけでなく、bodyの回転も考慮する必要がある
    // 簡易的に、頭の座標を計算する
    let m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
    m.rotateSelf(this.state.direction);
    m.scaleSelf(0.6, 0.6);
    m.rotateSelf(this.state.parts.body.rotation);
    m.rotateSelf(this.state.parts.head.rotation);
    m.translateSelf(0, -80); // 頭の先端
    const headPos = { x: m.e, y: m.f };
    
    const points = [
      { x: this.state.x, y: this.state.y },
      headPos,
      this.getHandPosition("rightArm"),
      this.getHandPosition("leftArm"),
      this.getLegPosition("rightLeg"),
      this.getLegPosition("leftLeg")
    ];
    
    for (const p of points) {
      for (const nz of this.state.needleZones) {
        if (this.isPointInRect(p.x, p.y, nz)) {
          return new Error("針山に触れてしまった！");
        }
      }
    }
    return null;
  }

  evaluateGoalStatus() {
    const item = this.state.item;
    const dist = this.distance(item.x, item.y, this.goal.x, this.goal.y);
    const inGoal = dist <= this.goal.radius;
    const hasGrabbed = this.state.hasGrabbedItem;
    const isAttached = item.attachedTo !== null;

    if (!hasGrabbed) return "物を持っていない";
    if (hasGrabbed && !inGoal) return "持ったがゴールに入れていない";
    if (inGoal && isAttached) return "ゴールしていたが離していない";
    if (inGoal && !isAttached) return "ゴールした";

    return "不明なステータス";
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
      await this.animatePartTurn(command.part, value);
      return;
    }
  }

  async animateMove(distance) {
    const radians = (this.state.direction - 90) * Math.PI / 180;
    const startX = this.state.x;
    const startY = this.state.y;
    const endX = startX + Math.cos(radians) * distance;
    const endY = startY + Math.sin(radians) * distance;

    let moveError = null;

    await this.animate(this.animationMs, (progress) => {
      const prevX = this.state.x;
      const prevY = this.state.y;

      this.state.x = this.lerp(startX, endX, progress);
      this.state.y = this.lerp(startY, endY, progress);
      


      if (this.checkWallCollision()) {
         this.state.x = prevX;
         this.state.y = prevY;
         this.draw();
         return false; // Stop moving
      }

      const err = this.checkNeedleCollision();
      if (err) {
        moveError = err;
        this.isStopped = true;
        return false;
      }
      this.draw();
    });

    if (moveError) throw moveError;

    this.state.trail.push({ x1: startX, y1: startY, x2: endX, y2: endY, color: this.state.color });
  }

  async animateTurn(angle) {
    const start = this.state.direction;
    let hitWall = false;
    await this.animate(this.animationMs, (progress) => {
      const prevDir = this.state.direction;
      this.state.direction = start + angle * progress;
      if (this.checkWallCollision()) {
         this.state.direction = prevDir;
         hitWall = true;
         this.draw();
         return false;
      }
      this.draw();
    });
    if (!hitWall) {
      this.state.direction = (start + angle + 360) % 360;
      this.draw();
    }
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
    this.checkCheckpoints(); // 追加: 描画のたびに手足を含む当たり判定を行う
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();
    this.drawGoal();
    this.drawNeedles();
    this.drawCheckpoints();
    this.drawWalls();
    this.drawTrail();
    this.drawPicto(this.state);
    this.drawShoes();
    this.drawItem();
    this.drawParticles();
    this.drawLegend();
  }
  
  drawParticles() {
    if (!this.state.particles || this.state.particles.length === 0) return;
    const now = Date.now();
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      const elapsed = now - p.startTime;
      if (elapsed > p.duration) {
        this.state.particles.splice(i, 1);
        continue;
      }
      const progress = elapsed / p.duration;
      const currentY = p.y - (p.distance * progress);
      const alpha = 1.0 - progress;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color || "rgba(255, 100, 100, 1)";
      this.ctx.font = "bold 30px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(p.text, p.x, currentY);
      this.ctx.restore();
    }
  }
  
  drawCheckpoints() {
    if (!this.state.checkpoints || this.state.checkpoints.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const cp of this.state.checkpoints) {
      if (!cp.passed) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 68, 68, 1)";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cp.label, cp.x, cp.y);
      } else {
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = "rgba(16, 185, 129, 1)";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✔", cp.x, cp.y);
      }
    }
    ctx.restore();
  }

  checkCheckpoints() {
    if (!this.state.checkpoints || this.state.checkpoints.length === 0) return;
    
    let m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
    m.rotateSelf(this.state.direction);
    m.scaleSelf(0.6, 0.6);
    m.rotateSelf(this.state.parts.body.rotation);
    m.rotateSelf(this.state.parts.head.rotation);
    m.translateSelf(0, -80);
    const headPos = { x: m.e, y: m.f };
    
    const points = [
      { x: this.state.x, y: this.state.y },
      headPos,
      this.getHandPosition("rightArm"),
      this.getHandPosition("leftArm"),
      this.getLegPosition("rightLeg"),
      this.getLegPosition("leftLeg")
    ];

    for (let cp of this.state.checkpoints) {
      if (!cp.passed) {
        for (let p of points) {
          const dist = this.distance(p.x, p.y, cp.x, cp.y);
          if (dist <= cp.radius + 15) { // 15は手足の太さなどを考慮したマージン
            cp.passed = true;
            break; // このチェックポイントは通過済み
          }
        }
      }
    }
  }

  drawWalls() {
    if (!this.state.walls || this.state.walls.length === 0) return;
    if (this.state.checkpoints && this.state.checkpoints.length > 0 && this.state.checkpoints.every(c => c.passed)) {
       return; // Walls disappear
    }
    const ctx = this.ctx;
    ctx.save();
    
    // 枠組み（壁）
    ctx.fillStyle = "#475569";
    for (const wall of this.state.walls) {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }
    
    // 鉄格子の描画
    let minX = Math.min(...this.state.walls.map(w => w.x));
    let maxX = Math.max(...this.state.walls.map(w => w.x + w.width));
    let minY = Math.min(...this.state.walls.map(w => w.y));
    let maxY = Math.max(...this.state.walls.map(w => w.y + w.height));
    
    ctx.strokeStyle = "#94a3b8"; // 鉄格子の色
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = minX + 25; x < maxX - 10; x += 25) {
      ctx.moveTo(x, minY + 10);
      ctx.lineTo(x, maxY - 10);
    }
    ctx.stroke();
    
    ctx.restore();
  }

  checkWallCollision() {
    if (!this.state.walls || this.state.walls.length === 0) return false;
    if (this.state.checkpoints && this.state.checkpoints.length > 0 && this.state.checkpoints.every(c => c.passed)) {
       return false;
    }
    let m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
    m.rotateSelf(this.state.direction);
    m.scaleSelf(0.6, 0.6);
    m.rotateSelf(this.state.parts.body.rotation);
    m.rotateSelf(this.state.parts.head.rotation);
    m.translateSelf(0, -80);
    const headPos = { x: m.e, y: m.f };
    
    const points = [
      { x: this.state.x, y: this.state.y },
      headPos,
      this.getHandPosition("rightArm"),
      this.getHandPosition("leftArm"),
      this.getLegPosition("rightLeg"),
      this.getLegPosition("leftLeg")
    ];
    
    for (const p of points) {
      for (const w of this.state.walls) {
        if (this.isPointInRect(p.x, p.y, w)) {
          return true;
        }
      }
    }
    return false;
  }

  drawGoal() {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // 薄い緑色
    ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(this.goal.x, this.goal.y, this.goal.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(16, 185, 129, 1)";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GOAL", this.goal.x, this.goal.y);
    ctx.restore();
  }

  drawNeedles() {
    if (this.state.needleZones.length === 0) return;
    if (this.isFullyEquipped()) return; // 全ての靴を履いたら針山(壁)が消滅する
    const ctx = this.ctx;
    ctx.save();
    
    for (const nz of this.state.needleZones) {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(nz.x, nz.y, nz.width, nz.height);

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      // 縦長の針山か横長の針山かでギザギザの向きを変える
      if (nz.height > nz.width) {
        const needleCount = Math.floor(nz.height / 20);
        for (let i = 0; i < needleCount; i++) {
          const ny = nz.y + i * 20 + 10;
          ctx.moveTo(nz.x, ny - 8);
          ctx.lineTo(nz.x, ny + 8);
          ctx.lineTo(nz.x - 15, ny);
          
          ctx.moveTo(nz.x + nz.width, ny - 8);
          ctx.lineTo(nz.x + nz.width, ny + 8);
          ctx.lineTo(nz.x + nz.width + 15, ny);
        }
      } else {
        const needleCount = Math.floor(nz.width / 20);
        for (let i = 0; i < needleCount; i++) {
          const nx = nz.x + i * 20 + 10;
          ctx.moveTo(nx - 8, nz.y);
          ctx.lineTo(nx + 8, nz.y);
          ctx.lineTo(nx, nz.y - 15);
          
          ctx.moveTo(nx - 8, nz.y + nz.height);
          ctx.lineTo(nx + 8, nz.y + nz.height);
          ctx.lineTo(nx, nz.y + nz.height + 15);
        }
      }
      ctx.fill();
    }
    ctx.restore();
  }

  drawShoes() {
    if (this.state.shoes.right && this.state.shoes.right.exists) {
      this.drawShoe("right", this.state.shoes.right, this.shoeRightImg);
    }
    if (this.state.shoes.left && this.state.shoes.left.exists) {
      this.drawShoe("left", this.state.shoes.left, this.shoeLeftImg);
    }
  }

  drawShoe(side, shoeState, img) {
    let cx, cy, rotation = 0;
    if (shoeState.isWorn) {
      const legPart = side === "right" ? "rightLeg" : "leftLeg";
      const pos = this.getLegPosition(legPart);
      cx = pos.x;
      cy = pos.y;
      
      const parts = this.state.parts;
      rotation = this.state.direction + parts.body.rotation + parts[legPart].rotation + parts[side === "right" ? "rightKnee" : "leftKnee"].rotation;
    } else {
      cx = shoeState.x;
      cy = shoeState.y;
    }

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation * Math.PI / 180);
    this.ctx.scale(0.6, 0.6);
    
    if (this.isGhostMode) {
      this.ctx.globalAlpha = 0.5;
    }
    
    if (shoeState.isWorn) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 40, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
      this.ctx.fill();
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      this.ctx.stroke();
      this.ctx.restore();
    } else {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 40, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 4]);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (img.complete && img.naturalWidth > 0) {
      const w = 80;
      const h = (w / img.naturalWidth) * img.naturalHeight;
      this.ctx.drawImage(img, -w/2, -h/2, w, h);
    } else {
      this.ctx.fillStyle = side === "right" ? "#f97316" : "#0ea5e9";
      this.ctx.fillRect(-25, -20, 50, 40);
    }
    this.ctx.restore();
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
    this.ctx.translate(cx, cy);
    this.ctx.scale(0.6, 0.6);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 35, 0, Math.PI * 2);
    
    if (this.state.item.attachedTo) {
      // 持っている時は赤色の実線
      this.ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      this.ctx.lineWidth = 3;
    } else {
      // 持っていない時は点線
      this.ctx.strokeStyle = "rgba(107, 114, 128, 0.6)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 4]);
    }
    
    this.ctx.stroke();
    this.ctx.restore();


    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(0.6, 0.6);

    if (this.isGhostMode) {
      this.ctx.globalAlpha = 0.5;
    }

    if (this.itemImg.complete && this.itemImg.naturalWidth > 0) {
      const w = 60;
      const h = (w / this.itemImg.naturalWidth) * this.itemImg.naturalHeight;
      this.ctx.drawImage(this.itemImg, -w/2, -h/2, w, h);
    } else {
      this.ctx.fillStyle = "#f59e0b";
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 30, 0, Math.PI*2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
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
    ctx.scale(0.6, 0.6);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    
    if (this.isGhostMode) {
      ctx.globalAlpha = 0.5; // ゴーストは半透明にする
    }

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

  async playGhost(events) {
    this.reset();
    this.isGhostMode = true;
    this.state.color = "#9ca3af"; // ゴースト用のグレー色
    
    for (const evt of events) {
      if (this.isStopped) break;
      
      const msg = evt.message;
      if (!msg) continue;

      if (msg.startsWith("移動")) {
        const match = msg.match(/移動\(([-.\d]+)\)/);
        if (match) await this.animateMove(parseFloat(match[1]));
      } else if (msg.startsWith("回転")) {
        const match = msg.match(/回転\(([-.\d]+)\)/);
        if (match) await this.animateTurn(parseFloat(match[1]));
      } else if (msg.startsWith("部位回転")) {
        const match = msg.match(/部位回転\("([^"]+)",\s*([-.\d]+)\)/);
        if (match) await this.animatePartRotate(match[1], parseFloat(match[2]));
      } else if (msg.startsWith("掴む")) {
        this.grabItem();
        await this.wait(300);
      } else if (msg.startsWith("離す")) {
        this.releaseItem();
        await this.wait(300);
      }
      await this.wait(120);
    }
    
    this.isGhostMode = false;
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
      let startTime = performance.now();
      let totalElapsed = 0;

      const step = (now) => {
        if (this.isStopped) {
          resolve();
          return;
        }

        if (this.isPaused) {
          startTime = now;
          requestAnimationFrame(step);
          return;
        }

        const delta = now - startTime;
        startTime = now;
        totalElapsed += delta;

        const raw = Math.min(1, totalElapsed / duration);
        const eased = raw; // Linear easing for continuous movement
        const res = update(eased);
        if (res === false) {
          resolve();
          return;
        }

        if (raw < 1) {
          requestAnimationFrame(step);
          return;
        }

        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  drawLegend() {
    const ctx = this.ctx;
    ctx.save();
    
    // 背景の半透明白角丸四角
    const boxX = this.canvas.width - 180;
    const boxY = this.canvas.height - 70;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, 160, 50, 8);
    ctx.fill();
    ctx.stroke();

    // 距離（1マス = 40）
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + 20, boxY + 30);
    ctx.lineTo(boxX + 20, boxY + 36);
    ctx.lineTo(boxX + 60, boxY + 36); // exactly 40 width
    ctx.lineTo(boxX + 60, boxY + 30);
    ctx.stroke();
    
    ctx.fillStyle = "#475569";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("1マス(移動40)", boxX + 40, boxY + 22);

    // 回転（90度）
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(boxX + 110, boxY + 35, 15, Math.PI * 1.5, 0);
    ctx.stroke();

    ctx.strokeStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(boxX + 110, boxY + 15);
    ctx.lineTo(boxX + 110, boxY + 35);
    ctx.lineTo(boxX + 130, boxY + 35);
    ctx.stroke();

    ctx.fillStyle = "#0ea5e9";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("90°", boxX + 130, boxY + 20);
    
    ctx.fillStyle = "#475569";
    ctx.fillText("回転", boxX + 120, boxY + 45);

    ctx.restore();
  }

  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.PictoEngine = PictoEngine;
