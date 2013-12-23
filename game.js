var Game = function (view) {
  var Antibiotics = { Penicillin: 10, Ciprofloxacin: 20 };
//  var Antibiotics = { Penicillin: 50, Ciprofloxacin: 200 };
  var width = 40;
  var height = width/view.widthInPixels()*view.heightInPixels();
  var gameState;
  var germSize = 1;
  var stepsInSecond = 30;
  var timeStep = 1/stepsInSecond;
  var doublingPeriod = 3; // in seconds (on average)
  var resistanceIncrease = 1.1; // multiplier for resistance increase
  var Condition = { continuing: 0, failed: 1, success: 2};

  var killGermsWithAntibiotic = function(antibiotic) {
    return (function() {
      var i, germ, germData, resist, newResist, toDelete = [];

      for (i in gameState.germs) {
        germ     = gameState.germs[i];
        germData = germ.getData();
        if (!germData.resistances[antibiotic]) {
          germ.destroy();
          toDelete.push(parseInt(i));
          gameState.score += 1;
        }
      }

      gameState.germs = Util.removeArrayElements(gameState.germs, toDelete);

      // increase the chance that germs are resistant
      resist = gameState.resistances[antibiotic];
      newResist = Math.min(0.99, resist*resistanceIncrease);
      gameState.resistances[antibiotic] = newResist;

      view.updateAntibioticResistance(antibiotic, Util.resistanceString(newResist));

      if (gameState.germs.length === 0 ) {
        gameState.condition = Condition.success;
      }

    });
  };

  var randomMultiplyTime = function() {
    // +1 is because it cannot be zero
    return Math.round(Math.random() * 2 * doublingPeriod * stepsInSecond) + 1;
  };

  var growthRateForSteps = function(t) {
    return Math.pow(2,1/t);
  }

  var pauseAndShowMessage = function(message) {
    if (gameState.animator) {
      view.unschedule(gameState.animator);
    }

    if (gameState.handler) {
      // This will be unnecessary once we've got one big handler.
      view.unbindHandler(gameState.handler);
    }

    view.showMessage(message);

    var handler = function(e) {
      view.clearMessage();
      if (gameState.animator) {
        view.reschedule(gameState.animator);
      }
      view.setContinueAction(handler, gameState.handler);
    };

    view.installContinueHandler(handler);
  };

  var bindGameHandler = function(handler) {
    view.bindHandler(handler);
    gameState.handler = handler;
  };


  var clickToStartNewGame = function() {
    var handler =function() {
      destroy();
      start(gameState.startingGerms + 1);
    };
    view.bindHandler(handler);
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

  var createGerm = function(o) {
    var t = randomMultiplyTime(),
        germData = { germId: (gameState.nextGermId += 1),
                     multiplyAt: gameState.step + t,
                     growthRate: growthRateForSteps(t),
                     // either inherent or create for the first time
                     resistances: (o.resistances || antibioticResistances()) },
        germ = view.createGerm(o, germData);
    gameState.germs.push(germ)
    return germ;
  };

  var createGerms = function(n) {
    var i;
    for (i=0; i < n; i++) {
      createGerm({x: width/2 + width/2*(Math.random() - 0.5),
                  y: height*3/5,
                  r: germSize * (0.8 + Math.random() * 0.4)});
    }
  };


  var killGermAtPos = function(pos) {
    var i, germ, numGerms = 0, toDelete = [];
        // TODO: I really should be checking a bounding box, but instead
        // I just check every object in the world.
    for (i in gameState.germs) {
      germ = gameState.germs[i];
      if (germ.isAtPos(pos)) {
        toDelete.push(parseInt(i));
        germ.destroy();
        gameState.score += 1;
      } else {
        numGerms += 1; // still alive
      }
    }

    gameState.germs = Util.removeArrayElements(gameState.germs, toDelete);

    if (numGerms === 0) {
      gameState.condition = Condition.success;
    }

  };

  var multiplyGerms = function() {
    var i, germ, pos, count = 0, r, t;

    for (i in gameState.germs) {
      germ     = gameState.germs[i];
      germData = germ.getData();
      count += 1;
      if (germ.getPos().y < height/6) {
        gameState.condition = Condition.failed;
      }

      if (gameState.step === germData.multiplyAt) {
        pos = germ.getPos();
        r   = germ.getRadius()/2;
        germ.setRadius(r);
        t = randomMultiplyTime();
        germData.multiplyAt = gameState.step + t;
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

  var growGerms = function() {
    var i, germ, germData;
    for (i in gameState.germs) {
      germ = gameState.germs[i];
      germData = germ.getData();
      germ.setRadius(germ.getRadius()*germData.growthRate);
    }
  };

  var animate = function() {
    gameState.step += 1;

    view.stepPhysics(timeStep);
    view.drawDebugData();

    multiplyGerms();
    view.updateScore(gameState.score);

    if (!checkAndEnableAntibiotics()) {

      switch (gameState.condition) {
        case Condition.continuing:
          growGerms();
          gameState.animator = view.schedule(animate, timeStep*1000);
          break;
        case Condition.failed:
          failedMessage();
          break;
        case Condition.success:
          successMessage();
          clickToStartNewGame();
          break;
      }
    }
  };


  var checkAndEnableAntibiotics = function() {
    var i, ab, abs = Util.propertiesOf(Antibiotics);
    for (i in abs) {
      ab = abs[i];
      if (!gameState.activations[ab] && gameState.score >= Antibiotics[ab]) {
        gameState.activations[ab] = true;
        view.showAntibioticLink(ab);
        pauseAndShowMessage('<p>Antibiotic "'+ ab +'" enabled!</p>' +
          '<p>The percentage next to the antibiotic is the germ\'s natural chance of immunity.</p>' +
          '<p>Each use of an antibiotic will increase the chance of immunity ' +
          'in subsequent levels. Use sparingly!</p>');
        return true;
      }
    }
    return false;
  }

  var resetHandler = function() {
    view.clearMessage();
    view.unbindAllHandlers();
    view.clearAntibioticLinks();
    destroy(); // destroy must come before initGameState()
    initGameState();
    start(1);
  };


  var start = function(startingGerms) {
    view.init(width);
    startingGerms = startingGerms || 1;

    gameState.step = 0;
    gameState.condition = Condition.continuing;
    gameState.startingGerms = startingGerms;

    view.createBeaker({x: width/2, y: height/2, width: width*0.9, height: height*2/3,
                       wallWidth: width/40});
    createGerms(startingGerms);

    view.updateLevel(startingGerms);

    view.unbindAllHandlers();
    view.bindResetHandler(resetHandler);
    view.bindPosHandler(killGermAtPos);

    view.setupDebugDraw();
    animate();

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
    gameState = { score: 0, resistances: {}, activations: {},
                  germs: [], nextGermId: 0 };

    view.clearAntibioticLinks();

    for (i in props) {
      ab = props[i];
      gameState.resistances[ab] = 0.10; // initial resistance chance of 0.10
      gameState.activations[ab] = false;
      view.addAntibioticLink(ab, killGermsWithAntibiotic(ab), gameState.resistances);
    }
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
  game.pauseAndShowMessage("<p>Click on the germs to kill them!</p>");

});

