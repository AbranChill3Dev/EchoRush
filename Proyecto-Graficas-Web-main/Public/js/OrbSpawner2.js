import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

const textureLoader = new THREE.TextureLoader();

// --- Variables Globales del Juego (Win/Lose) ---
let orbesRecolectados = 0;
let tiempoSinRecolectar = 0;
let temporizador = null; // Lo iniciamos en el constructor para evitar errores de carga

/**
 * Clase para gestionar la aparición y el comportamiento de los orbes en el mapa.
 */
export class OrbSpawner {
    constructor(params) {
        this._params = params;
        this._orbs = [];
        // --- NUEVO: Recibimos las plataformas del nivel ---
        this._platforms = params.platforms || []; 
        // -------------------------------------------------
        
        this._orbModel = null;
        this._loader = new FBXLoader();
        this._orbColorMap = null;
        this._orbNormalMap = null;
        this._texturesLoaded = 0;

        this._currentTime = 0;
        this._lastCollectionTime = 0;
        this._respawnTimeout = 20; 

        this._LoadOrbModel();
        this._LoadOrbTextures();

        // Iniciar lógica de juego (Temporizador)
        this._IniciarLogicaJuego();
    }

    _onTextureLoad() {
        this._texturesLoaded++;
        if (this._orbModel && this._texturesLoaded === 2) {
            this._applyTextureToModel();
        }
    }

    _LoadOrbModel() {
        this._loader.setPath('./Resources/Modelos/Orbe/');
        this._loader.load('Orb.fbx', (fbx) => {
            fbx.scale.setScalar(.4);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            this._orbModel = fbx;
            console.log('Modelo de orbe cargado exitosamente.');

            if (this._texturesLoaded === 2) {
                this._applyTextureToModel();
            }

            this._lastCollectionTime = this._currentTime;
            
            // --- CAMBIO: Generamos menos orbes iniciales para no saturar las plataformas ---
            this.spawnInitialOrbs(10); 
        }, null, (error) => {
            console.error('Error al cargar el modelo del orbe:', error);
        });
    }

    _LoadOrbTextures() {
        const colorTexturePath = './Resources/Modelos/orb/textures/OrbTransperacyMap.png';
        textureLoader.load(colorTexturePath, (texture) => {
            this._orbColorMap = texture;
            this._onTextureLoad();
        });

        const normalTexturePath = './Resources/Modelos/orb/textures/OrbNormalMap.png';
        textureLoader.load(normalTexturePath, (texture) => {
            this._orbNormalMap = texture;
            this._orbNormalMap.flipY = false;
            this._onTextureLoad();
        });
    }

