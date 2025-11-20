import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbSpawner } from './OrbSpawner2.js';

// ==========================================
// CONFIGURACIÓN DEL MAPA (Global para acceder fácil)
// ==========================================
const BLOCK_SIZE = 40; // Tamaño de cada cuadro del laberinto
const WALL_HEIGHT = 25;

// Posiciones lógicas en la matriz (Fila, Columna)
const START_ROW = 1;
const START_COL = 1;
const END_ROW = 13; // Penúltima fila
const END_COL = 13; // Penúltima columna

// Cálculo de coordenadas reales en el mundo 3D
// (Columna - OffsetCentro) * Tamaño
const SPAWN_X = (START_COL - 7) * BLOCK_SIZE;
const SPAWN_Z = START_ROW * BLOCK_SIZE;

const BOSS_X = (END_COL - 7) * BLOCK_SIZE;
const BOSS_Z = END_ROW * BLOCK_SIZE;


// ==========================================
// CLASES DEL CONTROLADOR
// ==========================================

class BasicCharacterControllerProxy {
    constructor(animations) { this._animations = animations; }
    get animations() { return this._animations; }
};

class BasicCharacterController {
    constructor(params) { this._Init(params); }

    _Init(params) {
        this._params = params;
        this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._gravity = new THREE.Vector3(0, -100.0, 0);
        this._jumpForce = 50.0;
        this._onGround = false;

        // --- NUEVO: VARIABLE PARA CONTROLAR EL TIEMPO DEL SONIDO DE SALTO ---
        this._soundJumpCooldown = 0.0;
        // --------------------------------------------------------------------

        this._platforms = params.platforms || [];
        this._game = params.game;
        this._platformBox = new THREE.Box3();

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(
            new BasicCharacterControllerProxy(this._animations));

        this._LoadModels();

        this._playerBox = new THREE.Box3(
            new THREE.Vector3(-1.0, 0.0, -1.0),
            new THREE.Vector3(1.0, 5.0, 1.0)
        );
    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('./Resources/Modelos/Personaje/');
        loader.load('Tilin2.fbx', (fbx) => {
            fbx.scale.setScalar(0.05);
            fbx.traverse(c => { c.castShadow = true; });

            this._target = fbx;
            this._params.scene.add(this._target);
            this._target.position.set(SPAWN_X, 10, SPAWN_Z);

            this._mixer = new THREE.AnimationMixer(this._target);
            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);
                this._animations[animName] = { clip: clip, action: action };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('./Resources/Modelos/Personaje/');
            loader.load('Walk.fbx', (a) => { _OnLoad('walk', a); });
            loader.load('Run.fbx', (a) => { _OnLoad('run', a); });
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
        });
    }

    _CheckCollisions(playerTestBox) {
        for (const collider of this._platforms) {
            if (collider.geometry.parameters.height < 5) continue;
            this._platformBox.setFromObject(collider);
            if (playerTestBox.intersectsBox(this._platformBox)) return true;
        }
        return false;
    }

    Update(timeInSeconds) {
        if (!this._target) return;
        if (this._game && this._game._isDead) return;

        timeInSeconds = Math.min(timeInSeconds, 0.1);

        // Actualizamos el cooldown del salto (restamos el tiempo que pasó)
        if (this._soundJumpCooldown > 0) {
            this._soundJumpCooldown -= timeInSeconds;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        // ============================================================
        // LÓGICA DE SONIDO BASADA EN TECLAS (INPUT)
        // ============================================================
        const sounds = this._game ? this._game._sounds : null;

        if (sounds) {
            const keys = this._input._keys;
            // ¿Se está moviendo? (W, A, S o D presionados)
            const isMoving = keys.forward || keys.backward || keys.left || keys.right;

            // 1. CAMINAR Y CORRER
            if (isMoving && this._onGround) {
                if (keys.shift) {
                    // --- CORRIENDO ---
                    // Si suena caminar, cállalo
                    if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                    // Si NO suena correr, dale play
                    if (sounds['run'] && !sounds['run'].isPlaying) sounds['run'].play();
                } else {
                    // --- CAMINANDO ---
                    // Si suena correr, cállalo
                    if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
                    // Si NO suena caminar, dale play
                    if (sounds['walk'] && !sounds['walk'].isPlaying) sounds['walk'].play();
                }
            } else {
                // --- QUIETO O EN EL AIRE ---
                // Callar todo
                if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
            }

            // 2. SALTO (Con Delay de 2 segundos)
            // Si presiona espacio, estamos en el suelo, Y el cooldown llegó a 0
            if (keys.space && this._onGround && this._soundJumpCooldown <= 0) {
                if (sounds['jump']) {
                    if (sounds['jump'].isPlaying) sounds['jump'].stop();
                    sounds['jump'].play();
                }
                // Reiniciamos el cooldown a 2 segundos
                this._soundJumpCooldown = 1.0;
            }
        }
        // ============================================================


        const velocity = this._velocity;
        const framedeceleration = new THREE.Vector3(
            velocity.x * this._deceleration.x,
            velocity.y * this._deceleration.y,
            velocity.z * this._deceleration.z
        );
        framedeceleration.multiplyScalar(timeInSeconds);
        framedeceleration.z = Math.sign(framedeceleration.z) * Math.min(
            Math.abs(framedeceleration.z), Math.abs(velocity.z));

        velocity.add(framedeceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();
        if (this._input._keys.shift) acc.multiplyScalar(3.0);

        if (this._input._keys.forward) velocity.z += acc.z * timeInSeconds;
        if (this._input._keys.backward) velocity.z -= acc.z * timeInSeconds;
        if (this._input._keys.left) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }
        if (this._input._keys.right) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        // LÓGICA FÍSICA DEL SALTO (Independiente del sonido)
        if (this._input._keys.space && this._onGround) {
            this._velocity.y = this._jumpForce;
            this._onGround = false;
        }

        this._velocity.y += this._gravity.y * timeInSeconds;
        controlObject.position.y += this._velocity.y * timeInSeconds;

        let potentialGroundY = -Infinity;
        const cPos = controlObject.position;
        const playerHalfWidth = 0.5;
        const playerHalfDepth = 0.5;

        if (this._platforms && this._velocity.y <= 0) {
            for (const platform of this._platforms) {
                if (platform.geometry.parameters.height > 5) continue;

                this._platformBox.setFromObject(platform);

                const isCollidingX = cPos.x >= this._platformBox.min.x - playerHalfWidth &&
                    cPos.x <= this._platformBox.max.x + playerHalfWidth;
                const isCollidingZ = cPos.z >= this._platformBox.min.z - playerHalfDepth &&
                    cPos.z <= this._platformBox.max.z + playerHalfDepth;

                if (isCollidingX && isCollidingZ && cPos.y <= this._platformBox.max.y + 5 && cPos.y >= this._platformBox.min.y - 5) {
                    potentialGroundY = Math.max(potentialGroundY, this._platformBox.max.y);
                }
            }
        }

        if (cPos.y <= potentialGroundY) {
            this._velocity.y = 0;
            controlObject.position.y = potentialGroundY;
            this._onGround = true;
        } else {
            this._onGround = false;
        }

        if (controlObject.position.y < -50) {
            this._velocity.set(0, 0, 0);
            this._onGround = true;
            if (this._game) this._game._TriggerDeath();
        }

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        if (this._playerBox) {
            const playerAABB = this._playerBox.clone().translate(controlObject.position);
            const testAABB_Z = playerAABB.clone().translate(forward);
            if (!this._CheckCollisions(testAABB_Z)) {
                controlObject.position.add(forward);
            }
            const playerAABB_PostZ = this._playerBox.clone().translate(controlObject.position);
            const testAABB_X = playerAABB_PostZ.clone().translate(sideways);
            if (!this._CheckCollisions(testAABB_X)) {
                controlObject.position.add(sideways);
            }
        } else {
            controlObject.position.add(forward);
            controlObject.position.add(sideways);
        }

        if (this._mixer) this._mixer.update(timeInSeconds);
    }
};

