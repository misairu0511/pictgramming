// 全ステージ共通の6点マーカー配置（規則正しい2×3グリッド：上段 A, B, C / 下段 D, E, F）
const COMMON_POINTS = [
  { label: "A", x: -220, y: -210 },
  { label: "B", x:    0, y: -210 },
  { label: "C", x:  220, y: -210 },
  { label: "D", x: -220, y:  130 },
  { label: "E", x:    0, y:  130 },
  { label: "F", x:  220, y:  130 }
];

const STAGES = {
  stage0: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -180, y: 0 },
    itemOffset: { x: -5, y: -45 },
    goalOffset: { x: 180, y: 0 },
    points: COMMON_POINTS
  },
  // ステージ1：移動・方向転換のみ①（自由なルートでゴールへ）
  stage1: {
    hasItem: false,
    initialDirection: 0,
    initialOffset: { x: -240, y: -30 },
    goalOffset: { x: 240, y: -30 },
    points: COMMON_POINTS
  },
  // ステージ2：移動・方向転換のみ②（中央の薄い壁を迂回しよう）
  stage2: {
    hasItem: false,
    initialDirection: 0,
    initialOffset: { x: -240, y: -20 },
    goalOffset: { x: 240, y: -40 },
    walls: [
      { x: -7, y: -70, width: 14, height: 80 }
    ],
    points: COMMON_POINTS
  },
  // ステージ3：掴んで運ぶ①（右腕で取るか、左腕で取るか）
  stage3: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -240, y: -20 },
    itemOffset: { x: 0, y: -40 },
    goalOffset: { x: 240, y: -20 },
    points: COMMON_POINTS
  },
  // ステージ4：掴んで運ぶ②（複数ルートでの運搬）
  stage4: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -250, y: -20 },
    itemOffset: { x: 40, y: -150 },
    goalOffset: { x: 250, y: 50 },
    points: COMMON_POINTS
  },
  // ステージ5：靴と針山①（上下2つの靴と縦の針山）
  stage5: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -240, y: -20 },
    itemOffset: { x: 165, y: -210 },
    goalOffset: { x: 240, y: -40 },
    shoes: [
      { x: -90, y: -80 },
      { x: -90, y:  30 }
    ],
    needleZone: { x: 80, y: -2000, width: 40, height: 4000 },
    points: COMMON_POINTS
  },
  // ステージ6：靴と針山②（左右2つの靴と横の針山）
  stage6: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: 0, y: 30 },
    itemOffset: { x: 120, y: -185 },
    goalOffset: { x: 250, y: 70 },
    shoes: [
      { x: -160, y: 10 },
      { x:  160, y: 10 }
    ],
    needleZone: { x: -2000, y: -140, width: 4000, height: 35 },
    points: COMMON_POINTS
  },
  // ステージ7：特定の場所を通る①（3つのチェックポイント：正三角形配置）
  stage7: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -260, y: -20 },
    itemOffset: { x: 260, y: -210 },
    goalOffset: { x: 250, y: 50 },
    checkpoints: [
      { x:    5, y: -155, radius: 24, passed: false, label: "①", num: "1" },
      { x:  150, y:   95, radius: 24, passed: false, label: "②", num: "2" },
      { x: -140, y:   95, radius: 24, passed: false, label: "③", num: "3" }
    ],
    points: COMMON_POINTS,
    walls: [
      { x: 195, y: -280, width: 135, height: 14 },
      { x: 195, y: -150, width: 135, height: 14 },
      { x: 195, y: -280, width: 14, height: 144 },
      { x: 316, y: -280, width: 14, height: 144 }
    ]
  },
  // ステージ8：特定の場所を通る②（5つのチェックポイント：正五角形配置）
  stage8: {
    hasItem: true,
    initialDirection: 0,
    initialOffset: { x: -260, y: -20 },
    itemOffset: { x: 260, y: -210 },
    goalOffset: { x: 250, y: 50 },
    checkpoints: [
      { x:   15, y: -160, radius: 24, passed: false, label: "①", num: "1" },
      { x:  177, y:  -43, radius: 24, passed: false, label: "②", num: "2" },
      { x:  115, y:  148, radius: 24, passed: false, label: "③", num: "3" },
      { x:  -85, y:  148, radius: 24, passed: false, label: "④", num: "4" },
      { x: -147, y:  -43, radius: 24, passed: false, label: "⑤", num: "5" }
    ],
    points: COMMON_POINTS,
    walls: [
      { x: 195, y: -280, width: 135, height: 14 },
      { x: 195, y: -150, width: 135, height: 14 },
      { x: 195, y: -280, width: 14, height: 144 },
      { x: 316, y: -280, width: 14, height: 144 }
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
    const hasItem = stage.hasItem !== undefined ? stage.hasItem : true;
    const itemOffset = stage.itemOffset || { x: 0, y: 0 };

    this.state = {
      x: centerX + initOffsetX,
      y: centerY + initOffsetY,
      direction: initialDir,
      color: "#2563eb",
      trail: [],
      parts: this.createParts(),
      particles: [],
      hasItem: hasItem,
      item: {
        x: centerX + itemOffset.x,
        y: centerY + itemOffset.y,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      },
      shoes: (stage.shoes ? stage.shoes : []).map(shoeDef => ({
          exists: true, x: centerX + shoeDef.x, y: centerY + shoeDef.y, isWorn: false
      })),
      needleZones: [],
      points: stage.points ? stage.points.map(p => ({ ...p, x: centerX + p.x, y: centerY + p.y })) : [],
      checkpoints: stage.checkpoints ? stage.checkpoints.map(c => ({...c, x: centerX + c.x, y: centerY + c.y})) : [],
      walls: stage.walls ? stage.walls.map(w => ({...w, x: centerX + w.x, y: centerY + w.y})) : [],
      hasGrabbedItem: false,
      targetPoint: null,
      goalCelebrated: false
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
    if (!this.state.hasItem) return;
    const item = this.state.item;
    if (item.attachedTo) return;
    // すでにゴールに運んで離した後は再キャッチしない
    if (this.state.hasGrabbedItem && this.distance(item.x, item.y, this.goal.x, this.goal.y) <= this.goal.radius) {
      return;
    }

    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const grabRadius = 38;

    const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
    const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);

    if (distL <= grabRadius) {
      item.attachedTo = "leftArm";
      item.offsetX = item.x - leftHand.x;
      item.offsetY = item.y - leftHand.y;
      this.state.hasGrabbedItem = true;
      this.state.particles.push({
        x: item.x + 30, y: item.y - 30, text: "♪", startTime: Date.now(), duration: 1200, distance: 30, color: "rgba(255, 150, 0, 1)", animationType: 'up_down'
      });
    } else if (distR <= grabRadius) {
      item.attachedTo = "rightArm";
      item.offsetX = item.x - rightHand.x;
      item.offsetY = item.y - rightHand.y;
      this.state.hasGrabbedItem = true;
      this.state.particles.push({
        x: item.x + 30, y: item.y - 30, text: "♪", startTime: Date.now(), duration: 1200, distance: 30, color: "rgba(255, 150, 0, 1)", animationType: 'up_down'
      });
    }
    this.draw();
  }

  isNearItem() {
    if (!this.state.hasItem) return false;
    const item = this.state.item;
    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const grabRadius = 65;
    const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
    const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);
    const distBody = this.distance(this.state.x, this.state.y, item.x, item.y);
    return distL <= grabRadius || distR <= grabRadius || distBody <= 65;
  }

  isNearTarget(label) {
    if (!label || label === "ヒヨコ") {
      return this.isNearItem();
    }
    const target = String(label).trim();
    if (target === "靴") {
      if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return true;
      const unworn = this.state.shoes.filter(s => s.exists && !s.isWorn);
      if (unworn.length === 0) return true;
      const leftFoot = this.getLegPosition("leftLeg");
      const rightFoot = this.getLegPosition("rightLeg");
      return unworn.some(shoe =>
        this.distance(this.state.x, this.state.y, shoe.x, shoe.y) <= 30 ||
        this.distance(leftFoot.x, leftFoot.y, shoe.x, shoe.y) <= 35 ||
        this.distance(rightFoot.x, rightFoot.y, shoe.x, shoe.y) <= 35
      );
    }
    if (target === "ゴール" || target.toUpperCase() === "GOAL") {
      return this.distance(this.state.x, this.state.y, this.goal.x, this.goal.y) <= this.goal.radius;
    }
    if (this.state.points) {
      const pt = this.state.points.find(p => p.label === target);
      if (pt) {
        return this.distance(this.state.x, this.state.y, pt.x, pt.y) <= 22;
      }
    }
    if (this.state.checkpoints) {
      const cp = this.state.checkpoints.find(c => c.label === target || c.num === target);
      if (cp) {
        return this.distance(this.state.x, this.state.y, cp.x, cp.y) <= 24;
      }
    }
    return false;
  }

  spawnGoalParticles(px, py) {
    if (!this.state.particles) this.state.particles = [];
    this.state.particles.push({
      x: px, y: py, text: "❤️", startTime: Date.now(), duration: 2500, distance: 40, color: "rgba(255, 50, 50, 1)", animationType: 'up_down', fontSize: 30
    });
    this.state.particles.push({
      x: px - 25, y: py - 10, text: "✨", startTime: Date.now(), duration: 2300, distance: 45, color: "rgba(255, 215, 0, 1)", animationType: 'up_down', fontSize: 20
    });
    this.state.particles.push({
      x: px + 25, y: py - 5, text: "✨", startTime: Date.now(), duration: 2700, distance: 35, color: "rgba(255, 215, 0, 1)", animationType: 'up_down', fontSize: 20
    });
  }

  releaseItem() {
    if (this.state.item.attachedTo) {
      const handPos = this.getHandPosition(this.state.item.attachedTo);
      this.state.item.x = handPos.x + this.state.item.offsetX;
      this.state.item.y = handPos.y + this.state.item.offsetY;
      this.state.item.attachedTo = null;
      
      const status = this.evaluateGoalStatus();
      if (status === "ゴールした") {
        this.spawnGoalParticles(this.state.item.x + 30, this.state.item.y - 30);
      }
    }
    this.draw();
  }

  // ピクトグラムは常に直立（頭が上）なので、state.direction による回転は行わない
  getHandPosition(arm) {
    const parts = this.state.parts;
    const m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
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

  equipShoe() {
    if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return;

    const grabRadius = 55;
    const legs = ["leftLeg", "rightLeg"];

    for (const legPart of legs) {
      const alreadyWearing = this.state.shoes.some(s => s.exists && s.isWorn && s.foot === legPart);
      if (alreadyWearing) continue;

      const legPos = this.getLegPosition(legPart);
      if (!legPos) continue;

      let closestShoe = null;
      let minDist = grabRadius;
      for (const shoe of this.state.shoes) {
        if (!shoe.exists || shoe.isWorn) continue;
        const distLeg = this.distance(legPos.x, legPos.y, shoe.x, shoe.y);
        const distBody = this.distance(this.state.x, this.state.y, shoe.x, shoe.y);
        const dist = Math.min(distLeg, distBody);
        if (dist <= minDist) {
          minDist = dist;
          closestShoe = shoe;
        }
      }

      if (closestShoe) {
        closestShoe.isWorn = true;
        closestShoe.foot = legPart;
      }
    }
    this.draw();
  }

  unequipShoe() {
    if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return;
    for (const shoe of this.state.shoes) {
      if (shoe.exists && shoe.isWorn) {
        const legPart = shoe.foot || "leftLeg";
        const legPos = this.getLegPosition(legPart);
        if (legPos) {
          shoe.x = legPos.x;
          shoe.y = legPos.y;
        }
        shoe.isWorn = false;
        shoe.foot = null;
      }
    }
    this.draw();
  }

  isFullyEquipped() {
    if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return false;
    return this.state.shoes.every(s => !s.exists || s.isWorn);
  }

  isPointInRect(x, y, rect) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  getShoeAt(canvasX, canvasY) {
    if (!Array.isArray(this.state.shoes)) return null;
    const hitRadius = 40;
    for (const shoeState of this.state.shoes) {
      if (!shoeState.exists) continue;
      let cx = shoeState.x, cy = shoeState.y;
      if (shoeState.isWorn) {
        const legPart = shoeState.foot || "leftLeg";
        const pos = this.getLegPosition(legPart);
        cx = pos.x; cy = pos.y;
      }
      if (this.distance(canvasX, canvasY, cx, cy) <= hitRadius) {
        return "靴";
      }
    }
    return null;
  }

  checkNeedleCollision() {
    if (this.state.needleZones.length === 0) return null;
    if (this.isFullyEquipped()) return null;
    
    let m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
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
      for (const nz of this.state.needleZones) {
        if (this.isPointInRect(p.x, p.y, nz)) {
          return new Error("針山に触れてしまった！");
        }
      }
    }
    return null;
  }

  evaluateGoalStatus() {
    // ヒヨコがいないステージ（ステージ1・2）はピクトグラム自身がGOALに入ればクリア
    if (!this.state.hasItem) {
      const dist = this.distance(this.state.x, this.state.y, this.goal.x, this.goal.y);
      if (dist <= this.goal.radius) {
        return "ゴールした";
      }
      return "ゴールに届いていない";
    }

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
    // direction = 0 を右向き(+X)とする
    const radians = this.state.direction * Math.PI / 180;
    const startX = this.state.x;
    const startY = this.state.y;
    let endX = startX + Math.cos(radians) * distance;
    let endY = startY + Math.sin(radians) * distance;

    // 向いている目標地点がある場合、飛び越さないようにぴったり目標地点で止める
    if (distance > 0 && this.state.targetPoint) {
      const distToTarget = this.distance(startX, startY, this.state.targetPoint.x, this.state.targetPoint.y);
      if (distToTarget > 0 && distToTarget <= distance + 6) {
        endX = this.state.targetPoint.x;
        endY = this.state.targetPoint.y;
      }
    } else if (distance > 0 && this.state.points && this.state.points.length > 0) {
      // 角度指定などで歩いている場合も、途中に地点の中心があればそこへ吸着して飛び越しを防ぐ
      for (const pt of this.state.points) {
        const distStart = this.distance(startX, startY, pt.x, pt.y);
        if (distStart > 5 && distStart <= distance + 4) {
          // 進行方向と地点の方向がほぼ一致しているか確認
          const angleToPt = Math.atan2(pt.y - startY, pt.x - startX);
          const diff = Math.abs(Math.atan2(Math.sin(radians - angleToPt), Math.cos(radians - angleToPt)));
          if (diff < 0.25) {
            endX = pt.x;
            endY = pt.y;
            break;
          }
        }
      }
    }

    const actualDist = this.distance(startX, startY, endX, endY);
    const moveDuration = Math.min(this.animationMs, Math.max(160, actualDist * 6));
    let moveError = null;

    await this.animate(moveDuration, (progress) => {
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

    this.state.trail.push({ x1: startX, y1: startY, x2: this.state.x, y2: this.state.y, color: this.state.color });

    // ヒヨコなしステージでゴールに入ったときのエフェクト
    if (!this.state.hasItem && !this.state.goalCelebrated && this.evaluateGoalStatus() === "ゴールした") {
      this.state.goalCelebrated = true;
      this.spawnGoalParticles(this.state.x + 30, this.state.y - 50);
      this.draw();
    }
  }

  async animateTurn(angle, keepTargetPoint = false) {
    if (!keepTargetPoint) {
      this.state.targetPoint = null;
    }
    const start = this.state.direction;
    const turnDuration = Math.min(this.animationMs, Math.max(180, Math.abs(angle) * 4));
    await this.animate(turnDuration, (progress) => {
      this.state.direction = start + angle * progress;
      this.draw();
    });
    this.state.direction = ((start + angle) % 360 + 360) % 360;
    this.draw();
  }

  async animateFace(target) {
    if (typeof target === "number" && Number.isFinite(target)) {
      await this.animateTurn(target, false);
      return;
    }
    if (typeof target !== "string") {
      throw new Error("向くの引数は地点名(\"A\"など)または角度(数字)を指定してください");
    }
    const label = target.trim();
    if (label === "ゴール" || label.toUpperCase() === "GOAL") {
      throw new Error("ゴールは直接向くことができません。地点(\"A\"など)や角度を指定してください");
    }

    let tx = null, ty = null;
    if (label === "ヒヨコ") {
      if (!this.state.hasItem) {
        throw new Error("このステージにはヒヨコがいません");
      }
      // 近づく方向（左側か右側か）に応じて、右腕または左腕で掴みやすい斜め下の立ち位置を目標にする
      const sideOffset = this.state.x > this.state.item.x ? 50 : -50;
      tx = this.state.item.x + sideOffset;
      ty = this.state.item.y + 35;
      this.state.targetPoint = { x: tx, y: ty, label: "ヒヨコ" };
    } else if (label === "靴") {
      const unworn = (this.state.shoes || []).filter(s => s.exists && !s.isWorn);
      if (unworn.length === 0) return;
      let closest = unworn[0];
      let minD = this.distance(this.state.x, this.state.y, closest.x, closest.y);
      for (const s of unworn) {
        const d = this.distance(this.state.x, this.state.y, s.x, s.y);
        if (d < minD) {
          minD = d;
          closest = s;
        }
      }
      tx = closest.x;
      ty = closest.y;
      this.state.targetPoint = { x: tx, y: ty, label: "靴" };
    } else {
      let pt = (this.state.points || []).find(p => p.label === label);
      if (!pt && this.state.checkpoints) {
        pt = this.state.checkpoints.find(c => c.label === label || c.num === label);
      }
      if (!pt) {
        throw new Error(`"${label}" という地点は見つかりません`);
      }
      tx = pt.x;
      ty = pt.y;
      this.state.targetPoint = { x: tx, y: ty, label: label };
    }

    const targetDeg = Math.atan2(ty - this.state.y, tx - this.state.x) * 180 / Math.PI;
    const diff = ((targetDeg - this.state.direction + 540) % 360) - 180;
    await this.animateTurn(diff, true);
  }

  async animatePartRotate(partName, angle) {
    const part = this.state.parts[partName];
    const start = part.rotation;
    const end = Math.max(-140, Math.min(140, start + angle));
    const isArmPart = ["leftArm", "rightArm", "leftElbow", "rightElbow"].includes(partName);
    const isLegPart = ["leftLeg", "rightLeg", "leftKnee", "rightKnee"].includes(partName);

    await this.animate(this.partAnimationMs, (progress) => {
      part.rotation = this.lerp(start, end, progress);
      // 腕を動かしている最中にヒヨコに触れたら自動で掴む
      if (isArmPart && this.state.hasItem && !this.state.item.attachedTo) {
        this.grabItem();
      }
      // 足を動かしている最中に靴に触れたら自動で履く
      if (isLegPart) {
        this.equipShoe();
      }
      this.draw();
    });
  }

  draw() {
    this.checkCheckpoints();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();
    this.drawGoal();
    this.drawPoints();
    this.drawNeedles();
    this.drawCheckpoints();
    this.drawWalls();
    this.drawTrail();
    this.drawShoes();
    this.drawItem();
    this.drawPicto(this.state);
    this.drawParticles();
    this.drawLegend();
  }

  drawPoints() {
    if (!this.state.points || this.state.points.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const pt of this.state.points) {
      // 座標を示す小さな点（●）
      ctx.fillStyle = "#1d4ed8";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 点のすぐ上にラベル（A〜F）を白縁取り付きで大きく表示
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeText(pt.label, pt.x, pt.y - 8);
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText(pt.label, pt.x, pt.y - 8);
    }
    ctx.restore();
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
      
      let currentY = p.y;
      let alpha = 1.0;
      
      if (p.animationType === 'up_down') {
        // 少し上に上がり下に下がる（Sin波の半周期＋少し下がる）
        // progress=0 -> 0, progress=0.5 -> 1, progress=1.0 -> 0
        currentY = p.y - Math.sin(progress * Math.PI) * p.distance;
        // 消える直前(progress > 0.8)だけフェードアウト
        if (progress > 0.8) {
          alpha = (1.0 - progress) * 5;
        }
      } else {
        // デフォルト（上にずっと移動してフェードアウト）
        currentY = p.y - (p.distance * progress);
        alpha = 1.0 - progress;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color || "rgba(255, 100, 100, 1)";
      this.ctx.font = `bold ${p.fontSize || 35}px sans-serif`;
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
    
    // チェックポイントがあるステージ（檻）のみ鉄格子を描画
    if (this.state.checkpoints && this.state.checkpoints.length > 0) {
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
    }
    
    ctx.restore();
  }

  checkWallCollision() {
    if (!this.state.walls || this.state.walls.length === 0) return false;
    if (this.state.checkpoints && this.state.checkpoints.length > 0 && this.state.checkpoints.every(c => c.passed)) {
       return false;
    }
    let m = new DOMMatrix();
    m.translateSelf(this.state.x, this.state.y);
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
    const ctx = this.ctx;
    ctx.save();
    
    for (const nz of this.state.needleZones) {
      const startX = Math.max(0, nz.x);
      const endX = Math.min(this.canvas.width, nz.x + nz.width);
      const startY = Math.max(0, nz.y);
      const endY = Math.min(this.canvas.height, nz.y + nz.height);
      const visW = endX - startX;
      const visH = endY - startY;
      if (visW <= 0 || visH <= 0) continue;

      // 地面の危険エリアの帯（薄い赤）
      ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
      ctx.fillRect(startX, startY, visW, visH);

      // 地面から上向きに生えている針山を描画
      const stepX = 20;
      const stepY = 20;
      for (let y = startY + 18; y <= endY; y += stepY) {
        // 針の根元（地面のライン）
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + 2, y);
        ctx.lineTo(endX - 2, y);
        ctx.stroke();

        // 上向きの針（▲）
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        for (let x = startX + 10; x <= endX - 6; x += stepX) {
          ctx.moveTo(x - 6, y);
          ctx.lineTo(x + 6, y);
          ctx.lineTo(x, y - 14);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawShoes() {
    if (!Array.isArray(this.state.shoes)) return;
    for (const shoe of this.state.shoes) {
      if (shoe && shoe.exists) {
        this.drawShoe("right", shoe, this.shoeRightImg);
      }
    }
  }

  drawShoe(side, shoeState, img) {
    let cx, cy, rotation = 0;
    if (shoeState.isWorn) {
      const legPart = shoeState.foot || "leftLeg"; // 記録された足を使う
      const pos = this.getLegPosition(legPart);
      cx = pos.x;
      cy = pos.y;
      
      const parts = this.state.parts;
      const kneePart = legPart === "rightLeg" ? "rightKnee" : "leftKnee";
      rotation = parts.body.rotation + parts[legPart].rotation + parts[kneePart].rotation;
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
    if (!this.state.hasItem) return;
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
    {
      let baseScale = 0.6;
      if (item.attachedTo) {
        baseScale = 0.6 * (1.0 + 0.25 * Math.sin(Date.now() / 150));
      }
      this.ctx.scale(baseScale, baseScale);
    }
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
    {
      let baseScale = 0.6;
      if (item.attachedTo) {
        baseScale = 0.6 * (1.0 + 0.25 * Math.sin(Date.now() / 150));
      }
      this.ctx.scale(baseScale, baseScale);
    }

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

    // ピクトグラム本体は常に直立（頭が上）で描画
    ctx.save();
    ctx.translate(state.x, state.y);
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

    // 進行方向を示す矢印マーカー（▶）をピクトグラムの外周（目に見えない縦長楕円軌道）の最前面に描画
    ctx.save();
    if (this.isGhostMode) {
      ctx.globalAlpha = 0.5;
    }
    const rad = state.direction * Math.PI / 180;
    const rx = 68;  // 横半径（腕の外側）
    const ry = 104; // 縦半径（頭・足の外側）
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // 中心から進行方向 rad へ伸ばした直線と楕円の交点距離（進む方向と1度もズレない式）
    const orbitR = (rx * ry) / Math.hypot(ry * cos, rx * sin);
    const arrowX = state.x + cos * orbitR;
    const arrowY = state.y + sin * orbitR;

    ctx.translate(arrowX, arrowY);
    ctx.rotate(rad);
    ctx.fillStyle = "#1d4ed8"; // 濃い鮮やかな青
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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

  
  startRenderLoop() {
    if (this._renderLoopId) return;
    const loop = () => {
      if (this.state && (this.state.item.attachedTo || (this.state.particles && this.state.particles.length > 0))) {
        this.draw();
      }
      this._renderLoopId = requestAnimationFrame(loop);
    };
    loop();
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
      } else if (msg.startsWith("向く")) {
        const strMatch = msg.match(/向く\("([^"]+)"\)/);
        const numMatch = msg.match(/向く\(([-.\d]+)\)/);
        if (strMatch) {
          await this.animateFace(strMatch[1]);
        } else if (numMatch) {
          await this.animateFace(parseFloat(numMatch[1]));
        }
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
      } else if (msg.startsWith("靴を履く") || msg.startsWith("履く") || msg.startsWith("右足で履く") || msg.startsWith("左足で履く")) {
        this.equipShoe();
        await this.wait(300);
      } else if (msg.startsWith("靴を脱ぐ") || msg.startsWith("脱ぐ") || msg.startsWith("右足で脱ぐ") || msg.startsWith("左足で脱ぐ")) {
        this.unequipShoe();
        await this.wait(300);
      }
      await this.wait(120);
    }
    
    this.isGhostMode = false;
    this.startRenderLoop();
  }

  getPartAt(canvasX, canvasY) {
    const point = this.toLocalPoint(canvasX, canvasY);
    if (!point) return null;

    const hitAreas = [
      { part: "head", x: 0, y: -70, radius: 28 },
      { part: "leftElbow", x: -42, y: 0, radius: 22 },
      { part: "rightElbow", x: 42, y: 0, radius: 22 },
      { part: "leftKnee", x: -26, y: 78, radius: 22 },
      { part: "rightKnee", x: 26, y: 78, radius: 22 },
      { part: "leftArm", x: -24, y: -20, radius: 24 },
      { part: "rightArm", x: 24, y: -20, radius: 24 },
      { part: "leftLeg", x: -14, y: 52, radius: 24 },
      { part: "rightLeg", x: 14, y: 52, radius: 24 },
      { part: "body", x: 0, y: 0, radius: 32 },
    ];

    const hit = hitAreas.find((area) => this.distance(point.x, point.y, area.x, area.y) <= area.radius);
    return hit ? this.partLabels[hit.part] : null;
  }

  toLocalPoint(canvasX, canvasY) {
    return {
      x: canvasX - this.state.x,
      y: canvasY - this.state.y,
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
    ctx.fillText("向く", boxX + 120, boxY + 45);

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
