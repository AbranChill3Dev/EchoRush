

export function initializeMenuLogic(appInstance) {
    const startButton = document.getElementById('start-button');
    const menuInicio = document.getElementById('MenuInicio');
    const mainMenu = document.getElementById('MainMenu');
    const backToMenuButton = document.getElementById('back-to-menu-button');
    const jugarButton = document.getElementById('jugar-button');
    const gameMenu = document.getElementById('GameMenu');
    const backButtonFromGameMenu = document.getElementById('back-to-main-menu');
    const backgroundMusic = document.getElementById('background-music');
    const audioIcon = document.getElementById('audio-icon');
    const audioImg = document.getElementById('audio-img');
    const optionsButton = document.getElementById('options-button');
    const optionsMenu = document.getElementById('OptionsMenu');
    const backFromOptionsButton = document.getElementById('back-from-options');

    const levelMenu = document.getElementById('LevelMenu');
    const solitarioOption = document.querySelector('.game-option[data-mode="solitario"]');
    const multijugadorOption = document.querySelector('.game-option[data-mode="multijugador"]');
    const backFromLevelButton = document.getElementById('back-from-level');
    const levelOptions = document.querySelectorAll('.level-option');



    let isPlaying = false;

    if (startButton && menuInicio && mainMenu && backToMenuButton && jugarButton && gameMenu && backButtonFromGameMenu && audioIcon && audioImg && backgroundMusic && optionsButton && optionsMenu && backFromOptionsButton && levelMenu && solitarioOption && multijugadorOption && backFromLevelButton && levelOptions.length > 0) {

        backgroundMusic.volume = .1;
        // --- Lógica del botón "Puntuaciones" ---
        const scoreButton = document.getElementById('score-button');
        const scoreModal = document.getElementById('scoreModal');
        const closeModal = document.getElementById('closeScoreModal');
        const scoreList = document.getElementById('scoreList');

        // --- Lógica del ícono de audio ---
        audioIcon.addEventListener('click', () => {
            if (isPlaying) {
                backgroundMusic.pause();
                audioImg.src = "Resources/Imagenes/SonidoOFF.png";
            } else {
                backgroundMusic.play().catch(e => {
                    console.error("Error al reproducir el audio:", e);
                });
                audioImg.src = "Resources/Imagenes/SonidoON.png";
            }
            isPlaying = !isPlaying;
        });

        // --- Lógica del botón de inicio ---
        startButton.addEventListener('click', () => {
            menuInicio.style.display = 'none';
            mainMenu.style.display = 'flex';
            if (!isPlaying) {
                backgroundMusic.play().catch(e => {
                    console.error("Error al reproducir el audio:", e);
                });
                isPlaying = true;
            }
            audioImg.src = "Resources/Imagenes/SonidoON.png";
        });

        // --- Lógica del botón "Puntuaciones" ---
        scoreButton.addEventListener('click', async () => {
            scoreList.innerHTML = ''; // Limpiar lista anterior
            try {
                const response = await fetch('http://localhost:3000/scores'); // tu endpoint GET
                const data = await response.json();
                data.sort((a, b) => b.score - a.score);
                data.forEach(score => {
                    const li = document.createElement('li');
                    li.textContent = `${score.username}: ${score.score} orbes`;
                    scoreList.appendChild(li);
                });
                scoreModal.style.display = 'flex';
            } catch (err) {
                console.error('Error al cargar puntuaciones:', err);
                alert('No se pudieron cargar las puntuaciones.');
            }
        });

        closeModal.addEventListener('click', () => {
            scoreModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === scoreModal) {
                scoreModal.style.display = 'none';
            }
        });

        // --- Lógica para ir al menú de juego ---
        jugarButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        // --- Lógica para ir al menú de niveles desde "Solitario" ---
        solitarioOption.addEventListener('click', () => {
            gameMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        // --- Lógica para ir al menú de niveles desde "Multijugador" ---
        multijugadorOption.addEventListener('click', () => {
            gameMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        // --- Lógica para regresar al menú principal desde el menú de juego ---
        backButtonFromGameMenu.addEventListener('click', () => {
            gameMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        // --- Lógica para regresar del menú de niveles al de juego ---
        backFromLevelButton.addEventListener('click', () => {
            levelMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        // --- Lógica para volver al menú de inicio (desde el MainMenu) ---
        backToMenuButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            menuInicio.style.display = 'flex';
        });

        // --- Lógica para ir al menú de opciones ---
        optionsButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            optionsMenu.style.display = 'flex';
        });

        // --- Lógica para regresar del menú de opciones ---
        backFromOptionsButton.addEventListener('click', () => {
            optionsMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        levelOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedLevel = option.dataset.level;

                console.log(`Nivel seleccionado: ${selectedLevel}`);

                // --- CÓDIGO MODIFICADO ---
                if (selectedLevel === 'plano') {
                    // Si el data-level es 'plano', vamos a Nivel1.html
                    window.location.href = 'Nivel1.html';
                } else if (selectedLevel === 'obstaculos') {
                    // Si el data-level es 'obstaculos', vamos a nivel2.html
                    window.location.href = 'nivel2.html';
                } else if (selectedLevel === 'laberinto') {
                    // Si el data-level es 'laberinto', vamos a nivel3.html
                    window.location.href = 'nivel3.html';
                }
                // --- FIN DE LA MODIFICACIÓN ---
            });
        });

    } else {
        console.error("No se encontraron todos los elementos del menú. Asegúrate de que los IDs y clases en el HTML y el JS sean correctos.");
    }
}