class BasicCharacterControllerInput {
    constructor() { this._Init(); }
    _Init() {
        this._keys = { forward: false, backward: false, left: false, right: false, space: false, shift: false };
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }
    _onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this._keys.forward = true; break;
            case 'KeyA': this._keys.left = true; break;
            case 'KeyS': this._keys.backward = true; break;
            case 'KeyD': this._keys.right = true; break;
            case 'Space': this._keys.space = true; break;
            case 'ShiftLeft': this._keys.shift = true; break;
        }
    }
    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this._keys.forward = false; break;
            case 'KeyA': this._keys.left = false; break;
            case 'KeyS': this._keys.backward = false; break;
            case 'KeyD': this._keys.right = false; break;
            case 'Space': this._keys.space = false; break;
            case 'ShiftLeft': this._keys.shift = false; break;
        }
    }
};

class FiniteStateMachine {
    constructor() { this._states = {}; this._currentState = null; }
    _AddState(name, type) { this._states[name] = type; }
    SetState(name) {
        const prevState = this._currentState;
        if (prevState) {
            if (prevState.Name == name) return;
            prevState.Exit();
        }
        const state = new this._states[name](this);
        this._currentState = state;
        state.Enter(prevState);
    }
    Update(timeElapsed, input) {
        if (this._currentState) this._currentState.Update(timeElapsed, input);
    }
};

class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }
    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
    }
};

class State {
    constructor(parent) { this._parent = parent; }
    Enter() { }
    Exit() { }
    Update() { }
};

class WalkState extends State {
    constructor(parent) { super(parent); }
    get Name() { return 'walk'; }
    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }
    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            if (input._keys.shift) { this._parent.SetState('run'); }
            return;
        }
        this._parent.SetState('idle');
    }
};

class RunState extends State {
    constructor(parent) { super(parent); }
    get Name() { return 'run'; }
    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'walk') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }
    Update(timeElapsed, input) {
        if (input._keys.forward || input._keys.backward) {
            if (!input._keys.shift) { this._parent.SetState('walk'); }
            return;
        }
        this._parent.SetState('idle');
    }
};

