import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';

import { OrbSpawner } from './OrbSpawner.js';

// Carga el personaje
class BasicCharacterControllerProxy {
    constructor(animations) {
        this._animations = animations;
    }

    get animations() {
        return this._animations;
    }
};


class BasicCharacterController {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._params = params;
        this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);

        this._speedMultiplier = 1.0;

        this._soundJumpCooldown = 0.0; // Temporizador para el salto
        this._gameRef = params.game;

        // --- CÓDIGO AÑADIDO PARA EL SALTO ---
        this._gravity = new THREE.Vector3(0, -100.0, 0); // Fuerza de la gravedad
        this._jumpForce = 50.0;   // Impulso inicial del salto
        this._onGround = true;    // Indica si el personaje puede saltar
        // --- FIN DEL CÓDIGO AÑADIDO ---

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(
            new BasicCharacterControllerProxy(this._animations));

        this._LoadModels();

        // --- CÓDIGO AÑADIDO PARA HITBOXES ---

        // 1. Define un "hitbox" para el jugador (Ancho: 1, Alto: 2, Profundidad: 1)
        this._playerBox = new THREE.Box3(
            new THREE.Vector3(-0.5, 0.0, -0.5), // min (x, y, z)
            new THREE.Vector3(0.5, 2.0, 0.5)  // max (x, y, z)
        );

        // 2. Crea un ARRAY para guardar TODAS las colisiones
        this._colliders = [];

        // Centro: (-33, 0, 47)
        const wallBox1 = new THREE.Box3(
            new THREE.Vector3(-36, -3, 44),
            new THREE.Vector3(-30, 3, 50)
        );
        this._colliders.push(wallBox1);

        // Centro: (9, 0, 0)
        const wallBox2 = new THREE.Box3(
            new THREE.Vector3(6, -3, -3),
            new THREE.Vector3(12, 3, 3)
        );
        this._colliders.push(wallBox2);

        // Centro: (36, 0, -23)
        const wallBox3 = new THREE.Box3(
            new THREE.Vector3(33, -3, -26),
            new THREE.Vector3(39, 3, -20)
        );
        this._colliders.push(wallBox3);

        // Centro: (63, 0, -47)
        const wallBox4 = new THREE.Box3(
            new THREE.Vector3(60, -3, -50),
            new THREE.Vector3(66, 3, -44)
        );
        this._colliders.push(wallBox4);

        // Centro: (98, 0, -25)
        const wallBox5 = new THREE.Box3(
            new THREE.Vector3(95, -3, -28),
            new THREE.Vector3(101, 3, -22)
        );
        this._colliders.push(wallBox5);

        // Centro: (118, 0, -57)
        const wallBox6 = new THREE.Box3(
            new THREE.Vector3(115, -3, -60),
            new THREE.Vector3(121, 3, -54)
        );
        this._colliders.push(wallBox6);

        // Centro: (151, 0, -80)
        const wallBox7 = new THREE.Box3(
            new THREE.Vector3(148, -3, -83),
            new THREE.Vector3(154, 3, -77)
        );
        this._colliders.push(wallBox7);

        // Centro: (148, 0, -143)
        const wallBox8 = new THREE.Box3(
            new THREE.Vector3(145, -3, -146),
            new THREE.Vector3(151, 3, -140)
        );
        this._colliders.push(wallBox8);

        // Centro: (156, 0, -31)
        const wallBox9 = new THREE.Box3(
            new THREE.Vector3(153, -3, -34),
            new THREE.Vector3(159, 3, -28)
        );
        this._colliders.push(wallBox9);

        // Centro: (191, 0, -20)
        const wallBox10 = new THREE.Box3(
            new THREE.Vector3(188, -3, -23),
            new THREE.Vector3(194, 3, -17)
        );
        this._colliders.push(wallBox10);

        // Centro: (177, 0, 34)
        const wallBox11 = new THREE.Box3(
            new THREE.Vector3(174, -3, 31),
            new THREE.Vector3(180, 3, 37)
        );
        this._colliders.push(wallBox11);

        // Centro: (151, 0, 58)
        const wallBox12 = new THREE.Box3(
            new THREE.Vector3(148, -3, 55),
            new THREE.Vector3(154, 3, 61)
        );
        this._colliders.push(wallBox12);

        // Centro: (163, 0, 93)
        const wallBox13 = new THREE.Box3(
            new THREE.Vector3(160, -3, 90),
            new THREE.Vector3(166, 3, 96)
        );
        this._colliders.push(wallBox13);

        // Centro: (184, 0, 126)
        const wallBox14 = new THREE.Box3(
            new THREE.Vector3(181, -3, 123),
            new THREE.Vector3(187, 3, 129)
        );
        this._colliders.push(wallBox14);

        // Centro: (216, 0, 108)
        const wallBox15 = new THREE.Box3(
            new THREE.Vector3(213, -3, 105),
            new THREE.Vector3(219, 3, 111)
        );
        this._colliders.push(wallBox15);

        // Centro: (264, 0, 116)
        const wallBox16 = new THREE.Box3(
            new THREE.Vector3(261, -3, 113),
            new THREE.Vector3(267, 3, 119)
        );
        this._colliders.push(wallBox16);

        // Centro: (69, 0, 1)
        const wallBox17 = new THREE.Box3(
            new THREE.Vector3(66, -3, -2),
            new THREE.Vector3(72, 3, 4)
        );
        this._colliders.push(wallBox17);

        // Centro: (116, 0, 33)
        const wallBox18 = new THREE.Box3(
            new THREE.Vector3(113, -3, 30),
            new THREE.Vector3(119, 3, 36)
        );
        this._colliders.push(wallBox18);

        // Centro: (135, 0, 1.5)
        const wallBox19 = new THREE.Box3(
            new THREE.Vector3(132, -3, -1.5),
            new THREE.Vector3(138, 3, 4.5)
        );
        this._colliders.push(wallBox19);

        // Centro: (123, 0, 109)
        const wallBox20 = new THREE.Box3(
            new THREE.Vector3(120, -3, 106),
            new THREE.Vector3(126, 3, 112)
        );
        this._colliders.push(wallBox20);

        // Centro: (138, 0, 146)
        const wallBox21 = new THREE.Box3(
            new THREE.Vector3(135, -3, 143),
            new THREE.Vector3(141, 3, 149)
        );
        this._colliders.push(wallBox21);

        // Centro: (79, 0, 135)
        const wallBox22 = new THREE.Box3(
            new THREE.Vector3(76, -3, 132),
            new THREE.Vector3(82, 3, 138)
        );
        this._colliders.push(wallBox22);

        // Centro: (70, 0, 170)
        const wallBox23 = new THREE.Box3(
            new THREE.Vector3(67, -3, 167),
            new THREE.Vector3(73, 3, 173)
        );
        this._colliders.push(wallBox23);

        // Centro: (24, 0, 149)
        const wallBox24 = new THREE.Box3(
            new THREE.Vector3(21, -3, 146),
            new THREE.Vector3(27, 3, 152)
        );
        this._colliders.push(wallBox24);

        // Centro: (-7, 0, 122)
        const wallBox25 = new THREE.Box3(
            new THREE.Vector3(-10, -3, 119),
            new THREE.Vector3(-4, 3, 125)
        );
        this._colliders.push(wallBox25);

        // Centro: (-41, 0, 147)
        const wallBox26 = new THREE.Box3(
            new THREE.Vector3(-44, -3, 144),
            new THREE.Vector3(-38, 3, 150)
        );
        this._colliders.push(wallBox26);

        // Centro: (-73, 0, 149)
        const wallBox27 = new THREE.Box3(
            new THREE.Vector3(-76, -3, 146),
            new THREE.Vector3(-70, 3, 152)
        );
        this._colliders.push(wallBox27);

        // Centro: (-95, 0, 113)
        const wallBox28 = new THREE.Box3(
            new THREE.Vector3(-98, -3, 110),
            new THREE.Vector3(-92, 3, 116)
        );
        this._colliders.push(wallBox28);

        // Centro: (-63, 0, 79)
        const wallBox29 = new THREE.Box3(
            new THREE.Vector3(-66, -3, 76),
            new THREE.Vector3(-60, 3, 82)
        );
        this._colliders.push(wallBox29);

        // Centro: (4, 0, 47)
        const wallBox30 = new THREE.Box3(
            new THREE.Vector3(1, -3, 44),
            new THREE.Vector3(7, 3, 50)
        );
        this._colliders.push(wallBox30);

        // Centro: (49, 0, 30)
        const wallBox31 = new THREE.Box3(
            new THREE.Vector3(46, -3, 27),
            new THREE.Vector3(52, 3, 33)
        );
        this._colliders.push(wallBox31);

        // Centro: (-40, 0, 99)
        const wallBox32 = new THREE.Box3(
            new THREE.Vector3(-43, -3, 96),
            new THREE.Vector3(-37, 3, 102)
        );
        this._colliders.push(wallBox32);

        // Centro: (24, 0, 149)
        const wallBox33 = new THREE.Box3(
            new THREE.Vector3(21, -3, 146),
            new THREE.Vector3(27, 3, 152)
        );
        this._colliders.push(wallBox33);

        // Centro: (24, 0, 149)
        const wallBox34 = new THREE.Box3(
            new THREE.Vector3(21, -3, 146),
            new THREE.Vector3(27, 3, 152)
        );
        this._colliders.push(wallBox34);


        const V_min = new THREE.Vector3(-99, -5, -170);
        const V_max = new THREE.Vector3(99, 15, -80);
        const myNewBox = new THREE.Box3(V_min, V_max);
        this._colliders.push(myNewBox);

        const V_min_colision = new THREE.Vector3(-266, 1, 288);
        const V_max_colision = new THREE.Vector3(197, 15, 337);
        const myNewBox1 = new THREE.Box3(V_min_colision, V_max_colision);
        this._colliders.push(myNewBox1);



    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('./Resources/Modelos/Personaje/');
        loader.load('Tilin2.fbx', (fbx) => {
            fbx.scale.setScalar(0.05);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('./Resources/Modelos/Personaje/');
            loader.load('Walk.fbx', (a) => { _OnLoad('walk', a); });
            loader.load('Run.fbx', (a) => { _OnLoad('run', a); });
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
        });
    }

    // --- NUEVO MÉTODO PARA REVISAR MÚLTIPLES COLISIONES ---
    _CheckCollisions(playerTestBox) {
        // Itera sobre CADA colisionador en nuestro array
        for (const collider of this._colliders) {
            // Si el hitbox de prueba intersecta CUALQUIERA de ellos...
            if (playerTestBox.intersectsBox(collider)) {
                return true; // ¡Colisión detectada! Detiene la función.
            }
        }
        return false; // No se encontró ninguna colisión
    }

    Update(timeInSeconds) {
        if (!this._target) {
            return;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        if (this._soundJumpCooldown > 0) this._soundJumpCooldown -= timeInSeconds;

        this._stateMachine.Update(timeInSeconds, this._input);

        // --- LÓGICA DE SONIDO (PEGA ESTO) ---
        const sounds = this._gameRef ? this._gameRef._sounds : null;
        if (sounds) {
            const keys = this._input._keys;
            const isMoving = keys.forward || keys.backward || keys.left || keys.right;

            if (isMoving && this._onGround) {
                if (keys.shift) { // Correr
                    if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                    if (sounds['run'] && !sounds['run'].isPlaying) sounds['run'].play();
                } else { // Caminar
                    if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
                    if (sounds['walk'] && !sounds['walk'].isPlaying) sounds['walk'].play();
                }
            } else { // Quieto
                if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
            }

            // Salto
            if (keys.space && this._onGround && this._soundJumpCooldown <= 0) {
                if (sounds['jump']) {
                    if (sounds['jump'].isPlaying) sounds['jump'].stop();
                    sounds['jump'].play();
                }
                this._soundJumpCooldown = 1.0;
            }
        }

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

        // --- AGREGA ESTA LÍNEA AQUÍ ---
        acc.multiplyScalar(this._speedMultiplier);
        // ------------------------------

        if (this._input._keys.shift) {
            acc.multiplyScalar(3.0);
        }

        if (this._input._keys.forward) {
            velocity.z += acc.z * timeInSeconds;
        }
        if (this._input._keys.backward) {
            velocity.z -= acc.z * timeInSeconds;
        }
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

        // --- CÓDIGO AÑADIDO PARA SALTO Y GRAVEDAD ---

        // 1. Revisa si se presiona Espacio y si estamos en el suelo
        if (this._input._keys.space && this._onGround) {
            this._velocity.y = this._jumpForce; // Aplica la fuerza del salto
            this._onGround = false;           // Ya no estamos en el suelo
        }

        // 2. Aplica la gravedad a la velocidad vertical en cada frame
        this._velocity.y += this._gravity.y * timeInSeconds;

        // 3. Mueve el personaje verticalmente
        controlObject.position.y += this._velocity.y * timeInSeconds;

        // 4. Detecta si el personaje ha aterrizado (y <= 0)
        if (controlObject.position.y <= 0.0) {
            controlObject.position.y = 0.0;    // Lo coloca exactamente en el suelo
            this._velocity.y = 0;              // Detiene la velocidad vertical
            this._onGround = true;             // Permite volver a saltar
        }
        // --- FIN DEL CÓDIGO AÑADIDO ---


        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);


        // --- INICIO DE LA LÓGICA DE COLISIÓN (CON ARRAY) ---

        // 1. Obtenemos el "hitbox" actual del jugador en su posición
        const playerAABB = this._playerBox.clone().translate(controlObject.position);

        // 2. Probamos movernos solo en el eje Z (adelante/atrás)
        const testAABB_Z = playerAABB.clone().translate(forward);

        // 3. Revisamos si choca con CUALQUIER objeto
        if (!this._CheckCollisions(testAABB_Z)) {
            // Si NO choca, permitimos el movimiento en Z
            controlObject.position.add(forward);
        }

        // 4. Actualizamos el "hitbox" a la nueva posición (después de mover en Z)
        const playerAABB_PostZ = this._playerBox.clone().translate(controlObject.position);

        // 5. Probamos movernos solo en el eje X (lados)
        const testAABB_X = playerAABB_PostZ.clone().translate(sideways);

        // 6. Revisamos si choca con CUALQUIER objeto
        if (!this._CheckCollisions(testAABB_X)) {
            // Si NO choca, permitimos el movimiento en X
            controlObject.position.add(sideways);
        }

        // --- FIN DE LA LÓGICA DE COLISIÓN ---

        if (this._mixer) {
            this._mixer.update(timeInSeconds);
        }
    }
};

