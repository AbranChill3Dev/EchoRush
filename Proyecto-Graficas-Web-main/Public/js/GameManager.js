import { OrbSpawner } from './OrbSpawner.js';

let orbsCollected = 0;

const orbSpawner = new OrbSpawner({ scene: scene });

function collectOrb(orb) {
    orbSpawner.collectOrb(orb);
    orbsCollected++;
    console.log('Orbes recolectados:', orbsCollected);
}

function playerDie() {
    const playerName = prompt('¡Perdiste! Ingresa tu nombre:');

    fetch('http://localhost:3000/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: playerName, score: orbsCollected })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Puntuación guardada:', data);
        alert(`¡Gracias ${playerName}! Tu puntuación de ${orbsCollected} orbes fue guardada.`);
        window.location.reload();
    })
    .catch(err => console.error('Error al guardar la puntuación:', err));
}

setTimeout(() => {
    playerDie();
}, 10000); // 10000 ms = 10 segundos
