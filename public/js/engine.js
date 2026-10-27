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
    initialDirection: -90,
    initialOffset: { x: -180, y: 0 },
    itemOffset: { x: -5, y: -45 },
    goalOffset: { x: 180, y: 0 },
    points: COMMON_POINTS
  },
  // ステージ1：移動・方向転換①（実行するだけでクリア）
  stage1: {
    hasItem: false,
    initialDirection: -90,
    initialOffset: { x: -240, y: -30 },
    goalOffset: { x: 240, y: -30 },
    points: COMMON_POINTS
  },
  // ステージ2：移動・方向転換②（壁なし・異なる初期位置からゴールへ）
  stage2: {
    hasItem: false,
    initialDirection: -90,
    initialOffset: { x: -240, y: 120 },
    goalOffset: { x: 240, y: -30 },
    points: COMMON_POINTS
  },
  // ステージ3：移動・方向転換③（中央の薄い壁を迂回しよう）
  stage3: {
    hasItem: false,
    initialDirection: -90,
    initialOffset: { x: -240, y: -20 },
    goalOffset: { x: 240, y: -40 },
    walls: [
      { x: -7, y: -70, width: 14, height: 80 }
    ],
    points: COMMON_POINTS
  },
  // ステージ4：掴んで運ぶ①（実行するとヒヨコを掴むところまで進む）
  stage4: {
    hasItem: true,
    initialDirection: -90,
    initialOffset: { x: -240, y: -20 },
    itemOffset: { x: 0, y: -40 },
    goalOffset: { x: 240, y: -40 },
    points: COMMON_POINTS
  },
  // ステージ5：掴んで運ぶ②（自分でヒヨコを掴んで運ぼう・while導入）
  stage5: {
    hasItem: true,
    initialDirection: -90,
    initialOffset: { x: -250, y: -20 },
    itemOffset: { x: 50, y: -185 },
    goalOffset: { x: 240, y: -40 },
    points: COMMON_POINTS
  },
  // ステージ6：掴んで運ぶ③（複数ルートでの運搬）
  stage6: {
    hasItem: true,
    initialDirection: -90,
    initialOffset: { x: -250, y: -20 },
    items: [
      { x: 50, y: -185 },
      { x: 50, y:  130 }
    ],
    goalOffset: { x: 250, y: 50 },
    points: COMMON_POINTS
  },
  // ステージ7：靴と針山①（上下2つの靴と縦の針山）
  stage7: {
    hasItem: true,
    initialDirection: -90,
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
  // ステージ8：靴と針山②（左右2つの靴と横の針山）
  stage8: {
    hasItem: true,
    initialDirection: -90,
    initialOffset: { x: 0, y: 30 },
    items: [
      { x: -120, y: -185 },
      { x:  120, y: -185 }
    ],
    goalOffset: { x: 250, y: 70 },
    shoes: [
      { x: -160, y: 10 },
      { x:  160, y: 10 }
    ],
    needleZone: { x: -2000, y: -140, width: 4000, height: 35 },
    points: COMMON_POINTS
  },
  // ステージ9：3羽のヒヨコを運ぼう（繰り返しの活用）
  stage9: {
    hasItem: true,
    requiredGoalCount: 3,
    initialDirection: -90,
    initialOffset: { x: -240, y: -40 },
    goalOffset: { x: 240, y: -40 },
    // 2か所の巣に各3羽（計6羽配置、3羽運べばクリア）
    nests: [
      { x: -160, y: -250, count: 3, label: "A側" },
      { x: -160, y:   90, count: 3, label: "D側" }
    ],
    points: COMMON_POINTS
  },
  // ステージ10：ヒヨコを探そう（条件分岐 if...else）
  stage10: {
    hasItem: true,
    initialDirection: -90,
    initialOffset: { x: -220, y: 130 },
    goalOffset: { x: 0, y: -40 },
    testCases: [
      { x: -160, y: -250, label: "パターン1" }, // パターン1: 左上(A地点)にヒヨコ、右下(F地点)に爆弾
      { x:  280, y:   90, label: "パターン2" }  // パターン2: 右下(F地点)にヒヨコ、左上(A地点)に爆弾
    ],
    points: COMMON_POINTS
  }
};

