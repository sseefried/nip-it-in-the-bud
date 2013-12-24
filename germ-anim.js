var GermAnim = function() {
  var con = console;
  var pi2 = Math.PI*2;

  // math
  function num(min,max) { return min + Math.random() * (max-min); }
  function int(min,max) { return Math.round(num(min,max)); }

  function mutateNum(base, mutation) {
    base = Number(base);
    return num(base - mutation, base + mutation);
  }

  function mutateInt(base, mutation) { return Math.round(mutateNum(base, mutation)); }


  // colour

  var colour = function(seed) {

    function rgba(base) {
      var num = 0
      if (base != undefined) {
        num = mutateInt(base, 10);
      } else {
        num = int(0,255);
      }
      return num > 255 ? 255 : num < 0 ? 0 : num;
    }

    var col = "";

    if (seed) {
      var arr = seed.replace(/rgba\(/, "").replace(/\)/, "").split(",") // TODO dodgy regex
      col = "rgba(" + rgba(arr[0]) + "," + rgba(arr[1]) + "," + rgba(arr[2]) + ",1)";
    } else {
      col = "rgba(" + rgba() + "," + rgba() + "," + rgba() + ",1)";
    }
    // con.log(col, arr );
    return col;
  };

  var radialGradient = function(ctx, x, y, size, seed) {
    var grd = ctx.createRadialGradient(x, y, 0, x, y, size);

    if (seed) {
      if (seed.inner && seed.outer) {

        seed.inner = colour(seed.inner);
        seed.outer = colour(seed.outer);

        grd.addColorStop(0, seed.inner);
        grd.addColorStop(1, seed.outer);
      } else {
        con.warn("Missing seed paramater:", seed.inner, seed.outer)
      }
    } else {
      grd.addColorStop(0, colour());
      grd.addColorStop(1, colour());
    }

    return grd;
  };

  // geometry

  var circle = function(ctx, x, y, size, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, pi2, false);
    ctx.fill();
  };

  var wobble = function(ctx, x, y, size, fill, seed) {

    seed = mutateNum( seed, 0.6 );

    function xp(i) { return size + Math.sin(i / bumps * pi2) * size; }
    function yp(i) { return size + Math.cos(i / bumps * pi2) * size; }

    var bumps = Math.round(seed) * 2;

    //circle(ctx, x, y, size, "#000" );

    var radInner = size * Math.sin(1 / bumps * pi2 / 2);
    var radBackground = size * Math.cos(1 / bumps * pi2 / 2);
    var scale = size / (xp(0) + radInner);

    ctx.save();
    ctx.translate(size, size);
    ctx.scale(scale, scale);
    ctx.translate(-size, -size);

    circle(ctx, x, y, radBackground, fill);
    function dots(fill, start) {
      for (var i = start; i < bumps; i += 2 ) {
        circle(ctx, xp(i), yp(i), radInner, fill)
      }
    }
    dots(fill,0);
    dots("rgba(255,255,255,1)",1);

    ctx.restore();
  };

  var blob = function(ctx, points, size, seed) {

    function getPoint(index) {
      return points[index % points.length];
    }

    seed.strokeStyle = colour(seed.strokeStyle);
    seed.lineWidth = mutateNum(seed.lineWidth, 0.5);

    ctx.strokeStyle = seed.strokeStyle;
    ctx.fillStyle = seed.fillStyle;

    //con.log("blob", seed.fillStyle)

    ctx.fillStyle = radialGradient(ctx, size/2, size/2, size, seed.fillStyle)
    ctx.lineWidth = seed.lineWidth;
    ctx.beginPath();

    for(var i = 0; i < points.length; i++) {

      var p1 = getPoint(i);
      var p2 = getPoint(i + 1);
      var p3 = getPoint(i + 2);

      var px = (p1.x + p2.x) * 0.5;
      var py = (p1.y + p2.y) * 0.5;

      var nx = (p2.x + p3.x) * 0.5;
      var ny = (p2.y + p3.y) * 0.5;

      if (i == 0) {
        ctx.moveTo(px, py);
      }
      ctx.quadraticCurveTo(p2.x, p2.y, nx, ny);

    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  };



  var generate = function(seed, size, rotation) {

    var circX = function(angle, radius) { return size/2 + Math.sin(angle) * radius; };
    var circY = function(angle, radius) { return size/2 + Math.cos(angle) * radius; };

    var canvas   = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx      = canvas.getContext('2d');

    ctx.translate(size/2, size/2);
    ctx.rotate(rotation);
    ctx.translate(-size/2, -size/2);

    var bg = radialGradient(ctx, size/2, size/2, size, seed.wall.fillStyle );

    switch (seed.wall.type) { // germ cannot mutate type, or can it? nasty.
      case 0 :
        circle(ctx, size/2, size/2, size/2, bg);
        break;
      case 1 :
        wobble(ctx, size/2, size/2, size/2, bg, seed.wall.microvillus);
        break;

      case 2 :
        // draw blob

        seed.wall.microvillus = mutateInt(seed.wall.microvillus, 1);

        var blobPoints = seed.wall.microvillus * 2;
        var radIn = size * 0.25;
        var radOut = size * 0.25;
        var points = [];
        for ( var i = 0; i < blobPoints; i++ ) {
          var angle = i / blobPoints * pi2;
          var radius = (i % 2) * radIn + radOut;

          points[i] = {
            x:circX(angle, radius),
            y:circY(angle, radius)
          };

        }
        blob(ctx, points, size, seed.wall); // use points average for centre?
        break;

      default :
        con.warn("Unknown seed.wall.type:", seed.wall.type);
    }

    // draw blob

    var blobPoints = 10;
    var points = [];
    for ( var i = 0; i < blobPoints; i++ ) {
      var angle = i / blobPoints * pi2;
      var radius = num(size / 2 * 0.2, size / 2 * 0.6);
      points[i] = {
        x:circX(angle,radius),
        y:circY(angle,radius)
      };
      // store points for later and manipulate shape of blob?
    }

    blob(ctx, points, size, seed.vacuole); // use points average for centre?

    // draw dots

    seed.nucleus.fillStyle = colour(seed.nucleus.fillStyle);
    seed.nucleus.number = mutateNum(seed.nucleus.number, 2);
    var nuclei = Math.round(seed.nucleus.number);

    for (var i = 0; i < nuclei; i++) {
      var angle = i / nuclei * pi2;
      var radius = num(size * 0.1, size * 0.3);
      var rr = num(2, 5);
      angle = Math.random() * pi2;
      circle(ctx, circX(angle, radius), circY(angle, radius), rr, seed.nucleus.fillStyle);
    }

    // draw worms

    seed.golgiApparatus.number = mutateNum(seed.golgiApparatus.number, 2);
    seed.golgiApparatus.lineWidth = 1;//mutateNum(seed.golgiApparatus.lineWidth, 2);
    seed.golgiApparatus.strokeStyle = colour(seed.golgiApparatus.strokeStyle);

    var golgiApparatus = 1;//30;//Math.round(seed.golgiApparatus.number);

    for (var i = 0; i < golgiApparatus; i++) {
      var angle = num(0, pi2);
      var radius = num(size * 0.1, size * 0.3);

      var x1 = circX(angle, radius);
      var y1 = circY(angle, radius);

      var x2 = mutateNum(x1,10);
      var x3 = mutateNum(x2,20);
      var x4 = mutateNum(x3,10);

      var y2 = mutateNum(y1,10);
      var y3 = mutateNum(y2,20);
      var y4 = mutateNum(y3,10);

      var wormSize = 5;//mutateNum(seed.golgiApparatus.lineWidth,2);
      var wormColour = colour(seed.golgiApparatus.strokeStyle);

      ctx.fillStyle = "none"
      ctx.strokeStyle = wormColour;
      ctx.lineWidth = wormSize;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineJoin = 'round'; // canvas is shit doesn't round end lines

      ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
      ctx.stroke();

      circle(ctx, x1, y1, wormSize / 1.5, wormColour); // draw a head
      circle(ctx, x4, y4, wormSize / 2, wormColour );

    }
    return canvas;
  };

  var createSeed = function() {
    return({ wall: {
                type: int(0, 2),
                microvillus: int(5, 16), // bumps is double this.
                fillStyle: {
                  inner: colour(),
                  outer: colour()
                }
              },
              nucleus: {
                fillStyle: colour(),
                number: int(10,20)
              },
              // membrane: {
              //   colour: colour()
              // },
              golgiApparatus: {
                number: int(10,20),
                lineWidth: num(4,10),
                strokeStyle: colour()
              },
              vacuole: {
                fillStyle: {
                  inner: colour(),
                  outer: colour()
                },
                lineWidth: num(4,20),
                strokeStyle: colour()
              }
            });
  };


  var seed = createSeed();

  // [ GermAnim API ]
  //
  // Draws a single frame of the germ on 2D context 'ctx' and position (x,y)
  // with radius 'r' and rotation 'rotation'.
  var drawFrame = function(ctx, x, y, r, rotation) {
    var imageCanvas = generate(seed, r*2, rotation),
        imageCtx    = imageCanvas.getContext('2d');
    ctx.drawImage(imageCanvas, x-r, y-r);

  };

  // The GermAnim API
  return({ drawFrame: drawFrame });

};