class BasicCharacterControllerInput {
    constructor() {
        this._Init();
    }

    _Init() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = true;
                break;
            case 65: // a
                this._keys.left = true;
                break;
            case 83: // s
                this._keys.backward = true;
                break;
            case 68: // d
                this._keys.right = true;
                break;
            case 32: // SPACE
                this._keys.space = true;
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                break;
        }
    }

    _onKeyUp(event) {
        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = false;
                break;
            case 65: // a
                this._keys.left = false;
                break;
            case 83: // s
                this._keys.backward = false;
                break;
            case 68: // d
                this._keys.right = false;
                break;
            case 32: // SPACE
                this._keys.space = false;
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                break;
        }
    }
};


class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentState = null;
    }

    _AddState(name, type) {
        this._states[name] = type;
    }

    SetState(name) {
        const prevState = this._currentState;

        if (prevState) {
            if (prevState.Name == name) {
                return;
            }
            prevState.Exit();
        }

        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input) {
        if (this._currentState) {
            this._currentState.Update(timeElapsed, input);
        }
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
    constructor(parent) {
        this._parent = parent;
    }

    Enter() { }
    Exit() { }
    Update() { }
};

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

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

    Exit() {
    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};


class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

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

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.forward || input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};


class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle';
    }

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

    Exit() {
    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            this._parent.SetState('walk');
        }
    }
};

