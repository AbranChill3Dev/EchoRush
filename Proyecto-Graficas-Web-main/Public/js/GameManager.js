import { OrbSpawner } from './OrbSpawner.js';

let orbsCollected = 0;

// Configura el juego y el OrbSpawner
const orbSpawner = new OrbSpawner({ scene: scene }); // Asegúrate de pasar tu escena
// Aquí supongo que tienes un main loop donde llamas orbSpawner.update(deltaTime)

function collectOrb(orb) {
    orbSpawner.collectOrb(orb);
    orbsCollected++;
    console.log('Orbes recolectados:', orbsCollected);
}

// ---------------------------
// PRUEBA DE “MORIR” AUTOMÁTICAMENTE
// ---------------------------
function playerDie() {
    // Preguntar el nombre del jugador
    const playerName = prompt('¡Perdiste! Ingresa tu nombre:');
    
    // Enviar POST a tu API
    fetch('http://localhost:3000/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: playerName, score: orbsCollected })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Puntuación guardada:', data);
        alert(`¡Gracias ${playerName}! Tu puntuación de ${orbsCollected} orbes fue guardada.`);
        // Reinicia el juego o recarga la página para prueba
        window.location.reload();
    })
    .catch(err => console.error('Error al guardar la puntuación:', err));
}

// ---------------------------
// TEST: morir después de 10 segundos
// ---------------------------
setTimeout(() => {
    playerDie();
}, 10000); // 10000 ms = 10 segundos