class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animationMs = 900;
    this.partAnimationMs = 650;
    this.currentStageId = "stage0";
    this.currentTestCase = 0;
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

    this.bombImg = new Image();
    this.bombImg.src = "img/bomb.png";
    this.bombImg.onload = () => { if (!this.isStopped) this.draw(); };

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
    this.currentTestCase = 0;
    this.reset();
  }

  setTestCase(caseIndex) {
    this.currentTestCase = caseIndex;
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
      radius: stage.goalRadius || 80
    };

    const initialDir = stage.initialDirection !== undefined ? stage.initialDirection : -90;
    const initOffsetX = stage.initialOffset ? stage.initialOffset.x : 0;
    const initOffsetY = stage.initialOffset ? stage.initialOffset.y : 0;
    const hasItem = stage.hasItem !== undefined ? stage.hasItem : true;
    let items = [];
    let bombs = [];
    if (stage.nests && stage.nests.length > 0) {
      for (let nIdx = 0; nIdx < stage.nests.length; nIdx++) {
        const nest = stage.nests[nIdx];
        const count = nest.count || 3;
        for (let k = 0; k < count; k++) {
          items.push({
            x: centerX + nest.x,
            y: centerY + nest.y,
            nestId: nIdx,
            nestX: centerX + nest.x,
            nestY: centerY + nest.y,
            attachedTo: null,
            offsetX: 0,
            offsetY: 0
          });
        }
      }
    } else if (stage.testCases && stage.testCases.length > 0) {
      const activeIdx = this.currentTestCase !== undefined ? this.currentTestCase : 0;
      const tc = stage.testCases[activeIdx] || stage.testCases[0];
      items = [{
        x: centerX + tc.x,
        y: centerY + tc.y,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      }];
      for (let i = 0; i < stage.testCases.length; i++) {
        if (i !== activeIdx) {
          const bTc = stage.testCases[i];
          bombs.push({
            x: centerX + bTc.x,
            y: centerY + bTc.y,
            exploded: false
          });
        }
      }
    } else if (stage.items && stage.items.length > 0) {
      items = stage.items.map(offset => ({
        x: centerX + offset.x,
        y: centerY + offset.y,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      }));
    } else if (hasItem) {
      const itemOffset = stage.itemOffset || { x: 0, y: 0 };
      items = [{
        x: centerX + itemOffset.x,
        y: centerY + itemOffset.y,
        attachedTo: null,
        offsetX: 0,
        offsetY: 0
      }];
    }

    this.state = {
      x: centerX + initOffsetX,
      y: centerY + initOffsetY,
      direction: initialDir,
      color: "#2563eb",
      trail: [],
      parts: this.createParts(),
      particles: [],
      hasItem: hasItem,
      items: items,
      bombs: bombs,
      item: items[0] || { x: 0, y: 0, attachedTo: null, offsetX: 0, offsetY: 0 },
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

  grabItem(fromPartRotate = false) {
    if (!this.state.hasItem) return;
    const items = this.state.items || (this.state.item ? [this.state.item] : []);
    // すでにいずれかのヒヨコを掴んでいる場合は絶対に新しいヒヨコを掴まない（全ステージ共通：1匹制限）
    const alreadyHolding = items.some(it => it && it.attachedTo !== null);
    if (alreadyHolding) return;

    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    // 掴む()直接呼び出しはグレー点線円と同じ半径21、部位回転による接触は少し広い半径36
    const grabRadius = fromPartRotate ? 36 : 21;

    if (!this.isGhostMode && this.state.bombs && this.state.bombs.length > 0) {
      for (const bomb of this.state.bombs) {
        const distL = this.distance(leftHand.x, leftHand.y, bomb.x, bomb.y);
        const distR = this.distance(rightHand.x, rightHand.y, bomb.x, bomb.y);
        if (distL <= grabRadius || distR <= grabRadius) {
          bomb.exploded = true;
          this.state.particles.push({
            x: bomb.x, y: bomb.y - 10, text: "💥", startTime: Date.now(), duration: 1500, distance: 35, color: "rgba(239, 68, 68, 1)", animationType: 'up_down', fontSize: 36
          });
          this.draw();
          throw new Error("爆弾を掴んでしまった！（ゲームオーバー）");
        }
      }
    }

    for (const item of this.state.items) {
      if (item.attachedTo) continue;
      // すでにゴールに運んで離した後は再キャッチしない
      if (this.state.hasGrabbedItem && this.distance(item.x, item.y, this.goal.x, this.goal.y) <= this.goal.radius) {
        continue;
      }

      const distL = this.distance(leftHand.x, leftHand.y, item.x, item.y);
      const distR = this.distance(rightHand.x, rightHand.y, item.x, item.y);

      if (distL <= grabRadius) {
        item.attachedTo = "leftArm";
        item.offsetX = 0;
        item.offsetY = 0;
        this.state.hasGrabbedItem = true;
        this.state.item = item;
        this.state.particles.push({
          x: item.x + 30, y: item.y - 30, text: "♪", startTime: Date.now(), duration: 1200, distance: 30, color: "rgba(255, 150, 0, 1)", animationType: 'up_down'
        });
        break;
      } else if (distR <= grabRadius) {
        item.attachedTo = "rightArm";
        item.offsetX = 0;
        item.offsetY = 0;
        this.state.hasGrabbedItem = true;
        this.state.item = item;
        this.state.particles.push({
          x: item.x + 30, y: item.y - 30, text: "♪", startTime: Date.now(), duration: 1200, distance: 30, color: "rgba(255, 150, 0, 1)", animationType: 'up_down'
        });
        break;
      }
    }
    this.draw();
  }

  // ピクトグラム全身の主要12点（頭・胴体・肩・肘・手・膝・足）の座標を返す
  getPictoPoints() {
    const parts = this.state.parts;
    const base = () => {
      const m = new DOMMatrix();
      m.translateSelf(this.state.x, this.state.y);
      m.scaleSelf(0.6, 0.6);
      m.rotateSelf(parts.body.rotation);
      return m;
    };

    const mh = base();
    mh.translateSelf(0, -82);
    mh.rotateSelf(parts.head.rotation);
    mh.translateSelf(0, -28);
    const head = { x: mh.e, y: mh.f, label: "頭" };

    const mls = base(); mls.translateSelf(-18, -42);
    const leftShoulder = { x: mls.e, y: mls.f, label: "左肩" };
    mls.rotateSelf(parts.leftArm.rotation); mls.translateSelf(-35, 29);
    const leftElbow = { x: mls.e, y: mls.f, label: "左肘" };

    const mrs = base(); mrs.translateSelf(18, -42);
    const rightShoulder = { x: mrs.e, y: mrs.f, label: "右肩" };
    mrs.rotateSelf(parts.rightArm.rotation); mrs.translateSelf(35, 29);
    const rightElbow = { x: mrs.e, y: mrs.f, label: "右肘" };

    const mlk = base(); mlk.translateSelf(-10, 64);
    mlk.rotateSelf(parts.leftLeg.rotation); mlk.translateSelf(-22, 44);
    const leftKnee = { x: mlk.e, y: mlk.f, label: "左膝" };

    const mrk = base(); mrk.translateSelf(10, 64);
    mrk.rotateSelf(parts.rightLeg.rotation); mrk.translateSelf(22, 44);
    const rightKnee = { x: mrk.e, y: mrk.f, label: "右膝" };

    const leftHand = this.getHandPosition("leftArm");
    const rightHand = this.getHandPosition("rightArm");
    const leftFoot = this.getLegPosition("leftLeg");
    const rightFoot = this.getLegPosition("rightLeg");

    return [
      { x: this.state.x, y: this.state.y, label: "体中心" },
      head,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      { x: leftHand.x, y: leftHand.y, label: "左手" },
      { x: rightHand.x, y: rightHand.y, label: "右手" },
      leftKnee,
      rightKnee,
      { x: leftFoot.x, y: leftFoot.y, label: "左足" },
      { x: rightFoot.x, y: rightFoot.y, label: "右足" }
    ];
  }

  isNearItem() {
    if (!this.state.hasItem || !this.state.items) return false;
    const pts = this.getPictoPoints();
    const nearRadius = 70;

    // ゴールに運ばれてすでに離されたヒヨコはアクティブ判定から除外
    const activeItems = this.state.items.filter(item =>
      item.attachedTo || (this.distance(item.x, item.y, this.goal.x, this.goal.y) > this.goal.radius)
    );

    return activeItems.some(item =>
      pts.some(p => this.distance(p.x, p.y, item.x, item.y) <= nearRadius)
    );
  }

  isNearTarget(label) {
    if (!label || label === "ヒヨコ") {
      return this.isNearItem();
    }
    const target = String(label).trim();
    const pts = this.getPictoPoints();
    if (target === "爆弾") {
      if (!this.state.bombs || this.state.bombs.length === 0) return false;
      const nearRadius = 70;
      return this.state.bombs.some(bomb =>
        pts.some(p => this.distance(p.x, p.y, bomb.x, bomb.y) <= nearRadius)
      );
    }
    if (target === "靴") {
      if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return true;
      const unworn = this.state.shoes.filter(s => s.exists && !s.isWorn);
      if (unworn.length === 0) return true;
      const nearRadius = 70;
      return unworn.some(shoe =>
        pts.some(p => this.distance(p.x, p.y, shoe.x, shoe.y) <= nearRadius)
      );
    }
    if (target === "ゴール" || target.toUpperCase() === "GOAL") {
      const goalNearRadius = 125; // ゴール円(80)より大きく余裕を持たせた判定半径
      return pts.some(p => this.distance(p.x, p.y, this.goal.x, this.goal.y) <= goalNearRadius);
    }
    if (this.state.points) {
      const pt = this.state.points.find(p => p.label === target);
      if (pt) {
        return this.distance(this.state.x, this.state.y, pt.x, pt.y) <= 28;
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
    const items = this.state.items || (this.state.item ? [this.state.item] : []);
    for (const it of items) {
      if (it.attachedTo) {
        const handPos = this.getHandPosition(it.attachedTo);
        it.x = handPos.x + it.offsetX;
        it.y = handPos.y + it.offsetY;
        // ピクトグラムが「近くにいる("ゴール")」の範囲内に入っている状態で離した場合は、腕の向きに関わらずゴール内に着地させる
        const itemDistToGoal = this.distance(it.x, it.y, this.goal.x, this.goal.y);
        if (this.isNearTarget("ゴール") && itemDistToGoal > this.goal.radius - 10) {
          const angle = Math.atan2(it.y - this.goal.y, it.x - this.goal.x);
          const targetR = this.goal.radius - 15;
          it.x = this.goal.x + Math.cos(angle) * targetR;
          it.y = this.goal.y + Math.sin(angle) * targetR;
        }
        it.attachedTo = null;
        
        const status = this.evaluateGoalStatus();
        if (status === "ゴールした") {
          this.spawnGoalParticles(it.x + 30, it.y - 30);
        }
      }
    }
    if (this.state.item) {
      this.state.item.attachedTo = null;
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

  equipShoe(fromPartRotate = false) {
    if (!Array.isArray(this.state.shoes) || this.state.shoes.length === 0) return;

    // 靴を履く()直接呼び出しはグレー点線円と同じ半径24、部位回転による接触は少し広い半径36（どちらも足先で判定）
    const grabRadius = fromPartRotate ? 36 : 24;
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
        if (distLeg <= minDist) {
          minDist = distLeg;
          closestShoe = shoe;
        }
      }

      if (closestShoe) {
        closestShoe.isWorn = true;
        closestShoe.foot = legPart;
        break; // 1回の操作で1足ずつ履く
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
    if (Array.isArray(this.state.bombs)) {
      for (const bomb of this.state.bombs) {
        if (this.distance(canvasX, canvasY, bomb.x, bomb.y) <= 35) {
          return "爆弾";
        }
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
    // ヒヨコがいないステージ（ステージ1〜3）はピクトグラム自身がGOALに入ればクリア
    if (!this.state.hasItem) {
      if (this.isNearTarget("ゴール")) {
        return "ゴールした";
      }
      return "ゴールに届いていない";
    }

    const items = this.state.items || (this.state.item ? [this.state.item] : []);
    const hasGrabbed = this.state.hasGrabbedItem;
    if (!hasGrabbed) return "物を持っていない";

    let inGoalCount = 0;
    let anyInGoalAndAttached = false;

    for (const item of items) {
      const dist = this.distance(item.x, item.y, this.goal.x, this.goal.y);
      if (dist <= this.goal.radius) {
        if (item.attachedTo === null) {
          inGoalCount++;
        } else {
          anyInGoalAndAttached = true;
        }
      }
    }

    const stageDef = STAGES[this.currentStageId];
    const requiredCount = stageDef && stageDef.requiredGoalCount ? stageDef.requiredGoalCount : (stageDef && stageDef.requireAllItems ? items.length : 1);

    if (inGoalCount >= requiredCount) {
      return "ゴールした";
    }
    if (anyInGoalAndAttached) return "ゴールしていたが離していない";
    if (inGoalCount > 0) return `まだヒヨコが残っている（${inGoalCount}/${requiredCount}羽）`;
    return "持ったがゴールに入れていない";
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
      if (distToTarget > 0 && distToTarget <= distance + 22) {
        endX = this.state.targetPoint.x;
        endY = this.state.targetPoint.y;
      }
    } else if (distance > 0 && this.state.points && this.state.points.length > 0) {
      // 角度指定などで歩いている場合も、途中に地点の中心があればそこへ吸着して飛び越しを防ぐ
      for (const pt of this.state.points) {
        const distStart = this.distance(startX, startY, pt.x, pt.y);
        if (distStart > 5 && distStart <= distance + 22) {
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
    if (label === "ゴール" || label.toUpperCase() === "GOAL" || label === "ヒヨコ" || label === "靴" || label === "爆弾") {
      throw new Error(`"${label}" には直接向くことができません。地点("A"など)や角度(数字)を指定してください`);
    }

    let pt = (this.state.points || []).find(p => p.label === label);
    if (!pt && this.state.checkpoints) {
      pt = this.state.checkpoints.find(c => c.label === label || c.num === label);
    }
    if (!pt) {
      throw new Error(`"${label}" という地点は見つかりません`);
    }
    const tx = pt.x;
    const ty = pt.y;
    this.state.targetPoint = { x: tx, y: ty, label: label };

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

    let partError = null;
    await this.animate(this.partAnimationMs, (progress) => {
      part.rotation = this.lerp(start, end, progress);
      // 腕を動かしている最中にヒヨコに触れたら自動で掴む（爆弾に触れたらエラー停止）
      const alreadyHolding = (this.state.items || [this.state.item]).some(it => it && it.attachedTo !== null);
      if (isArmPart && this.state.hasItem && !alreadyHolding) {
        try {
          this.grabItem(true);
        } catch (err) {
          partError = err;
          this.isStopped = true;
          return false;
        }
      }
      // 足を動かしている最中に靴に触れたら自動で履く
      if (isLegPart) {
        this.equipShoe(true);
      }
      this.draw();
    });

    if (partError) throw partError;
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
    this.drawShoes(false);
    this.drawItem(false);
    this.drawPicto(this.state);
    this.drawShoes(true);
    this.drawItem(true);
    if (this.showDebugRanges !== false) {
      this.drawDebugRanges();
    }
    this.drawParticles();
    this.drawLegend();
  }

  drawDebugRanges() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";

    const drawLabel = (text, x, y, color) => {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    // 1. 地点 A〜F の「近くにいる」範囲 (r = 28)
    if (this.state.points) {
      for (const pt of this.state.points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(14, 165, 233, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(14, 165, 233, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        drawLabel("地点判定(28)", pt.x, pt.y + 40, "#0284c7");
      }
    }

    // 2. ゴールの「近くにいる」範囲 (r = 125: ゴール円80より大幅に大きい)
    if (this.goal) {
      const goalNearR = 125;
      ctx.beginPath();
      ctx.arc(this.goal.x, this.goal.y, goalNearR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(217, 119, 6, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      drawLabel(`近くにいる("ゴール") (${goalNearR})`, this.goal.x, this.goal.y + goalNearR + 14, "#b45309");
    }

    // 3. ヒヨコ・爆弾の「近くにいる(70)」と「掴む・爆発(36)」範囲
    const targets = [];
    if (this.state.hasItem && this.state.items) {
      const seenNests = new Set();
      for (const it of this.state.items) {
        if (it.attachedTo) continue;
        if (it.nestId !== undefined) {
          if (seenNests.has(it.nestId)) continue;
          seenNests.add(it.nestId);
        }
        targets.push({ x: it.x, y: it.y, name: "ヒヨコ" });
      }
    }
    if (this.state.bombs) {
      for (const b of this.state.bombs) {
        targets.push({ x: b.x, y: b.y, name: "爆弾" });
      }
    }
    for (const t of targets) {
      // 外側：近くにいる範囲 (r = 70)
      ctx.beginPath();
      ctx.arc(t.x, t.y, 70, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(37, 99, 235, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      drawLabel(`近くにいる("${t.name}") (70)`, t.x, t.y + 84, "#1d4ed8");

      // 内側：部位回転で掴む・爆発する範囲 (r = 36) ＆ 掴む()直接の範囲 (グレー点線 r = 21)
      ctx.beginPath();
      ctx.arc(t.x, t.y, 36, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
      drawLabel(t.name === "爆弾" ? "部位回転:爆発(36) / 掴む():点線(21)" : "部位回転:掴む(36) / 掴む():点線(21)", t.x, t.y - 42, "#dc2626");
    }

    // 4. 靴の「近くにいる(70)」と「部位回転で履く(36)」範囲
    if (this.state.shoes) {
      for (const shoe of this.state.shoes) {
        if (!shoe.exists || shoe.isWorn) continue;
        // 外側：近くにいる("靴") (r = 70)
        ctx.beginPath();
        ctx.arc(shoe.x, shoe.y, 70, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(147, 51, 234, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(147, 51, 234, 0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        drawLabel("近くにいる(\"靴\") (70)", shoe.x, shoe.y + 84, "#7e22ce");

        // 内側：部位回転で履く判定 (r = 36) ＆ 靴を履く()直接の範囲 (グレー点線 r = 24)
        ctx.beginPath();
        ctx.arc(shoe.x, shoe.y, 36, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
        drawLabel("部位回転:履く(36) / 履く():点線(24)", shoe.x, shoe.y - 42, "#dc2626");
      }
    }

    // 5. ピクトグラム全身の判定基準点（12点：頭・胴体・肩・肘・手・膝・足）を可視化
    const allPts = this.getPictoPoints();
    ctx.setLineDash([]);
    for (const cp of allPts) {
      const isHand = cp.label === "左手" || cp.label === "右手";
      const isFoot = cp.label === "左足" || cp.label === "右足";
      const isCenter = cp.label === "体中心";
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, isHand || isFoot || isCenter ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isHand ? "#ef4444" : (isFoot ? "#9333ea" : (isCenter ? "#10b981" : "#3b82f6"));
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    ctx.restore();
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

  drawShoes(wornOnly = false) {
    if (!Array.isArray(this.state.shoes)) return;
    for (const shoe of this.state.shoes) {
      if (shoe && shoe.exists && Boolean(shoe.isWorn) === wornOnly) {
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

  drawItem(attachedOnly = false) {
    if (!this.state.hasItem) return;
    const stage = STAGES[this.currentStageId];
    const items = this.state.items || (this.state.item ? [this.state.item] : []);
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 + 40;

    // ステージ9：2か所の巣とヒヨコ羽数バッジ（③、②、①）を描画（背面レイヤーのみ）
    if (!attachedOnly && stage && stage.nests && stage.nests.length > 0) {
      for (let nIdx = 0; nIdx < stage.nests.length; nIdx++) {
        const nest = stage.nests[nIdx];
        const nx = centerX + nest.x;
        const ny = centerY + nest.y;

        // 巣の台座
        this.ctx.save();
        this.ctx.translate(nx, ny);
        this.ctx.fillStyle = "#fef3c7";
        this.ctx.strokeStyle = "#f59e0b";
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 18, 28, 12, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.strokeStyle = "#d97706";
        this.ctx.lineWidth = 1.5;
        for (let ox = -16; ox <= 16; ox += 8) {
          this.ctx.beginPath();
          this.ctx.moveTo(ox - 3, 12);
          this.ctx.lineTo(ox + 3, 24);
          this.ctx.stroke();
        }
        this.ctx.restore();

        // この巣に残っているヒヨコ数をカウント
        const remaining = items.filter(it => it.nestId === nIdx && !it.attachedTo && (this.distance(it.x, it.y, this.goal.x, this.goal.y) > this.goal.radius)).length;
        
        if (remaining > 0) {
          // 残り羽数のバッジ（丸バッジ：オレンジ地に白文字）
          this.ctx.save();
          this.ctx.fillStyle = "#ea580c";
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(nx + 20, ny - 16, 12, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = "#ffffff";
          this.ctx.font = "bold 13px sans-serif";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(remaining, nx + 20, ny - 16);
          this.ctx.restore();
        }
      }
    }

    // ステージ10：テストケース用の巣を描画（背面レイヤーのみ）
    if (!attachedOnly && stage && stage.testCases && stage.testCases.length > 0) {
      for (let tIdx = 0; tIdx < stage.testCases.length; tIdx++) {
        const tc = stage.testCases[tIdx];
        const tx = centerX + tc.x;
        const ty = centerY + tc.y;

        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.fillStyle = "#fef3c7";
        this.ctx.strokeStyle = tIdx === (this.currentTestCase || 0) ? "#f59e0b" : "#cbd5e1";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 18, 26, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 爆弾（危険物）の描画（背面レイヤーのみ）
    if (!attachedOnly && this.state.bombs && this.state.bombs.length > 0) {
      for (const bomb of this.state.bombs) {
        this.ctx.save();
        this.ctx.translate(bomb.x, bomb.y);
        this.ctx.scale(0.6, 0.6);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 35, 0, Math.PI * 2);
        if (bomb.exploded) {
          this.ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
          this.ctx.fill();
          this.ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
          this.ctx.lineWidth = 3;
        } else {
          this.ctx.strokeStyle = "rgba(107, 114, 128, 0.6)";
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([6, 4]);
        }
        this.ctx.stroke();

        if (this.isGhostMode) {
          this.ctx.globalAlpha = 0.5;
        }
        if (this.bombImg && this.bombImg.complete && this.bombImg.naturalWidth > 0) {
          const w = 95;
          const h = (w / this.bombImg.naturalWidth) * this.bombImg.naturalHeight;
          this.ctx.drawImage(this.bombImg, -w / 2, -h / 2, w, h);
        } else {
          this.ctx.fillStyle = "#1e293b";
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 24, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      }
    }

    const drawnNestIds = new Set();
    for (const item of items) {
      if (Boolean(item.attachedTo) !== attachedOnly) {
        continue;
      }
      if (item.nestId !== undefined && !item.attachedTo && (this.distance(item.x, item.y, this.goal.x, this.goal.y) > this.goal.radius)) {
        if (drawnNestIds.has(item.nestId)) {
          continue;
        }
        drawnNestIds.add(item.nestId);
      }
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
      
      if (item.attachedTo) {
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
      const anyItemAttached = (this.state && this.state.items) ? this.state.items.some(it => it && it.attachedTo !== null) : (this.state && this.state.item && this.state.item.attachedTo);
      if (this.state && (anyItemAttached || (this.state.particles && this.state.particles.length > 0))) {
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
