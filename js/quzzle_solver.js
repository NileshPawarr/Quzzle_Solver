
$(document).ready(() => {
  let blocks = [
    { "type": 4, "row": 0, "col": 0 },
    { "type": 3, "row": 0, "col": 2 },
    { "type": 2, "row": 1, "col": 2 },
    { "type": 2, "row": 1, "col": 3 },
    { "type": 2, "row": 3, "col": 0 },
    { "type": 3, "row": 3, "col": 1 },
    { "type": 1, "row": 3, "col": 3 },
    { "type": 3, "row": 4, "col": 1 },
    { "type": 1, "row": 4, "col": 3 }
  ],
    quzzleSolver = new QuzzleSolver(blocks);


  quzzleSolver.renderQuzzleUI(blocks);

});


(() => {

  'use strict';

  const BLOCK = {
    SMALL_BLOCK: 1,
    VERTICAL_BLOCK: 2,
    HORIZONTAL_BLOCK: 3,
    BOX_BLOCK: 4
  },

    MAX_DIRECTION = 4,
    MAX_WARRIOR_TYPE = 5,

    GAME_ROW = 5,
    GAME_COL = 4,
    GAME_BOARD_WIDTH = GAME_COL + 2,
    GAME_BOARD_HEIGHT = GAME_ROW + 2,

    GOAL_STATE_ROW = 0,
    GOAL_STATE_COL = 2,

    EMPTY_CELL = 0,
    CELL_BORDER = -1,
    BLOCK_UNIT_SIZE = 70;

  function QuzzleSolver(blocks) {
    /**
     * Private variables
     */
    const directions = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }],
      directionName = ['Down', 'Right', 'Up', 'Left'];
    let zobrist_hash;

    this.blocks = blocks;
    this.isGoalState = false;

    /**
     * 
     * @param {Array} blocks 
     * Render UI for Quzzle
     */
    this.renderQuzzleUI = (blocks) => {
      const $container = $('.quzzle-container');

      for (let i = 0; i < blocks.length; i++) {
        $container.append("<div id='block-" + (i + 1) + "' class='block block-type-" + blocks[i].type + "'>" + (i + 1) + "</div>");
        let $e = $container.find("#block-" + (i + 1));
        $e.css("left", blocks[i].col * (BLOCK_UNIT_SIZE));
        $e.css("top", blocks[i].row * (BLOCK_UNIT_SIZE));
      }

      //Event bindings
      $('.solve-quzzle').on('click', findSolution.bind(this));
      $('.play-quzzle').on('click', playToGoal.bind(this));

    };

    /**
     * Find Solution for Quzzle
     */
    function findSolution() {
      if (!this.result) {
        this.result = solve(this.blocks);
        renderMoves(this.result);
      }
    };

    /**
     * @param {Array} result
     * render moves list
     */
    function renderMoves(result) {
      let $ul = $('<ol/>', { class: "moves-list-container" }),
        $movesContainer = $('.moves-container'),
        thisRef = this,
        prevStep = -1,
        $li = null,
        str = '',
        count = 0;
      result = result.slice().reverse();
      $.each(result, (index, move) => {

        if (prevStep === move.step) {
          str += ' ' + directionName[move.directionIndex];
        }
        else {
          $li = $('<li/>')
            .addClass('move-' + count)
            .appendTo($ul);
          str = (move.blockIndex + 1) + ' ' + directionName[move.directionIndex];
          prevStep = move.step;
          count++;
        }
        $li.text(str);
      });
      $movesContainer.append($ul);
    }

    /**
     * @param {Array} blocks 
     * Entry function to create and solve quzzle
     */

    function solve(blocks) {

      let game = createGame(blocks);

      if (game) {
        if (resolveGame(game)) {
          return game.result.moves;
        }
      }

      return null;
    };

    /**
     * @param {Array} blocks 
     * create empty state for game
     */
    function createGame(blocks) {
      let game = {
        targetBlockId: 0,
        states: [],
        zhash: {},
        result: {
          time: null,
          moves: [],
        },
      },

        state = {
          board: [],
          blocks: [],
          move: {
            blockIndex: 0,
            directionIndex: 0,
          },
          step: 0,
          hash: 0,
          parent: null,
        },
        block = {};

      initZobristHash();
      initGameStateBoard(state);

      state.parent = null;
      state.step = 0;
      state.move.blockIndex = 0;
      state.move.directionIndex = 0;

      if (!blocks || blocks.length === 0) {
        return null;
      }

      if (typeof blocks[0] === 'object') {
        for (let i = 0; i < blocks.length; i++) {
          block = {
            type: blocks[i].type,
            row: blocks[i].row,
            col: blocks[i].col,
          };

          if (blocks[i].type === 4) {
            game.targetBlockId = i;
          }

          if (!addBlockToGameState(state, i, block)) {
            return null;
          }
        }
      } else {
        return null;
      }

      state.hash = getZobristHash(state);

      game.states.push(state);

      return game;
    }

    /**
     * initialize zobrish hash table
     */
    function initZobristHash() {
      let i, j;

      zobrist_hash = { key: [] };

      for (i = 0; i < GAME_ROW; i++) {
        zobrist_hash.key[i] = [];

        for (j = 0; j < GAME_COL; j++) {
          zobrist_hash.key[i][j] = { value: [] };
          createCellState(zobrist_hash.key[i][j]);
        }
      }
    }
    
    /**
     * @param {object} cell 
     * create and assign 4(number of blocks) hash value to each cell
     */
    function createCellState(cell) {
      for (let i = 0; i < MAX_WARRIOR_TYPE; i++) {
        cell.value[i] = random32();
      }
    }

    /**
     * generate random 32 bit integer
     */
    function random32() {
      let tmp = 0;

      do {
        tmp = Math.floor(Math.random() * Math.pow(2, 31));
      } while (!tmp);

      return parseInt(tmp);
    }

    /**
     * 
     * @param {object} state 
     * initialize game state board
     */
    function initGameStateBoard(state) {
      let i, j;

      for (i = 0; i < GAME_BOARD_HEIGHT; i++) {
        state.board[i] = [];
        for (j = 0; j < GAME_BOARD_WIDTH; j++) {
          state.board[i][j] = EMPTY_CELL;
        }
      }

      for (i = 0; i < GAME_BOARD_WIDTH; i++) {
        state.board[0][i] = CELL_BORDER;
        state.board[GAME_BOARD_HEIGHT - 1][i] = CELL_BORDER;
      }

      for (i = 1; i < GAME_BOARD_HEIGHT - 1; i++) {
        state.board[i][0] = CELL_BORDER;
        state.board[i][GAME_BOARD_WIDTH - 1] = CELL_BORDER;
      }
    }

    /**
     * 
     * @param {Object} state 
     * @param {Number} blockIndex 
     * @param {Object} block 
     */
    function addBlockToGameState(state, blockIndex, block) {
      if (isPositionAvailable(state, block.type, block.row, block.col)) {
        takePosition(state, blockIndex, block.type, block.row, block.col);
        state.blocks.push(block);
        return true;
      }
      return false;
    }

    /**
     * Check for position available in passed state at given coordinates
     * @param {Object} state 
     * @param {Number} type 
     * @param {Number} row 
     * @param {Number} col 
     */
    function isPositionAvailable(state, type, row, col) {
      let isOK = false;

      switch (type) {
        case BLOCK.SMALL_BLOCK:
          isOK = state.board[row + 1][col + 1] === EMPTY_CELL;
          break;
        case BLOCK.VERTICAL_BLOCK:
          isOK =
            state.board[row + 1][col + 1] === EMPTY_CELL && state.board[row + 2][col + 1] === EMPTY_CELL;
          break;
        case BLOCK.HORIZONTAL_BLOCK:
          isOK =
            state.board[row + 1][col + 1] === EMPTY_CELL && state.board[row + 1][col + 2] === EMPTY_CELL;
          break;
        case BLOCK.BOX_BLOCK:
          isOK =
            state.board[row + 1][col + 1] === EMPTY_CELL &&
            state.board[row + 1][col + 2] === EMPTY_CELL &&
            state.board[row + 2][col + 1] === EMPTY_CELL &&
            state.board[row + 2][col + 2] === EMPTY_CELL;
          break;
        default:
          isOK = false;
          break;
      }

      return isOK;
    }

    /**
     * Move block to position available in passed state at given coordinates 
     * @param {Object} state 
     * @param {Number} blockIndex 
     * @param {Number} type 
     * @param {Number} row 
     * @param {Number} col 
     */
    function takePosition(state, blockIndex, type, row, col) {
      switch (type) {
        case BLOCK.SMALL_BLOCK:
          state.board[row + 1][col + 1] = blockIndex + 1;
          break;
        case BLOCK.VERTICAL_BLOCK:
          state.board[row + 1][col + 1] = blockIndex + 1;
          state.board[row + 2][col + 1] = blockIndex + 1;
          break;
        case BLOCK.HORIZONTAL_BLOCK:
          state.board[row + 1][col + 1] = blockIndex + 1;
          state.board[row + 1][col + 2] = blockIndex + 1;
          break;
        case BLOCK.BOX_BLOCK:
          state.board[row + 1][col + 1] = blockIndex + 1;
          state.board[row + 1][col + 2] = blockIndex + 1;
          state.board[row + 2][col + 1] = blockIndex + 1;
          state.board[row + 2][col + 2] = blockIndex + 1;
          break;
        default:
          break;
      }
    }

    /**
     * @param {Number} prevDirection
     * @param {Number} newDirection
     * check for reverse direction 
     */
    function isReverseDirection(prevDirection, newDirection) {
      return (prevDirection + 2) % MAX_DIRECTION === newDirection;
    }

    /**     
     * @param {Object} gameState
     * create copy of state passed as parameter 
     */
    function copyGameState(gameState) {
      let newBoard = [],
        newBlocks = [];

      for (let i = 0; i < GAME_BOARD_HEIGHT; i++) {
        newBoard[i] = gameState.board[i].slice(0);
      }


      for (let i = 0; i < gameState.blocks.length; i++) {
        newBlocks[i] = {
          type: gameState.blocks[i].type,
          row: gameState.blocks[i].row,
          col: gameState.blocks[i].col,
        };
      }

      let newState = {
        board: newBoard,
        blocks: newBlocks,
        move: {
          blockIndex: gameState.move.blockIndex,
          directionIndex: gameState.move.directionIndex,
        },
        step: gameState.step,
        hash: gameState.hash,
        parent: gameState.parent,
      };

      return newState;
    }

    /**
     * @param {Object} gameState
     * return hash value of state passed as parameter 
     */
    function getZobristHash(gameState) {
      let i, j,
        hash = 0,
        blocks = gameState.blocks;

      for (i = 1; i <= GAME_ROW; i++) {
        for (j = 1; j <= GAME_COL; j++) {
          var index = gameState.board[i][j] - 1;
          var type = index >= 0 && index < blocks.length ? blocks[index].type : 0;
          hash ^= zobrist_hash.key[i - 1][j - 1].value[type];
        }
      }

      return hash;
    }

    /**
     * @param {Object} gameState
     * @param {Number} blockIndex
     * @param {Number} directionId
     * return updated hash value of state after move 
     */
    function getUpdatedZobristHash(gameState, blockIndex, directionId) {
      let hash = gameState.hash,
        block = gameState.blocks[blockIndex],
        row = block.row,
        type = block.type,
        col = block.col,
        dir = directions[directionId];

      switch (block.type) {
        case BLOCK.SMALL_BLOCK:
          // Clear the old position
          hash ^= zobrist_hash.key[row][col].value[type];
          // Take the new position
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x].value[type];
          break;
        case BLOCK.VERTICAL_BLOCK:
          // Clear the old position
          hash ^= zobrist_hash.key[row][col].value[type];
          hash ^= zobrist_hash.key[row + 1][col].value[type];
          // Take the new position
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x].value[type];
          hash ^= zobrist_hash.key[row + dir.y + 1][col + dir.x].value[type];
          break;
        case BLOCK.HORIZONTAL_BLOCK:
          // Clear the old position
          hash ^= zobrist_hash.key[row][col].value[type];
          hash ^= zobrist_hash.key[row][col + 1].value[type];
          // Take the new position
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x].value[type];
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x + 1].value[type];
          break;
        case BLOCK.BOX_BLOCK:
          // Clear the old position
          hash ^= zobrist_hash.key[row][col].value[type];
          hash ^= zobrist_hash.key[row][col + 1].value[type];
          hash ^= zobrist_hash.key[row + 1][col].value[type];
          hash ^= zobrist_hash.key[row + 1][col + 1].value[type];
          // Take the new position
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x].value[type];
          hash ^= zobrist_hash.key[row + dir.y][col + dir.x + 1].value[type];
          hash ^= zobrist_hash.key[row + dir.y + 1][col + dir.x].value[type];
          hash ^= zobrist_hash.key[row + dir.y + 1][col + dir.x + 1].value[type];
          break;
      }

      return hash;
    }

    /**
     * 
     * @param {Object} state 
     * @param {Number} blockIndex 
     * @param {Number} directionIndex 
     */
    function isMovable(state, blockIndex, directionIndex) {
      let cv1, cv2, cv3, cv4,
        canMove = false,
        block = state.blocks[blockIndex],
        dir = directions[directionIndex];

      switch (block.type) {
        case BLOCK.SMALL_BLOCK:
          canMove = state.board[block.row + dir.y + 1][block.col + dir.x + 1] == EMPTY_CELL;
          break;
        case BLOCK.VERTICAL_BLOCK:
          cv1 = state.board[block.row + dir.y + 1][block.col + dir.x + 1];
          cv2 = state.board[block.row + dir.y + 2][block.col + dir.x + 1];
          canMove =
            (cv1 == EMPTY_CELL || cv1 == blockIndex + 1) && (cv2 == EMPTY_CELL || cv2 == blockIndex + 1);
          break;
        case BLOCK.HORIZONTAL_BLOCK:
          cv1 = state.board[block.row + dir.y + 1][block.col + dir.x + 1];
          cv2 = state.board[block.row + dir.y + 1][block.col + dir.x + 2];
          canMove =
            (cv1 == EMPTY_CELL || cv1 == blockIndex + 1) && (cv2 == EMPTY_CELL || cv2 == blockIndex + 1);
          break;
        case BLOCK.BOX_BLOCK:
          cv1 = state.board[block.row + dir.y + 1][block.col + dir.x + 1];
          cv2 = state.board[block.row + dir.y + 2][block.col + dir.x + 1];
          cv3 = state.board[block.row + dir.y + 1][block.col + dir.x + 2];
          cv4 = state.board[block.row + dir.y + 2][block.col + dir.x + 2];
          canMove =
            (cv1 == EMPTY_CELL || cv1 == blockIndex + 1) &&
            (cv2 == EMPTY_CELL || cv2 == blockIndex + 1) &&
            (cv3 == EMPTY_CELL || cv3 == blockIndex + 1) &&
            (cv4 == EMPTY_CELL || cv4 == blockIndex + 1);
          break;
        default:
          canMove = false;
          break;
      }

      return canMove;
    }

    /**
     * 
     * @param {Object} state 
     * @param {Number} type 
     * @param {Number} row 
     * @param {Number} col 
     */
    function clearPosition(state, type, row, col) {
      switch (type) {
        case BLOCK.SMALL_BLOCK:
          state.board[row + 1][col + 1] = EMPTY_CELL;
          break;
        case BLOCK.VERTICAL_BLOCK:
          state.board[row + 1][col + 1] = EMPTY_CELL;
          state.board[row + 2][col + 1] = EMPTY_CELL;
          break;
        case BLOCK.HORIZONTAL_BLOCK:
          state.board[row + 1][col + 1] = EMPTY_CELL;
          state.board[row + 1][col + 2] = EMPTY_CELL;
          break;
        case BLOCK.BOX_BLOCK:
          state.board[row + 1][col + 1] = EMPTY_CELL;
          state.board[row + 1][col + 2] = EMPTY_CELL;
          state.board[row + 2][col + 1] = EMPTY_CELL;
          state.board[row + 2][col + 2] = EMPTY_CELL;
          break;
        default:
          break;
      }
    }


    /**
     * Get all moves for game
     * @param {Object} game 
     * @param {Object} gameState 
     */
    function getMovesRecords(game, gameState) {
      let state = gameState;
      while (state) {
        if (state.step > 0) {
          let move = {
            step: state.step,
            blockIndex: state.move.blockIndex,
            directionIndex: state.move.directionIndex,
          };
          game.result.moves.push(move);
        }
        state = state.parent;
      }
    }

    /**
     * check for goal state of game
     * @param {Object} game 
     * @param {Object} gameState 
     */
    function isGoalState(game, gameState) {
      let block = gameState.blocks[game.targetBlockId];
      return block.row === GOAL_STATE_ROW && block.col === GOAL_STATE_COL;
    }


    function resolveGame(game) {
      let index = 0;

      while (index < game.states.length) {
        let gameState = game.states[index++];

        game.zhash[gameState.hash] = true;

        if (isGoalState(game, gameState)) {
          getMovesRecords(game, gameState);
          return true;
        } else {
          searchNewGameStates(game, gameState);
        }
      }

      return false;
    }

    /**
     * Search for new game state
     * @param {Object} game 
     * @param {Object} gameState 
     */
    function searchNewGameStates(game, gameState) {
      for (let i = 0; i < gameState.blocks.length; i++) {
        for (let j = 0; j < MAX_DIRECTION; j++) {
          trySearchBlockNewState(game, gameState, i, j);
        }
      }
    }

    /**
     * Search for new move/game state
     * @param {Object} game 
     * @param {Object} gameState 
     * @param {Number} blockIndex 
     * @param {Number} directionIndex 
     */
    function trySearchBlockNewState(game, gameState, blockIndex, directionIndex) {
      let newState = moveBlockToNewState(game, gameState, blockIndex, directionIndex);

      if (newState) {
        if (addNewStatePattern(game, newState)) {
          tryBlockContinueMove(game, newState, blockIndex, directionIndex);
          return;
        }
      }
    }

    /**
     * move block and create new state
     * @param {Object} game 
     * @param {Object} gameState 
     * @param {Number} blockIndex 
     * @param {Number} directionIndex 
     */
    function moveBlockToNewState(game, gameState, blockIndex, directionIndex) {
      if (isMovable(gameState, blockIndex, directionIndex)) {
        let hash = getUpdatedZobristHash(gameState, blockIndex, directionIndex);
        if (game.zhash[hash]) {
          return null;
        }

        let newState = copyGameState(gameState),
          block = newState.blocks[blockIndex],
          dir = directions[directionIndex];

        clearPosition(newState, block.type, block.row, block.col);
        takePosition(newState, blockIndex, block.type, block.row + dir.y, block.col + dir.x);

        block.row = block.row + dir.y;
        block.col = block.col + dir.x;

        newState.blocks[blockIndex] = block;

        newState.step = gameState.step + 1;
        newState.parent = gameState;
        newState.move.blockIndex = blockIndex;
        newState.move.directionIndex = directionIndex;

        newState.hash = hash;


        return newState;
      }

      return null;
    }

    /**
     * Push game state hash in an states Array
     * @param {Object} game 
     * @param {Object} gameState 
     */
    function addNewStatePattern(game, gameState) {

      if (game.zhash[gameState.hash]) {
        return false;
      }
      game.zhash[gameState.hash] = true;

      game.states.push(gameState);

      return true;
    }

    /**
     * try next possible move for block
     * @param {Object} game
     * @param {Object} gameState
     * @param {Number} blockIndex
     * @param {Number} prevDirectionIndex
     */
    function tryBlockContinueMove(game, gameState, blockIndex, prevDirectionIndex) {
      for (let d = 0; d < MAX_DIRECTION; d++) {
        if (!isReverseDirection(d, prevDirectionIndex)) {
          let newState = moveBlockToNewState(game, gameState, blockIndex, d);
          if (newState) {
            if (addNewStatePattern(game, newState)) {
              newState.step--;
            }
          }
        }
      }
    }


    /**
     * Play Quzzle moves animation till Goal state
     */
    function playToGoal() {
      if (this.result) {
        if (this.isGoalState) {
          alert("You are already on Goal state!");
        } else {
          let resultCopy = this.result.slice();
          playBlock(resultCopy.pop(), resultCopy, this, 0);
        }
      } else {
        alert("Please find solution to play!");
      }
    }

    /**
     * 
     * @param {Object} step 
     * @param {Array} allSteps 
     * @param {Context} thisRef 
     * @param {Number} index 
     * @param {Object} prevStep 
     */
    function playBlock(step, allSteps, thisRef, index, prevStep) {
      let $block = $('#block-' + (step.blockIndex + 1)),
        animateObj = {},
        blockTop = parseInt($block.css('top').replace('px', '')),
        blockLeft = parseInt($block.css('left').replace('px', '')),
        $move = $('.move-' + index).addClass('highlight');

      switch (step.directionIndex) {
        case 0://Down
          animateObj.top = blockTop + BLOCK_UNIT_SIZE + 'px';
          break;
        case 1://Right
          animateObj.left = blockLeft + BLOCK_UNIT_SIZE + 'px';
          break;
        case 2://Up
          animateObj.top = blockTop - BLOCK_UNIT_SIZE + 'px';
          break;
        case 3://Left
          animateObj.left = blockLeft - BLOCK_UNIT_SIZE + 'px';
          break;
      }


      $block.animate(animateObj, 500, () => {

        if (allSteps.length) {
          if (allSteps[allSteps.length - 1].step !== step.step) {
            $('.move-' + index).removeClass('highlight');
            if (index < 50) {
              $('html, body').animate({
                scrollTop: $move.offset().top - 10
              }, 500);
            }
            index += 1;
          }
          playBlock(allSteps.pop(), allSteps, thisRef, index, step);
        }
        else {
          $('.move-' + index).removeClass('highlight');
          thisRef.isGoalState = true;
        }
      });
    }


  }


  // Browser main thread
  window.QuzzleSolver = QuzzleSolver;

})();





