import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

const textureLoader = new THREE.TextureLoader();

/**
 * Clase para gestionar la aparición y el comportamiento de los orbes en el mapa.
 */
export class OrbSpawner {
	constructor(params) {
		this._params = params;
		this._orbs = [];
		this._orbModel = null;
		this._loader = new FBXLoader();
		this._orbColorMap = null;    // Mapa de color/transparencia
		this._orbNormalMap = null;   // Mapa Normal
		this._texturesLoaded = 0;    // Contador para asegurar que ambos carguen

		this._currentTime = 0;           // Tiempo total transcurrido
		this._lastCollectionTime = 0;    // Último tiempo en que se recolectó un orbe
		this._respawnTimeout = 20;        // Tiempo límite para el movimiento de orbes (5 segundos)
		// ----------------------------------------------------

		// 🔵 NUEVO CONTADOR
		this._orbsCollected = 0;

		this._LoadOrbModel();
		this._LoadOrbTextures();
	}

	/**
	 * Función de callback para contar cuántas texturas se han cargado.
	 * Una vez que ambas (color y normal) estén listas, aplica las texturas.
	 */
	_onTextureLoad() {
		this._texturesLoaded++;
		// Solo aplica las texturas si el modelo ya está cargado Y ambas texturas están listas
		if (this._orbModel && this._texturesLoaded === 2) {
			this._applyTextureToModel();
		}
	}

	/**
	 * Carga el modelo FBX del orbe.
	 */
	_LoadOrbModel() {
		// NOTA DE RUTA: Es importante que el caso coincida con la carpeta real.
		this._loader.setPath('./Resources/Modelos/Orbe/');
		this._loader.load('Orb.fbx', (fbx) => {
			fbx.scale.setScalar(.4); // Ajusta la escala según sea necesario
			fbx.traverse(c => {
				c.castShadow = true;
			});
			this._orbModel = fbx;
			console.log('Modelo de orbe cargado exitosamente.');

			// Si las texturas ya se cargaron (por si son más rápidas), las aplicamos.
			if (this._texturesLoaded === 2) {
				this._applyTextureToModel();
			}

			// Una vez que el modelo está listo, inicializa el tiempo de colección
			this._lastCollectionTime = this._currentTime;
			this.spawnInitialOrbs(25); // Aparece 5 orbes al inicio del juego
		}, null, (error) => {
			console.error('Error al cargar el modelo del orbe:', error);
		});
	}

	/**
	 * Carga el mapa de color y el mapa normal manualmente.
	 */
	_LoadOrbTextures() {
		// 1. Carga del Mapa de Color/Transparencia (TransperacyMap)
		const colorTexturePath = './Resources/Modelos/orb/textures/OrbTransperacyMap.png';
		textureLoader.load(colorTexturePath,
			(texture) => {
				this._orbColorMap = texture;
				console.log('Mapa de color/transparencia cargado exitosamente.');
				this._onTextureLoad();
			},
			null,
			(error) => {
				console.error('Error al cargar el Mapa de Color/Transparencia:', colorTexturePath, error);
			}
		);

		// 2. Carga del Mapa Normal (NormalMap)
		const normalTexturePath = './Resources/Modelos/orb/textures/OrbNormalMap.png';
		textureLoader.load(normalTexturePath,
			(texture) => {
				this._orbNormalMap = texture;
				// Los mapas normales a menudo necesitan un flipY deshabilitado
				this._orbNormalMap.flipY = false;
				console.log('Mapa Normal del orbe cargado exitosamente.');
				this._onTextureLoad();
			},
			null,
			(error) => {
				console.error('Error al cargar el Mapa Normal:', normalTexturePath, error);
			}
		);
	}

	/**
		 * Aplica las texturas cargadas al modelo.
		 */
	_applyTextureToModel() {
		if (!this._orbModel || !this._orbColorMap || !this._orbNormalMap) return;

		this._orbModel.traverse(c => {
			if (c.isMesh) {

				// --- CÓDIGO CORREGIDO ---
				const newMaterial = new THREE.MeshStandardMaterial({
					color: 0x9933FF, // ¡Dale un color base morado!

					// 'map' (color) ahora es nulo, a menos que tengas una textura de color
					// map: null, 

					normalMap: this._orbNormalMap, // El mapa normal está bien

					alphaMap: this._orbColorMap, // Usa tu textura como alphaMap
					transparent: true, // ¡Indica que este material usa transparencia!
					depthWrite: false, // Mejor para objetos transparentes
					blending: THREE.AdditiveBlending // Opcional: hace que brille un poco
				});
				// --- FIN DEL CÓDIGO CORREGIDO ---

				if (!c.geometry.attributes.normal) {
					c.geometry.computeVertexNormals();
				}

				c.material = newMaterial;
			}
		});
	}

	/**
	 * Genera una posición aleatoria dentro de un rango determinado.
	 * @param {number} range - El rango máximo en X y Z.
	 * @returns {THREE.Vector3} La posición aleatoria.
	 */
	_getRandomPosition(range = 300) {
		const x = Math.random() * (range * 2) - range;
		const z = Math.random() * (range * 2) - range;
		return new THREE.Vector3(x, 1, z); // La posición Y es 0.5 para que flote sobre el plano
	}