class IdleState extends State {
    constructor(parent) { super(parent); }
    get Name() { return 'idle'; }
    Enter(prevState) {
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }
    Update(_, input) {
        if (input._keys.forward || input._keys.backward) { this._parent.SetState('walk'); }
    }
};

// ==========================================
// CLASE PRINCIPAL DEL JUEGO
// ==========================================

class CharacterControllerDemo {
    constructor() {
        this._isPaused = false;
        this._pauseMenu = document.getElementById('pauseMenu');
        this._RAF_ID = null;

        this._orbSpawner = 0;
        this._orbsCollected = 0;

        this._fireSystem = null;
        this._explosions = [];

        this._timeLeft = 30; // Empezamos con 30 segundos
        this._gameWon = false;
        this._bossDefeated = false;
        this._tiempoSinRecolectar = 0;
        this._temporizador = null;

        // --- HITBOX DEL JEFE AL FINAL DEL LABERINTO ---
        this._bossHitbox = new THREE.Box3(
            new THREE.Vector3(BOSS_X - 20, 0, BOSS_Z - 20),
            new THREE.Vector3(BOSS_X + 20, 20, BOSS_Z + 20)
        );
        // ----------------------------------------------

        // --- MULTIJUGADOR: Variables ---
        this._remotePlayers = {};
        this._socket = null;

        this._isDead = false;

        this._Initialize();
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({ antialias: true });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => { this._OnWindowResize(); }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 3000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(25, 10, 25);

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x000000);

        this._scene.fog = new THREE.FogExp2(0x111111, 0.0025);

        this._platforms = [];      // Paredes y suelo
        this._floorMeshes = [];    // Solo suelo (para orbes)

        // --- CREAR LABERINTO ---
        this._CreateSquareMaze();

        // --- MOSTRAR HITBOX JEFE (DEBUG - QUITAR SI MOLESTA) ---
        const helper = new THREE.Box3Helper(this._bossHitbox, 0xffff00);
        this._scene.add(helper);

        this._orbSpawner = new OrbSpawner({
            scene: this._scene,
            platforms: this._floorMeshes
        });

        this._dustSystem = new FogParticleSystem({ // <--- Cambio de nombre
            scene: this._scene,
            count: 800 // Menos partículas porque ahora son gigantes
        });