    _applyTextureToModel() {
        if (!this._orbModel || !this._orbColorMap || !this._orbNormalMap) return;

        this._orbModel.traverse(c => {
            if (c.isMesh) {
                const newMaterial = new THREE.MeshStandardMaterial({
                    color: 0x9933FF,
                    normalMap: this._orbNormalMap,
                    alphaMap: this._orbColorMap,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
                if (!c.geometry.attributes.normal) {
                    c.geometry.computeVertexNormals();
                }
                c.material = newMaterial;
            }
        });
    }

    // --- NUEVO MÉTODO: Obtener posición ENCIMA de una plataforma ---
    _getPlatformSpawnPosition() {
        // Si no hay plataformas, usar lógica antigua (fallback)
        if (!this._platforms || this._platforms.length === 0) {
            return this._getRandomPosition();
        }

        // 1. Elegir una plataforma aleatoria
        const randomIndex = Math.floor(Math.random() * this._platforms.length);
        const platform = this._platforms[randomIndex];

        // 2. Obtener los límites exactos de esa plataforma (Bounding Box)
        const box = new THREE.Box3().setFromObject(platform);
        
        // 3. Calcular dimensiones
        const minX = box.min.x;
        const maxX = box.max.x;
        const minZ = box.min.z;
        const maxZ = box.max.z;
        const surfaceY = box.max.y;

        // 4. Definir un margen (padding) para que no aparezcan justo en el borde y se caigan
        const padding = 2.0; 

        // Asegurarse de que la plataforma no sea demasiado pequeña para el padding
        const safeMinX = minX + padding < maxX - padding ? minX + padding : minX;
        const safeMaxX = maxX - padding > minX + padding ? maxX - padding : maxX;
        const safeMinZ = minZ + padding < maxZ - padding ? minZ + padding : minZ;
        const safeMaxZ = maxZ - padding > minZ + padding ? maxZ - padding : maxZ;

        // 5. Generar coordenadas aleatorias DENTRO de esos límites
        const x = THREE.MathUtils.randFloat(safeMinX, safeMaxX);
        const z = THREE.MathUtils.randFloat(safeMinZ, safeMaxZ);
        
        // 6. Altura: Superficie de la plataforma + altura del orbe (para que flote)
        const y = surfaceY + 1.5; 

        return new THREE.Vector3(x, y, z);
    }

    // Mantenemos este por si acaso fallan las plataformas
    _getRandomPosition(range = 300) {
        const x = Math.random() * (range * 2) - range;
        const z = Math.random() * (range * 2) - range;
        return new THREE.Vector3(x, 1, z);
    }

    spawnOrb() {
        if (!this._orbModel) return;

        const orbInstance = this._orbModel.clone();
        
        // --- USAR LA NUEVA LÓGICA DE POSICIÓN ---
        orbInstance.position.copy(this._getPlatformSpawnPosition());
        // ----------------------------------------

        orbInstance.name = 'orb';

        this._params.scene.add(orbInstance);
        this._orbs.push(orbInstance);
    }

    spawnInitialOrbs(count) {
        for (let i = 0; i < count; i++) {
            this.spawnOrb();
        }
    }

    respawnAllOrbs() {
        this._orbs.forEach(orb => {
            // --- USAR LA NUEVA LÓGICA AL REPOSICIONAR ---
            orb.position.copy(this._getPlatformSpawnPosition());
        });
        console.log(`[OrbSpawner] Orbes reposicionados en plataformas.`);
    }

    collectOrb(orbToMove) {
        // --- USAR LA NUEVA LÓGICA AL RECOLECTAR ---
        orbToMove.position.copy(this._getPlatformSpawnPosition());
        this._lastCollectionTime = this._currentTime;

        // Llamar a la lógica global
        recolectarOrbe(); 

        console.log('Orbe recolectado y movido a nueva plataforma.');
    }

    update(timeElapsedS) {
        this._currentTime += timeElapsedS;

        if (this._orbModel && this._currentTime - this._lastCollectionTime >= this._respawnTimeout) {
            this.respawnAllOrbs();
            this._lastCollectionTime = this._currentTime;
        }

        this._orbs.forEach(orb => {
            orb.rotation.y += timeElapsedS * 1.5;
        });
    }

    // --- INICIALIZADOR DE LÓGICA DE JUEGO ---
    _IniciarLogicaJuego() {
        // Reiniciar variables
        orbesRecolectados = 0;
        tiempoSinRecolectar = 0;
        if (temporizador) clearInterval(temporizador);

        temporizador = setInterval(() => {
            tiempoSinRecolectar++;
            // Nota: 30 segundos son 30, no 300000 (porque el intervalo es de 1000ms = 1s)
            if (tiempoSinRecolectar >= 30 && orbesRecolectados === 0) {
                mostrarPantalla("lose");
                clearInterval(temporizador);
            }
        }, 1000);
    }
}

// --- FUNCIONES GLOBALES (Integradas al mismo archivo para simplicidad) ---

function actualizarBarraEnergia() {
    const barraImg = document.getElementById("barra-energia-img");
    if (!barraImg) return;

    const progreso = Math.min(orbesRecolectados, 5);
    const rutaBase = "./Resources/UI/";
    const nombreImagen = progreso === 0 ? "HUH.png" : `HUH-${progreso}.png`;

    barraImg.src = rutaBase + nombreImagen;
}

function recolectarOrbe() {
    orbesRecolectados++;
    tiempoSinRecolectar = 0; 
    actualizarBarraEnergia();

    // if (orbesRecolectados >= 5) {
    //     mostrarPantalla("win");
    //     if(temporizador) clearInterval(temporizador);
    // }
}

function mostrarPantalla(tipo) {
    const overlay = document.getElementById(
        tipo === "win" ? "win-screen" : "lose-screen"
    );
    if (overlay) overlay.classList.add("active");
    console.log("JUEGO TERMINADO: " + tipo);
}