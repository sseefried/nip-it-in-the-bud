var Game = function ($, canvasSelector, view) {
  jQueryExtend($); //
  var Antibiotics = { Penicillin: 2, Ciprofloxacin: 5 };
//  var Antibiotics = { Penicillin: 50, Ciprofloxacin: 200 };

  // sseefried: I don't want to use magic numbers in my code, so I'm defining the
  //   width and height for now. FIXME: get this directly from the canvas.
  var canvas = $(canvasSelector)[0]; // FIXME: remove
  var widthInPixels  = $(canvas).width(); // FIXME: remove
  var heightInPixels = $(canvas).height(); // FIXME: remove

  var width = 40;
  var height = heightInPixels/widthInPixels * width;

  var scale = widthInPixels/width; // world is 40m wide

  var gameState;
  var germSize = 1;

  var stepsInSecond = 30;
  var timeStep = 1/stepsInSecond;

  var doublingPeriod = 3; // in seconds

  var resistanceIncrease = 1.1; // multiplier for resistance increase

  var velocityIterations = 8;
  var positionIterations = 100;

  var Condition = { continuing: 0, failed: 1, success: 2};

  var killGermsWithAntibiotic = function(antibiotic) {

    return (function() {
      var i, germ, germData, resist, newResist, toDelete = [];

      for (i in gameState.germs) {
        germ     = gameState.germs[i];
        germData = view.getGermData(germ);
        if (!germData.resistances[antibiotic]) {
          view.destroyGerm(germ);
          toDelete.push(parseInt(i));
          gameState.score += 1;
        }
      }

      Util.deleteArrayElements(gameState.germs, toDelete);

      // increase the chance that germs are resistant
      resist = gameState.resistances[antibiotic];
      newResist = Math.min(0.99, resist*resistanceIncrease);
      gameState.resistances[antibiotic] = newResist;
      $('#' + antibiotic + '-resistance').html(Util.resistanceString(newResist));
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
        view.schedule(gameState.animator, timeStep*1000);
      }
      view.setContinueAction(handler, gameState.handler);
    };

    view.installContinueHandler(handler);
  };

  var bindGameHandler = function(handler) {
    view.bindHandler(handler);
    gameState.handler = handler;
  };


  var start = function(startingGerms) {
    var context   = canvas.getContext("2d"), i;

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
      var body = view.bb().createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                           [{ density: 1.0,
                              friction: 1.0,
                              restitution: 0.0,
                              shape: new (view.bb()).CircleShape(o.r) }]),
          t = randomMultiplyTime();
      body.SetUserData({ germId: (gameState.nextGermId += 1),
                         multiplyAt: gameState.step + t,
                         growthRate: growthRateForSteps(t),
                         // either inherent or create for the first time
                         resistances: (o.resistances || antibioticResistances()) });
      gameState.germs.push(body)
      return body;
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
        if (view.collideAtPos(germ, pos)) {
          toDelete.push(parseInt(i));
          view.destroyGerm(germ);
          gameState.score += 1;
        } else {
          numGerms += 1; // still alive
        }
      }

      gameState.germs = Util.deleteArrayElements(gameState.germs, toDelete);

      if (numGerms === 0) {
        gameState.condition = Condition.success;
      }

    };

    var multiplyGerms = function() {
      var pos, count = 0, b, circleShape, r, t;
      for (b = view.bb().world.GetBodyList(); b; b = b.GetNext()) {
        if (userData = b.GetUserData()) {
          count += 1;
          if (b.GetPosition().y < height/6) {
            gameState.condition = Condition.failed;
          }

          if (gameState.step === userData.multiplyAt) {
            pos = b.GetPosition();
            circleShape = b.GetFixtureList().GetShape();
            // Update multiply time for current germ
            r = circleShape.GetRadius()/2;
            circleShape.SetRadius(r);
            t = randomMultiplyTime();
            userData.multiplyAt = gameState.step + t;
            userData.growthRate = growthRateForSteps(t);
            // create new germ. Inherits resistances
            createGerm({x: pos.x+0.2, y: pos.y, r: r, resistances: userData.resistances});
          }
        }
      }
    };

    var failedMessage = function() {
      context.fillStyle = "red";
      context.font = "bold " + Math.round(widthInPixels/10) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("INFECTED!", widthInPixels/2, heightInPixels/5)
    }

    var successMessage = function() {
      context.fillStyle = "green";
      context.font = "bold "+ Math.round(widthInPixels/15) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("Epidemic averted!", widthInPixels/2, heightInPixels/5);
      context.fillStyle ="#333333";
      context.font = "bold " + Math.round(widthInPixels/30) + "px Helvetica";
      context.fillText("Click to continue", widthInPixels/2, 2*heightInPixels/5);
    }

    var growGerms = function() {
      var body, fixture, shape, userData;
      for (body = view.bb().world.GetBodyList(); body; body = body.GetNext()) {
        if (userData = body.GetUserData()) {
          shape = body.GetFixtureList().GetShape();
          shape.SetRadius(shape.GetRadius() * userData.growthRate);
        }
      }
    }

    var animate = function() {
      var animateId;

      view.bb().world.Step(timeStep, velocityIterations, positionIterations);
      gameState.step += 1;
      view.bb().world.ClearForces();
      view.bb().world.DrawDebugData();
      multiplyGerms();
      $('#score').html("Score: " + gameState.score);

      if (!checkAndEnableAntibiotics()) {

        switch (gameState.condition) {
          case Condition.continuing:
            growGerms();
            animateId = setTimeout(animate, timeStep*1000);
            gameState.animator = { animateFun: animate, animateId: animateId };
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
      var i, props = Util.propertiesOf(Antibiotics), el;

      for (i in props) {
        el = $('#' + props[i]);
        if (!el.is(":visible") && gameState.score >= Antibiotics[props[i]]) {
          el.show();
          pauseAndShowMessage('<p>Antibiotic "'+ props[i] +'" enabled!</p>' +
                      '<p>The percentage next to the antibiotic is the germ\'s natural chance of immunity.</p>' +
                      '<p>Each use of an antibiotic will increase the chance of immunity ' +
                      'in subsequent levels. Use sparingly!</p>');
          return true;
        }
      }
      return false;
    }

    var resetHandler = function() {
      $('#message').hide();
      destroy(); // destroy must come before initGameState()
      $('#reset').unbindClickAndTouchstart();
      $('#antiobiotics').html(''); // clear antibiotic links
      initGameState();
      start(1);
    };

    ///////////////////////////////////////////////////////////////
    view.init(width);
    startingGerms = startingGerms || 1;

    gameState.step = 0;
    gameState.condition = Condition.continuing;
    gameState.startingGerms = startingGerms;

    view.createBeaker({x: 20, y: height/2, width: 36, height: height*2/3, wallWidth: 1});
    createGerms(startingGerms);

    $('#level').html("Level: " + startingGerms);

    $('#reset').unbindClickAndTouchstart();
    $('#reset').clickOrTouchstart(resetHandler);
    view.bindPosHandler(killGermAtPos);
//    bindAntibioticHandlers();

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
  }

  var initGameState = function() {
    var i, props = Util.propertiesOf(Antibiotics);
    gameState = { score: 0, resistances: {}, germs: [], nextGermId: 0 };

    view.clearAntibioticLinks();

    for (i in props) {
      gameState.resistances[props[i]] = 0.10; // initial resistance chance of 0.10
      view.showAntibioticLink(props[i], killGermsWithAntibiotic(props[i]), gameState.resistances);
    }
  };

  initGameState(); // called once when the game object is first created

  return ({
    pauseAndShowMessage:  pauseAndShowMessage,
    start:                start,
    destroy:              destroy
  })

};

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

  gameView = GameView($, Box2D, '#canvas');
  game = Game(jQuery, '#canvas', gameView);
//  $('#debug').html("height = " + window.innerHeight);



  game.start(1);
  game.pauseAndShowMessage("<p>Click on the germs to kill them!</p>");

});

