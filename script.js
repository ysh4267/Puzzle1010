(() => {
    const BOARD_SIZE = 10;

    const SHAPES = [
        { name: '1x1', color: '#EF4444', cells: [[1]] },
        { name: '1x2h', color: '#F97316', cells: [[1, 1]] },
        { name: '1x2v', color: '#F97316', cells: [[1], [1]] },
        { name: '1x3h', color: '#F59E0B', cells: [[1, 1, 1]] },
        { name: '1x3v', color: '#F59E0B', cells: [[1], [1], [1]] },
        { name: '1x4h', color: '#84CC16', cells: [[1, 1, 1, 1]] },
        { name: '1x4v', color: '#84CC16', cells: [[1], [1], [1], [1]] },
        { name: '1x5h', color: '#10B981', cells: [[1, 1, 1, 1, 1]] },
        { name: '1x5v', color: '#10B981', cells: [[1], [1], [1], [1], [1]] },
        { name: '2x2', color: '#06B6D4', cells: [[1, 1], [1, 1]] },
        { name: '3x3', color: '#3B82F6', cells: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
        { name: 'L2-a', color: '#8B5CF6', cells: [[1, 0], [1, 1]] },
        { name: 'L2-b', color: '#8B5CF6', cells: [[1, 1], [1, 0]] },
        { name: 'L2-c', color: '#8B5CF6', cells: [[1, 1], [0, 1]] },
        { name: 'L2-d', color: '#8B5CF6', cells: [[0, 1], [1, 1]] },
        { name: 'L3-a', color: '#EC4899', cells: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] },
        { name: 'L3-b', color: '#EC4899', cells: [[1, 1, 1], [1, 0, 0], [1, 0, 0]] },
        { name: 'L3-c', color: '#EC4899', cells: [[1, 1, 1], [0, 0, 1], [0, 0, 1]] },
        { name: 'L3-d', color: '#EC4899', cells: [[0, 0, 1], [0, 0, 1], [1, 1, 1]] },
    ];

    const BONUS_THRESHOLD = 500;

    const boardEl = document.getElementById('board');
    const trayEl = document.getElementById('tray');
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const bonusEl = document.getElementById('bonus');
    const bonusBoxEl = bonusEl.parentElement;
    const restartBtn = document.getElementById('restart');
    const restartBtn2 = document.getElementById('restart2');
    const gameoverEl = document.getElementById('gameover');
    const finalScoreEl = document.getElementById('final-score');

    const shopToggleEl = document.getElementById('shop-toggle');
    const shopBadgeEl = document.getElementById('shop-badge');
    const shopCloseEl = document.getElementById('shop-close');
    const shopDrawerEl = document.getElementById('shop-drawer');
    const shopBackdropEl = document.getElementById('shop-backdrop');
    const shopItemsEl = document.getElementById('shop-items');
    const shopBonusEl = document.getElementById('shop-bonus');

    const undoBtns = [document.getElementById('undo'), document.getElementById('undo2')].filter(Boolean);
    let undoSnapshot = null;
    let nextPieces = null;

    function clonePieces(arr) {
        if (!Array.isArray(arr)) return null;
        return arr.map(p => p ? { name: p.name, color: p.color, cells: p.cells.map(row => row.slice()) } : null);
    }

    const SAVE_KEY = '1010-save';

    let board = [];
    let cellEls = [];
    let pieces = [];
    let score = 0;
    let best = Number(localStorage.getItem('1010-best') || 0);
    let bonusPoints = 0;

    function saveState() {
        try {
            const data = {
                board,
                pieces: pieces.map(p => p ? { name: p.name, color: p.color, cells: p.cells } : null),
                score,
                bonusPoints,
                undoSnapshot,
                nextPieces,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (_) {}
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.board) || data.board.length !== BOARD_SIZE) return null;
            if (!Array.isArray(data.pieces)) return null;
            return data;
        } catch (_) {
            return null;
        }
    }

    function clearSavedState() {
        try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    }

    const placeSound = new Audio('sounds/place.mp3');
    placeSound.volume = 0.18;
    const clearSound = new Audio('sounds/clear.mp3');
    clearSound.volume = 0.2;

    function play(sound) {
        try {
            const s = sound.cloneNode();
            s.volume = sound.volume;
            s.play().catch(() => {});
        } catch (_) {}
    }

    function init(restore) {
        const saved = restore ? loadState() : null;

        if (saved) {
            board = saved.board.map(row => row.slice());
            score = Number(saved.score) || 0;
            bonusPoints = Number(saved.bonusPoints) || 0;
            pieces = clonePieces(saved.pieces) || [];
            undoSnapshot = saved.undoSnapshot || null;
            nextPieces = clonePieces(saved.nextPieces);
        } else {
            clearSavedState();
            board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
            score = 0;
            bonusPoints = 0;
            pieces = [];
            undoSnapshot = null;
            nextPieces = null;
        }

        cellEls = [];
        boardEl.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (board[r][c]) {
                    cell.classList.add('filled');
                    cell.style.setProperty('--cell-color', board[r][c]);
                }
                boardEl.appendChild(cell);
                cellEls.push(cell);
            }
        }

        updateScore();
        bestEl.textContent = best;
        updateBonus();
        updateUndoButton();

        if (pieces.length && pieces.some(p => p)) {
            renderTray();
        } else {
            refillTray();
        }

        gameoverEl.classList.add('hidden');

        if (saved && checkGameOver()) {
            finalScoreEl.textContent = score;
            gameoverEl.classList.remove('hidden');
        }
        saveState();
    }

    function captureUndoSnapshot() {
        undoSnapshot = {
            board: board.map(row => row.slice()),
            pieces: clonePieces(pieces),
            score,
            bonusPoints,
            nextPieces: clonePieces(nextPieces),
        };
        updateUndoButton();
    }

    function updateUndoButton() {
        undoBtns.forEach(btn => { btn.disabled = !undoSnapshot; });
    }

    function undo() {
        if (!undoSnapshot) return;
        board = undoSnapshot.board.map(row => row.slice());
        pieces = clonePieces(undoSnapshot.pieces);
        score = undoSnapshot.score;
        bonusPoints = undoSnapshot.bonusPoints;
        nextPieces = clonePieces(undoSnapshot.nextPieces);
        undoSnapshot = null;

        cellEls = [];
        boardEl.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (board[r][c]) {
                    cell.classList.add('filled');
                    cell.style.setProperty('--cell-color', board[r][c]);
                }
                boardEl.appendChild(cell);
                cellEls.push(cell);
            }
        }

        updateScore();
        updateBonus();
        renderTray();
        gameoverEl.classList.add('hidden');
        updateUndoButton();
        saveState();
    }

    function updateBonus(animate) {
        bonusEl.textContent = bonusPoints;
        shopBonusEl.textContent = bonusPoints;
        shopBadgeEl.textContent = bonusPoints + 'P';
        shopToggleEl.classList.toggle('has-points', bonusPoints > 0);
        if (animate) {
            bonusBoxEl.classList.remove('pulse');
            void bonusBoxEl.offsetWidth;
            bonusBoxEl.classList.add('pulse');
        }
        updateShopItemsState();
    }

    function awardBonusForScore(prevScore) {
        const earned = Math.floor(score / BONUS_THRESHOLD) - Math.floor(prevScore / BONUS_THRESHOLD);
        if (earned > 0) {
            bonusPoints += earned;
            updateBonus(true);
            const rect = bonusBoxEl.getBoundingClientRect();
            showBonusPop(earned, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    }

    function cellAt(r, c) {
        return cellEls[r * BOARD_SIZE + c];
    }

    function updateScore() {
        scoreEl.textContent = score;
        if (score > best) {
            best = score;
            bestEl.textContent = best;
            localStorage.setItem('1010-best', best);
        }
    }

    function refillTray() {
        if (nextPieces && nextPieces.length === 3) {
            pieces = clonePieces(nextPieces);
            nextPieces = null;
        } else {
            pieces = [];
            for (let i = 0; i < 3; i++) {
                pieces.push(randomShape());
            }
        }
        renderTray();
    }

    function randomShape() {
        const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        return { ...s, cells: s.cells.map(row => row.slice()) };
    }

    function renderTray() {
        trayEl.innerHTML = '';
        pieces.forEach((piece, idx) => {
            const slot = document.createElement('div');
            slot.className = 'piece-slot';
            slot.dataset.index = idx;

            if (!piece) {
                slot.classList.add('empty');
                trayEl.appendChild(slot);
                return;
            }

            const pieceEl = buildPieceEl(piece);
            slot.appendChild(pieceEl);

            attachDragHandlers(slot, piece, idx);
            trayEl.appendChild(slot);
        });
        updateShopItemsState();
    }

    function renderShop() {
        shopItemsEl.innerHTML = '';
        SHAPES.forEach((shape, idx) => {
            const item = document.createElement('div');
            item.className = 'shop-item';
            item.dataset.shapeIdx = idx;

            const preview = document.createElement('div');
            preview.className = 'shop-piece';
            const rows = shape.cells.length;
            const cols = shape.cells[0].length;
            preview.style.gridTemplateColumns = `repeat(${cols}, 12px)`;
            preview.style.gridTemplateRows = `repeat(${rows}, 12px)`;
            preview.style.setProperty('--piece-color', shape.color);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const pc = document.createElement('div');
                    pc.className = 'shop-pcell' + (shape.cells[r][c] ? '' : ' blank');
                    preview.appendChild(pc);
                }
            }
            item.appendChild(preview);

            const cost = document.createElement('span');
            cost.className = 'shop-cost';
            cost.textContent = '1P';
            item.appendChild(cost);

            attachShopDragHandlers(item, idx);
            shopItemsEl.appendChild(item);
        });
        updateShopItemsState();
    }

    function updateShopItemsState() {
        if (!shopItemsEl.children.length) return;
        const canBuy = bonusPoints > 0;
        for (const item of shopItemsEl.children) {
            item.classList.toggle('disabled', !canBuy);
        }
    }

    function openShop() {
        shopDrawerEl.classList.add('open');
        shopDrawerEl.setAttribute('aria-hidden', 'false');
        shopBackdropEl.classList.remove('hidden');
        updateShopItemsState();
    }

    function closeShop() {
        shopDrawerEl.classList.remove('open');
        shopDrawerEl.setAttribute('aria-hidden', 'true');
        shopBackdropEl.classList.add('hidden');
    }

    function buildPieceEl(piece) {
        const el = document.createElement('div');
        el.className = 'piece';
        const rows = piece.cells.length;
        const cols = piece.cells[0].length;
        const pieceCell = getComputedStyle(document.documentElement).getPropertyValue('--piece-cell').trim();
        el.style.gridTemplateColumns = `repeat(${cols}, ${pieceCell})`;
        el.style.gridTemplateRows = `repeat(${rows}, ${pieceCell})`;
        el.style.setProperty('--piece-color', piece.color);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const pc = document.createElement('div');
                pc.className = 'pcell' + (piece.cells[r][c] ? '' : ' blank');
                el.appendChild(pc);
            }
        }
        return el;
    }

    function canPlace(piece, baseR, baseC) {
        const rows = piece.cells.length;
        const cols = piece.cells[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!piece.cells[r][c]) continue;
                const br = baseR + r;
                const bc = baseC + c;
                if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE) return false;
                if (board[br][bc]) return false;
            }
        }
        return true;
    }

    function canPlaceAnywhere(piece) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (canPlace(piece, r, c)) return true;
            }
        }
        return false;
    }

    function placePiece(piece, baseR, baseC) {
        const occupied = [];
        const rows = piece.cells.length;
        const cols = piece.cells[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!piece.cells[r][c]) continue;
                const br = baseR + r;
                const bc = baseC + c;
                board[br][bc] = piece.color;
                const cell = cellAt(br, bc);
                cell.classList.add('filled');
                cell.style.setProperty('--cell-color', piece.color);
                occupied.push([br, bc]);
            }
        }
        return occupied.length;
    }

    function clearLines() {
        const fullRows = [];
        const fullCols = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (board[r].every(v => v !== null)) fullRows.push(r);
        }
        for (let c = 0; c < BOARD_SIZE; c++) {
            let full = true;
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (!board[r][c]) { full = false; break; }
            }
            if (full) fullCols.push(c);
        }

        const toClear = new Set();
        fullRows.forEach(r => {
            for (let c = 0; c < BOARD_SIZE; c++) toClear.add(r * BOARD_SIZE + c);
        });
        fullCols.forEach(c => {
            for (let r = 0; r < BOARD_SIZE; r++) toClear.add(r * BOARD_SIZE + c);
        });

        if (toClear.size === 0) return 0;

        toClear.forEach(idx => {
            const r = Math.floor(idx / BOARD_SIZE);
            const c = idx % BOARD_SIZE;
            board[r][c] = null;
            const cell = cellEls[idx];
            cell.classList.add('clearing');
            setTimeout(() => {
                cell.classList.remove('clearing', 'filled');
                cell.style.removeProperty('--cell-color');
            }, 350);
        });

        const lineCount = fullRows.length + fullCols.length;
        return 10 * lineCount + (lineCount > 1 ? 10 * (lineCount - 1) : 0);
    }

    function showScorePop(amount, x, y) {
        if (amount <= 0) return;
        const pop = document.createElement('div');
        pop.className = 'score-pop';
        pop.textContent = '+' + amount;
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        document.body.appendChild(pop);
        setTimeout(() => pop.remove(), 900);
    }

    function showBonusPop(amount, x, y) {
        const pop = document.createElement('div');
        pop.className = 'score-pop';
        pop.style.color = '#D97706';
        pop.textContent = '+' + amount + 'P';
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        document.body.appendChild(pop);
        setTimeout(() => pop.remove(), 900);
    }

    function checkGameOver() {
        for (const p of pieces) {
            if (p && canPlaceAnywhere(p)) return false;
        }
        if (bonusPoints > 0 && canPlaceAnywhere(SHAPES[0])) return false;
        return true;
    }

    let dragState = null;

    function startDrag(source, piece, idx, sourceEl, clientX, clientY, pointerId) {
        const rows = piece.cells.length;
        const cols = piece.cells[0].length;

        const drag = document.createElement('div');
        drag.className = 'drag-piece';
        const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
        drag.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        drag.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
        drag.style.setProperty('--piece-color', piece.color);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const dc = document.createElement('div');
                dc.className = 'dcell' + (piece.cells[r][c] ? '' : ' blank');
                drag.appendChild(dc);
            }
        }
        document.body.appendChild(drag);
        sourceEl.classList.add('dragging');

        dragState = {
            source,
            piece,
            idx,
            slot: sourceEl,
            dragEl: drag,
            rows,
            cols,
            pointerId,
            lastValid: null,
            lastGhostKey: null,
            ghostCells: [],
        };

        updateDragPos(clientX, clientY);
    }

    function attachDragHandlers(slot, piece, idx) {
        slot.addEventListener('pointerdown', (e) => {
            if (slot.classList.contains('empty')) return;
            e.preventDefault();
            slot.setPointerCapture?.(e.pointerId);
            startDrag('tray', piece, idx, slot, e.clientX, e.clientY, e.pointerId);
        });
    }

    function attachShopDragHandlers(item, shapeIdx) {
        item.addEventListener('pointerdown', (e) => {
            if (item.classList.contains('disabled')) return;
            if (bonusPoints <= 0) return;
            e.preventDefault();
            item.setPointerCapture?.(e.pointerId);
            const shape = SHAPES[shapeIdx];
            const piece = { ...shape, cells: shape.cells.map(row => row.slice()) };
            startDrag('shop', piece, shapeIdx, item, e.clientX, e.clientY, e.pointerId);
            closeShop();
        });
    }

    function updateDragPos(clientX, clientY) {
        if (!dragState) return;
        const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
        const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
        const step = cellSize + gap;

        const { dragEl, rows, cols, piece } = dragState;
        const liftY = 80;
        dragEl.style.left = clientX + 'px';
        dragEl.style.top = (clientY - liftY) + 'px';

        const boardRect = boardEl.getBoundingClientRect();
        const pieceCenterX = clientX;
        const pieceCenterY = clientY - liftY;

        const pieceWidth = cols * cellSize + (cols - 1) * gap;
        const pieceHeight = rows * cellSize + (rows - 1) * gap;
        const pieceLeft = pieceCenterX - pieceWidth / 2;
        const pieceTop = pieceCenterY - pieceHeight / 2;

        const padding = gap;
        const relX = pieceLeft - boardRect.left - padding;
        const relY = pieceTop - boardRect.top - padding;

        const col = Math.round(relX / step);
        const row = Math.round(relY / step);

        const inBounds = row >= 0 && row + rows <= BOARD_SIZE && col >= 0 && col + cols <= BOARD_SIZE;
        const valid = inBounds && canPlace(piece, row, col);
        const key = inBounds ? `${row},${col},${valid ? 'v' : 'i'}` : 'none';

        if (key === dragState.lastGhostKey) return;
        dragState.lastGhostKey = key;

        clearGhosts();

        if (inBounds) {
            const next = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (!piece.cells[r][c]) continue;
                    const cell = cellAt(row + r, col + c);
                    if (valid) {
                        cell.classList.add('ghost-valid');
                        cell.style.setProperty('--cell-color', piece.color);
                    } else {
                        cell.classList.add('ghost-invalid');
                    }
                    next.push(cell);
                }
            }
            dragState.ghostCells = next;
            dragState.lastValid = valid ? { row, col } : null;
        } else {
            dragState.lastValid = null;
        }
    }

    function clearGhosts() {
        if (!dragState || !dragState.ghostCells) {
            cellEls.forEach(c => {
                c.classList.remove('ghost-valid', 'ghost-invalid');
                if (!c.classList.contains('filled')) {
                    c.style.removeProperty('--cell-color');
                }
            });
            return;
        }
        dragState.ghostCells.forEach(c => {
            c.classList.remove('ghost-valid', 'ghost-invalid');
            if (!c.classList.contains('filled')) {
                c.style.removeProperty('--cell-color');
            }
        });
        dragState.ghostCells = [];
    }

    function endDrag(committed) {
        if (!dragState) return;
        const source = dragState.source;
        dragState.dragEl.remove();
        dragState.slot.classList.remove('dragging');
        clearGhosts();

        if (committed && dragState.lastValid) {
            const { row, col } = dragState.lastValid;
            captureUndoSnapshot();
            const prevScore = score;
            const placedCells = placePiece(dragState.piece, row, col);
            score += placedCells;

            if (source === 'tray') {
                pieces[dragState.idx] = null;
            } else if (source === 'shop') {
                bonusPoints -= 1;
                updateBonus();
            }

            play(placeSound);

            const lineScore = clearLines();
            if (lineScore > 0) {
                score += lineScore;
                play(clearSound);
                const rect = boardEl.getBoundingClientRect();
                showScorePop(lineScore, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
            updateScore();
            awardBonusForScore(prevScore);

            if (source === 'tray') {
                renderTray();
                if (pieces.every(p => !p)) {
                    refillTray();
                    if (undoSnapshot) {
                        undoSnapshot.nextPieces = clonePieces(pieces);
                    }
                }
            }

            saveState();

            setTimeout(() => {
                if (checkGameOver()) {
                    finalScoreEl.textContent = score;
                    gameoverEl.classList.remove('hidden');
                } else {
                    gameoverEl.classList.add('hidden');
                }
            }, 400);
        } else if (source === 'shop') {
            openShop();
        }

        dragState = null;
    }

    document.addEventListener('pointermove', (e) => {
        if (!dragState) return;
        e.preventDefault();
        updateDragPos(e.clientX, e.clientY);
    }, { passive: false });

    document.addEventListener('pointerup', (e) => {
        if (!dragState) return;
        endDrag(true);
    });

    document.addEventListener('pointercancel', () => {
        if (!dragState) return;
        endDrag(false);
    });

    restartBtn.addEventListener('click', () => init(false));
    restartBtn2.addEventListener('click', () => init(false));
    undoBtns.forEach(btn => btn.addEventListener('click', undo));

    shopToggleEl.addEventListener('click', openShop);
    shopCloseEl.addEventListener('click', closeShop);
    shopBackdropEl.addEventListener('click', closeShop);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shopDrawerEl.classList.contains('open')) closeShop();
    });

    renderShop();
    init(true);
})();
