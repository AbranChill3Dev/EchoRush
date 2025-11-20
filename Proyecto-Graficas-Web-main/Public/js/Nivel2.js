import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';

import { OrbSpawner } from './OrbSpawner2.js';

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

        this._soundJumpCooldown = 0.0; // Temporizador para el salto
        this._gameRef = params.game;

        // --- CÓDIGO AÑADIDO PARA EL SALTO ---
        this._gravity = new THREE.Vector3(0, -100.0, 0); // Fuerza de la gravedad
        this._jumpForce = 50.0;   // Impulso inicial del salto

        // --- MODIFICADO: Empezamos en el aire para forzar la colisión inicial ---
        this._onGround = false;    // Indica si el personaje puede saltar
        // --- FIN DEL CÓDIGO AÑADIDO ---

        // --- NUEVO: Recibimos las plataformas y la instancia del juego ---
        this._platforms = params.platforms || [];
        this._game = params.game; // Para llamar a _TriggerDeath
        this._platformBox = new THREE.Box3(); // Helper para colisiones
        // --- FIN DE LA MODIFICACIÓN ---

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(
            new BasicCharacterControllerProxy(this._animations));

        this._LoadModels();

        this._playerBox = new THREE.Box3(
            new THREE.Vector3(-0.5, 0.0, -0.5), // min (x, y, z)
            new THREE.Vector3(0.5, 2.0, 0.5)  // max (x, y, z)
        );
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

            // --- MODIFICADO: Empezar MÁS ARRIBA (10 unidades) para asegurar el aterrizaje ---
            this._target.position.set(0, 10, 0);
            // --- FIN DE LA MODIFICACIÓN ---

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

        // --- NUEVO: Si el jugador está muerto, no hacer nada ---
        if (this._game && this._game._isDead) {
            return;
        }

        if (this._soundJumpCooldown > 0) {
            this._soundJumpCooldown -= timeInSeconds;
        }

        // --- FIN DEL CÓDIGO NUEVO ---

        this._stateMachine.Update(timeInSeconds, this._input);

        // --- LÓGICA DE SONIDO (AÑADIDO) ---
        const sounds = this._gameRef ? this._gameRef._sounds : null;

        if (sounds) {
            const keys = this._input._keys;
            // Detectar si alguna tecla de movimiento está presionada
            const isMoving = keys.forward || keys.backward || keys.left || keys.right;

            // CAMINAR Y CORRER
            if (isMoving && this._onGround) {
                if (keys.shift) {
                    // CORRIENDO: Apaga 'walk', prende 'run'
                    if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                    if (sounds['run'] && !sounds['run'].isPlaying) sounds['run'].play();
                } else {
                    // CAMINANDO: Apaga 'run', prende 'walk'
                    if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
                    if (sounds['walk'] && !sounds['walk'].isPlaying) sounds['walk'].play();
                }
            } else {
                // QUIETO: Apaga todo
                if (sounds['walk'] && sounds['walk'].isPlaying) sounds['walk'].stop();
                if (sounds['run'] && sounds['run'].isPlaying) sounds['run'].stop();
            }

            // SALTO (Solo si cooldown llegó a 0)
            if (keys.space && this._onGround && this._soundJumpCooldown <= 0) {
                if (sounds['jump']) {
                    if (sounds['jump'].isPlaying) sounds['jump'].stop();
                    sounds['jump'].play();
                }
                this._soundJumpCooldown = 1.0; // Esperar 1 segundo para volver a sonar
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

        // --- CÓDIGO DE SALTO Y GRAVEDAD (SIN CAMBIOS) ---
        if (this._input._keys.space && this._onGround) {
            this._velocity.y = this._jumpForce;
            this._onGround = false;
        }
        this._velocity.y += this._gravity.y * timeInSeconds;
        controlObject.position.y += this._velocity.y * timeInSeconds;
        // --- FIN DE SALTO Y GRAVEDAD ---


        // --- INICIO DE LA LÓGICA DE PLATAFORMA CORREGIDA ---

        // 4. Detecta si el personaje ha aterrizado en una plataforma
        let potentialGroundY = -Infinity; // Empezamos asumiendo que no hay suelo
        const cPos = controlObject.position;

        const playerHalfWidth = 0.5;
        const playerHalfDepth = 0.5;

        if (this._platforms && this._velocity.y <= 0) { // Solo checa si estamos cayendo
            for (const platform of this._platforms) {

                this._platformBox.setFromObject(platform);

                // Comprobamos si el jugador está horizontalmente sobre la plataforma
                const isCollidingX = cPos.x >= this._platformBox.min.x - playerHalfWidth &&
                    cPos.x <= this._platformBox.max.x + playerHalfWidth;

                const isCollidingZ = cPos.z >= this._platformBox.min.z - playerHalfDepth &&
                    cPos.z <= this._platformBox.max.z + playerHalfDepth;

                // --- MODIFICACIÓN CLAVE (ARREGLO DE TÚNEL) ---
                // Si está colisionando horizontalmente Y sus pies están EN O POR DEBAJO
                // de la superficie de la plataforma (corrige el error de túnel)
                if (isCollidingX && isCollidingZ &&
                    cPos.y <= this._platformBox.max.y) {

                    // ...registramos la altura de su superficie.
                    potentialGroundY = Math.max(potentialGroundY, this._platformBox.max.y);
                }
                // --- FIN DE LA MODIFICACIÓN CLAVE ---
            }
        }

        // 5. Aplicar colisión
        // Si los pies del jugador (cPos.y) han cruzado la superficie de la plataforma Y el jugador está cayendo...
        if (cPos.y <= potentialGroundY) {
            this._velocity.y = 0; // Detiene la caída
            controlObject.position.y = potentialGroundY; // Lo coloca exactamente sobre la plataforma
            this._onGround = true;
        } else {
            this._onGround = false; // Si está en el aire, no está en el suelo
        }

        // 6. Detectar caída al vacío (aumentamos el umbral por si las plataformas bajan mucho)
        if (controlObject.position.y < -25) {
            console.log("¡Caíste al vacío!");
            this._velocity.set(0, 0, 0); // Detenemos al personaje
            this._onGround = true; // Prevenimos saltos mientras morimos
            if (this._game) {
                this._game._TriggerDeath(); // Llamamos a la función de "perdiste"
            }
        }
        // --- FIN DE LA LÓGICA DE PLATAFORMA CORREGIDA ---


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

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        oldPosition.copy(controlObject.position);

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

        this._fireSystem = null;
        this._explosions = [];

        this._timeLeft = 30; // Empezamos con 30 segundos
        this._temporizador = null;

        // --- AÑADE ESTAS LÍNEAS ---
        this._gameWon = false;         // Para saber si ya ganamos
        this._bossDefeated = false;    // Para que la animación solo suene una vez
        this._tiempoSinRecolectar = 0;
        this._temporizador = null;

        this._bossHitbox = new THREE.Box3(
            new THREE.Vector3(-4, 0, 735),  // Min (x, y, z) - Un poco antes del jefe
            new THREE.Vector3(16, 10, 755)  // Max (x, y, z) - Un poco después
        );

        this._isDead = false;

        this._Initialize();

        // --- SISTEMA DE AUDIO (AÑADIDO) ---
        this._listener = new THREE.AudioListener();
        this._camera.add(this._listener); // Pegamos los oídos a la cámara

        this._sounds = {}; // Aquí guardamos los sonidos cargados
        const audioLoader = new THREE.AudioLoader();

        // Función auxiliar para cargar rápido
        const loadSound = (name, path, loop, volume) => {
            const sound = new THREE.Audio(this._listener);
            audioLoader.load(path, (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(loop);
                sound.setVolume(volume);
                this._sounds[name] = sound;
                if (name === 'bgm') sound.play(); // Autoplay música de fondo
            });
        };

        // CARGAR SONIDOS ESPECÍFICOS
        loadSound('bgm', './Resources/Audio/nivel2.mp3', true, 0.07);
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

        // --- MODIFICADO: Fondo negro ---
        this._scene.background = new THREE.Color(0x000000);
        // --- FIN DE LA MODIFICACIÓN ---

        // --- NUEVO: Array para guardar las plataformas ---
        this._platforms = [];
        // --- FIN DEL CÓDIGO NUEVO ---


        // Instancia el OrbSpawner
        this._orbSpawner = new OrbSpawner({
            scene: this._scene,
            platforms: this._platforms
        });

        this._dustSystem = new DustParticleSystem({
            scene: this._scene,
            count: 1500 // Cantidad de partículas (ajústalo si va lento)
        });

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

        // --- MODIFICADO: OrbitControls ahora está deshabilitado
        //     para que no interfiera con tu cámara de tercera persona ---
        const controls = new OrbitControls(
            this._camera, this._threejs.domElement);
        controls.target.set(0, 10, 0);
        controls.enabled = false; // <-- Deshabilitado
        controls.update();
        // --- FIN DE LA MODIFICACIÓN ---


        // --- MODIFICADO: El mapa GLB está deshabilitado ---
        const loader = new GLTFLoader();
        loader.setPath('./Resources/Modelos/Mapas/Escenario2/'); // Ruta a la carpeta de tu mapa
        loader.load('Escenario5.glb', (gltf) => { // Nombre de tu archivo
            gltf.scene.scale.setScalar(4.5);
            this._scene.add(gltf.scene);
            gltf.scene.position.set(0, 0, 0);
            gltf.scene.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        });
        // --- Fin del código para el mapa ---


        // --- MODIFICADO: Bucle para crear plataformas con altura fija ---

        // --- NUEVO: Cargador de texturas y textura de metal ---
        const textureLoader = new THREE.TextureLoader();
        const metalTexture = textureLoader.load('./Resources/Imagenes/Metal.jpg');
        // Asegúrate de que la textura se repita
        metalTexture.wrapS = THREE.RepeatWrapping;
        metalTexture.wrapT = THREE.RepeatWrapping;
        // --- FIN NUEVO ---


        // 1. Crear la plataforma inicial (larga en X)
        const initialPlatformGeo = new THREE.BoxGeometry(80, 2, 50);

        // Clonamos la textura para esta geometría
        const initialTexture = metalTexture.clone();
        initialTexture.needsUpdate = true; // Importante al clonar
        initialTexture.repeat.set(10, 2); // Repetir 10 veces en X (100/10), 2 en Z (20/10)

        const initialPlatformMat = new THREE.MeshStandardMaterial({
            map: initialTexture
        });

        const initialPlatform = new THREE.Mesh(initialPlatformGeo, initialPlatformMat);

        initialPlatform.position.set(0, 0, 0); // En el origen (altura Y=0)
        initialPlatform.castShadow = true;
        initialPlatform.receiveShadow = true;
        this._scene.add(initialPlatform);
        this._platforms.push(initialPlatform); // ¡Añadir al array de colisión!

        // 2. Crear las plataformas intermedias
        const platformGeometry = new THREE.BoxGeometry(20, 2, 20); // Geometría estándar

        const numPlatforms = 14;
        const spacingZ = 45.0;
        let lastZ = 0.0; // La Z de la plataforma inicial

        for (let i = 0; i < numPlatforms; i++) {

            // --- NUEVO: Material y textura clonada para esta plataforma ---
            const platformTexture = metalTexture.clone();
            platformTexture.needsUpdate = true;
            platformTexture.repeat.set(2, 2); // Repetir 2x2 en esta plataforma (20/10)
            const platformMaterial = new THREE.MeshStandardMaterial({
                map: platformTexture
            });
            // --- FIN NUEVO ---

            const platform = new THREE.Mesh(platformGeometry, platformMaterial);

            // --- MODIFICADO: Altura fija ---
            const newY = 0.0;
            // Nueva Z basada en la anterior + espaciado
            const newZ = lastZ + spacingZ;

            platform.position.set(0, newY, newZ);

            lastZ = newZ; // Guardamos la Z

            platform.castShadow = true;
            platform.receiveShadow = true;
            this._scene.add(platform);
            this._platforms.push(platform); // Añadir al array de colisión
        }

        // --- MODIFICADO: Plataforma final 200x200 y más separada ---
        const finalPlatformGeo = new THREE.BoxGeometry(150, 2, 250);

        // --- NUEVO: Material y textura clonada para la plataforma final ---
        const finalTexture = metalTexture.clone();
        finalTexture.needsUpdate = true;
        finalTexture.repeat.set(20, 20); // <-- REPETICIÓN AJUSTADA (200/10)
        const finalPlatformMat = new THREE.MeshStandardMaterial({
            map: finalTexture
        });
        // --- FIN NUEVO ---

        const finalPlatform = new THREE.Mesh(finalPlatformGeo, finalPlatformMat);

        // --- MODIFICADO: Altura fija en 0.0 y más espacio ---
        finalPlatform.position.set(0, 0.0, lastZ + 150);

        finalPlatform.castShadow = true;
        finalPlatform.receiveShadow = true;
        this._scene.add(finalPlatform);
        this._platforms.push(finalPlatform); // ¡Añadir al array de colisión!
        // --- FIN DE LA MODIFICACIÓN ---


        this._mixers = [];
        this._previousRAF = null;

        // Nuevas variables para el seguimiento de la cámara (TU CÁMARA)
        this._cameraTarget = new THREE.Vector3();
        this._cameraOffset = new THREE.Vector3(0, 6, -15);

        this._LoadAnimatedModel();

        // --- MODIFICADO: Comentado para simplificar ---
        this._LoadEnemyFBX();
        // --- FIN DE LA MODIFICACIÓN ---

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

        // --- MANEJADOR DE EVENTOS UNIFICADO ---
        document.addEventListener('keydown', (event) => this._onKeyDown(event));
        document.addEventListener('keyup', (event) => this._onKeyUp(event));

        // --- LISTENERS DE LOS BOTONES DEL MENÚ DE PAUSA ---
        // Los comento temporalmente si no tienes el HTML para ellos
        document.getElementById('jugar-button').addEventListener('click', () => this._togglePause());
        document.getElementById('back-to-menu-button').addEventListener('click', () => this._exitToMenu());

        this._RAF();

        // --- MODIFICADO: Comentado para que la muerte sea solo por caída ---
        // setTimeout(() => {
        //     this._TriggerDeath();
        // }, 1000000); // 10 segundos
        // --- FIN DE LA MODIFICACIÓN ---
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

            fbx.position.set(6, 1, 745); // posición donde estará el enemigo
            fbx.rotation.y = Math.PI; // Rotación de 180 grados

            this._scene.add(fbx);

            // Guardamos referencias
            this._enemy = fbx;
            this._enemyMixer = new THREE.AnimationMixer(fbx);
            this._enemyAnimations = {};

            const _OnLoad = (name, anim) => {
                const clip = anim.animations[0];
                const action = this._enemyMixer.clipAction(clip);
                this._enemyAnimations[name] = action;
            };

            // --- Cargar animaciones FBX ---
            const animLoader = new FBXLoader();
            animLoader.setPath('./Resources/Modelos/Enemigo/');
            animLoader.load('Idle.fbx', (a) => { _OnLoad('idle', a); });
            animLoader.load('Dying.fbx', (a) => { _OnLoad('dying', a); });
            animLoader.load('Mutant Punch.fbx', (a) => { _OnLoad('punch', a); });

            // --- Esperar a que las animaciones se carguen ---
            setTimeout(() => {
                // Reproduce la animación idle en bucle
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

    // ====================================================================
    // MANTENEMOS TU LÓGICA DE CÁMARA ORIGINAL
    // ====================================================================
    _UpdateCamera() {
        if (!this._controls._target) {
            return;
        }

        // Posición del objetivo de la cámara (el personaje)
        this._cameraTarget.copy(this._controls._target.position);
        this._cameraTarget.y += 5; // Ajuste de altura para que la cámara apunte a la cabeza del personaje

        // Posición de la cámara detrás del personaje, con la misma rotación
        const tempOffset = this._cameraOffset.clone();
        tempOffset.applyQuaternion(this._controls._target.quaternion);
        tempOffset.add(this._controls._target.position);

        this._camera.position.lerp(tempOffset, 0.1); // Usa lerp para un movimiento más suave
        this._camera.lookAt(this._cameraTarget);
    }
    // ====================================================================
    // FIN DE TU LÓGICA DE CÁMARA
    // ====================================================================

    _LoadAnimatedModel() {
        // --- MODIFICADO: Pasamos las plataformas y la instancia del juego ---
        const params = {
            camera: this._camera,
            scene: this._scene,
            platforms: this._platforms, // <-- Le pasamos el array de plataformas
            game: this,
            sounds: this._sounds                  // <-- Le pasamos la instancia del juego
        }
        this._controls = new BasicCharacterController(params);
        // --- FIN DE LA MODIFICACIÓN ---
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

        // --- NUEVO: No procesar teclas si está muerto ---
        if (this._isDead) return;
        // --- FIN DEL CÓDIGO NUEVO ---

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
        if (this._isPaused || this._isDead) { // --- MODIFICADO: Checar muerte
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
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._enemyMixer) {
            this._enemyMixer.update(timeElapsed * 0.001);
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }

        if (this._orbSpawner) {
            this._orbSpawner.update(timeElapsedS);
        }

        for (let i = this._explosions.length - 1; i >= 0; i--) {
            const explosion = this._explosions[i];
            const isDead = explosion.update(timeElapsedS); // El update devuelve 'true' si ya murió
            if (isDead) {
                this._explosions.splice(i, 1); // Eliminarla del array
            }
        }

        if (this._dustSystem) {
            this._dustSystem.update(timeElapsedS);
        }

        this._CheckCollisions();
        this._CheckBossEncounter();

        // Llamada al método de actualización de la cámara
        this._UpdateCamera();

    }

    _TriggerDeath() {
        if (this._isDead) return; // evita duplicados
        this._isDead = true;

        // Ocultar jugador
        if (this._controls && this._controls._target) {
            this._controls._target.visible = false;
        }

        // Preguntar nombre
        let playerName = prompt("¡Perdiste! Ingresa tu nombre:");
        if (!playerName) playerName = "Jugador"; // Default

        // Enviar puntuación a la API
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
            .catch(err => {
                console.error('Error al guardar la puntuación:', err);
                alert(`¡Error al guardar! Tu puntuación fue: ${this._orbsCollected}`);
                window.location.reload(); // reinicia incluso si la API falla
            });
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

    /**
     * Muestra la pantalla de "Ganaste".
     */
    _TriggerWin() {
        if (this._isDead || this._gameWon) return; // No hacer nada si ya terminó
        this._gameWon = true;

        const overlay = document.getElementById("win-screen");
        if (overlay) overlay.classList.add("active");

        clearInterval(this._temporizador);
        if (this._controls) this._controls._input._keys = {}; // Detener movimiento
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

/**
 * Sistema de partículas de polvo ambiental.
 * Crea partículas que flotan suavemente en todo el mapa.
 */
class DustParticleSystem {
    constructor(params) {
        this.scene = params.scene;
        this.count = params.count || 1000; // Cantidad de partículas

        // Define el área que cubrirá el polvo (ajustado a tu Nivel 2)
        // Tu nivel va de Z=0 a Z=800 aprox.
        this.bounds = {
            minX: -100, maxX: 100,
            minY: -10, maxY: 60,
            minZ: -50, maxZ: 850
        };

        this.particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        // Velocidades aleatorias para cada partícula
        this.velocities = [];

        for (let i = 0; i < this.count; i++) {
            // Posición inicial aleatoria dentro de los límites
            positions[i * 3] = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);     // x
            positions[i * 3 + 1] = THREE.MathUtils.randFloat(this.bounds.minY, this.bounds.maxY); // y
            positions[i * 3 + 2] = THREE.MathUtils.randFloat(this.bounds.minZ, this.bounds.maxZ); // z

            // Velocidad muy suave
            this.velocities.push({
                x: (Math.random() - 0.5) * 0.5, // Leve movimiento lateral
                y: (Math.random() - 0.5) * 0.5, // Leve movimiento vertical
                z: (Math.random() - 0.5) * 0.5  // Leve movimiento frontal
            });
        }

        this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Usamos una textura simple o la misma sparkle.png (se verá bien pequeña)
        const textureLoader = new THREE.TextureLoader();
        const particleTexture = textureLoader.load('./Resources/Imagenes/sparkle.png');

        this.particlesMaterial = new THREE.PointsMaterial({
            color: 0x00FF00,      // Blanco
            size: 0.8,            // Muy pequeñas
            map: particleTexture,
            transparent: true,
            opacity: .7,         // Semi-transparentes
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
        this.scene.add(this.particleSystem);
    }

    update(timeInSeconds) {
        const positions = this.particlesGeometry.attributes.position.array;

        for (let i = 0; i < this.count; i++) {
            // Actualizar posiciones basado en velocidad
            positions[i * 3] += this.velocities[i].x * timeInSeconds; // X
            positions[i * 3 + 1] += this.velocities[i].y * timeInSeconds; // Y
            positions[i * 3 + 2] += this.velocities[i].z * timeInSeconds; // Z

            // --- LÓGICA DE BUCLE INFINITO (Wrap Around) ---
            // Si se sale por un lado, aparece por el otro para que nunca se acaben

            // Eje Y (Altura)
            if (positions[i * 3 + 1] > this.bounds.maxY) positions[i * 3 + 1] = this.bounds.minY;
            if (positions[i * 3 + 1] < this.bounds.minY) positions[i * 3 + 1] = this.bounds.maxY;

            // Eje X (Ancho)
            if (positions[i * 3] > this.bounds.maxX) positions[i * 3] = this.bounds.minX;
            if (positions[i * 3] < this.bounds.minX) positions[i * 3] = this.bounds.maxX;

            // Eje Z (Largo) - Importante para tu nivel largo
            if (positions[i * 3 + 2] > this.bounds.maxZ) positions[i * 3 + 2] = this.bounds.minZ;
            if (positions[i * 3 + 2] < this.bounds.minZ) positions[i * 3 + 2] = this.bounds.maxZ;
        }

        this.particlesGeometry.attributes.position.needsUpdate = true;
    }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new CharacterControllerDemo();
});