        // Luces
        let light = new THREE.DirectionalLight(0xFFFFFF, 0.8);
        light.position.set(100, 300, 100);
        light.castShadow = true;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 2000.0;
        light.shadow.camera.left = 1000;
        light.shadow.camera.right = -1000;
        light.shadow.camera.top = 1000;
        light.shadow.camera.bottom = -1000;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 0.4);
        this._scene.add(light);

        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 10, 0);
        controls.enabled = false;
        controls.update();

        this._mixers = [];
        this._previousRAF = null;

        this._cameraTarget = new THREE.Vector3();
        this._cameraOffset = new THREE.Vector3(0, 10, -20);

        this._LoadAnimatedModel();
        this._LoadEnemyFBX();

        this._temporizador = setInterval(() => {
            // Si el juego está pausado o terminado, no hacemos nada
            if (this._isPaused || this._isDead || this._gameWon) return;

            // Restamos 1 segundo
            this._timeLeft--;

            // Actualizamos el número en la pantalla HTML
            const timerElement = document.getElementById('time-counter');
            if (timerElement) {
                timerElement.innerText = this._timeLeft;

                // (Opcional) Ponerlo rojo si queda poco tiempo
                if (this._timeLeft <= 5) timerElement.style.color = 'red';
                else timerElement.style.color = 'white';
            }

            // Si el tiempo llega a 0, mueres
            if (this._timeLeft <= 0) {
                this._TriggerLoss();
                clearInterval(this._temporizador);
            }
        }, 1000); // Se ejecuta cada 1 segundo (1000 ms)

        // --- SISTEMA DE AUDIO ---
        // 1. Crear los "oídos" y pegarlos a la cámara
        this._listener = new THREE.AudioListener();
        this._camera.add(this._listener);

        // 2. Objeto para guardar tus sonidos cargados
        this._sounds = {};

        const audioLoader = new THREE.AudioLoader();

        // Función auxiliar para cargar (para no repetir código)
        const loadSound = (name, path, loop, volume) => {
            const sound = new THREE.Audio(this._listener);
            audioLoader.load(path, (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(loop);
                sound.setVolume(volume);
                this._sounds[name] = sound;

                // Si es la música de fondo, dale play apenas cargue
                if (name === 'bgm') sound.play();
            });
        };

        // --- CARGAR TUS ARCHIVOS AQUÍ ---
        // Nombre, Ruta, ¿Se repite?, Volumen (0 a 1)
        loadSound('bgm', './Resources/Audio/nivel3.mp3', true, 0.07);
        loadSound('walk', './Resources/Audio/pasos.mp3', true, 0.25);
        loadSound('run', './Resources/Audio/correr.mp3', true, 0.25);
        loadSound('jump', './Resources/Audio/salto.mp3', false, 0.1);
        loadSound('orb', './Resources/Audio/orbe.mp3', false, 0.05);
        loadSound('bossDeath', './Resources/Audio/explosion.mp3', false, .1);

        document.addEventListener('keydown', (event) => this._onKeyDown(event));
        document.addEventListener('keyup', (event) => this._onKeyUp(event));

        const btnJugar = document.getElementById('jugar-button');
        if (btnJugar) btnJugar.addEventListener('click', () => this._togglePause());

        const btnSalir = document.getElementById('back-to-menu-button');
        if (btnSalir) btnSalir.addEventListener('click', () => this._exitToMenu());

        // --- MULTIJUGADOR: Conectar si el usuario eligió ese modo ---
        if (window.isMultiplayer) {
            console.log("🔵 Iniciando modo Multijugador...");

            // ESTO ES LO QUE TIENES AHORA (solo conecta):
            // this._socket = io(); 

            // CÁMBIALO POR ESTO (para enviar el nombre):
            const myName = window.currentUser ? window.currentUser.username : "Invitado";
            this._socket = io({
                query: { username: myName }
            });

            this._setupSocketEvents();
        }

        this._RAF();
    }

    _CreateSquareMaze() {
        const textureLoader = new THREE.TextureLoader();
        const metalTexture = textureLoader.load('./Resources/Imagenes/Metal.jpg');
        metalTexture.wrapS = THREE.RepeatWrapping;
        metalTexture.wrapT = THREE.RepeatWrapping;

        const wallMat = new THREE.MeshStandardMaterial({ map: metalTexture, color: 0x555555 });
        const floorMat = new THREE.MeshStandardMaterial({ map: metalTexture, color: 0x222222 });

        // MAPA CUADRADO 15x15
        // 1 = Pared, 0 = Camino
        const map = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], // Fila 1: START en col 1 (0,0 es pared)
            [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Fila 13: END en col 13
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ];

        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                const type = map[row][col];

                // Coordenadas centradas según el índice de la matriz
                // Offset de -7 columnas para centrar el mapa en X=0 aproximadamente
                const x = (col - 7) * BLOCK_SIZE;
                const z = row * BLOCK_SIZE;

                if (type === 1) {
                    // Pared
                    const geo = new THREE.BoxGeometry(BLOCK_SIZE, WALL_HEIGHT, BLOCK_SIZE);
                    const mesh = new THREE.Mesh(geo, wallMat);
                    mesh.position.set(x, WALL_HEIGHT / 2, z);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this._scene.add(mesh);
                    this._platforms.push(mesh);
                } else {
                    // Suelo
                    const geo = new THREE.BoxGeometry(BLOCK_SIZE, 2, BLOCK_SIZE);
                    const mesh = new THREE.Mesh(geo, floorMat);
                    mesh.position.set(x, 0, z); // Y=0 (superficie en Y=1)
                    mesh.receiveShadow = true;
                    this._scene.add(mesh);
                    this._platforms.push(mesh);
                    this._floorMeshes.push(mesh);
                }
            }
        }
    }

    _LoadEnemyFBX() {
        const loader = new FBXLoader();
        loader.setPath('./Resources/Modelos/Enemigo/');
        loader.load('Enemigo.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
            });

            // POSICIÓN DEL BOSS (Al final del laberinto)
            fbx.position.set(BOSS_X, 1, BOSS_Z);
            fbx.rotation.y = Math.PI;

            this._scene.add(fbx);
            this._enemy = fbx;
            this._enemyMixer = new THREE.AnimationMixer(fbx);
            this._enemyAnimations = {};

            const _OnLoad = (name, anim) => {
                const clip = anim.animations[0];
                const action = this._enemyMixer.clipAction(clip);
                this._enemyAnimations[name] = action;
            };

            const animLoader = new FBXLoader();
            animLoader.setPath('./Resources/Modelos/Enemigo/');
            animLoader.load('Idle.fbx', (a) => { _OnLoad('idle', a); });
            animLoader.load('Dying.fbx', (a) => { _OnLoad('dying', a); });
            animLoader.load('Mutant Punch.fbx', (a) => { _OnLoad('punch', a); });

            setTimeout(() => {
                const idleAction = this._enemyAnimations['idle'];
                if (idleAction) {
                    idleAction.reset().play();
                    idleAction.loop = THREE.LoopRepeat;
                }
            }, 1500);
        });
    }

    _CheckCollisions() {
        if (!this._controls || !this._controls._target || !this._orbSpawner) return;

        const playerPosition = this._controls._target.position;
        const COLLECTION_RADIUS = 3.0;
        const orbs = this._orbSpawner._orbs || [];

        for (let i = orbs.length - 1; i >= 0; i--) {
            const orb = orbs[i];
            const distance = playerPosition.distanceTo(orb.position);

            if (distance < COLLECTION_RADIUS) {

                if (this._sounds && this._sounds['orb']) {
                    if (this._sounds['orb'].isPlaying) this._sounds['orb'].stop(); // Permite agarrar varios rápido
                    this._sounds['orb'].play();
                }

                this._orbSpawner.collectOrb(orb);
                this._orbsCollected++;
                this._tiempoSinRecolectar = 0;
                this._timeLeft = 30; // ¡Reseteamos a 30 segundos!

                const timerElement = document.getElementById('time-counter');
                if (timerElement) {
                    timerElement.innerText = 30;
                    timerElement.style.color = 'white'; // Volver a blanco si estaba rojo
                }

                const counter = document.getElementById('orbCounter');
                if (counter) counter.textContent = `Orbes: ${this._orbsCollected}`;
                this._actualizarBarraEnergia();
            }
        }
    }

    _UpdateCamera() {
        if (!this._controls._target) return;

        this._cameraTarget.copy(this._controls._target.position);
        this._cameraTarget.y += 5;

        const tempOffset = this._cameraOffset.clone();
        tempOffset.applyQuaternion(this._controls._target.quaternion);
        tempOffset.add(this._controls._target.position);

        this._camera.position.lerp(tempOffset, 0.1);
        this._camera.lookAt(this._cameraTarget);
    }

    _LoadAnimatedModel() {
        const params = {
            camera: this._camera,
            scene: this._scene,
            platforms: this._platforms,
            game: this,
            sounds: this._sounds
        }
        this._controls = new BasicCharacterController(params);
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _onKeyDown(event) {
        if (this._isPaused) {
            if (event.key === "Escape" || event.keyCode === 27) this._togglePause();
            return;
        }
        if (this._isDead) return;

        if (this._controls && this._controls._input) {
            this._controls._input._onKeyDown(event);
        }
        if (event.key === "Escape" || event.keyCode === 27) this._togglePause();
    }

    _onKeyUp(event) {
        if (this._isPaused || this._isDead) return;
        if (this._controls && this._controls._input) {
            this._controls._input._onKeyUp(event);
        }
    }

    _togglePause() {
        this._isPaused = !this._isPaused;
        if (this._isPaused) {
            this._pauseMenu.style.display = 'flex';
            cancelAnimationFrame(this._RAF_ID);
            document.getElementById('pauseOverlay').style.display = 'block';
        } else {
            this._pauseMenu.style.display = 'none';
            this._RAF();
            document.getElementById('pauseOverlay').style.display = 'none';
        }
    }

    _RAF() {
        this._RAF_ID = requestAnimationFrame((t) => {
            if (this._previousRAF === null) this._previousRAF = t;
            if (this._isPaused) return;

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
            this._RAF();
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        // Actualizaciones normales
        if (this._mixers) this._mixers.map(m => m.update(timeElapsedS));
        if (this._enemyMixer) this._enemyMixer.update(timeElapsed * 0.001);
        if (this._controls) this._controls.Update(timeElapsedS);
        if (this._orbSpawner) this._orbSpawner.update(timeElapsedS);
        if (this._dustSystem) this._dustSystem.update(timeElapsedS); // Nivel 2 usa polvo, no fuego

        // Explosiones
        for (let i = this._explosions.length - 1; i >= 0; i--) {
            const explosion = this._explosions[i];
            const isDead = explosion.update(timeElapsedS);
            if (isDead) this._explosions.splice(i, 1);
        }

        this._CheckCollisions();
        this._CheckBossEncounter();
        this._UpdateCamera();

        // --- MULTIJUGADOR: Enviar datos al servidor ---
        if (this._socket && this._controls && this._controls._target) {
            const pos = this._controls._target.position;
            const rot = this._controls._target.quaternion;

            // Obtenemos la animación actual de forma segura
            const currentAnim = this._controls._stateMachine._currentState?.Name || 'idle';

            this._socket.emit('playerMovement', {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                rotation: rot,
                anim: currentAnim
            });
        }
        // ----------------------------------------------
    }

    _TriggerDeath() {
        if (this._isDead) return;
        this._isDead = true;
        if (this._controls && this._controls._target) this._controls._target.visible = false;

        this._TriggerLoss();
    }

    _exitToMenu() {
        window.location.href = 'index.html';
    }

    _actualizarBarraEnergia() {
        const barraImg = document.getElementById("barra-energia-img");
        if (!barraImg) return;
        const progreso = Math.min(this._orbsCollected, 5);
        const rutaBase = "./Resources/UI/";
        const nombreImagen = progreso === 0 ? "HUH.png" : `HUH-${progreso}.png`;
        barraImg.src = rutaBase + nombreImagen;
    }

    _TriggerLoss() {
        if (this._isDead || this._gameWon) return;
        this._isDead = true;
        const overlay = document.getElementById("lose-screen");
        if (overlay) overlay.classList.add("active");
        clearInterval(this._temporizador);
        if (this._controls) this._controls._input._keys = {};

        const playerName = prompt("¡Perdiste! Ingresa tu nombre:");
        fetch('http://localhost:3000/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: playerName, score: this._orbsCollected })
        });
    }

    _TriggerWin() {
        if (this._isDead || this._gameWon) return;
        this._gameWon = true;

        // 1. Mostrar pantalla de victoria
        const overlay = document.getElementById("win-screen");
        if (overlay) overlay.classList.add("active");

        clearInterval(this._temporizador);
        if (this._controls) this._controls._input._keys = {};

        // 2. Guardar Puntaje
        const playerName = window.currentUser ? window.currentUser.username : "Jugador Anónimo";
        const userId = window.currentUser ? window.currentUser.id : null;

        if (userId) {
            fetch('http://localhost:3000/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, score: this._orbsCollected, level: "Nivel 1" })
            }).catch(err => console.error(err));
        }

        // 3. Configurar el Botón de Twitter
        const buttonContainer = overlay.querySelector('div');

        if (!document.getElementById('btn-share-twitter')) {
            const twitterBtn = document.createElement('button');
            twitterBtn.id = 'btn-share-twitter';
            twitterBtn.innerText = "🏆 Compartir en Twitter";
            twitterBtn.style.backgroundColor = "#1DA1F2";
            twitterBtn.style.color = "white";
            twitterBtn.style.marginTop = "10px";
            twitterBtn.style.cursor = "pointer";

            // --- AQUÍ ESTÁ LA DEPURACIÓN ---
            // ... dentro de _TriggerWin ...

            twitterBtn.onclick = () => {
                const socialModal = document.getElementById('socialModal');
                const postInput = document.getElementById('postContent');
                const userInput = document.getElementById('usernameInput');

                if (socialModal) {
                    // 1. Mostrar ventana (Forzando capa superior)
                    socialModal.style.display = 'flex';
                    socialModal.style.zIndex = "99999";

                    // 2. DATOS DEL JUGADOR
                    const nombre = window.currentUser ? window.currentUser.username : "Jugador Invitado";
                    const puntos = this._orbsCollected;
                    const nivel = "Nivel 3"; // Cambia esto en Nivel 2 y 3

                    // 3. LLENAR AUTOMÁTICAMENTE EL MENSAJE
                    // Aquí defines qué dirá el tweet
                    if (postInput) {
                        postInput.value = `¡He completado el ${nivel}!\n\n👤 Jugador: ${nombre}\n💎 Puntuación: ${puntos} orbes\n\n¿Podrás superarme?`;
                    }

                    // Llenar el campo de usuario (visual)
                    if (userInput) {
                        userInput.value = nombre;
                    }
                } else {
                    console.error("No se encontró el modal #socialModal en el HTML");
                }
            };

            buttonContainer.appendChild(twitterBtn);
        }
    }

    _CheckBossEncounter() {
        if (!this._controls || !this._controls._playerBox || !this._bossHitbox) return;
        if (!this._controls._target || this._bossDefeated || this._isDead) return;

        const playerAABB = this._controls._playerBox.clone().translate(this._controls._target.position);

        if (playerAABB.intersectsBox(this._bossHitbox)) {
            this._bossDefeated = true;
            if (this._orbsCollected >= 5) {
                this._PlayEnemyDeath();
            } else {
                console.log("No tienes orbes suficientes...");
                this._PlayEnemyAttackAndLose();
            }
        }
    }

    _PlayEnemyAttackAndLose() {
        const idleAction = this._enemyAnimations['idle'];
        const punchAction = this._enemyAnimations['punch'];

        if (!punchAction) {
            this._TriggerLoss();
            return;
        }

        if (idleAction) idleAction.fadeOut(0.2);
        punchAction.reset();
        punchAction.setLoop(THREE.LoopOnce, 1);
        punchAction.clampWhenFinished = true;
        punchAction.fadeIn(0.2);
        punchAction.play();

        const onFinish = (e) => {
            if (e.action === punchAction) {
                setTimeout(() => { this._TriggerLoss(); }, 500);
                this._enemyMixer.removeEventListener('finished', onFinish);
            }
        };
        this._enemyMixer.addEventListener('finished', onFinish);
    }

    _PlayEnemyDeath() {
        const idleAction = this._enemyAnimations['idle'];
        const dyingAction = this._enemyAnimations['dying'];

        if (!dyingAction) {
            this._TriggerWin();
            return;
        }

        const explosionPos = this._enemy.position.clone();
        explosionPos.y += 2.0;

        const explosion = new ExplosionParticleSystem({
            scene: this._scene,
            count: 400,
            position: explosionPos,
            texture: './Resources/Imagenes/sparkle.png'
        });
        this._explosions.push(explosion);

        if (idleAction) idleAction.stop();
        dyingAction.reset();
        dyingAction.setLoop(THREE.LoopOnce, 1);
        dyingAction.clampWhenFinished = true;
        dyingAction.play();

        if (this._sounds && this._sounds['bossDeath']) {
            this._sounds['bossDeath'].play();
        }

        const onFinish = (e) => {
            if (e.action === dyingAction) {
                setTimeout(() => { this._TriggerWin(); }, 1000);
                this._enemyMixer.removeEventListener('finished', onFinish);
            }
        };
        this._enemyMixer.addEventListener('finished', onFinish);
    }

    _setupSocketEvents() {
        // 1. Cargar jugadores existentes
        this._socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach((id) => {
                if (id !== this._socket.id) {
                    this._addRemotePlayer(id, players[id]);
                }
            });
        });

        // 2. Alguien nuevo entró
        this._socket.on('newPlayer', (info) => {
            this._addRemotePlayer(info.playerId, info.playerInfo);
        });

        // 3. Alguien se movió (Sincronización de Posición y Animación)
        this._socket.on('playerMoved', (info) => {
            const remotePlayer = this._remotePlayers[info.playerId];

            if (remotePlayer && remotePlayer.mesh) {
                // Actualizar Posición
                remotePlayer.mesh.position.set(info.x, info.y, info.z);
                remotePlayer.mesh.quaternion.set(
                    info.rotation._x, info.rotation._y, info.rotation._z, info.rotation._w
                );

                // Actualizar Animación
                if (remotePlayer.actions && info.anim) {
                    if (remotePlayer.currentAnim !== info.anim) {
                        const newAction = remotePlayer.actions[info.anim];
                        const prevAction = remotePlayer.actions[remotePlayer.currentAnim];

                        if (newAction) {
                            if (prevAction) prevAction.fadeOut(0.2);
                            newAction.reset().fadeIn(0.2).play();
                            remotePlayer.currentAnim = info.anim;
                        }
                    }
                }
            }
        });

        // 4. Desconexión
        this._socket.on('playerDisconnected', (id) => {
            if (this._remotePlayers[id]) {
                this._scene.remove(this._remotePlayers[id].mesh);
                delete this._remotePlayers[id];
            }
        });
    }

    _addRemotePlayer(id, data) {
        const loader = new FBXLoader();
        loader.setPath('./Resources/Modelos/Personaje/');

        loader.load('Tilin2.fbx', (fbx) => {
            fbx.scale.setScalar(0.05);
            fbx.traverse(c => { c.castShadow = true; });

            // --- NUEVO: AGREGAR ETIQUETA DE NOMBRE ---
            // Usamos data.username (que viene del servidor) o "Jugador" por defecto
            const nameLabel = this._createNameLabel(data.username || "Jugador");
            fbx.add(nameLabel); // Pegamos el cartel al personaje

            // Posición inicial
            fbx.position.set(data.x, data.y, data.z);
            if (data.rotation) {
                fbx.quaternion.set(data.rotation._x, data.rotation._y, data.rotation._z, data.rotation._w);
            }

            // Configurar AnimationMixer
            const mixer = new THREE.AnimationMixer(fbx);
            this._mixers.push(mixer); // Agregar al array global para que se mueva

            const actions = {};

            // Cargar clips de animación
            const loadAnim = (animName, fileName) => {
                const animLoader = new FBXLoader();
                animLoader.setPath('./Resources/Modelos/Personaje/');
                animLoader.load(fileName, (anim) => {
                    const action = mixer.clipAction(anim.animations[0]);
                    actions[animName] = action;
                    if (animName === 'idle') action.play();
                });
            };

            loadAnim('idle', 'idle.fbx');
            loadAnim('walk', 'Walk.fbx');
            loadAnim('run', 'Run.fbx');

            this._remotePlayers[id] = {
                mesh: fbx,
                mixer: mixer,
                actions: actions,
                currentAnim: 'idle'
            };

            this._scene.add(fbx);
        });
    }

    _createNameLabel(text) {
        // 1. Crear un Canvas HTML5 para dibujar el texto
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Configuración del tamaño y fuente
        // (Usamos tamaños grandes para que no se vea pixelado)
        canvas.width = 512;
        canvas.height = 128;

        context.font = 'bold 70px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';

        // Sombra negra para que se lea bien sobre cualquier fondo
        context.shadowColor = "black";
        context.shadowBlur = 7;
        context.lineWidth = 4;
        context.strokeText(text, 256, 80); // Borde
        context.fillText(text, 256, 80);   // Relleno

        // 2. Crear textura y Sprite de Three.js
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);

        // 3. Ajustar posición y escala
        // Como tu personaje es escala 0.05, el sprite debe ser MUY grande localmente para verse normal.
        sprite.position.set(0, 200, 0); // 200 unidades arriba (en espacio local del modelo)
        sprite.scale.set(60, 15, 1);    // Escala del cartel

        return sprite;
    }
}