// configura la escena
class CharacterControllerDemo {
    constructor() {

        this._isPaused = false;
        this._pauseMenu = document.getElementById('pauseMenu');
        this._RAF_ID = null;

        this._skyboxMesh = null;

        this._orbSpawner = 0;
        this._orbsCollected = 0; // ← inicialización

        this._fireDamageCooldown = 0.0;

        this._fireSystem = null;
        this._explosions = [];

        this._timeLeft = 30; // Empezamos con 30 segundos
        this._temporizador = null;

        // --- AÑADE ESTAS LÍNEAS ---
        this._gameWon = false;         // Para saber si ya ganamos
        this._bossDefeated = false;    // Para que la animación solo suene una vez
        this._tiempoSinRecolectar = 0;
        this._temporizador = null;

        // Definimos la hitbox del jefe aquí
        this._bossHitbox = new THREE.Box3(
            new THREE.Vector3(-10, -5, -78),
            new THREE.Vector3(10, 5, -58)
        );

        // --- MULTIJUGADOR: Variables nuevas ---
        this._remotePlayers = {}; // Aquí guardaremos los modelos de los otros
        this._socket = null;      // Aquí guardaremos la conexión

        this._isDead = false;

        this._Initialize();

        this._listener = new THREE.AudioListener();
        this._camera.add(this._listener); // Pegamos el oído a la cámara
        this._sounds = {}; // Diccionario para guardar los sonidos

        const audioLoader = new THREE.AudioLoader();
        const loadSound = (name, path, loop, volume) => {
            const sound = new THREE.Audio(this._listener);
            audioLoader.load(path, (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(loop);
                sound.setVolume(volume);
                this._sounds[name] = sound;
                if (name === 'bgm') sound.play(); // Reproducir música automáticamente
            });
        };

        // Lista de archivos a cargar
        loadSound('bgm', './Resources/Audio/nivel1.mp3', true, 0.07);
        loadSound('walk', './Resources/Audio/pasos.mp3', true, 0.25);
        loadSound('run', './Resources/Audio/correr.mp3', true, 0.25);
        loadSound('jump', './Resources/Audio/salto.mp3', false, 0.1);
        loadSound('orb', './Resources/Audio/orbe.mp3', false, 0.05);
        loadSound('bossDeath', './Resources/Audio/explosion.mp3', false, .1);
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(25, 10, 25);

        this._scene = new THREE.Scene();
        // --- CÓDIGO PARA SKYBOX GIRATORIO CON 1 IMAGEN PANORÁMICA ---

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            './Resources/Imagenes/Sky.jpg', // Ruta a tu imagen de 360°
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;

                const geometry = new THREE.SphereGeometry(500, 60, 40);
                geometry.scale(-1, 1, 1);

                const material = new THREE.MeshBasicMaterial({ map: texture });

                this._skyboxMesh = new THREE.Mesh(geometry, material);
                this._scene.add(this._skyboxMesh);
                this._scene.environment = texture;
            }
        );

        // --- CÓDIGO ACTUALIZADO: MÚLTIPLES POWERUPS ---
        // 1. ¡IMPORTANTE! Crea la lista ANTES de cargar nada
        // Si no pones esto, el juego intentará leer una lista que no existe y dará pantalla negra.
        this._powerups = [];

        // 2. Configura el cargador
        const powerupLoader = new FBXLoader();
        powerupLoader.setPath('./Resources/Modelos/Poweups/'); // Verifica que esta carpeta exista

        const debugMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00, // Verde puro
            // wireframe: true // DESCOMENTA ESTO SI QUIERES VER SOLO LAS LÍNEAS
        });

        // 3. Carga el modelo
        powerupLoader.load('X2.fbx', (fbx) => {
            console.log("Modelo de velocidad cargado correctamente"); // Mensaje de control

            fbx.scale.setScalar(0.015); // Ajusta el tamaño si es necesario

            fbx.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.material = debugMaterial;
                }
            });

            // Coordenadas donde quieres los items
            const positions = [
                new THREE.Vector3(67, 2, 149),
                new THREE.Vector3(179, 2, -87),
                new THREE.Vector3(-266, 2, 7),
                new THREE.Vector3(-50, 2, 25),
            ];

            for (const pos of positions) {
                const clone = fbx.clone();
                clone.position.copy(pos);

                // Animación opcional: un poco de rotación aleatoria
                // clone.rotation.y = Math.random() * Math.PI;

                this._scene.add(clone);
                this._powerups.push(clone);
            }
        },
            // 4. (Opcional) Callback de progreso
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% cargado');
            },
            // 5. Callback de ERROR (Esto te dirá si la ruta está mal)
            (error) => {
                console.error('Error al cargar velocidad.fbx:', error);
            });
        // -----------------------------------------------------

        // Instancia el OrbSpawner
        this._orbSpawner = new OrbSpawner({
            scene: this._scene,
        });

        // --- *** ¡MODIFICACIÓN 3! *** CÓDIGO PARA AÑADIR EL FUEGO ESTÁTICO ---
        this._fireSystem = new FireParticleSystem({
            scene: this._scene,
            count: 200, // Número de partículas
            // Posición fija que pediste
            position: new THREE.Vector3(10, 0, 10)
        });

        this._fires = []; // Lista para guardar los fuegos

        const cantidadFuegos = 30; // ¡Pon aquí cuantos quieras!
        const rangoMapa = 250;     // Que tan dispersos están (ajusta según tu mapa)

        for (let i = 0; i < cantidadFuegos; i++) {
            // Posición aleatoria (Math.random() va de 0 a 1)
            // (Math.random() - 0.5) * 2 nos da un número entre -1 y 1
            const x = (Math.random() - 0.5) * 2 * rangoMapa;
            const z = (Math.random() - 0.5) * 2 * rangoMapa;

            const fire = new FireParticleSystem({
                scene: this._scene,
                count: 100, // Bajamos un poco la cantidad de partículas por fuego para que no se trabe
                position: new THREE.Vector3(x, 0, z)
            });

            this._fires.push(fire);
        }

        // --- FIN DEL CÓDIGO DE FUEGO ---

        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(-100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 50;
        light.shadow.camera.right = -50;
        light.shadow.camera.top = 50;
        light.shadow.camera.bottom = -50;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 0.25);
        this._scene.add(light);

        const controls = new OrbitControls(
            this._camera, this._threejs.domElement);
        controls.target.set(0, 10, 0);
        controls.update();

        // --- AÑADE ESTE CÓDIGO PARA CARGAR TU MAPA ---
        const loader = new GLTFLoader();
        loader.setPath('./Resources/Modelos/Mapas/Escenario1/'); // Ruta a la carpeta de tu mapa
        loader.load('Escenario1.glb', (gltf) => { // Nombre de tu archivo
            gltf.scene.scale.setScalar(6);
            this._scene.add(gltf.scene);

            gltf.scene.position.set(0, -166.5, 0);
            gltf.scene.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        });
        // --- Fin del código para el mapa ---


        // --- CÓDIGO PARA AÑADIR CAJAS DE COLISIÓN (WIREFRAME) ---
        const collisionBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00, // Verde brillante
            wireframe: true
        });

        const collisionBoxGeometry1 = new THREE.BoxGeometry(3, 30, 3);
        const collisionBoxMesh1 = new THREE.Mesh(collisionBoxGeometry1, collisionBoxMaterial);
        collisionBoxMesh1.position.set(-33, 0, 47);
        this._scene.add(collisionBoxMesh1);

        const collisionBoxGeometry2 = new THREE.BoxGeometry(3, 30, 3);
        const collisionBoxMesh2 = new THREE.Mesh(collisionBoxGeometry2, collisionBoxMaterial);
        collisionBoxMesh2.position.set(9, 0, 0);
        this._scene.add(collisionBoxMesh2);
        // --- FIN DEL CÓDIGO DE LAS CAJAS ---


        this._mixers = [];
        this._previousRAF = null;

        this._cameraTarget = new THREE.Vector3();
        this._cameraOffset = new THREE.Vector3(0, 6, -15);

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
        }, 1000);

        document.addEventListener('keydown', (event) => this._onKeyDown(event));
        document.addEventListener('keyup', (event) => this._onKeyUp(event));

        document.getElementById('jugar-button').addEventListener('click', () => this._togglePause());
        document.getElementById('back-to-menu-button').addEventListener('click', () => this._exitToMenu());

        // --- MULTIJUGADOR: Conectar si el usuario eligió ese modo ---
        if (window.isMultiplayer) {
            console.log("🔵 Iniciando modo Multijugador...");
            const myName = window.currentUser ? window.currentUser.username : "Invitado";
            this._socket = io({
                query: { username: myName }
            });
            this._setupSocketEvents(); // Configura qué hacer cuando recibimos datos
        }

        this._RAF();
    }

    _LoadEnemyFBX() {
        const loader = new FBXLoader();
        loader.setPath('./Resources/Modelos/Enemigo/');
        loader.load('Enemigo.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            fbx.position.set(0, 0, -70); // posición donde estará el enemigo
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

    // ====================================================================
    // 1. NUEVA FUNCIÓN PARA CHEQUEAR COLISIONES (posición aquí)
    // ====================================================================
    _CheckCollisions() {
        if (!this._controls || !this._controls._target || !this._orbSpawner) return;

        const playerPosition = this._controls._target.position;
        const COLLECTION_RADIUS = 2.0;
        const orbs = this._orbSpawner._orbs || [];

        for (let i = orbs.length - 1; i >= 0; i--) {
            const orb = orbs[i];
            const distance = playerPosition.distanceTo(orb.position);

            if (distance < COLLECTION_RADIUS) {
                // ESTA PARTE CAMBIA
                console.log("Orb recolectado!");
                this._orbSpawner.collectOrb(orb); // Esto solo mueve el orbe

                // --- INICIO DE LÓGICA MOVIDA AQUÍ ---
                this._orbsCollected++;
                this._tiempoSinRecolectar = 0; // Reinicia el contador de "perder"
                this._timeLeft = 30;

                const timerElement = document.getElementById('time-counter');
                if (timerElement) {
                    timerElement.innerText = 30;
                    timerElement.style.color = 'white'; // Volver a blanco si estaba rojo
                }

                if (this._sounds && this._sounds['orb']) {
                    if (this._sounds['orb'].isPlaying) this._sounds['orb'].stop();
                    this._sounds['orb'].play();
                }

                // Actualiza el contador de texto
                const counter = document.getElementById('orbCounter');
                if (counter) counter.textContent = `Orbes: ${this._orbsCollected}`;

                // Actualiza la barra de energía
                this._actualizarBarraEnergia(); // Nueva función
                // --- FIN DE LÓGICA MOVIDA AQUÍ ---
            }
        }
    }

    // --- NUEVO MÉTODO PARA EL POWERUP ---
    // --- MÉTODO ACTUALIZADO PARA REVISAR MÚLTIPLES POWERUPS ---
    _CheckPowerups() {
        if (!this._controls || !this._controls._target || !this._powerups) return;

        const playerPos = this._controls._target.position;

        // Recorremos cada powerup de la lista
        for (const powerup of this._powerups) {

            // Si no es visible, ya lo agarramos, pasamos al siguiente
            if (powerup.visible === false) continue;

            // 1. Animación: Hacemos que giren todos
            powerup.rotation.y += 0.05;
            powerup.rotation.z += 0.02;

            // 2. Revisamos distancia
            if (playerPos.distanceTo(powerup.position) < 3.0) {
                console.log("¡PowerUp de Velocidad obtenido en: " + powerup.position.x + "," + powerup.position.z);

                // Ocultar ESTE powerup específico
                powerup.visible = false;

                // Aplicar velocidad al jugador
                this._controls._speedMultiplier = 1.5;

                // Sonido
                if (this._sounds && this._sounds['orb']) {
                    if (this._sounds['orb'].isPlaying) this._sounds['orb'].stop();
                    this._sounds['orb'].play();
                }

                // Temporizador para quitar el efecto (10 segundos)
                // Nota: Si agarras otro mientras tienes el efecto, el timer anterior 
                // podría quitarte la velocidad antes de tiempo. Para un sistema simple está bien,
                // pero si quieres que se reinicie el tiempo, avísame.
                setTimeout(() => {
                    // Solo quitamos la velocidad si no hemos agarrado otro recientemente 
                    // (por simplicidad, aquí lo reseteamos directo)
                    if (this._controls) this._controls._speedMultiplier = 1.0;
                }, 10000);
            }
        }
    }

    // ====================================================================

    _UpdateCamera() {
        if (!this._controls._target) {
            return;
        }

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
            game: this,
            sounds: this._sounds
        }
        this._controls = new BasicCharacterController(params);
    }

    _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
        const loader = new FBXLoader();
        loader.setPath(path);
        loader.load(modelFile, (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            fbx.position.copy(offset);

            const anim = new FBXLoader();
            anim.setPath(path);
            anim.load(animFile, (anim) => {
                const m = new THREE.AnimationMixer(fbx);
                this._mixers.push(m);
                const idle = m.clipAction(anim.animations[0]);
                idle.play();
            });
            this._scene.add(fbx);
        });
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _onKeyDown(event) {
        if (this._isPaused) {
            if (event.key === "Escape" || event.keyCode === 27) {
                this._togglePause();
            }
            return;
        }

        if (event.keyCode === 80) { // 'P'
            if (this._controls && this._controls._target) {
                const pos = this._controls._target.position;
                alert(`Coordenadas: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`);
            }
        }

        if (this._controls && this._controls._input) {
            this._controls._input._onKeyDown(event);
        }

        if (event.key === "Escape" || event.keyCode === 27) {
            this._togglePause();
        }
    }

    _onKeyUp(event) {
        if (this._isPaused) {
            return;
        }

        if (this._controls && this._controls._input) {
            this._controls._input._onKeyUp(event);
        }
    }

    _togglePause() {
        this._isPaused = !this._isPaused;

        if (this._isPaused) {
            this._pauseMenu.style.display = 'flex';
            cancelAnimationFrame(this._RAF_ID);
            console.log('Juego Pausado.');
            document.getElementById('pauseOverlay').style.display = 'block';
            document.getElementById('pauseMenu').style.display = 'flex';

        } else {
            this._pauseMenu.style.display = 'none';
            this._RAF();
            console.log('Juego Reanudado.');
            document.getElementById('pauseOverlay').style.display = 'none';
            document.getElementById('pauseMenu').style.display = 'none';
        }
    }

    _RAF() {
        this._RAF_ID = requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            if (this._isPaused) {
                return;
            }

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;

            this._RAF();
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        // 1. Actualizar animaciones (Jugador y Enemigo)
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._enemyMixer) {
            this._enemyMixer.update(timeElapsed * 0.001);
        }

        // 2. Actualizar Lógica del Jugador
        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }

        // 3. Actualizar Orbes
        if (this._orbSpawner) {
            this._orbSpawner.update(timeElapsedS);
        }

        // 4. Actualizar Partículas de Fuego (Estático)
        if (this._fireSystem) {
            this._fireSystem.update(timeElapsedS);
        }

        // 5. Actualizar Explosiones (y eliminar las que terminaron)
        for (let i = this._explosions.length - 1; i >= 0; i--) {
            const explosion = this._explosions[i];
            const isDead = explosion.update(timeElapsedS);
            if (isDead) {
                this._explosions.splice(i, 1);
            }
        }

        // 6. Chequeos de Juego
        this._CheckCollisions();      // Recolección de orbes
        this._CheckBossEncounter();   // Jefe final

        this._CheckPowerups();

        this._UpdateCamera();         // Mover la cámara

        // 7. LÓGICA MULTIJUGADOR (CORREGIDA)
        // Solo enviamos datos si estamos conectados y el jugador existe
        if (this._socket && this._controls && this._controls._target) {
            const pos = this._controls._target.position;
            const rot = this._controls._target.quaternion;

            // --- CORRECCIÓN: Definir la variable antes de usarla ---
            // Obtenemos el nombre de la animación actual ('idle', 'walk', 'run')
            // Usamos ?. por seguridad, por si _currentState es null momentáneamente
            const currentAnim = this._controls._stateMachine._currentState?.Name || 'idle';

            // Enviamos los datos al servidor
            this._socket.emit('playerMovement', {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                rotation: rot,
                anim: currentAnim
            });
        }

        // 1. Actualizar el temporizador de inmunidad (cooldown)
        if (this._fireDamageCooldown > 0) {
            this._fireDamageCooldown -= timeElapsedS;
        }

        // ... dentro de _Step ...

        // --- ACTUALIZAR TODOS LOS FUEGOS ---
        if (this._fires) {
            this._fires.forEach(fire => {
                fire.update(timeElapsedS);
            });
        }
        // -----------------------------------

        // B) Detectar colisión con CUALQUIER fuego
        if (this._controls && this._controls._target && this._fires) {
            const playerPos = this._controls._target.position;
            let teEstasQuemando = false;

            // Revisamos uno por uno
            for (const fire of this._fires) {
                // Si te acercas a menos de 2.5 metros de ESTE fuego
                if (playerPos.distanceTo(fire.emitterPosition) < 2.5) {
                    teEstasQuemando = true;
                    break; // Ya encontramos uno, no hace falta seguir buscando
                }
            }

            // C) Aplicar daño si te quemas y no eres inmune
            if (teEstasQuemando && this._fireDamageCooldown <= 0) {
                if (this._orbsCollected > 0) {
                    this._orbsCollected--;

                    // Actualizar UI
                    const counter = document.getElementById('orbCounter');
                    if (counter) counter.textContent = `Orbes: ${this._orbsCollected}`;
                    this._actualizarBarraEnergia();

                    // Opcional: Sonido de daño
                    // if (this._sounds && this._sounds['hurt']) this._sounds['hurt'].play();
                }
                else {
                    // NO TIENES VIDA (0 Orbes): MUERES
                    console.log("¡Has muerto quemado!");
                    this._TriggerLoss();
                }

                // D) Dar inmunidad por 1.5 segundos
                this._fireDamageCooldown = 1.5;
            }
        }


        // 2. Calcular distancia al fuego
        if (this._fireSystem && this._controls && this._controls._target) {
            const playerPos = this._controls._target.position;

            // Accedemos a la posición del emisor de partículas
            const firePos = this._fireSystem.emitterPosition;

            // Si estás a menos de 3 metros del fuego
            if (playerPos.distanceTo(firePos) < 3.0) {

                // Y si ya pasó el tiempo de inmunidad
                if (this._fireDamageCooldown <= 0) {

                    // Restar orbe si tienes alguno
                    if (this._orbsCollected > 0) {
                        this._orbsCollected--;

                        // Actualizar UI (Texto y Barra)
                        const counter = document.getElementById('orbCounter');
                        if (counter) counter.textContent = `Orbes: ${this._orbsCollected}`;
                        this._actualizarBarraEnergia();

                        // Opcional: Reproducir sonido de golpe si tienes uno cargado
                        // if (this._sounds && this._sounds['hurt']) this._sounds['hurt'].play();
                    }
                    else {
                        // NO TIENES VIDA (0 Orbes): MUERES
                        this._TriggerLoss();
                    }

                    // Reiniciar cooldown (te da 1.5 segundos de inmunidad)
                    this._fireDamageCooldown = 1.5;
                }
            }
        }

    }

    //  API
    _TriggerDeath() {
        if (this._isDead) return;
        this._isDead = true;

        if (this._controls && this._controls._target) {
            this._controls._target.visible = false;
        }

        const playerName = prompt("¡Perdiste! Ingresa tu nombre:");

        fetch('http://localhost:3000/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: playerName, score: this._orbsCollected })
        })
            .then(res => res.json())
            .then(data => {
                console.log('Puntuación guardada:', data);
                alert(`¡Gracias ${playerName}! Tu puntuación de ${this._orbsCollected} orbes fue guardada.`);
                window.location.reload(); // reinicia el juego para probar
            })
            .catch(err => console.error('Error al guardar la puntuación:', err));
    }

    _exitToMenu() {
        console.log("Saliendo al menú principal...");
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

    /**
     * Muestra la pantalla de "Perdiste".
     */
    _TriggerLoss() {
        if (this._isDead || this._gameWon) return; // No hacer nada si ya terminó
        this._isDead = true; // Usamos la variable que ya tenías

        const overlay = document.getElementById("lose-screen");
        if (overlay) overlay.classList.add("active");

        clearInterval(this._temporizador);
        if (this._controls) this._controls._input._keys = {}; // Detener movimiento
    }

    // ==========================================
    //  NUEVA FUNCIÓN _TriggerWin CON TWITTER
    // ==========================================
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

            // --- ESTILOS DE COLOR ---
            twitterBtn.style.backgroundColor = "#1DA1F2";
            twitterBtn.style.color = "white";
            twitterBtn.style.border = "2px solid white";
            twitterBtn.style.borderRadius = "10px"; // Un poco redondeado se ve mejor flotando
            twitterBtn.style.padding = "10px 20px";
            twitterBtn.style.fontSize = "1.2rem";
            twitterBtn.style.fontFamily = "'Impact', sans-serif";
            twitterBtn.style.cursor = "pointer";
            twitterBtn.style.boxShadow = "3px 3px 5px rgba(0,0,0,0.5)";

            // --- LA CLAVE: POSICIÓN ABSOLUTA (ESQUINA INFERIOR DERECHA) ---
            twitterBtn.style.position = "absolute";
            twitterBtn.style.bottom = "30px";  // Separación del suelo
            twitterBtn.style.right = "30px";   // Separación de la derecha
            twitterBtn.style.margin = "0";     // Sin márgenes que estorben
            twitterBtn.style.zIndex = "10000"; // Aseguramos que esté encima de todo
            // --------------------------------------------------------------

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
                    const nivel = "Nivel 1"; // Cambia esto en Nivel 2 y 3

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

    /**
     * Revisa si el jugador está en el área del jefe CON los orbes necesarios.
     */
    _CheckBossEncounter() {
        // 1. Validaciones básicas (si ya ganamos o perdimos, no hacer nada)
        if (!this._controls || !this._controls._target || this._bossDefeated || this._isDead) {
            return;
        }

        // 2. Obtener la hitbox actual del jugador
        const playerAABB = this._controls._playerBox.clone().translate(this._controls._target.position);

        // 3. Comprobar si choca con la hitbox del jefe
        if (playerAABB.intersectsBox(this._bossHitbox)) {

            // Marcamos que ya hubo interacción para que no se repita en cada frame
            this._bossDefeated = true;

            // 4. DECISIÓN: ¿Ganar o Perder?
            if (this._orbsCollected >= 5) {
                // Tienes los orbes: Matas al jefe
                this._PlayEnemyDeath();
            } else {
                // No tienes los orbes: El jefe te mata
                console.log("Adios papu.");
                this._PlayEnemyAttackAndLose();
            }
        }
    }

    /**
     * Reproduce la animación de golpe y luego activa la pantalla de PERDER.
     */
    _PlayEnemyAttackAndLose() {
        const idleAction = this._enemyAnimations['idle'];
        const punchAction = this._enemyAnimations['punch']; // La que cargamos en el paso 1

        if (!punchAction) {
            console.error("Animación 'Mutant Punch' no cargada. Perdiendo directamente.");
            this._TriggerLoss();
            return;
        }

        // 1. Detener Idle
        if (idleAction) idleAction.fadeOut(0.2);

        // 2. Configurar Puñetazo
        punchAction.reset();
        punchAction.setLoop(THREE.LoopOnce, 1); // Solo una vez
        punchAction.clampWhenFinished = true;   // Se queda en la pose final
        punchAction.fadeIn(0.2);
        punchAction.play();

        // 3. Escuchar cuando termine el golpe para mostrar la pantalla de Game Over
        const onFinish = (e) => {
            if (e.action === punchAction) {
                console.log("Te golpearon. Game Over.");

                // Opcional: Esperar medio segundo para dramatismo
                setTimeout(() => {
                    this._TriggerLoss(); // <--- LLAMA A TU FUNCIÓN DE PERDER
                }, 500);

                this._enemyMixer.removeEventListener('finished', onFinish);
            }
        };

        this._enemyMixer.addEventListener('finished', onFinish);
    }

    /**
     * Activa la animación de muerte del enemigo y, al terminar, gana el juego.
     */
    _PlayEnemyDeath() {
        console.log("Activando muerte del enemigo...");
        const idleAction = this._enemyAnimations['idle'];
        const dyingAction = this._enemyAnimations['dying'];

        // Si la animación de morir no cargó, solo gana
        if (!dyingAction) {
            console.error("Animación 'Dying' no encontrada! Ganando de todas formas.");
            this._TriggerWin();
            return;
        }

        const explosionPos = this._enemy.position.clone();
        explosionPos.y += 2.0; // Sube la explosión al centro del enemigo

        const explosion = new ExplosionParticleSystem({
            scene: this._scene,
            count: 400, // Más partículas para una explosión
            position: explosionPos,
            texture: './Resources/Imagenes/sparkle.png' // Usa la misma textura
        });
        this._explosions.push(explosion);

        if (this._sounds && this._sounds['bossDeath']) {
            this._sounds['bossDeath'].play();
        }

        // Detener animación 'idle'
        if (idleAction) idleAction.stop();

        // Configurar y reproducir animación 'dying'
        dyingAction.reset();
        dyingAction.setLoop(THREE.LoopOnce, 1); // Reproducir solo una vez
        dyingAction.clampWhenFinished = true; // Mantener en el último frame
        dyingAction.play();

        // Escuchar el evento 'finished' del mixer
        const onFinish = (e) => {
            // Asegurarse de que sea la animación correcta la que terminó
            if (e.action === dyingAction) {
                console.log("Animación de muerte terminada.");

                // Esperar un segundo para que sea dramático y luego ganar
                setTimeout(() => {
                    this._TriggerWin();
                }, 1000);

                // Limpiar el listener para no tenerlo duplicado
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

        // 3. Alguien se movió (AQUÍ ESTÁ LA CORRECCIÓN DE ANIMACIÓN)
        this._socket.on('playerMoved', (info) => {
            const remotePlayer = this._remotePlayers[info.playerId];

            if (remotePlayer && remotePlayer.mesh) {
                // A) Actualizar Posición y Rotación
                remotePlayer.mesh.position.set(info.x, info.y, info.z);
                remotePlayer.mesh.quaternion.set(
                    info.rotation._x,
                    info.rotation._y,
                    info.rotation._z,
                    info.rotation._w
                );

                // B) Actualizar Animación
                // Verificamos que el jugador tenga acciones cargadas y el servidor mande una animación
                if (remotePlayer.actions && info.anim) {

                    // Solo cambiamos si la animación es diferente a la actual
                    if (remotePlayer.currentAnim !== info.anim) {

                        const newAction = remotePlayer.actions[info.anim];
                        const prevAction = remotePlayer.actions[remotePlayer.currentAnim];

                        // --- CORRECCIÓN: ---
                        // Si la nueva animación ya cargó (newAction existe), la ponemos.
                        // No nos importa si la "prevAction" no existe (puede pasar al inicio).
                        if (newAction) {
                            if (prevAction) {
                                prevAction.fadeOut(0.2); // Si hay anterior, la desvanecemos
                            }

                            newAction.reset().fadeIn(0.2).play(); // Reproducimos la nueva
                            remotePlayer.currentAnim = info.anim; // Actualizamos el registro
                        }
                    }
                }
            }
        });

        // 4. Alguien se desconectó
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

        // 1. Cargar el Modelo
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

            // --- SISTEMA DE ANIMACIÓN REMOTA ---
            const mixer = new THREE.AnimationMixer(fbx);
            this._mixers.push(mixer); // ¡Importante! Agregarlo al array global para que se actualice

            const actions = {}; // Aquí guardaremos las acciones (idle, walk, run)

            // Función auxiliar para cargar clips
            const loadAnim = (animName, fileName) => {
                const animLoader = new FBXLoader();
                animLoader.setPath('./Resources/Modelos/Personaje/');
                animLoader.load(fileName, (anim) => {
                    const action = mixer.clipAction(anim.animations[0]);
                    actions[animName] = action;

                    // Si es la animación inicial (idle), dale play
                    if (animName === 'idle') {
                        action.play();
                    }
                });
            };

            // Cargar las 3 animaciones clave
            loadAnim('idle', 'idle.fbx');
            loadAnim('walk', 'Walk.fbx');
            loadAnim('run', 'Run.fbx');

            // Guardamos todo en el objeto del jugador remoto
            this._remotePlayers[id] = {
                mesh: fbx,
                mixer: mixer,
                actions: actions,
                currentAnim: 'idle' // Estado inicial
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

// ====================================================================
// ====================================================================
// *** ¡MODIFICACIÓN 2 (continúa)! ***
// AQUÍ ESTÁ LA CLASE COMPLETA DEL SISTEMA DE PARTÍCULAS
// ====================================================================
// ====================================================================

/**
 * Clase para crear un sistema de partículas de fuego.
 * Se instancia en _Initialize() y se actualiza en _Step().
 */
class FireParticleSystem {

    constructor(params) {
        this.scene = params.scene;
        this.particleCount = params.count || 200;
        // Esta es la posición fija donde nacerán las partículas
        this.emitterPosition = params.position || new THREE.Vector3(0, 0, 0);

        this.particles = [];
        this.geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const color = new THREE.Color();

        // Inicializamos cada partícula
        for (let i = 0; i < this.particleCount; i++) {
            // Posición inicial (en el centro del emisor)
            positions[i * 3] = this.emitterPosition.x;
            positions[i * 3 + 1] = this.emitterPosition.y;
            positions[i * 3 + 2] = this.emitterPosition.z;

            // Color inicial (blanco/amarillo brillante)
            color.set(0xFFFFAA);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // Guardamos los datos de "física" para esta partícula
            this.particles.push({
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5, // Velocidad X aleatoria
                    Math.random() * 4.0 + 2.0,   // Velocidad Y (siempre hacia arriba)
                    (Math.random() - 0.5) * 1.5  // Velocidad Z aleatoria
                ),
                lifetime: Math.random() * 1.5 + 0.5, // Vida de 0.5 a 2.0 segundos
                initialLifetime: 0
            });
            // Asignamos la vida inicial de inmediato
            this.particles[i].initialLifetime = this.particles[i].lifetime;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // 2. Material
        const textureLoader = new THREE.TextureLoader();

        // ¡¡IMPORTANTE!! Asegúrate de tener esta textura
        // Esta es la causa MÁS PROBABLE de una pantalla negra si no existe
        const particleTexture = textureLoader.load('./Resources/Imagenes/sparkle.png');

        this.material = new THREE.PointsMaterial({
            map: particleTexture,
            size: 1.5,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending, // Clave para el efecto de fuego
            transparent: true,
            depthWrite: false,
            vertexColors: true
        });

        // 3. El objeto THREE.Points
        this.pointSystem = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.pointSystem);
    }

    // Método para "revivir" una partícula que ha muerto
    _resetParticle(i) {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const particle = this.particles[i];

        // 1. Reinicia la posición al centro del emisor (con un leve offset)
        positions[i * 3] = this.emitterPosition.x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = this.emitterPosition.y + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = this.emitterPosition.z + (Math.random() - 0.5) * 0.5;

        // 2. Reinicia el color a amarillo/blanco
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.5;

        // 3. Reinicia la velocidad
        particle.velocity.set(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 4.0 + 2.0, // Hacia arriba
            (Math.random() - 0.5) * 1.5
        );

        // 4. Reinicia la vida
        particle.lifetime = Math.random() * 1.5 + 0.5;
        particle.initialLifetime = particle.lifetime;
    }

    // (Este método no lo usaremos por ahora, pero es bueno tenerlo)
    setEmitterPosition(newPosition) {
        this.emitterPosition.copy(newPosition);
    }

    // Bucle de actualización
    update(timeDelta) {
        // Si la geometría aún no está lista, no hagas nada
        if (!this.geometry.attributes.position) {
            return;
        }

        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;

        const color = new THREE.Color();
        const targetColor = new THREE.Color(0xBB0000); // Color rojo oscuro

        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.particles[i];
            particle.lifetime -= timeDelta;

            if (particle.lifetime <= 0) {
                this._resetParticle(i);
            }

            const lifePercent = particle.lifetime / particle.initialLifetime;

            // 1. Actualizar Posición
            positions[i * 3] += particle.velocity.x * timeDelta;
            positions[i * 3 + 1] += particle.velocity.y * timeDelta;
            positions[i * 3 + 2] += particle.velocity.z * timeDelta;

            // 2. Actualizar Color (de amarillo a rojo)
            color.setRGB(
                colors[i * 3],
                colors[i * 3 + 1],
                colors[i * 3 + 2]
            );
            color.lerp(targetColor, 1.0 - lifePercent);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        // Marcar atributos para actualizar en la GPU
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}

class ExplosionParticleSystem {

    constructor(params) {
        this.scene = params.scene;
        this.particleCount = params.count || 400;
        this.emitterPosition = params.position || new THREE.Vector3(0, 0, 0);
        this.texturePath = params.texture || './Resources/Imagenes/sparkle.png';

        this.particles = [];
        this.geometry = new THREE.BufferGeometry();
        this.isDead = false; // Bandera para saber si ya debe ser eliminado

        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const color = new THREE.Color();

        for (let i = 0; i < this.particleCount; i++) {
            // Nace en el centro
            positions[i * 3] = this.emitterPosition.x;
            positions[i * 3 + 1] = this.emitterPosition.y;
            positions[i * 3 + 2] = this.emitterPosition.z;

            // Color inicial (blanco/naranja brillante)
            color.set(0xFFFFAA);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // Velocidad: aleatoria en todas direcciones, hacia afuera
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5),
                (Math.random() - 0.5),
                (Math.random() - 0.5)
            );
            velocity.normalize().multiplyScalar(Math.random() * 15 + 10); // Velocidad de 10 a 25

            const lifetime = Math.random() * 1.0 + 0.5; // Vida de 0.5 a 1.5 segundos

            this.particles.push({
                velocity: velocity,
                lifetime: lifetime,
                initialLifetime: lifetime
            });
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const textureLoader = new THREE.TextureLoader();
        const particleTexture = textureLoader.load(this.texturePath);

        this.material = new THREE.PointsMaterial({
            map: particleTexture,
            size: 2.0, // Partículas un poco más grandes
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            vertexColors: true
        });

        this.pointSystem = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.pointSystem);
    }

    /**
     * Bucle de actualización. Devuelve 'true' cuando el sistema ha "muerto" y debe ser eliminado.
     */
    update(timeDelta) {
        if (this.isDead) return true;

        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const color = new THREE.Color();
        const targetColor = new THREE.Color(0xFF4500); // Naranja/Rojo oscuro
        const gravity = 9.8;

        let allDead = true;

        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.particles[i];

            // Si la partícula ya está muerta, la saltamos
            if (particle.lifetime <= 0) continue;

            allDead = false; // Si al menos una está viva, el sistema no está muerto

            particle.lifetime -= timeDelta;

            // Si acaba de morir, pon su color a negro (invisible)
            if (particle.lifetime <= 0) {
                colors[i * 3] = 0;
                colors[i * 3 + 1] = 0;
                colors[i * 3 + 2] = 0;
                continue;
            }

            // Aplicar gravedad
            particle.velocity.y -= gravity * timeDelta;

            // Actualizar Posición
            positions[i * 3] += particle.velocity.x * timeDelta;
            positions[i * 3 + 1] += particle.velocity.y * timeDelta;
            positions[i * 3 + 2] += particle.velocity.z * timeDelta;

            // Interpolar color de amarillo a naranja
            const lifePercent = particle.lifetime / particle.initialLifetime;
            color.setRGB(1.0, 1.0, 0.5); // Amarillo inicial
            color.lerp(targetColor, 1.0 - lifePercent);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        // Si todas las partículas murieron, marcamos el sistema para eliminación
        if (allDead) {
            this.isDead = true;
            this.scene.remove(this.pointSystem); // Limpia de la escena
            this.geometry.dispose(); // Limpia la memoria de la geometría
            this.material.dispose(); // Limpia la memoria del material
            console.log("Explosión autodestruida.");
        }

        // Marcar atributos para actualizar en la GPU
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;

        return this.isDead; // Devuelve si el sistema debe ser eliminado
    }
}


// INICIO DEL JUEGO
let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new CharacterControllerDemo();
});