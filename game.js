(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const loadingScreen = document.querySelector("#loading-screen");
  const loadingProgress = document.querySelector("#loading-progress");
  const playerHealth = document.querySelector("#player-health");
  const healthValue = document.querySelector("#health-value");
  const fullscreenButton = document.querySelector("#fullscreen-button");
  const gameMenu = document.querySelector("#game-menu");
  const menuEyebrow = document.querySelector("#menu-eyebrow");
  const playButton = document.querySelector("#play-button");
  const playLabel = document.querySelector("#play-label");
  const controlsButton = document.querySelector("#controls-button");
  const menuFullscreenButton = document.querySelector("#menu-fullscreen-button");
  const backButton = document.querySelector("#back-button");
  const menuMainActions = document.querySelector("#menu-main-actions");
  const menuHelp = document.querySelector("#menu-help");
  const fireGemIcon = document.querySelector("#fire-gem");
  const blueGemIcon = document.querySelector("#blue-gem");
  const gameOverScreen = document.querySelector("#game-over-screen");
  const gameOverStats = document.querySelector("#game-over-stats");
  const retryButton = document.querySelector("#retry-button");
  const gameOverMenuButton = document.querySelector("#game-over-menu-button");
  const inventoryScreen = document.querySelector("#inventory-screen");
  const inventoryCloseButton = document.querySelector("#inventory-close-button");
  const inventoryKillCount = document.querySelector("#inventory-kill-count");
  const inventoryCapacity = document.querySelector("#inventory-capacity");
  const inventoryFireItem = document.querySelector("#inventory-fire-item");
  const inventoryBlueItem = document.querySelector("#inventory-blue-item");
  const inventoryFoxItem = document.querySelector("#inventory-fox-item");
  const inventoryDetail = document.querySelector("#inventory-detail");
  const AUDIO_ROOT = "assets/audio";
  const chestSound = new Audio(`${AUDIO_ROOT}/treasure-open.wav`);
  chestSound.preload = "auto";
  chestSound.volume = 0.72;

  function createSoundPool(src, volume, size = 3) {
    return {
      index: 0,
      volume,
      sounds: Array.from({ length: size }, () => {
        const sound = new Audio(src);
        sound.preload = "auto";
        sound.volume = volume;
        return sound;
      }),
    };
  }

  const soundPools = {
    swordFast: createSoundPool(`${AUDIO_ROOT}/dragon-studio-sword-slice-393847.mp3`, 0.42, 4),
    swordStrong: createSoundPool(`${AUDIO_ROOT}/musicholder-sword-sound-260274.mp3`, 0.5, 4),
    fireSpell: createSoundPool(`${AUDIO_ROOT}/dragon-studio-fire-spell-impact-393921.mp3`, 0.24, 4),
    waterSpell: createSoundPool(`${AUDIO_ROOT}/dragon-studio-elemental-spell-impact-water-478377.mp3`, 0.22, 4),
    waterSplash: createSoundPool(`${AUDIO_ROOT}/universfield-water-splash-199583.mp3`, 0.2, 3),
    waterSlime: createSoundPool(`${AUDIO_ROOT}/u_suxeprk67p-slime-water-3-381256.mp3`, 0.34, 3),
    slimeHurt: createSoundPool(`${AUDIO_ROOT}/floraphonic-goopy-slime-4-219777.mp3`, 0.34, 4),
    slimeJump: createSoundPool(`${AUDIO_ROOT}/freesound_community-slimejump-6913.mp3`, 0.3, 3),
    footstep: createSoundPool(`${AUDIO_ROOT}/freesound_community-snow-step-1-81064.mp3`, 0.16, 5),
  };

  const ambience = {
    rain: new Audio(`${AUDIO_ROOT}/dragon-studio-gentle-midday-rain-499668.mp3`),
    wind: new Audio(`${AUDIO_ROOT}/storegraphic-soft-wind-477404.mp3`),
  };
  ambience.rain.loop = true;
  ambience.rain.preload = "auto";
  ambience.rain.volume = 0.2;
  ambience.wind.loop = true;
  ambience.wind.preload = "auto";
  ambience.wind.volume = 0.1;

  function playSound(name, rate = 1) {
    const pool = soundPools[name];
    if (!pool) return;
    const sound = pool.sounds.find((candidate) => candidate.paused || candidate.ended)
      || pool.sounds[pool.index];
    pool.index = (pool.index + 1) % pool.sounds.length;
    sound.pause();
    sound.currentTime = 0;
    sound.volume = pool.volume;
    sound.playbackRate = Math.max(0.78, Math.min(1.24, rate));
    const playback = sound.play();
    if (playback) playback.catch(() => {});
  }

  function pauseAmbience() {
    ambience.rain.pause();
    ambience.wind.pause();
  }

  function resumeAmbience() {
    if (state.paused || state.gameOver || !state.hasStarted) return;
    for (const sound of Object.values(ambience)) {
      const playback = sound.play();
      if (playback) playback.catch(() => {});
    }
  }

  const FRAME_WIDTH = 96;
  const FRAME_HEIGHT = 80;
  const FRAME_COUNT = 8;
  const WORLD = { width: 1800, height: 1100, margin: 70 };
  const SCALE = 2.35;
  const SPEED = 230;
  const SLIME_FRAME_SIZE = 64;
  const SLIME_IDLE_FRAMES = 16;
  const SLIME_HURT_FRAMES = 11;
  const SLIME_SCALE = 2.45;
  const SLIME_SPEED = 82;
  const SLIME_HURT_DURATION = 0.45;
  const WATER_SLIME_FRAME_WIDTH = 32;
  const WATER_SLIME_FRAME_HEIGHT = 25;
  const WATER_SLIME_SCALE = 3.65;
  const WATER_SLIME_ROOT = "assets/sprites/enemies/water";
  const waterSlimeAnimations = {
    idle: { frames: 4, fps: 6, loop: true },
    move: { frames: 4, fps: 10, loop: true },
    attack: { frames: 5, fps: 11, loop: false },
    hurt: { frames: 4, fps: 11, loop: false },
    die: { frames: 4, fps: 9, loop: false },
  };
  const slimeTypes = {
    classic: {
      maxHealth: 100,
      speed: SLIME_SPEED,
      damage: 10,
      attackCooldown: 1.05,
      label: "SLIME",
      barColor: "#e3902f",
      hitColor: "#f5b33e",
    },
    water: {
      maxHealth: 90,
      speed: 94,
      damage: 8,
      attackCooldown: 1.12,
      label: "SLIME D'ÁGUA",
      barColor: "#48acd5",
      hitColor: "#62cef1",
    },
  };
  const FOX_ALERT_ENTER_DISTANCE = 255;
  const FOX_ALERT_EXIT_DISTANCE = 310;
  const directions = ["down", "left", "right", "up"];
  const animationConfig = {
    idle: { fps: 7, loop: true },
    run: { fps: 12, loop: true },
    attack1: { fps: 15, loop: false },
    attack2: { fps: 13, loop: false },
  };
  const EFFECT_FRAME_SIZE = 16;
  const EFFECT_SHEET_ROOT = "assets/effects";
  const projectileVariants = [
    { startColumn: 24, row: 0, frames: 5, fps: 13, scale: 2.55 },
    { startColumn: 14, row: 2, frames: 4, fps: 11, scale: 2.75 },
    { startColumn: 19, row: 4, frames: 4, fps: 12, scale: 2.65 },
    { startColumn: 30, row: 0, frames: 6, fps: 14, scale: 2.55 },
    { startColumn: 14, row: 9, frames: 4, fps: 10, scale: 2.8 },
  ];
  const powerConfig = {
    fire: {
      speed: 430,
      damage: 34,
      knockback: 48,
      cooldown: 0.46,
      maxAge: 1.28,
      visualScale: 1,
      color: "#ff8f2d",
      accent: "#ffd36b",
    },
    water: {
      speed: 390,
      damage: 27,
      knockback: 34,
      cooldown: 0.42,
      maxAge: 1.38,
      visualScale: 0.68,
      color: "#3bbcff",
      accent: "#b8efff",
    },
  };

  const spriteRoot = "assets/sprites/player";
  const animationFolders = {
    idle: "idle",
    run: "run",
    attack1: "attack1",
    attack2: "attack2",
  };

  const state = {
    loaded: false,
    paused: true,
    hasStarted: false,
    gameOver: false,
    inventoryOpen: false,
    lastTime: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: 1,
    camera: { x: WORLD.width / 2, y: WORLD.height / 2 },
    keys: new Set(),
    queuedAttack: null,
    particles: [],
    projectiles: [],
    powerCooldowns: { fire: 0, water: 0 },
    projectileVariantBags: { fire: [], water: [] },
    lastProjectileVariant: { fire: -1, water: -1 },
    powerAim: { x: 0, y: 1 },
    rain: {
      drops: [],
      splashes: [],
    },
    trees: [
      { x: 300 + Math.random() * 80, y: 265 + Math.random() * 70, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 490 + Math.random() * 85, y: 830 + Math.random() * 75, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 785 + Math.random() * 90, y: 210 + Math.random() * 65, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 1380 + Math.random() * 90, y: 285 + Math.random() * 75, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 1440 + Math.random() * 80, y: 815 + Math.random() * 80, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 180 + Math.random() * 85, y: 545 + Math.random() * 90, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 710 + Math.random() * 90, y: 970 + Math.random() * 55, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 1090 + Math.random() * 95, y: 125 + Math.random() * 70, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
      { x: 1580 + Math.random() * 80, y: 520 + Math.random() * 90, animationTime: Math.random() * 3, fps: 4.3 + Math.random() * 1.4, petalTimer: 2 + Math.random() * 5 },
    ],
    petals: [],
    kills: 0,
    player: {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      direction: "down",
      action: "idle",
      frame: 0,
      animationTime: 0,
      moving: false,
      step: 0,
      lastStepSound: 0,
      health: 100,
      maxHealth: 100,
      invulnerable: 0,
      attackHitApplied: false,
      attackAim: { x: 0, y: 1 },
    },
    enemy: {
      x: WORLD.width / 2 + 310,
      y: WORLD.height / 2 - 90,
      type: "water",
      health: slimeTypes.water.maxHealth,
      maxHealth: slimeTypes.water.maxHealth,
      alive: true,
      dying: false,
      deathTime: 0,
      animationTime: 0,
      hurtTime: 0,
      moving: false,
      facing: "left",
      attacking: false,
      attackTime: 0,
      attackHitApplied: false,
      attackCooldown: 0.4,
      respawnTime: 0,
      spawnCount: 0,
    },
    chests: [
      {
        id: 1,
        milestone: 5,
        x: WORLD.width / 2 - 270,
        y: WORLD.height / 2 + 125,
        active: false,
        opened: false,
        near: false,
        openTime: 0,
        rewardType: null,
      },
      {
        id: 2,
        milestone: 10,
        x: WORLD.width / 2 + 285,
        y: WORLD.height / 2 + 145,
        active: false,
        opened: false,
        near: false,
        openTime: 0,
        rewardType: null,
      },
    ],
    gems: [],
    inventory: {
      fire: false,
      blue: false,
    },
    fox: {
      active: false,
      x: WORLD.width / 2,
      y: WORLD.height / 2 + 72,
      moving: false,
      alert: false,
      facing: "right",
      animationTime: 0,
    },
  };

  const sprites = {};

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Não foi possível carregar: ${src}`));
      image.src = src;
    });
  }

  async function loadSprites() {
    const jobs = [];
    let loadedCount = 0;
    const waterSlimeFrameTotal = Object.values(waterSlimeAnimations)
      .reduce((total, animation) => total + animation.frames, 0);
    const totalSprites = 23 + waterSlimeFrameTotal;
    const registerLoaded = () => {
      loadedCount += 1;
      loadingProgress.style.width = `${(loadedCount / totalSprites) * 100}%`;
    };

    for (const [action, folder] of Object.entries(animationFolders)) {
      sprites[action] = {};
      for (const direction of directions) {
        const src = `${spriteRoot}/${folder}/${action}_${direction}.png`;
        jobs.push(
          loadImage(src).then((image) => {
            sprites[action][direction] = image;
            registerLoaded();
          }),
        );
      }
    }

    jobs.push(
      loadImage("assets/sprites/enemies/classic.png").then((image) => {
        sprites.slime = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage("assets/sprites/environment/treasure-chest.png").then((image) => {
        sprites.chest = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage("assets/ui/fantasy.png").then((image) => {
        sprites.ui = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage("assets/sprites/companions/fox.png").then((image) => {
        sprites.fox = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage("assets/sprites/environment/autumn-tree.png").then((image) => {
        sprites.tree = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage(`${EFFECT_SHEET_ROOT}/fire.png`).then((image) => {
        sprites.fireEffects = image;
        registerLoaded();
      }),
    );
    jobs.push(
      loadImage(`${EFFECT_SHEET_ROOT}/water.png`).then((image) => {
        sprites.waterEffects = image;
        registerLoaded();
      }),
    );

    sprites.waterSlime = {};
    for (const [action, animation] of Object.entries(waterSlimeAnimations)) {
      sprites.waterSlime[action] = [];
      for (let frame = 0; frame < animation.frames; frame += 1) {
        const src = `${WATER_SLIME_ROOT}/slime-${action}-${frame}.png`;
        jobs.push(
          loadImage(src).then((image) => {
            sprites.waterSlime[action][frame] = image;
            registerLoaded();
          }),
        );
      }
    }

    await Promise.all(jobs);
    state.loaded = true;
    loadingProgress.style.width = "100%";
    window.setTimeout(() => loadingScreen.classList.add("hidden"), 180);
    canvas.focus();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.round(rect.width * state.dpr);
    canvas.height = Math.round(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ensureRainDensity();
  }

  function resetRainDrop(drop, initial = false) {
    drop.vx = 105 + Math.random() * 55;
    drop.vy = 470 + Math.random() * 150;
    drop.x = -90 + Math.random() * (state.width + 120);
    drop.y = initial
      ? -40 + Math.random() * (state.height + 40)
      : -30 - Math.random() * Math.min(220, state.height * 0.35);
    const maxFlight = Math.max(0.18, (state.height - drop.y) / drop.vy);
    drop.life = 0.16 + Math.random() * Math.max(0.06, maxFlight - 0.16);
    drop.segments = 2 + Math.floor(Math.random() * 3);
    drop.alpha = 0.58 + Math.random() * 0.3;
  }

  function ensureRainDensity() {
    const desiredCount = Math.max(
      52,
      Math.min(145, Math.round((state.width * state.height) / 10800)),
    );
    while (state.rain.drops.length < desiredCount) {
      const drop = {};
      resetRainDrop(drop, true);
      state.rain.drops.push(drop);
    }
    if (state.rain.drops.length > desiredCount) {
      state.rain.drops.length = desiredCount;
    }
  }

  function spawnRainSplash(x, y) {
    if (x < -8 || x > state.width + 8 || y < 0 || y > state.height) return;
    state.rain.splashes.push({
      x: x - state.width / 2 + state.camera.x,
      y: y - state.height / 2 + state.camera.y,
      age: 0,
      duration: 0.22 + Math.random() * 0.12,
    });
    if (state.rain.splashes.length > 90) state.rain.splashes.shift();
  }

  function updateRain(dt) {
    for (const drop of state.rain.drops) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.life -= dt;
      if (drop.life <= 0 || drop.y > state.height + 18 || drop.x > state.width + 28) {
        if (drop.life <= 0) spawnRainSplash(drop.x, drop.y);
        resetRainDrop(drop);
      }
    }

    for (const splash of state.rain.splashes) splash.age += dt;
    state.rain.splashes = state.rain.splashes.filter(
      (splash) => splash.age < splash.duration,
    );
  }

  function setInventoryItemState(element, owned, ownedLabel, lockedLabel) {
    element.classList.toggle("owned", owned);
    element.classList.toggle("locked", !owned);
    element.setAttribute("aria-label", owned ? ownedLabel : lockedLabel);
  }

  function updateInventoryUI() {
    inventoryKillCount.textContent = String(state.kills);
    setInventoryItemState(
      inventoryFireItem,
      state.inventory.fire,
      "Gema de fogo: obtida",
      "Gema de fogo: não obtida",
    );
    setInventoryItemState(
      inventoryBlueItem,
      state.inventory.blue,
      "Gema d'água: obtida",
      "Gema d'água: não obtida",
    );
    setInventoryItemState(
      inventoryFoxItem,
      state.fox.active,
      "Raposa companheira: desbloqueada",
      "Raposa companheira: bloqueada",
    );

    const obtained = Number(state.inventory.fire) + Number(state.inventory.blue);
    const occupiedSlots = obtained + Number(state.fox.active);
    inventoryCapacity.textContent = `${occupiedSlots} / 3`;
    inventoryDetail.textContent = obtained === 2
      ? "Poderes de fogo e água ativos • a raposa despertou"
      : `${obtained} de 2 gemas coletadas`;
  }

  function showInventoryItemDetail(element) {
    const owned = element.classList.contains("owned");
    inventoryDetail.textContent = `${element.dataset.detail} • ${owned ? "obtido" : "bloqueado"}`;
  }

  function openInventory() {
    if (
      state.gameOver
      || state.inventoryOpen
      || !state.hasStarted
      || state.paused
    ) {
      return;
    }
    state.inventoryOpen = true;
    state.paused = true;
    pauseAmbience();
    state.keys.clear();
    state.queuedAttack = null;
    updateInventoryUI();
    inventoryScreen.classList.remove("hidden");
    window.setTimeout(() => inventoryCloseButton.focus(), 40);
  }

  function closeInventory() {
    if (!state.inventoryOpen) return;
    state.inventoryOpen = false;
    state.paused = false;
    inventoryScreen.classList.add("hidden");
    resumeAmbience();
    canvas.focus();
  }

  function showMainMenuView() {
    menuHelp.hidden = true;
    menuMainActions.hidden = false;
  }

  function openMenu() {
    if (state.gameOver) return;
    state.paused = true;
    pauseAmbience();
    state.keys.clear();
    state.queuedAttack = null;
    showMainMenuView();
    menuEyebrow.textContent = state.hasStarted ? "Jogo pausado" : "Menu principal";
    playLabel.textContent = state.hasStarted ? "Continuar" : "Jogar";
    gameMenu.classList.remove("hidden");
    window.setTimeout(() => playButton.focus(), 40);
  }

  function closeMenu() {
    if (!state.loaded || state.gameOver) return;
    state.hasStarted = true;
    state.paused = false;
    gameMenu.classList.add("hidden");
    resumeAmbience();
    canvas.focus();
  }

  function showGameOver() {
    if (state.gameOver) return;
    state.gameOver = true;
    state.paused = true;
    pauseAmbience();
    state.keys.clear();
    state.queuedAttack = null;
    const gemCount = Number(state.inventory.fire) + Number(state.inventory.blue);
    gameOverStats.textContent = `${state.kills} SLIMES • ${gemCount} GEMAS`;
    gameOverScreen.classList.remove("hidden");
    window.setTimeout(() => retryButton.focus(), 80);
  }

  function resetRun(startImmediately) {
    state.gameOver = false;
    state.inventoryOpen = false;
    state.paused = !startImmediately;
    state.hasStarted = startImmediately;
    state.kills = 0;
    state.keys.clear();
    state.queuedAttack = null;
    state.particles = [];
    state.projectiles = [];
    state.powerCooldowns.fire = 0;
    state.powerCooldowns.water = 0;
    state.projectileVariantBags.fire = [];
    state.projectileVariantBags.water = [];
    state.lastProjectileVariant.fire = -1;
    state.lastProjectileVariant.water = -1;
    state.powerAim = { x: 0, y: 1 };
    state.petals = [];
    state.gems = [];

    Object.assign(state.player, {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      direction: "down",
      action: "idle",
      frame: 0,
      animationTime: 0,
      moving: false,
      step: 0,
      lastStepSound: 0,
      health: state.player.maxHealth,
      invulnerable: startImmediately ? 1.2 : 0,
      attackHitApplied: false,
      attackAim: { x: 0, y: 1 },
    });

    Object.assign(state.enemy, {
      x: WORLD.width / 2 + 310,
      y: WORLD.height / 2 - 90,
      type: "water",
      health: slimeTypes.water.maxHealth,
      maxHealth: slimeTypes.water.maxHealth,
      alive: true,
      dying: false,
      deathTime: 0,
      animationTime: 0,
      hurtTime: 0,
      moving: false,
      facing: "left",
      attacking: false,
      attackTime: 0,
      attackHitApplied: false,
      attackCooldown: 0.7,
      respawnTime: 0,
      spawnCount: 0,
    });

    for (const chest of state.chests) {
      chest.active = false;
      chest.opened = false;
      chest.near = false;
      chest.openTime = 0;
      chest.rewardType = null;
    }

    state.inventory.fire = false;
    state.inventory.blue = false;
    fireGemIcon.classList.remove("collected");
    blueGemIcon.classList.remove("collected");
    fireGemIcon.classList.remove("cooling");
    blueGemIcon.classList.remove("cooling");
    fireGemIcon.setAttribute("aria-label", "Gema de fogo: não obtida");
    blueGemIcon.setAttribute("aria-label", "Gema d'água: não obtida");
    fireGemIcon.setAttribute("aria-disabled", "true");
    blueGemIcon.setAttribute("aria-disabled", "true");

    Object.assign(state.fox, {
      active: false,
      x: WORLD.width / 2,
      y: WORLD.height / 2 + 72,
      moving: false,
      alert: false,
      facing: "right",
      animationTime: 0,
    });

    state.camera.x = WORLD.width / 2;
    state.camera.y = WORLD.height / 2;
    chestSound.pause();
    chestSound.currentTime = 0;
    updateHealthUI();
    gameOverScreen.classList.add("hidden");
    inventoryScreen.classList.add("hidden");
    updateInventoryUI();

    if (startImmediately) {
      gameMenu.classList.add("hidden");
      resumeAmbience();
      canvas.focus();
    } else {
      pauseAmbience();
      openMenu();
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      canvas.focus();
    }
  }

  function isDown(...codes) {
    return codes.some((code) => state.keys.has(code));
  }

  function playAttackSound(action) {
    const variation = 0.96 + Math.random() * 0.08;
    playSound(action === "attack1" ? "swordFast" : "swordStrong", variation);
  }

  function startAttack(
    action,
    direction = state.player.direction,
    aim = directionVector(direction),
  ) {
    if (state.paused) return;
    const player = state.player;
    if (player.action.startsWith("attack")) {
      state.queuedAttack = { action, direction, aim };
      return;
    }
    player.direction = direction;
    player.attackAim = aim;
    player.action = action;
    player.frame = 0;
    player.animationTime = 0;
    player.attackHitApplied = false;
    playAttackSound(action);
  }

  function finishAttack() {
    const player = state.player;
    if (state.queuedAttack) {
      const nextAttack = state.queuedAttack;
      state.queuedAttack = null;
      player.action = nextAttack.action;
      player.direction = nextAttack.direction;
      player.attackAim = nextAttack.aim;
      player.frame = 0;
      player.animationTime = 0;
      player.attackHitApplied = false;
      playAttackSound(nextAttack.action);
      return;
    }

    player.action = player.moving ? "run" : "idle";
    player.frame = 0;
    player.animationTime = 0;
  }

  function directionVector(direction) {
    if (direction === "left") return { x: -1, y: 0 };
    if (direction === "right") return { x: 1, y: 0 };
    if (direction === "up") return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  }

  function shuffleProjectileVariants(type) {
    const bag = projectileVariants.map((_, index) => index);
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    const lastVariant = state.lastProjectileVariant[type];
    if (bag.length > 1 && bag[bag.length - 1] === lastVariant) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    state.projectileVariantBags[type] = bag;
  }

  function nextProjectileVariant(type) {
    if (state.projectileVariantBags[type].length === 0) {
      shuffleProjectileVariants(type);
    }
    const variant = state.projectileVariantBags[type].pop();
    state.lastProjectileVariant[type] = variant;
    return variant;
  }

  function updatePowerButtons() {
    const entries = [
      ["fire", fireGemIcon, "Gema de fogo", "1"],
      ["water", blueGemIcon, "Gema d'água", "2"],
    ];
    for (const [type, icon, label, shortcut] of entries) {
      const owned = type === "fire" ? state.inventory.fire : state.inventory.blue;
      const cooling = state.powerCooldowns[type] > 0;
      icon.classList.toggle("cooling", owned && cooling);
      icon.setAttribute("aria-disabled", String(!owned || cooling));
      icon.setAttribute(
        "aria-label",
        owned
          ? `${label}: arremessar poder (${shortcut})`
          : `${label}: não obtida`,
      );
    }
  }

  function throwPower(type, aim = state.powerAim) {
    if (state.paused || !powerConfig[type]) return false;
    const owned = type === "fire" ? state.inventory.fire : state.inventory.blue;
    if (!owned || state.powerCooldowns[type] > 0) return false;

    const player = state.player;
    const fallback = directionVector(player.direction);
    const length = Math.hypot(aim?.x || 0, aim?.y || 0);
    const direction = length > 0.01
      ? { x: aim.x / length, y: aim.y / length }
      : fallback;
    const config = powerConfig[type];

    player.direction = Math.abs(direction.x) > Math.abs(direction.y)
      ? (direction.x < 0 ? "left" : "right")
      : (direction.y < 0 ? "up" : "down");
    state.powerAim = direction;
    state.powerCooldowns[type] = config.cooldown;
    state.projectiles.push({
      type,
      variantIndex: nextProjectileVariant(type),
      x: player.x + direction.x * 38,
      y: player.y - 18 + direction.y * 22,
      vx: direction.x * config.speed,
      vy: direction.y * config.speed,
      direction,
      angle: Math.atan2(direction.y, direction.x),
      age: 0,
      maxAge: config.maxAge,
      active: true,
    });
    playSound(type === "fire" ? "fireSpell" : "waterSpell", 0.96 + Math.random() * 0.08);
    spawnHitParticles(
      player.x + direction.x * 34,
      player.y - 14 + direction.y * 18,
      config.accent,
      6,
    );
    updatePowerButtons();
    return true;
  }

  function spawnHitParticles(x, y, color, amount = 9) {
    for (let index = 0; index < amount; index += 1) {
      const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.45;
      const speed = 42 + Math.random() * 78;
      state.particles.push({
        x,
        y: y - 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 25,
        life: 0.35 + Math.random() * 0.24,
        size: Math.random() > 0.5 ? 4 : 3,
        color,
      });
    }
  }

  function hitEnemy(damage, direction, knockback, color, accent = null) {
    const enemy = state.enemy;
    if (!enemy.alive || enemy.dying) return false;

    enemy.health = Math.max(0, enemy.health - damage);
    enemy.hurtTime = SLIME_HURT_DURATION;
    enemy.attacking = false;
    enemy.attackTime = 0;
    enemy.attackHitApplied = false;
    enemy.x += direction.x * knockback;
    enemy.y += direction.y * knockback;
    spawnHitParticles(enemy.x, enemy.y, color, 11);
    if (accent) spawnHitParticles(enemy.x, enemy.y, accent, 6);

    if (enemy.health === 0) {
      enemy.hurtTime = 0;
      enemy.moving = false;
      if (enemy.type === "water") {
        enemy.dying = true;
        enemy.deathTime = 0;
      } else {
        enemy.alive = false;
        enemy.respawnTime = 2.8;
      }
      state.kills += 1;
      unlockChests();
      updateInventoryUI();
      spawnHitParticles(enemy.x, enemy.y, slimeTypes[enemy.type].hitColor, 18);
    }
    return true;
  }

  function damageEnemy(action) {
    const enemy = state.enemy;
    const player = state.player;
    if (!enemy.alive || enemy.dying || player.attackHitApplied) return;

    const forward = player.attackAim || directionVector(player.direction);
    const relativeX = enemy.x - player.x;
    const relativeY = enemy.y - player.y;
    const forwardDistance = relativeX * forward.x + relativeY * forward.y;
    const lateralDistance = Math.abs(relativeX * -forward.y + relativeY * forward.x);
    const distance = Math.hypot(relativeX, relativeY);
    const attack = action === "attack1"
      ? { range: 120, width: 60, damage: 25, knockback: 25 }
      : { range: 132, width: 74, damage: 45, knockback: 42 };
    const closeHit = distance <= 52;
    const directionalHit = (
      forwardDistance >= -10
      && forwardDistance <= attack.range
      && lateralDistance <= attack.width
    );

    if (!closeHit && !directionalHit) {
      return;
    }

    player.attackHitApplied = true;
    const hitApplied = hitEnemy(
      attack.damage,
      forward,
      attack.knockback,
      action === "attack1" ? "#f3a13b" : "#c4433f",
      enemy.type === "water" ? "#62cef1" : null,
    );
    if (hitApplied) playSound("slimeHurt", 0.94 + Math.random() * 0.12);
  }

  function unlockChests() {
    const firstChest = state.chests[0];
    const secondChest = state.chests[1];

    if (!firstChest.active && state.kills >= firstChest.milestone) {
      firstChest.active = true;
      firstChest.rewardType = Math.random() < 0.5 ? "fire" : "blue";
      spawnHitParticles(firstChest.x, firstChest.y - 12, "#f4c45b", 22);
    }

    if (!secondChest.active && state.kills >= secondChest.milestone) {
      secondChest.active = true;
      secondChest.rewardType = firstChest.rewardType === "fire" ? "blue" : "fire";
      spawnHitParticles(secondChest.x, secondChest.y - 12, "#f4c45b", 22);
    }
  }

  function updateHealthUI() {
    const player = state.player;
    healthValue.textContent = String(player.health);
    playerHealth.setAttribute("aria-label", `Vida: ${player.health} de ${player.maxHealth}`);
    const healthLoss = 92 * (1 - player.health / player.maxHealth);
    playerHealth.style.setProperty("--health-loss", `${Math.round(healthLoss)}px`);
  }

  function damagePlayer(amount, attacker = state.enemy) {
    const player = state.player;
    if (player.invulnerable > 0) return false;

    player.health = Math.max(0, player.health - amount);
    player.invulnerable = 0.75;
    const dx = player.x - attacker.x;
    const dy = player.y - attacker.y;
    const distance = Math.hypot(dx, dy) || 1;
    player.x += (dx / distance) * 34;
    player.y += (dy / distance) * 34;
    spawnHitParticles(player.x, player.y, "#a72d31", 8);
    updateHealthUI();

    if (player.health === 0) {
      showGameOver();
    }
    return true;
  }

  function respawnEnemy() {
    const enemy = state.enemy;
    const angle = Math.random() * Math.PI * 2;
    enemy.spawnCount += 1;
    enemy.type = enemy.spawnCount % 2 === 0 ? "water" : "classic";
    const typeConfig = slimeTypes[enemy.type];
    enemy.x = Math.max(
      WORLD.margin,
      Math.min(WORLD.width - WORLD.margin, state.player.x + Math.cos(angle) * 340),
    );
    enemy.y = Math.max(
      WORLD.margin,
      Math.min(WORLD.height - WORLD.margin, state.player.y + Math.sin(angle) * 260),
    );
    enemy.maxHealth = typeConfig.maxHealth;
    enemy.health = typeConfig.maxHealth;
    enemy.alive = true;
    enemy.dying = false;
    enemy.deathTime = 0;
    enemy.hurtTime = 0;
    enemy.animationTime = 0;
    enemy.moving = false;
    enemy.facing = state.player.x < enemy.x ? "left" : "right";
    enemy.attacking = false;
    enemy.attackTime = 0;
    enemy.attackHitApplied = false;
    enemy.attackCooldown = 0.8;
    playSound("slimeJump", 0.92 + Math.random() * 0.12);
  }

  function slimeTouchesPlayer(enemy = state.enemy) {
    const player = state.player;
    const dx = player.x - enemy.x;
    const dy = (player.y - 38) - (enemy.y - 26);
    return (dx * dx) / (58 * 58) + (dy * dy) / (68 * 68) <= 1;
  }

  function resolveChestCollision(actor, radiusX, radiusY, actorCenterOffset) {
    for (const chest of state.chests) {
      if (!chest.active) continue;

      const chestCenterY = chest.y - 14;
      const actorCenterY = actor.y - actorCenterOffset;
      let dx = actor.x - chest.x;
      let dy = actorCenterY - chestCenterY;
      let normalizedDistance = Math.hypot(dx / radiusX, dy / radiusY);

      if (normalizedDistance >= 1) continue;
      if (normalizedDistance < 0.001) {
        dx = 0;
        dy = radiusY;
        normalizedDistance = 1;
      }

      actor.x = chest.x + dx / normalizedDistance;
      const resolvedCenterY = chestCenterY + dy / normalizedDistance;
      actor.y = resolvedCenterY + actorCenterOffset;
    }
  }

  function resolveTreeCollisions(actor, radiusX, radiusY, actorCenterOffset) {
    for (const tree of state.trees) {
      const treeCenterY = tree.y - 10;
      const actorCenterY = actor.y - actorCenterOffset;
      let dx = actor.x - tree.x;
      let dy = actorCenterY - treeCenterY;
      let normalizedDistance = Math.hypot(dx / radiusX, dy / radiusY);

      if (normalizedDistance >= 1) continue;
      if (normalizedDistance < 0.001) {
        dx = 0;
        dy = radiusY;
        normalizedDistance = 1;
      }

      actor.x = tree.x + dx / normalizedDistance;
      const resolvedCenterY = treeCenterY + dy / normalizedDistance;
      actor.y = resolvedCenterY + actorCenterOffset;
    }
  }

  function releasePetals(tree) {
    const amount = 1 + Math.floor(Math.random() * 3);
    const colors = ["#e9a15f", "#d97b48", "#bd5f3d", "#f0b978"];
    for (let index = 0; index < amount; index += 1) {
      state.petals.push({
        x: tree.x + (Math.random() - 0.5) * 62,
        y: tree.y - 8 + (Math.random() - 0.5) * 26,
        height: 72 + Math.random() * 55,
        fallSpeed: 22 + Math.random() * 18,
        driftX: 7 + Math.random() * 11,
        driftY: 3 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        spin: 2.4 + Math.random() * 2.8,
        groundedAge: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function updateTrees(dt) {
    for (const tree of state.trees) {
      tree.animationTime += dt;
      tree.petalTimer -= dt;
      if (tree.petalTimer <= 0) {
        releasePetals(tree);
        tree.petalTimer = 4.5 + Math.random() * 7.5;
      }
    }

    for (const petal of state.petals) {
      petal.phase += petal.spin * dt;
      petal.x += petal.driftX * dt;
      petal.y += petal.driftY * dt;
      if (petal.height > 0) {
        petal.height = Math.max(0, petal.height - petal.fallSpeed * dt);
      } else {
        petal.groundedAge += dt;
      }
    }
    state.petals = state.petals.filter((petal) => petal.groundedAge < 0.85);
  }

  function updateEnemy(dt) {
    const enemy = state.enemy;
    const player = state.player;
    if (!enemy.alive) {
      enemy.respawnTime -= dt;
      if (enemy.respawnTime <= 0) respawnEnemy();
      return;
    }

    if (enemy.dying) {
      enemy.deathTime += dt;
      const deathAnimation = waterSlimeAnimations.die;
      const deathDuration = deathAnimation.frames / deathAnimation.fps + 0.16;
      if (enemy.deathTime >= deathDuration) {
        enemy.alive = false;
        enemy.dying = false;
        enemy.respawnTime = 2.35;
      }
      return;
    }

    const typeConfig = slimeTypes[enemy.type];
    enemy.animationTime += dt;
    enemy.hurtTime = Math.max(0, enemy.hurtTime - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (!enemy.attacking && Math.abs(dx) > 4) {
      enemy.facing = dx < 0 ? "left" : "right";
    }

    enemy.moving = false;
    if (enemy.type === "water" && enemy.attacking) {
      enemy.attackTime += dt;
      const attackAnimation = waterSlimeAnimations.attack;
      const attackFrame = Math.floor(enemy.attackTime * attackAnimation.fps);

      if (attackFrame >= 2 && !enemy.attackHitApplied) {
        enemy.attackHitApplied = true;
        if (slimeTouchesPlayer(enemy)) {
          const dealtDamage = damagePlayer(typeConfig.damage, enemy);
          if (dealtDamage) {
            spawnHitParticles(player.x, player.y, "#4eb5dc", 5);
            playSound("waterSplash", 0.94 + Math.random() * 0.1);
          }
        }
      }

      if (enemy.attackTime >= attackAnimation.frames / attackAnimation.fps) {
        enemy.attacking = false;
        enemy.attackTime = 0;
        enemy.attackHitApplied = false;
      }
    } else if (!slimeTouchesPlayer(enemy) && enemy.hurtTime <= 0) {
      enemy.x += (dx / distance) * typeConfig.speed * dt;
      enemy.y += (dy / distance) * typeConfig.speed * dt;
      enemy.moving = true;
    }

    resolveChestCollision(enemy, 62, 42, 22);
    resolveTreeCollisions(enemy, 43, 29, 22);

    if (
      !enemy.attacking
      && enemy.hurtTime <= 0
      && slimeTouchesPlayer(enemy)
      && enemy.attackCooldown <= 0
    ) {
      if (enemy.type === "water") {
        enemy.attacking = true;
        enemy.attackTime = 0;
        enemy.attackHitApplied = false;
        playSound("waterSlime", 0.94 + Math.random() * 0.1);
      } else {
        damagePlayer(typeConfig.damage, enemy);
        playSound("slimeJump", 0.9 + Math.random() * 0.12);
      }
      enemy.attackCooldown = typeConfig.attackCooldown;
    }

    enemy.x = Math.max(WORLD.margin, Math.min(WORLD.width - WORLD.margin, enemy.x));
    enemy.y = Math.max(WORLD.margin, Math.min(WORLD.height - WORLD.margin, enemy.y));
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 125 * dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateProjectiles(dt) {
    let powerButtonChanged = false;
    for (const type of Object.keys(state.powerCooldowns)) {
      const previous = state.powerCooldowns[type];
      state.powerCooldowns[type] = Math.max(0, previous - dt);
      if (previous > 0 && state.powerCooldowns[type] === 0) powerButtonChanged = true;
    }
    if (powerButtonChanged) updatePowerButtons();

    for (const projectile of state.projectiles) {
      if (!projectile.active) continue;
      projectile.age += dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (
        projectile.age >= projectile.maxAge
        || projectile.x < WORLD.margin
        || projectile.x > WORLD.width - WORLD.margin
        || projectile.y < WORLD.margin
        || projectile.y > WORLD.height - WORLD.margin
      ) {
        projectile.active = false;
        continue;
      }

      const enemy = state.enemy;
      if (!enemy.alive || enemy.dying) continue;
      const dx = enemy.x - projectile.x;
      const dy = (enemy.y - 22) - projectile.y;
      const hit = (dx * dx) / (46 * 46) + (dy * dy) / (38 * 38) <= 1;
      if (!hit) continue;

      projectile.active = false;
      const config = powerConfig[projectile.type];
      hitEnemy(
        config.damage,
        projectile.direction,
        config.knockback,
        config.color,
        config.accent,
      );
      playSound(
        projectile.type === "water" ? "waterSplash" : "slimeHurt",
        0.94 + Math.random() * 0.1,
      );
      spawnHitParticles(projectile.x, projectile.y, config.accent, 10);
    }
    state.projectiles = state.projectiles.filter((projectile) => projectile.active);
  }

  function updateChests(dt) {
    for (const chest of state.chests) {
      if (!chest.active) {
        chest.near = false;
        continue;
      }
      const distance = Math.hypot(state.player.x - chest.x, state.player.y - chest.y);
      chest.near = !chest.opened && distance <= 122;
      if (chest.opened) chest.openTime += dt;
    }
  }

  function spawnGem(chest) {
    state.gems.push({
      active: true,
      collected: false,
      type: chest.rewardType,
      chestId: chest.id,
      x: chest.x,
      y: chest.y - 22,
      z: 24,
      vx: (Math.random() - 0.5) * 72,
      vy: 68 + Math.random() * 24,
      vz: 205,
      bounces: 0,
      age: 0,
    });
  }

  function activateFox() {
    const fox = state.fox;
    if (fox.active || !state.inventory.fire || !state.inventory.blue) return;

    const forward = directionVector(state.player.direction);
    fox.active = true;
    fox.x = state.player.x - forward.x * 68;
    fox.y = state.player.y - forward.y * 58 + 8;
    fox.alert = false;
    fox.animationTime = 0;
    spawnHitParticles(fox.x, fox.y, "#ef7f35", 24);
  }

  function collectGem(gem) {
    if (!gem.active || gem.collected) return;

    gem.collected = true;
    gem.active = false;
    state.inventory[gem.type] = true;
    const icon = gem.type === "fire" ? fireGemIcon : blueGemIcon;
    icon.classList.add("collected");
    icon.setAttribute(
      "aria-label",
      gem.type === "fire" ? "Gema de fogo: obtida" : "Gema d'água: obtida",
    );
    spawnHitParticles(gem.x, gem.y, gem.type === "fire" ? "#ff9e35" : "#55a9ff", 18);
    activateFox();
    updateInventoryUI();
    updatePowerButtons();
  }

  function updateGems(dt) {
    for (const gem of state.gems) {
      if (!gem.active || gem.collected) continue;

      gem.age += dt;
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;
      gem.z += gem.vz * dt;
      gem.vz -= 440 * dt;

      const friction = Math.pow(gem.z > 0 ? 0.32 : 0.08, dt);
      gem.vx *= friction;
      gem.vy *= friction;

      if (gem.z <= 0) {
        gem.z = 0;
        if (Math.abs(gem.vz) > 42 && gem.bounces < 2) {
          gem.vz = Math.abs(gem.vz) * 0.38;
          gem.bounces += 1;
        } else {
          gem.vz = 0;
        }
      }

      gem.x = Math.max(WORLD.margin, Math.min(WORLD.width - WORLD.margin, gem.x));
      gem.y = Math.max(WORLD.margin, Math.min(WORLD.height - WORLD.margin, gem.y));

      const pickupDistance = Math.hypot(state.player.x - gem.x, state.player.y - gem.y);
      if (gem.z <= 3 && gem.age > 0.45 && pickupDistance <= 52) {
        collectGem(gem);
      }
    }
  }

  function updateFox(dt) {
    const fox = state.fox;
    if (!fox.active) return;

    const enemy = state.enemy;
    const previousAnimation = fox.alert ? "alert" : (fox.moving ? "move" : "idle");
    const enemyDistance = enemy.alive && !enemy.dying
      ? Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y)
      : Infinity;
    fox.alert = fox.alert
      ? enemyDistance <= FOX_ALERT_EXIT_DISTANCE
      : enemyDistance <= FOX_ALERT_ENTER_DISTANCE;

    const forward = directionVector(state.player.direction);
    const targetX = state.player.x - forward.x * 68;
    const targetY = state.player.y - forward.y * 58 + 8;
    const dx = targetX - fox.x;
    const dy = targetY - fox.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 280) {
      fox.x = targetX;
      fox.y = targetY;
    } else if (distance > 12) {
      const speed = Math.min(290, 115 + distance * 1.25);
      const step = Math.min(distance, speed * dt);
      fox.x += (dx / distance) * step;
      fox.y += (dy / distance) * step;
    }

    fox.moving = distance > 14;
    if (fox.alert) {
      const dangerDx = enemy.x - fox.x;
      if (Math.abs(dangerDx) > 1) fox.facing = dangerDx < 0 ? "left" : "right";
    } else if (Math.abs(dx) > 1) {
      fox.facing = dx < 0 ? "left" : "right";
    }

    const nextAnimation = fox.alert ? "alert" : (fox.moving ? "move" : "idle");
    if (nextAnimation !== previousAnimation) fox.animationTime = 0;
    else fox.animationTime += dt;
    resolveTreeCollisions(fox, 31, 21, 7);
  }

  function nearestOpenableChest() {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const chest of state.chests) {
      if (!chest.active || chest.opened) continue;
      const distance = Math.hypot(state.player.x - chest.x, state.player.y - chest.y);
      if (distance <= 122 && distance < nearestDistance) {
        nearest = chest;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function tryOpenChest(chest = nearestOpenableChest()) {
    if (state.paused || !chest || !chest.active || chest.opened) return false;
    const distance = Math.hypot(state.player.x - chest.x, state.player.y - chest.y);
    if (distance > 122) return false;

    chest.opened = true;
    chest.near = false;
    chest.openTime = 0;
    spawnGem(chest);
    spawnHitParticles(chest.x, chest.y - 10, "#f4c45b", 20);
    spawnHitParticles(chest.x, chest.y - 16, "#fff0a1", 10);
    chestSound.currentTime = 0;
    const playback = chestSound.play();
    if (playback) playback.catch(() => {});
    return true;
  }

  function update(dt) {
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    let dx = 0;
    let dy = 0;

    if (isDown("KeyA", "ArrowLeft")) dx -= 1;
    if (isDown("KeyD", "ArrowRight")) dx += 1;
    if (isDown("KeyW", "ArrowUp")) dy -= 1;
    if (isDown("KeyS", "ArrowDown")) dy += 1;

    player.moving = dx !== 0 || dy !== 0;
    const attacking = player.action.startsWith("attack");

    if (player.moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;

      if (!attacking) {
        if (Math.abs(dx) > Math.abs(dy)) {
          player.direction = dx < 0 ? "left" : "right";
        } else {
          player.direction = dy < 0 ? "up" : "down";
        }
      }

      const movementScale = attacking ? 0.24 : 1;
      player.x += dx * SPEED * movementScale * dt;
      player.y += dy * SPEED * movementScale * dt;
      player.step += SPEED * movementScale * dt;
      if (player.step - player.lastStepSound >= 88) {
        player.lastStepSound = player.step;
        playSound("footstep", 0.94 + Math.random() * 0.12);
      }
    }

    resolveChestCollision(player, 57, 36, 8);
    resolveTreeCollisions(player, 38, 27, 8);
    player.x = Math.max(WORLD.margin, Math.min(WORLD.width - WORLD.margin, player.x));
    player.y = Math.max(WORLD.margin, Math.min(WORLD.height - WORLD.margin, player.y));

    if (!attacking) {
      const nextAction = player.moving ? "run" : "idle";
      if (player.action !== nextAction) {
        player.action = nextAction;
        player.frame = 0;
        player.animationTime = 0;
      }
    }

    const config = animationConfig[player.action];
    player.animationTime += dt;
    const rawFrame = Math.floor(player.animationTime * config.fps);

    if (config.loop) {
      player.frame = rawFrame % FRAME_COUNT;
    } else if (rawFrame >= FRAME_COUNT) {
      finishAttack();
    } else {
      player.frame = rawFrame;
    }

    if (
      player.action.startsWith("attack")
      && player.frame >= 1
      && player.frame <= 4
      && !player.attackHitApplied
    ) {
      damageEnemy(player.action);
    }

    updateProjectiles(dt);
    updateEnemy(dt);
    updateTrees(dt);
    updateParticles(dt);
    updateChests(dt);
    updateGems(dt);
    updateFox(dt);

    const cameraEase = 1 - Math.pow(0.0005, dt);
    state.camera.x += (player.x - state.camera.x) * cameraEase;
    state.camera.y += (player.y - state.camera.y) * cameraEase;

    const halfW = state.width / 2;
    const halfH = state.height / 2;
    if (state.width < WORLD.width) {
      state.camera.x = Math.max(halfW, Math.min(WORLD.width - halfW, state.camera.x));
    } else {
      state.camera.x = WORLD.width / 2;
    }
    if (state.height < WORLD.height) {
      state.camera.y = Math.max(halfH, Math.min(WORLD.height - halfH, state.camera.y));
    } else {
      state.camera.y = WORLD.height / 2;
    }
  }

  function worldToScreen(x, y) {
    return {
      x: x - state.camera.x + state.width / 2,
      y: y - state.camera.y + state.height / 2,
    };
  }

  function aimFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const playerPoint = worldToScreen(state.player.x, state.player.y);
    const dx = event.clientX - rect.left - playerPoint.x;
    const dy = event.clientY - rect.top - playerPoint.y;
    const length = Math.hypot(dx, dy);
    if (length < 4) {
      return {
        direction: state.player.direction,
        vector: directionVector(state.player.direction),
      };
    }
    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx < 0 ? "left" : "right")
      : (dy < 0 ? "up" : "down");
    return {
      direction,
      vector: { x: dx / length, y: dy / length },
    };
  }

  function chestAtPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (const chest of state.chests) {
      if (!chest.active || chest.opened) continue;
      const chestPoint = worldToScreen(chest.x, chest.y);
      if (Math.abs(x - chestPoint.x) <= 58 && Math.abs(y - (chestPoint.y - 38)) <= 64) {
        return chest;
      }
    }
    return null;
  }

  function drawArena() {
    ctx.fillStyle = "#e9ebe7";
    ctx.fillRect(0, 0, state.width, state.height);

    const topLeft = worldToScreen(0, 0);
    ctx.fillStyle = "#fbfcfa";
    ctx.fillRect(topLeft.x, topLeft.y, WORLD.width, WORLD.height);

    const minor = 32;
    const major = 128;
    const startX = Math.max(0, Math.floor(state.camera.x - state.width / 2));
    const endX = Math.min(WORLD.width, Math.ceil(state.camera.x + state.width / 2));
    const startY = Math.max(0, Math.floor(state.camera.y - state.height / 2));
    const endY = Math.min(WORLD.height, Math.ceil(state.camera.y + state.height / 2));

    ctx.lineWidth = 1;
    for (let x = Math.floor(startX / minor) * minor; x <= endX; x += minor) {
      const point = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.strokeStyle = x % major === 0 ? "rgba(23,25,24,.055)" : "rgba(23,25,24,.022)";
      ctx.moveTo(Math.round(point.x) + 0.5, topLeft.y);
      ctx.lineTo(Math.round(point.x) + 0.5, topLeft.y + WORLD.height);
      ctx.stroke();
    }

    for (let y = Math.floor(startY / minor) * minor; y <= endY; y += minor) {
      const point = worldToScreen(0, y);
      ctx.beginPath();
      ctx.strokeStyle = y % major === 0 ? "rgba(23,25,24,.055)" : "rgba(23,25,24,.022)";
      ctx.moveTo(topLeft.x, Math.round(point.y) + 0.5);
      ctx.lineTo(topLeft.x + WORLD.width, Math.round(point.y) + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(23,25,24,.13)";
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeft.x + 1, topLeft.y + 1, WORLD.width - 2, WORLD.height - 2);

    const center = worldToScreen(WORLD.width / 2, WORLD.height / 2);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.strokeStyle = "rgba(23,25,24,.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-88, 0);
    ctx.lineTo(-60, 0);
    ctx.moveTo(60, 0);
    ctx.lineTo(88, 0);
    ctx.moveTo(0, -88);
    ctx.lineTo(0, -60);
    ctx.moveTo(0, 60);
    ctx.lineTo(0, 88);
    ctx.stroke();
    ctx.restore();
  }

  function drawRainSplashes() {
    for (const splash of state.rain.splashes) {
      const point = worldToScreen(splash.x, splash.y);
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      const progress = splash.age / splash.duration;
      const alpha = Math.max(0, 1 - progress);
      const spread = 2 + Math.floor(progress * 11);
      const lift = Math.max(0, 5 - Math.floor(progress * 7));

      ctx.fillStyle = `rgba(58, 79, 84, ${alpha * 0.2})`;
      ctx.fillRect(x - spread + 1, y + 1, 4, 2);
      ctx.fillRect(x + spread - 3, y + 1, 4, 2);
      if (progress < 0.62) ctx.fillRect(x, y - lift + 1, 2, 3);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fillRect(x - spread, y, 3, 2);
      ctx.fillRect(x + spread - 3, y, 3, 2);
      if (progress < 0.62) ctx.fillRect(x - 1, y - lift, 2, 3);
    }
  }

  function drawRainStreaks() {
    for (const drop of state.rain.drops) {
      const x = Math.round(drop.x);
      const y = Math.round(drop.y);

      ctx.fillStyle = `rgba(55, 75, 80, ${drop.alpha * 0.2})`;
      for (let segment = 0; segment < drop.segments; segment += 1) {
        const zigzag = segment % 2;
        ctx.fillRect(
          x - segment * 2 + zigzag + 1,
          y - segment * 4 + 1,
          2,
          4,
        );
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${drop.alpha})`;
      for (let segment = 0; segment < drop.segments; segment += 1) {
        const zigzag = segment % 2;
        ctx.fillRect(
          x - segment * 2 + zigzag,
          y - segment * 4,
          2,
          4,
        );
      }
    }
  }

  function drawPlayer() {
    const player = state.player;
    const point = worldToScreen(player.x, player.y);
    const bob = player.action === "run" ? Math.sin(player.step * 0.11) * 1.2 : 0;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "rgba(29, 24, 22, .17)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 22 + Math.abs(bob), 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const sprite = sprites[player.action][player.direction];
    const drawWidth = FRAME_WIDTH * SCALE;
    const drawHeight = FRAME_HEIGHT * SCALE;
    const sourceX = player.frame * FRAME_WIDTH;
    const drawX = Math.round(point.x - drawWidth / 2);
    const drawY = Math.round(point.y - 59 * SCALE + bob);

    ctx.save();
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2 === 0) {
      ctx.globalAlpha = 0.42;
    }
    ctx.drawImage(
      sprite,
      sourceX,
      0,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
  }

  function drawTree(tree) {
    const point = worldToScreen(tree.x, tree.y);
    const scale = 2.08;
    const drawSize = 64 * scale;
    const frame = Math.floor(tree.animationTime * tree.fps) % 16;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "rgba(55, 35, 23, .18)";
    ctx.beginPath();
    ctx.ellipse(0, 1, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(
      sprites.tree,
      frame * 64,
      0,
      64,
      64,
      Math.round(point.x - drawSize / 2),
      Math.round(point.y - drawSize),
      drawSize,
      drawSize,
    );
  }

  function drawSlime() {
    const enemy = state.enemy;
    if (!enemy.alive) return;

    const point = worldToScreen(enemy.x, enemy.y);
    const isWater = enemy.type === "water";
    const typeConfig = slimeTypes[enemy.type];

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = isWater ? "rgba(23, 77, 99, .2)" : "rgba(76, 45, 12, .18)";
    ctx.beginPath();
    ctx.ellipse(0, 2, isWater ? 30 : 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isWater) {
      let action = enemy.moving ? "move" : "idle";
      let animationTime = enemy.animationTime;

      if (enemy.dying) {
        action = "die";
        animationTime = enemy.deathTime;
      } else if (enemy.hurtTime > 0) {
        action = "hurt";
        animationTime = SLIME_HURT_DURATION - enemy.hurtTime;
      } else if (enemy.attacking) {
        action = "attack";
        animationTime = enemy.attackTime;
      }

      const animation = waterSlimeAnimations[action];
      const rawFrame = Math.floor(animationTime * animation.fps);
      const frame = animation.loop
        ? rawFrame % animation.frames
        : Math.min(animation.frames - 1, rawFrame);
      const sprite = sprites.waterSlime[action][frame];
      const drawWidth = WATER_SLIME_FRAME_WIDTH * WATER_SLIME_SCALE;
      const drawHeight = WATER_SLIME_FRAME_HEIGHT * WATER_SLIME_SCALE;
      const drawY = Math.round(point.y - 24 * WATER_SLIME_SCALE);

      ctx.save();
      ctx.translate(Math.round(point.x), 0);
      if (enemy.facing === "right") ctx.scale(-1, 1);
      if (enemy.hurtTime > 0 && Math.floor(enemy.hurtTime * 32) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      ctx.drawImage(
        sprite,
        Math.round(-drawWidth / 2),
        drawY,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
    } else {
      const drawSize = SLIME_FRAME_SIZE * SLIME_SCALE;
      let sourceY = 0;
      let frame = Math.floor(enemy.animationTime * 10) % SLIME_IDLE_FRAMES;

      if (enemy.hurtTime > 0) {
        const progress = 1 - enemy.hurtTime / SLIME_HURT_DURATION;
        frame = Math.min(SLIME_HURT_FRAMES - 1, Math.floor(progress * SLIME_HURT_FRAMES));
        sourceY = SLIME_FRAME_SIZE;
      }

      const drawX = Math.round(point.x - drawSize / 2);
      const drawY = Math.round(point.y - 54 * SLIME_SCALE);
      ctx.save();
      if (enemy.hurtTime > 0 && Math.floor(enemy.hurtTime * 32) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      ctx.drawImage(
        sprites.slime,
        frame * SLIME_FRAME_SIZE,
        sourceY,
        SLIME_FRAME_SIZE,
        SLIME_FRAME_SIZE,
        drawX,
        drawY,
        drawSize,
        drawSize,
      );
      ctx.restore();
    }

    if (enemy.dying) return;

    const barWidth = isWater ? 68 : 58;
    const barY = point.y - (isWater ? 78 : 70);
    ctx.fillStyle = "rgba(54, 24, 11, .88)";
    ctx.fillRect(Math.round(point.x - barWidth / 2 - 2), Math.round(barY - 2), barWidth + 4, 8);
    ctx.fillStyle = isWater ? "#173b4d" : "#57201b";
    ctx.fillRect(Math.round(point.x - barWidth / 2), Math.round(barY), barWidth, 4);
    ctx.fillStyle = typeConfig.barColor;
    ctx.fillRect(
      Math.round(point.x - barWidth / 2),
      Math.round(barY),
      Math.round(barWidth * (enemy.health / enemy.maxHealth)),
      4,
    );
    ctx.fillStyle = "rgba(63, 31, 12, .72)";
    ctx.font = "900 8px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(typeConfig.label, Math.round(point.x), Math.round(barY - 6));
  }

  function drawChest(chest) {
    const point = worldToScreen(chest.x, chest.y);
    const baseScale = 2.25;
    const openingProgress = Math.min(1, chest.openTime / 0.38);
    const pop = chest.opened ? Math.sin(openingProgress * Math.PI) * 0.09 : 0;
    const scale = baseScale * (1 + pop);
    const drawSize = 64 * scale;

    if (chest.opened) {
      const glow = ctx.createRadialGradient(point.x, point.y - 42, 4, point.x, point.y - 38, 76);
      glow.addColorStop(0, "rgba(255, 222, 112, .28)");
      glow.addColorStop(1, "rgba(255, 222, 112, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(point.x - 80, point.y - 120, 160, 140);
    }

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "rgba(55, 29, 15, .2)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(
      sprites.chest,
      chest.opened ? 64 : 0,
      0,
      64,
      64,
      Math.round(point.x - drawSize / 2),
      Math.round(point.y - 56 * scale),
      drawSize,
      drawSize,
    );

    if (chest.near) {
      const label = "E  ABRIR BAÚ";
      ctx.font = "900 10px Courier New";
      ctx.textAlign = "center";
      const labelWidth = Math.ceil(ctx.measureText(label).width) + 22;
      const labelX = Math.round(point.x - labelWidth / 2);
      const labelY = Math.round(point.y - 96);
      ctx.fillStyle = "rgba(59, 25, 14, .96)";
      ctx.fillRect(labelX - 2, labelY - 2, labelWidth + 4, 27);
      ctx.fillStyle = "#d89a4d";
      ctx.fillRect(labelX, labelY, labelWidth, 23);
      ctx.fillStyle = "#6d301a";
      ctx.fillRect(labelX + 2, labelY + 2, labelWidth - 4, 19);
      ctx.fillStyle = "#fff0c6";
      ctx.fillText(label, Math.round(point.x), labelY + 14);
    }
  }

  function drawGem(gem) {
    if (!gem.active || gem.collected) return;

    const groundPoint = worldToScreen(gem.x, gem.y);
    const height = gem.z;
    const sourceX = gem.type === "fire" ? 194 : 225;
    const scale = 1.72;
    const drawWidth = 29 * scale;
    const drawHeight = 28 * scale;
    const shadowScale = Math.max(0.34, 1 - height / 150);

    ctx.save();
    ctx.translate(groundPoint.x, groundPoint.y + 1);
    ctx.fillStyle = `rgba(48, 26, 13, ${0.2 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (gem.z <= 3) {
      const glowColor = gem.type === "fire"
        ? "rgba(255, 157, 43, .2)"
        : "rgba(70, 159, 255, .2)";
      const glow = ctx.createRadialGradient(
        groundPoint.x,
        groundPoint.y - 24,
        3,
        groundPoint.x,
        groundPoint.y - 24,
        48,
      );
      glow.addColorStop(0, glowColor);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(groundPoint.x - 52, groundPoint.y - 76, 104, 94);
    }

    ctx.drawImage(
      sprites.ui,
      sourceX,
      2,
      29,
      28,
      Math.round(groundPoint.x - drawWidth / 2),
      Math.round(groundPoint.y - height - drawHeight),
      drawWidth,
      drawHeight,
    );
  }

  function drawProjectile(projectile) {
    const point = worldToScreen(projectile.x, projectile.y);
    const variant = projectileVariants[projectile.variantIndex];
    const frame = Math.floor(projectile.age * variant.fps) % variant.frames;
    const sourceX = (variant.startColumn + frame) * EFFECT_FRAME_SIZE;
    const sourceY = variant.row * EFFECT_FRAME_SIZE;
    const config = powerConfig[projectile.type];
    const drawSize = EFFECT_FRAME_SIZE * variant.scale * config.visualScale;
    const flightProgress = Math.min(1, projectile.age / projectile.maxAge);
    const height = 10 + Math.sin(flightProgress * Math.PI) * 16;
    const sheet = projectile.type === "fire" ? sprites.fireEffects : sprites.waterEffects;

    ctx.save();
    ctx.translate(Math.round(point.x), Math.round(point.y));
    ctx.fillStyle = "rgba(40, 34, 31, .15)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(Math.round(point.x), Math.round(point.y - height));
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, drawSize * 0.72);
    glow.addColorStop(0, projectile.type === "fire"
      ? "rgba(255, 174, 61, .32)"
      : "rgba(75, 196, 255, .3)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-drawSize, -drawSize, drawSize * 2, drawSize * 2);
    ctx.rotate(projectile.angle);
    ctx.drawImage(
      sheet,
      sourceX,
      sourceY,
      EFFECT_FRAME_SIZE,
      EFFECT_FRAME_SIZE,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );
    ctx.fillStyle = config.accent;
    ctx.globalAlpha = 0.46;
    ctx.fillRect(-drawSize * 0.78, -1, Math.max(3, drawSize * 0.22), 2);
    ctx.restore();
  }

  function drawFox() {
    const fox = state.fox;
    if (!fox.active) return;

    const point = worldToScreen(fox.x, fox.y);
    let row = fox.moving ? 2 : 0;
    let frameCount = fox.moving ? 8 : 5;
    let fps = fox.moving ? 10 : 5;
    if (fox.alert) {
      row = 4;
      frameCount = 5;
      fps = 6;
    }
    const frame = Math.floor(fox.animationTime * fps) % frameCount;
    const scale = 2.25;
    const drawSize = 32 * scale;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "rgba(50, 29, 17, .16)";
    ctx.beginPath();
    ctx.ellipse(0, 1, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(point.x, point.y);
    if (fox.facing === "left") ctx.scale(-1, 1);
    ctx.drawImage(
      sprites.fox,
      frame * 32,
      row * 32,
      32,
      32,
      -drawSize / 2,
      -drawSize,
      drawSize,
      drawSize,
    );
    ctx.restore();
  }

  function drawPetals() {
    for (const petal of state.petals) {
      const groundPoint = worldToScreen(petal.x, petal.y);
      const sway = Math.round(Math.sin(petal.phase) * 5);
      const x = Math.round(groundPoint.x + sway);
      const y = Math.round(groundPoint.y - petal.height);
      const alpha = petal.height > 0
        ? 0.9
        : Math.max(0, 1 - petal.groundedAge / 0.85) * 0.72;

      if (petal.height < 24) {
        ctx.fillStyle = `rgba(65, 38, 25, ${0.12 * (1 - petal.height / 24)})`;
        ctx.fillRect(Math.round(groundPoint.x - 2), Math.round(groundPoint.y), 5, 2);
      }

      ctx.fillStyle = petal.color;
      ctx.globalAlpha = alpha;
      if (Math.sin(petal.phase * 1.7) > 0) ctx.fillRect(x, y, 3, 2);
      else ctx.fillRect(x, y, 2, 3);
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const point = worldToScreen(particle.x, particle.y);
      ctx.globalAlpha = Math.min(1, particle.life * 3.5);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(point.x - particle.size / 2),
        Math.round(point.y - particle.size / 2),
        particle.size,
        particle.size,
      );
    }
    ctx.globalAlpha = 1;
  }

  function drawEntities() {
    const entities = [
      { y: state.player.y, draw: drawPlayer },
    ];
    for (const tree of state.trees) {
      entities.push({ y: tree.y, draw: () => drawTree(tree) });
    }
    for (const chest of state.chests) {
      if (chest.active) {
        entities.push({ y: chest.y, draw: () => drawChest(chest) });
      }
    }
    for (const gem of state.gems) {
      if (gem.active && !gem.collected) {
        entities.push({ y: gem.y, draw: () => drawGem(gem) });
      }
    }
    for (const projectile of state.projectiles) {
      if (projectile.active) {
        entities.push({ y: projectile.y, draw: () => drawProjectile(projectile) });
      }
    }
    if (state.fox.active) {
      entities.push({ y: state.fox.y, draw: drawFox });
    }
    if (state.enemy.alive) {
      entities.push({ y: state.enemy.y, draw: drawSlime });
    }
    entities.sort((first, second) => first.y - second.y);
    for (const entity of entities) entity.draw();
    drawPetals();
    drawParticles();
  }

  function drawCornerCoordinates() {
    const x = Math.round(state.player.x);
    const y = Math.round(state.player.y);
    ctx.save();
    ctx.fillStyle = "rgba(23,25,24,.36)";
    ctx.font = "700 9px Courier New";
    ctx.textAlign = "right";
    ctx.fillText(`${String(x).padStart(4, "0")} : ${String(y).padStart(4, "0")}`, state.width - 25, state.height - 24);
    ctx.restore();
  }

  function drawKillProgress() {
    const goal = state.kills < 5 ? 5 : 10;
    const count = Math.min(state.kills, 10);
    const y = state.width <= 740 ? 116 : 86;
    const label = state.kills >= 10 ? "BAÚS LIBERADOS" : `SLIMES  ${count} / ${goal}`;

    ctx.save();
    ctx.font = "900 9px Courier New";
    const width = Math.ceil(ctx.measureText(label).width) + 18;
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.fillRect(24, y - 14, width, 23);
    ctx.strokeStyle = "rgba(83,42,22,.22)";
    ctx.strokeRect(24.5, y - 13.5, width - 1, 22);
    ctx.fillStyle = state.kills >= 10 ? "#a85427" : "rgba(67,43,30,.7)";
    ctx.textAlign = "left";
    ctx.fillText(label, 33, y);
    ctx.restore();
  }

  function render() {
    drawArena();
    drawRainSplashes();
    if (state.loaded) drawEntities();
    drawRainStreaks();
    drawKillProgress();
    drawCornerCoordinates();
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000 || 0, 0.05);
    state.lastTime = timestamp;
    if (state.loaded) updateRain(dt);
    if (state.loaded && !state.paused) update(dt);
    render();
    window.requestAnimationFrame(loop);
  }

  function pressKey(code) {
    state.keys.add(code);
  }

  function releaseKey(code) {
    state.keys.delete(code);
  }

  window.addEventListener("keydown", (event) => {
    if (state.gameOver) return;

    if (event.code === "KeyI") {
      event.preventDefault();
      if (state.inventoryOpen) closeInventory();
      else if (!event.repeat) openInventory();
      return;
    }

    if (state.inventoryOpen) {
      if (event.code === "Escape") {
        event.preventDefault();
        closeInventory();
      }
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      if (!state.hasStarted) return;
      if (state.paused) closeMenu();
      else openMenu();
      return;
    }

    if (state.paused) return;

    if (event.code === "Digit1" || event.code === "Numpad1") {
      event.preventDefault();
      if (!event.repeat) throwPower("fire", directionVector(state.player.direction));
      return;
    }

    if (event.code === "Digit2" || event.code === "Numpad2") {
      event.preventDefault();
      if (!event.repeat) throwPower("water", directionVector(state.player.direction));
      return;
    }

    if (event.code === "KeyE") {
      event.preventDefault();
      if (!event.repeat) tryOpenChest();
      return;
    }

    const gameKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];
    if (!gameKeys.includes(event.code)) return;
    event.preventDefault();
    if (!event.repeat) pressKey(event.code);
  });

  window.addEventListener("keyup", (event) => releaseKey(event.code));
  window.addEventListener("blur", () => state.keys.clear());
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAmbience();
    else resumeAmbience();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (state.paused) return;
    canvas.focus();
    const pointedChest = chestAtPointer(event);
    if (
      (event.button === 0 || event.pointerType === "touch")
      && pointedChest
      && tryOpenChest(pointedChest)
    ) {
      event.preventDefault();
      return;
    }
    if (event.pointerType === "mouse") {
      const aim = aimFromPointer(event);
      state.powerAim = aim.vector;
      if (event.button === 0) startAttack("attack1", aim.direction, aim.vector);
      if (event.button === 2) startAttack("attack2", aim.direction, aim.vector);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || state.paused) return;
    state.powerAim = aimFromPointer(event).vector;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const release = (event) => {
      event.preventDefault();
      releaseKey(code);
      button.classList.remove("active");
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pressKey(code);
      button.classList.add("active");
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
  });

  document.querySelectorAll("[data-attack]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startAttack(button.dataset.attack);
      button.classList.add("active");
      button.setPointerCapture(event.pointerId);
    });
    const release = () => button.classList.remove("active");
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
  });

  [
    [fireGemIcon, "fire"],
    [blueGemIcon, "water"],
  ].forEach(([icon, type]) => {
    icon.addEventListener("click", () => {
      throwPower(type, state.powerAim || directionVector(state.player.direction));
      canvas.focus();
    });
  });

  fullscreenButton.addEventListener("click", async () => {
    await toggleFullscreen();
  });

  playButton.addEventListener("click", closeMenu);
  controlsButton.addEventListener("click", () => {
    menuMainActions.hidden = true;
    menuHelp.hidden = false;
    backButton.focus();
  });
  backButton.addEventListener("click", () => {
    showMainMenuView();
    controlsButton.focus();
  });
  menuFullscreenButton.addEventListener("click", toggleFullscreen);
  retryButton.addEventListener("click", () => resetRun(true));
  gameOverMenuButton.addEventListener("click", () => resetRun(false));
  inventoryCloseButton.addEventListener("click", closeInventory);
  [inventoryFireItem, inventoryBlueItem, inventoryFoxItem].forEach((item) => {
    item.addEventListener("pointerenter", () => showInventoryItemDetail(item));
    item.addEventListener("focus", () => showInventoryItemDetail(item));
    item.addEventListener("pointerleave", updateInventoryUI);
    item.addEventListener("blur", updateInventoryUI);
    item.addEventListener("click", () => showInventoryItemDetail(item));
  });

  resize();
  updateInventoryUI();
  updatePowerButtons();
  loadSprites().catch((error) => {
    loadingScreen.querySelector("p").textContent = "Erro ao carregar os sprites";
    console.error(error);
  });
  window.requestAnimationFrame(loop);
})();