// ====================================================
// CLASES DE PARTÍCULAS
// ====================================================

class ExplosionParticleSystem {
    constructor(params) {
        this.scene = params.scene;
        this.particleCount = params.count || 400;
        this.emitterPosition = params.position || new THREE.Vector3(0, 0, 0);
        this.texturePath = params.texture || './Resources/Imagenes/sparkle.png';
        this.particles = [];
        this.geometry = new THREE.BufferGeometry();
        this.isDead = false;

        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const color = new THREE.Color();

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = this.emitterPosition.x;
            positions[i * 3 + 1] = this.emitterPosition.y;
            positions[i * 3 + 2] = this.emitterPosition.z;
            color.set(0xFFFFAA);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            const velocity = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
            velocity.normalize().multiplyScalar(Math.random() * 15 + 10);
            const lifetime = Math.random() * 1.0 + 0.5;
            this.particles.push({ velocity: velocity, lifetime: lifetime, initialLifetime: lifetime });
        }
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const textureLoader = new THREE.TextureLoader();
        const particleTexture = textureLoader.load(this.texturePath);
        this.material = new THREE.PointsMaterial({ map: particleTexture, size: 2.0, sizeAttenuation: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, vertexColors: true });
        this.pointSystem = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.pointSystem);
    }

    update(timeDelta) {
        if (this.isDead) return true;
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const color = new THREE.Color();
        const targetColor = new THREE.Color(0xFF4500);
        const gravity = 9.8;
        let allDead = true;
        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.particles[i];
            if (particle.lifetime <= 0) continue;
            allDead = false;
            particle.lifetime -= timeDelta;
            if (particle.lifetime <= 0) { colors[i * 3] = 0; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 0; continue; }
            particle.velocity.y -= gravity * timeDelta;
            positions[i * 3] += particle.velocity.x * timeDelta;
            positions[i * 3 + 1] += particle.velocity.y * timeDelta;
            positions[i * 3 + 2] += particle.velocity.z * timeDelta;
            const lifePercent = particle.lifetime / particle.initialLifetime;
            color.setRGB(1.0, 1.0, 0.5);
            color.lerp(targetColor, 1.0 - lifePercent);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        if (allDead) {
            this.isDead = true;
            this.scene.remove(this.pointSystem);
            this.geometry.dispose();
            this.material.dispose();
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        return this.isDead;
    }
}

