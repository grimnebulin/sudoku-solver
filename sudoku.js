(function () {

    var DELAY = 0;

    $(function () {
        $("#board input").val("");
        $("#solve-button").click(solve);
        $("#stop-button").click(stop);
        $("#reset-button").click(reset)[0].disabled = true;
        $("#fast-speed, #slow-speed").change(function () {
            DELAY = $("#fast-speed").is(":checked") ? 0 : 100;
        });
        done();
    });

    var stack;
    var strategy;
    var startCells;
    var timeoutId;

    function schedule() {
        $("#stack-depth").text(stack.size());
        timeoutId = setTimeout(solveStep, DELAY);
    }

    function cell(x, y) {
        return $("#cell" + x + y);
    }

    function solve() {
        startCells = readCells();
        stack = new Stack();
        stack.push(new Board(startCells.slice(0)));
        strategy = $("#random-strategy").is(":checked")
            ? STRATEGY.RANDOM : STRATEGY.DETERMINISTIC;
        $("#reset-button")[0].disabled = false;
        $("#board input").unbind("mouseover");
        schedule();
    }

    function stop() {
        clearTimeout(timeoutId);
    }

    function reset() {
        clearTimeout(timeoutId);
        $("#stack-depth").text("0");
        for (var y = 0; y < 9; ++y) {
            for (var x = 0; x < 9; ++x) {
                var value = startCells[x + 9 * y];
                cell(x, y).val(value == 0 ? "" : value);
            }
        }
    }

    function done() {
        stack = null;
        $("#board input").mouseover(function () { $(this).focus() });
    }

    function solveStep() {
        var frame = stack.top();

        if (!frame.started()) {
            var trial = analyze(frame.board());
            if (trial === false) {
                stack.pop();
            } else if (trial === undefined) {
                done();
                return;
            } else {
                stack.push(frame.start(trial));
            }
        } else if (frame.isEmpty()) {
            stack.pop();
        } else {
            stack.push(frame.nextBoard());
        }

        schedule();

    }

    function analyze(board) {
        var result;
        var minLen = 10;
        var chooser = strategy.chooser();

        for (var x = 0; x < 9; ++x) {
            for (var y = 0; y < 9; ++y) {
                if (board.isUndetermined(x, y)) {
                    var choices = board.couldBe(x, y);
                    if (choices.length == 0) {
                        return false;
                    }
                    var trial = { x: x, y: y, choices: choices };
                    if (choices.length < minLen) {
                        result = trial;
                        minLen = choices.length;
                        chooser.reset();
                    } else if (choices.length == minLen && chooser.keep()) {
                        result = trial;
                    }
                }
            }
        }

        return result;

    }

    function readCells() {
        var cells = [ ];
        var n = 0;
        cells.length = 81;

        for (var y = 0; y < 9; ++y) {
            for (var x = 0; x < 9; ++x) {
                var entry = cell(x, y).val();
                if (/^[1-9]?$/.test(entry)) {
                    if (entry == "") {
                        cell(x, y).addClass("unspecified");
                        entry = 0;
                    } else {
                        entry = parseInt(entry, 10);
                    }
                } else {
                    throw "invalid entry";
                }
                cells[n++] = entry;
            }
        }

        return cells;

    }

    function Board(cells) {

        var set = [ ];

        this.isUndetermined = function (x, y) {
            return cells[x + 9 * y] == 0;
        };

        this.set = function (x, y, n) {
            cells[x + 9 * y] = n;
            set.push(cell(x, y).val(n)[0]);
            return this;
        };

        this.clone = function () {
            return new Board(cells.slice(0));
        };

        this.undo = function () {
            $(set).val("");
        };

        this.couldBe = function (x, y) {
            var list = [ true, true, true, true, true, true, true, true, true, true ];
            var i, n;

            for (i = x, n = 0; n < 9; i += 9, ++n) {
                list[cells[i]] = false;
            }

            for (i = 9 * y, n = 0; n < 9; ++i, ++n) {
                list[cells[i]] = false;
            }

            i = (x - x % 3) + 9 * (y - y % 3);

            for (n = 0; n < 3; i += 9, ++n) {
                list[cells[i]] = list[cells[i + 1]] = list[cells[i + 2]] = false;
            }

            var arr = [ ];
            for (var i = 1; i <= 9; ++i) {
                if (list[i]) arr.push(i);
            }

            return arr;

        };
    }

    function Stack() {

        var stack = [ ];

        this.push = function (board) {
            stack.push(new Frame(board));
        };

        this.pop = function () {
            stack.pop().board().undo();
        };

        this.top = function () {
            return stack[stack.length - 1];
        };

        this.size = function () {
            return stack.length;
        };

    }

    function Frame(board) {

        var x = -1, y = -1;
        var choices;

        this.board = function () {
            return board;
        };

        this.started = function () {
            return x != -1;
        };

        this.start = function (trial) {
            x       = trial.x;
            y       = trial.y;
            choices = trial.choices;
            return this.nextBoard();
        };

        this.isEmpty = function () {
            return choices.length == 0;
        };

        this.nextBoard = function () {
            return board.clone().set(x, y, strategy.removeOne(choices));
        };

    }

    function random(n) {
        return Math.random() * n;
    }

    var STRATEGY = {
        RANDOM: {
            chooser: function () {
                var n = 0;
                return {
                    reset: function () { n = 0 },
                    keep:  function () { return random(++n) < 1 }
                };
            },
            removeOne: function (array) {
                return array.splice(random(array.length), 1)[0];
            }
        },
        DETERMINISTIC: {
            chooser: function () {
                return {
                    reset: function () { },
                    keep:  function () { return true }
                };
            },
            removeOne: function (array) {
                return array.pop();
            }
        }
    };

})();