	/**
	 * Crea y añade un nuevo orbe a la escena en una posición aleatoria.
	 */
	spawnOrb() {
		if (!this._orbModel) {
			console.warn('El modelo del orbe no ha sido cargado aún.');
			return;
		}

		const orbInstance = this._orbModel.clone();
		orbInstance.position.copy(this._getRandomPosition());

		// Aquí puedes agregar un identificador para cada orbe si lo necesitas para la lógica de colisiones
		orbInstance.name = 'orb';

		this._params.scene.add(orbInstance);
		this._orbs.push(orbInstance);
		console.log('Orbe generado en:', orbInstance.position);
	}

	/**
	 * Genera un número inicial de orbes en el mapa.
	 * @param {number} count - Número de orbes a generar.
	 */
	spawnInitialOrbs(count) {
		for (let i = 0; i < count; i++) {
			this.spawnOrb();
		}
	}

	// --- NUEVO MÉTODO PARA REPOSICIONAR ORBES ---
	/**
	 * Reposiciona todos los orbes existentes a nuevas ubicaciones aleatorias.
	 */
	respawnAllOrbs() {
		this._orbs.forEach(orb => {
			// Reposiciona el orbe a una nueva posición aleatoria
			orb.position.copy(this._getRandomPosition());
		});
		console.log(`[OrbSpawner] ¡Todos los ${this._orbs.length} orbes se han reposicionado!`);
	}
	// ----------------------------------------------

	// --- NUEVO MÉTODO PARA LA RECOLECCIÓN ---
	/**
	 * Llama esta función desde tu lógica de colisión cuando el personaje recoge un orbe.
	 * Esto elimina el orbe, genera uno nuevo y reinicia el contador de movimiento.
	 * @param {THREE.Object3D} orbToRemove - El orbe que fue recolectado.
	 */
	collectOrb(orbToMove) {
		orbToMove.position.copy(this._getRandomPosition());
		this._lastCollectionTime = this._currentTime;

		// // Llama a la función global que cuenta los orbes recolectados
		// recolectarOrbe();

		console.log('Orbe reposicionado en:', orbToMove.position);
	}

	// ------------------------------------------

	/**
	 * Elimina un orbe de la escena y del array de orbes.
	 * @param {THREE.Object3D} orbToRemove - El orbe a eliminar.
	 */
	removeOrb(orbToRemove) {
		const index = this._orbs.indexOf(orbToRemove);
		if (index > -1) {
			this._orbs.splice(index, 1);
			this._params.scene.remove(orbToRemove);
			console.log('Orbe eliminado de la escena.');
		}
	}

	/**
	 * Actualiza el estado de los orbes (por ejemplo, para animaciones y movimiento por tiempo).
	 * @param {number} timeElapsedS - El tiempo transcurrido en segundos (delta time).
	 */
	update(timeElapsedS) {
		this._currentTime += timeElapsedS; // Actualiza el tiempo total

		// --- LÓGICA DE MOVIMIENTO POR TIMEOUT ---
		if (this._orbModel && this._currentTime - this._lastCollectionTime >= this._respawnTimeout) {
			this.respawnAllOrbs(); // Llama a la función de reposicionamiento
			this._lastCollectionTime = this._currentTime; // Reinicia el timer
		}
		// ----------------------------------------

		this._orbs.forEach(orb => {
			// Rotación del orbe para darle un efecto visual
			orb.rotation.y += timeElapsedS * 1.5; // Ajusta 1.5 para la velocidad de rotación
		});
	}


}
// Ola, esta es para lo d la logica de la barra de energia y lo de ganar y perder
//aqui se gana si recolectas 5 orbes y se pierde si no recolectas ninguno en 30 segundos y yap
let orbesRecolectados = 0;
let tiempoSinRecolectar = 0;

// actualiza la barra de energía en el HUD
function actualizarBarraEnergia() {
	const barraImg = document.getElementById("barra-energia-img");
	if (!barraImg) {
		console.warn("No se encontró la imagen de la barra (#barra-energia-img)");
		return;
	}

	// Asegura que no sobrepase el 5
	const progreso = Math.min(orbesRecolectados, 5);

	const rutaBase = "./Resources/UI/";
	const nombreImagen = progreso === 0 ? "HUH.png" : `HUH-${progreso}.png`;

	const nuevaRuta = rutaBase + nombreImagen;
	console.log(" Actualizando barra a:", nuevaRuta);
	barraImg.src = nuevaRuta;
}
//aqui se puede ajustar el tiempo
let temporizador = setInterval(() => {
	tiempoSinRecolectar++;
	if (tiempoSinRecolectar >= 300000 && orbesRecolectados === 0) {
		mostrarPantalla("lose");
		clearInterval(temporizador);
	}
}, 1000);

function recolectarOrbe() {
	orbesRecolectados++;
	tiempoSinRecolectar = 0; // reinicia el contador
	actualizarBarraEnergia(); //  actualiza visualmente la barra

	if (orbesRecolectados >= 5) {
		mostrarPantalla("win");
		clearInterval(temporizador);
	}
}

function mostrarPantalla(tipo) {
	const overlay = document.getElementById(
		tipo === "win" ? "win-screen" : "lose-screen"
	);
	if (overlay) overlay.classList.add("active");
}
