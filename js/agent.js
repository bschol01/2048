// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    /* if (moved) {
        this.addRandomTile();
    } */
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};

// Selects a move based on the score returned by the expectimax function
Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
	var depth = 0;
	var max = true;
	var runTill = ((brain.grid.availableCells().length - 16) * -1);
	if (runTill > 11) runTill = 11;
	currentMove = this.expectimax(brain, depth, runTill, max);
	brain.reset();
	return currentMove.move;
	
};

// calculate a score for the current grid configuration
Agent.prototype.evaluateGrid = function (brain) {
	
	var x = 0;
	var y = 0;
	var inc = 1;
	var cell = {x, y};
	var score = 0;
	score = brain.score;
	
	 for (y = 0 ; y < 4; y++) {
		for (x = 0 ; x < 4; x++) {
			cell = {x, y};
			if (brain.grid.cellContent(cell) != null) {
					score += Math.log(brain.grid.cellContent(cell).value)/Math.log(2) * -10;
			}
		}
	}
	
	return score;
	
};

// Runs through combinations of moves until the game ends
// or until the max depth is reached, then returns a score
// and move based on the games tested
Agent.prototype.expectimax = function(brain, depth, runTill, max) {
	var score = brain.score;
	score = this.evaluateGrid(brain);
	var move;
	if (brain.over) return {score, move};
	if (depth == runTill) return {score, move};
	var testBrain = new AgentBrain(brain);
	var testScore;
	
	if (max) {
		max = false;
		for (var i = 0; i < 4; i++) {
			
			testBrain = new AgentBrain(brain);
			if (testBrain.move(i)) {
			testScore = this.expectimax(testBrain, depth + 1, runTill, max);
			if (testScore.score >= score) {
				score = testScore.score;
				move = i;
			}
			}
			testBrain.reset();
		}
	} else {
		max = true;
		
		var spaces = brain.grid.availableCells();
			testBrain = new AgentBrain(brain);
			testBrain = this.getTile(testBrain)
			testScore = this.expectimax(testBrain, depth + 1, runTill, max);
			if (testScore.score >= score) {
				score = testScore.score;
			}
			
			testBrain.reset();
			
	}
		
	return {score: score, move : move};
		
};

// Predicts the next tile
Agent.prototype.getTile = function(brain) {
	if (brain.grid.cellsAvailable()) {
		
		var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(brain.grid.randomAvailableCell(), value);
        brain.grid.insertTile(tile);
		return brain;
    }
};