// ... (código anterior sin cambios) ...

/**
 * Sistema de Niebla Volumétrica.
 * Usa partículas grandes y suaves para simular nubes bajas.
 */
class FogParticleSystem {
    constructor(params) {
        this.scene = params.scene;
        this.count = params.count || 800; // Menos partículas, pero más grandes

        // Límites del laberinto
        this.bounds = { minX: -350, maxX: 350, minY: -5, maxY: 20, minZ: -50, maxZ: 800 };

        this.particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        this.velocities = [];

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);
            // La niebla se mantiene baja (cerca del suelo)
            positions[i * 3 + 1] = THREE.MathUtils.randFloat(this.bounds.minY, this.bounds.maxY);
            positions[i * 3 + 2] = THREE.MathUtils.randFloat(this.bounds.minZ, this.bounds.maxZ);

            this.velocities.push({
                x: (Math.random() - 0.5) * 2.0, // Movimiento lento lateral
                y: 0,                          // Sin movimiento vertical (flota)
                z: (Math.random() - 0.5) * 2.0 // Movimiento lento frontal
            });
        }

        this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const textureLoader = new THREE.TextureLoader();

        // INTENTA USAR UNA TEXTURA DE HUMO/NUBE. Si no tienes, usa sparkle pero se verá raro.
        // Lo ideal es un archivo "smoke.png" que sea una mancha blanca difusa transparente.
        const particleTexture = textureLoader.load('./Resources/Imagenes/fog.png');

        this.particlesMaterial = new THREE.PointsMaterial({
            color: 0x555555,    // Gris humo
            size: 80.0,         // ¡TAMAÑO GIGANTE! Para que parezcan nubes
            map: particleTexture,
            transparent: true,
            opacity: .2,      // Muy transparente para que se mezclen
            depthWrite: false,  // Importante para que no se tapen entre sí feo
            blending: THREE.AdditiveBlending // Hace que brillen un poco (tipo niebla mágica)
            // Si quieres niebla oscura/tétrica, quita el "blending" y cambia color a 0x000000
        });

        this.particleSystem = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
        this.scene.add(this.particleSystem);
    }

    update(timeInSeconds) {
        const positions = this.particlesGeometry.attributes.position.array;

        for (let i = 0; i < this.count; i++) {
            // Mover partículas
            positions[i * 3] += this.velocities[i].x * timeInSeconds;
            positions[i * 3 + 2] += this.velocities[i].z * timeInSeconds;

            // Teletransportar si salen del mapa (efecto infinito)
            if (positions[i * 3] > this.bounds.maxX) positions[i * 3] = this.bounds.minX;
            if (positions[i * 3] < this.bounds.minX) positions[i * 3] = this.bounds.maxX;

            if (positions[i * 3 + 2] > this.bounds.maxZ) positions[i * 3 + 2] = this.bounds.minZ;
            if (positions[i * 3 + 2] < this.bounds.minZ) positions[i * 3 + 2] = this.bounds.maxZ;
        }

        this.particlesGeometry.attributes.position.needsUpdate = true;

        // Truco visual: Rotar todo el sistema muy lentamente para que la niebla parezca viva
        this.particleSystem.rotation.y += 0.02 * timeInSeconds;
    }
}

// ... (resto del código sin cambios) ...

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new CharacterControllerDemo();
});