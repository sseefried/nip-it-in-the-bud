var Game = function (view) {
  var Antibiotics = { Penicillin: 5, Ciprofloxacin: 10 },
//  var Antibiotics = { Penicillin: 50, Ciprofloxacin: 200 };
      width              = 40,
      height             = width/view.widthInPixels()*view.heightInPixels(),
      germSize           = 1,
      stepsInSecond      = 30,
      timeStep           = 1/stepsInSecond,
      doublingPeriod     = 3, // in seconds (on average)
      resistanceIncrease = 1.1, // multiplier for resistance increase
      gameState,
      fsmHandler; // Finite State Machine handler

  var randomMultiplyTime = function() {
    // +1 is because it cannot be zero
    return Math.round(Math.random() * 2 * doublingPeriod * stepsInSecond) + 1;
  };

  var growthRateForSteps = function(t) {
    return Math.pow(2,1/t);
  }

  var pauseAndShowMessage = function(message) {
    if (gameState.subState.animator) {
      view.unschedule(gameState.subState.animator);
    }
    view.showMessage(message);
    view.setContinueHandler(function() {
      gameState.subState.continueTapped = true;
    })
  };

  //
  // Randomly generates antiobiotics resistance for bacteria
  //
  var antibioticResistances = function() {
    var i, resistances = {}, props = Util.propertiesOf(Antibiotics);
    for (i in props) {
      resistances[props[i]] = (Math.random() < gameState.resistances[props[i]]) ? true : false;
    };
    return resistances;
  };

  //
  // Create a single germ. Not to be confused with 'createGerm' function of GameView
  //
  var createGerm = function(o) {
    var t = randomMultiplyTime(),
        germData = { germId: (gameState.subState.nextGermId += 1),
                     multiplyAt: gameState.subState.step + t,
                     growthRate: growthRateForSteps(t),
                     // either inherent or create for the first time
                     resistances: (o.resistances || antibioticResistances()) },
        germ = view.createGerm(o, germData);
    gameState.subState.germs.push(germ)
    return germ;
  };

  //
  // Create 'n' germs and add to the world.
  //
  var createGerms = function(n) {
    var i;
    for (i=0; i < n; i++) {
      createGerm({x: width/2 + width/2*(Math.random() - 0.5),
                  y: height*3/5 + height/10*(Math.random() - 0.5),
                  r: germSize * (0.8 + Math.random() * 0.4)});
    }
  };

  var multiplyGerms = function() {
    var i, germ, pos, count = 0, r, t, st ;

    for (i in gameState.subState.germs) {
      germ     = gameState.subState.germs[i];
      germData = germ.getData();
      count += 1;

      st = gameState.subState
      if (st.step === germData.multiplyAt) {
        pos = germ.getPos();
        r   = germ.getRadius()/2;
        germ.setRadius(r);
        t = randomMultiplyTime();
        germData.multiplyAt = st.step + t;
        germData.growthRate = growthRateForSteps(t);
        // create new germ. Inherits resistances
        createGerm({x: pos.x+0.2, y: pos.y, r: r, resistances: germData.resistances});
      }
    }
  };

  var failedMessage = function() {
    view.floatingMessage({ pos:       { x: width/2, y: height/5 },
                           color:     "red",
                           modifiers: "bold",
                           font:      "Helvetica",
                           size:       10,
                           message:    "INFECTED!" });
  };

  var successMessage = function() {
    view.floatingMessage({ pos:       { x: width/2, y: height/5 },
                           color:     "green",
                           modifiers: "bold",
                           font:      "Helvetica",
                           size:      7,
                           message:   "Epidemic averted!"
                           });

    view.floatingMessage({ pos:       { x: width/2, y: height*2/5 },
                           color:     "#333333",
                           modifiers: "bold",
                           font:      "Helvetica",
                           size:      4,
                           message:   "Tap to continue" });
  };

  //
  // Increases the size of germs. Should be called on every physics step.
  //
  var growGerms = function() {
    var i, germ, germData;
    for (i in gameState.subState.germs) {
      germ = gameState.subState.germs[i];
      germData = germ.getData();
      germ.setRadius(germ.getRadius()*germData.growthRate);
    }
  };

  var animate = function() {
    fsmHandler(gameState, "levelStep");
    gameState.subState.step += 1;
    multiplyGerms();
    growGerms();
    view.stepPhysics(timeStep);
    view.drawDebugData();
    view.updateScore(gameState.score);
  };

  var resetHandler = function() {
    view.clearMessage();
    view.unbindAllHandlers();
    view.clearAntibioticLinks();
    destroy(); // destroy must come before initGameState()
    initGameState();
    start(1);
  };

  //
  // Inititalise a new level
  //
  var initLevel = function(startingGerms) {
    gameState.subState = { germs:              [],
                           nextGermId:         0,
                           step:               0,
                           animator:           null };
    createGerms(startingGerms);
    gameState.subState.animator = view.schedule(animate, timeStep*1000);
  };

  //
  // getFSMHandler sets up the Finite State Machine for this game
  // and returns the handler.
  //
  // This FSM has two types of FSM events 'levelStep' and 'touch'.
  // The FSM handler should be called with the 'levelStep' event on
  // every physics step, while the 'touch' event should be called
  // whenever there is a 'touch' of any kind.
  //
  var getFSMHandler = function() {

    var killGermsUnderTouches = function(gameState) {
      var i, ts, pos, toDelete = [];
      for ( i in ts = gameState.touches ) {
        pos = ts[i];
        // See if there is collision with germ
        // TODO: I really should be checking a bounding box, but instead
        // I just check every object in the world.
        for (i in gameState.subState.germs) {
          germ = gameState.subState.germs[i];
          if (germ.isAtPos(pos)) {
            toDelete.push(parseInt(i));
            germ.destroy();
            gameState.score += 1;
          }
        }
        gameState.subState.germs = Util.removeArrayElements(gameState.subState.germs, toDelete);
        view.drawDebugData();
      }
    };

    var killGermsWithClickedAntibiotics = function(gameState) {
      var i, j, st, germ, germData, resist, newResist, toDelete = [], antibiotic;
      st = gameState.subState;

      for ( i in gameState.antibioticsClicked) {
        antibiotic = gameState.antibioticsClicked[i];
        for (j in st.germs) {
          germ     = st.germs[j];
          germData = germ.getData();
          if (!germData.resistances[antibiotic]) {
            germ.destroy();
            toDelete.push(parseInt(j));
            gameState.score += 1;
          }
        }

        st.germs = Util.removeArrayElements(st.germs, toDelete);

        // increase the chance that germs are resistant
        resist = gameState.resistances[antibiotic];
        newResist = Math.min(0.99, resist*resistanceIncrease);
        gameState.resistances[antibiotic] = newResist;

        view.updateAntibioticResistance(antibiotic, Util.resistanceString(newResist));

        gameState.antibioticsClicked = []; // clear all
        view.drawDebugData();
      }
    };

    var tooManyGerms = function(gameState) {
      var i, germ, gs, msgNode;

      for (i in gs = gameState.subState.germs ) {
        germ = gs[i];
        if ( germ.getPos().y < height/6 ) {
          view.unschedule(gameState.subState.animator);
          failedMessage();
          gameState.subState = { levelState: gameState.subState };
          return true;
        }
      }
      return false;
    };

    var antibioticUnlockedTransition = function(gameState) {
      var i, ab, abs = Util.propertiesOf(Antibiotics), activated, message;

      for (i in abs) {
        ab = abs[i];
        activated = gameState.activations[ab];
        if (!activated && gameState.score >= Antibiotics[ab]) {
          gameState.activations[ab] = true;
          view.showAntibioticLink(ab);
          pauseAndShowMessage('<p>Antibiotic "'+ ab +'" enabled!</p>' +
          '<p>The percentage next to the antibiotic is the germ\'s natural chance of immunity.</p>' +
          '<p>Each use of an antibiotic will increase the chance of immunity ' +
          'in subsequent levels. Use sparingly!</p>');
          gameState.subState = { continueTapped: false, levelState: gameState.subState };
          return true;
        }
      }
      return false;
    };

    var germsLeftOverTransition = function(gameState) {
      return (gameState.subState.germs.length > 0);
    };

    var noMoreGermsTransition = function(gameState) {
      if ( gameState.subState.germs.length === 0 ) {
        view.unschedule(gameState.subState.animator);
        successMessage();
        gameState.subState = {};
        return true;
      }
      return false;
    };

    var newGameTransition = function(gameState) {
      view.clearMessage();
      for (i in (ss = gameState.subState.levelState.germs)) {
        ss[i].destroy();
      }
      initGameState();
      initLevel(gameState.currentLevel);
      return true;
    };

    var nextLevelTransition = function(gameState) {
      view.clearMessage();
      initLevel(gameState.currentLevel += 1);
      return true;
    };

    var noGermsLeftTransition = function(gameState) {
      if ( gameState.subState.continueTapped &&
           gameState.subState.levelState.germs.length === 0 ) {
        view.clearMessage();
        successMessage();
        return true;
      }
      return false;
    };

    var continueLevelTransition = function(gameState) {
      var handler = function() { };
      if ( gameState.subState.continueTapped &&
           gameState.subState.levelState.germs.length > 0 ) {
        gameState.subState = gameState.subState.levelState;
        view.clearMessage();
        gameState.subState.animator = view.schedule(animate, timeStep*1000);
        return true;
      }
      return false;
    };

    //
    // The Finite State Machine is fully specified here.
    //
    return FSM("fsmState", {
      "levelStep":
        { "level": { conditionals: [ { transition: tooManyGerms,
                                       nextState: "failed"
                                      }]
                   }
        },
      "touch":
        {
          "level":
            { unconditionals: [ killGermsUnderTouches, killGermsWithClickedAntibiotics ],
              conditionals:
                [ { transition: antibioticUnlockedTransition,
                    nextState:  "antibioticUnlocked"
                  },
                  { transition: germsLeftOverTransition,
                    nextState:  "level"
                  },
                  { transition: noMoreGermsTransition,
                    nextState:  "success"
                  }
                ]
            },
          "failed":
            { conditionals:
                [ { transition: newGameTransition,
                    nextState:  "level"
                  }
                ]
            },
          "success":
            { conditionals:
                [ { transition: nextLevelTransition,
                    nextState:  "level"
                  }
                ]
            },
          "antibioticUnlocked":
            { conditionals:
                [ { transition:  noGermsLeftTransition,
                    nextState:   "success"
                  },
                  { transition: continueLevelTransition,
                    nextState:  "level"
                  }
                ]
            }
        }
    });
  };

  var destroy = function() {
    if (gameState.animator) {
      clearTimeout(gameState.animator.animateId);
      gameState.animator = undefined;
    }
    if (gameState.handler) {
      $(document).unbindClickAndTouchstart(gameState.handler);
    }
    view.resetWorld();
  };

  var initGameState = function() {
    var i, props = Util.propertiesOf(Antibiotics), ab;
    gameState = { score:              0,
                  antibioticsClicked: [],
                  resistances:        {},
                  activations:        {},
                  fsmState:           "level",
                  subState:           {},
                  currentLevel:       1 };


    view.clearAntibioticLinks();

    var handler = function(antibiotic) {
      return (function() {
        gameState.antibioticsClicked.push(antibiotic);
      });
    }

    for (i in props) {
      ab = props[i];
      gameState.resistances[ab] = 0.10; // initial resistance chance of 0.10
      gameState.activations[ab] = false;
      view.addAntibioticLink(ab, handler(ab), gameState.resistances);
    }
  };

  var start = function() {
    view.init(width);
    view.createBeaker({x: width/2, y: height/2, width: width*0.9, height: height*2/3,
                       wallWidth: width/40});

    view.updateLevel(1);
    view.unbindAllHandlers();
    view.bindResetHandler(resetHandler);
    fsmHandler = getFSMHandler();
    view.bindTouchHandler(function(touches) {
      gameState.touches = touches;
      fsmHandler(gameState, "touch");
    });

    view.setupDebugDraw();
    initLevel(1);
  };


  initGameState(); // called once when the game object is first created

  return ({
    pauseAndShowMessage:  pauseAndShowMessage,
    start:                start,
    destroy:              destroy
  })

};

/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

jQuery(document).ready(function() {
  var pos = $('#canvas').position(),
      h = $(window).height(),
      w = $(window).width(),
      min = Math.min(w,h),
      leftMargin = Math.round((w - min)/2),
      percent = 0.8;

  $('#canvas').attr('width', min).attr('height', min)
              .css('left', leftMargin)
              .css('top', pos.top*2);
  $('#message').css('left', leftMargin + ((1 - percent)/2)*min)
               .css('top', pos.top*2 + 0.2*min)
               .css('width', min*percent);

  gameView = GameView($, Box2D, '#canvas', jQueryExtend);
  game     = Game(gameView);
//  $('#debug').html("height = " + window.innerHeight);

  game.start(1);
//  game.pauseAndShowMessage("<p>Click on the germs to kill them!</p>");

});

