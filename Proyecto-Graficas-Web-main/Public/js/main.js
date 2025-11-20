import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';

class MenuScene {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true // Permite fondo transparente
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
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        
        // Posiciona la cámara al frente del personaje.
        // Ajusta estos valores para cambiar la vista.
        this._camera.position.set(0, 1, 10);
        this._camera.lookAt(-7.5, 5, 0); // Apunta al centro del personaje

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x87CEEB); 

        // Luces
        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(-100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 0.5); // Aumenta la intensidad para mayor visibilidad
        this._scene.add(light);

        // Plano del suelo
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(100, 1, 100),
            new THREE.MeshStandardMaterial({
                color: 0x000000,
            }));
        box.position.set(0, -0.5, 0);
        box.receiveShadow = true;
        this._scene.add(box);

        this._mixers = [];
        this._previousRAF = null;

        this._LoadAnimatedModel();
        this._RAF();
    }

    _LoadAnimatedModel() {
        const loader = new FBXLoader();
        loader.setPath('Resources/Modelos/Personaje/');

        // Carga el modelo principal
        loader.load('Tilin2.fbx', (model) => {
            model.scale.setScalar(0.05);
            model.position.set(0, 0, 0); // Posiciona el personaje en el centro de la escena
            model.traverse(c => {
                c.castShadow = true;
            });

            // Carga y reproduce la animación de "idle"
            loader.load('idle.fbx', (anim) => {
                const mixer = new THREE.AnimationMixer(model);
                this._mixers.push(mixer);
                const idleAction = mixer.clipAction(anim.animations[0]);
                idleAction.play();
            });

            this._scene.add(model);
        });
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers.length > 0) {
            this._mixers.forEach(m => m.update(timeElapsedS));
        }
    }
}

import { initializeMenuLogic } from './menus.js';

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new MenuScene();
    // Llamada a la función del nuevo archivo para inicializar la lógica del menú
    initializeMenuLogic(); 
});