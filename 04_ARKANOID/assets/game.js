// Arkanoid MVP — SPEC 01

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
ctx.imageSmoothingEnabled = false;

const state = {
  screen: 'start',        // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,

  paddle: {
    x: ( 640 - 100 ) / 2, y: 760,
    w: 100, h: 14,
  },

  ball: {
    x: 0, y: 0,
    vx: 0, vy: 0,
    radius: 8,
    attached: true,
  },

  bricks: [],
};

const PADDLE_SPEED = 8;
const BALL_SPEED = 6;
const BALL_LAUNCH_VX = 3;
const BALL_LAUNCH_VY = -Math.sqrt( BALL_SPEED * BALL_SPEED - BALL_LAUNCH_VX * BALL_LAUNCH_VX );
const PADDLE_MAX_BOUNCE_ANGLE = ( 75 * Math.PI ) / 180;
const POINTS_PER_BRICK = 10;

const BRICK_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const BRICK_COLS = 8;
const BRICK_ROWS = 6;
const BRICK_W = 64;
const BRICK_H = 24;
const BRICK_GAP = 8;
const BRICK_TOP = 80;
const BRICK_MARGIN_X = ( canvas.width - ( BRICK_COLS * BRICK_W + ( BRICK_COLS - 1 ) * BRICK_GAP ) ) / 2;

const RESTART_BUTTON = { x: canvas.width / 2 - 100, y: 480, w: 200, h: 50 };

const keys = { left: false, right: false };
let lastInput = 'keyboard';
let mouseX = null;

function createBricks() {
  const bricks = [];

  for ( let row = 0; row < BRICK_ROWS; row++ ) {
    for ( let col = 0; col < BRICK_COLS; col++ ) {
      bricks.push( {
        x: BRICK_MARGIN_X + col * ( BRICK_W + BRICK_GAP ),
        y: BRICK_TOP + row * ( BRICK_H + BRICK_GAP ),
        w: BRICK_W, h: BRICK_H,
        color: BRICK_COLORS[ row ],
        alive: true,
      } );
    }
  }

  return bricks;
}

function resetGame() {
  state.score = 0;
  state.lives = 3;

  state.paddle.x = ( canvas.width - state.paddle.w ) / 2;
  state.paddle.y = canvas.height - 40;

  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;

  state.bricks = createBricks();
  state.screen = 'playing';
}

function pointInRect( point, rect ) {
  return point.x >= rect.x && point.x <= rect.x + rect.w &&
    point.y >= rect.y && point.y <= rect.y + rect.h;
}

function canvasPosFromEvent( e ) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ( e.clientX - rect.left ) * ( canvas.width / rect.width ),
    y: ( e.clientY - rect.top ) * ( canvas.height / rect.height ),
  };
}

function launchBall() {
  state.ball.attached = false;
  state.ball.vx = BALL_LAUNCH_VX;
  state.ball.vy = BALL_LAUNCH_VY;
}

function movePaddle() {
  if ( lastInput === 'mouse' && mouseX !== null ) {
    state.paddle.x = mouseX - state.paddle.w / 2;
  } else {
    if ( keys.left ) state.paddle.x -= PADDLE_SPEED;
    if ( keys.right ) state.paddle.x += PADDLE_SPEED;
  }

  if ( state.paddle.x < 0 ) state.paddle.x = 0;
  if ( state.paddle.x > canvas.width - state.paddle.w ) state.paddle.x = canvas.width - state.paddle.w;
}

function handleWallCollisions() {
  const b = state.ball;

  if ( b.x - b.radius < 0 ) {
    b.x = b.radius;
    b.vx = -b.vx;
  } else if ( b.x + b.radius > canvas.width ) {
    b.x = canvas.width - b.radius;
    b.vx = -b.vx;
  }

  if ( b.y - b.radius < 0 ) {
    b.y = b.radius;
    b.vy = -b.vy;
  }
}

function handlePaddleCollision( prevY ) {
  const b = state.ball;
  const p = state.paddle;

  const wasAbove = prevY + b.radius <= p.y;
  const isTouching = b.y + b.radius >= p.y && b.y - b.radius <= p.y + p.h;
  const withinX = b.x + b.radius >= p.x && b.x - b.radius <= p.x + p.w;

  if ( b.vy > 0 && wasAbove && isTouching && withinX ) {
    const hitPos = ( b.x - ( p.x + p.w / 2 ) ) / ( p.w / 2 ); // -1 (borde izq) .. 1 (borde der)
    const clamped = Math.max( -1, Math.min( 1, hitPos ) );
    const angle = clamped * PADDLE_MAX_BOUNCE_ANGLE;

    b.vx = BALL_SPEED * Math.sin( angle );
    b.vy = -BALL_SPEED * Math.cos( angle );
    b.y = p.y - b.radius;
  }
}

function handleBrickCollisions() {
  const b = state.ball;

  for ( const brick of state.bricks ) {
    if ( !brick.alive ) continue;

    const closestX = Math.max( brick.x, Math.min( b.x, brick.x + brick.w ) );
    const closestY = Math.max( brick.y, Math.min( b.y, brick.y + brick.h ) );
    const dx = b.x - closestX;
    const dy = b.y - closestY;

    if ( dx * dx + dy * dy > b.radius * b.radius ) continue;

    brick.alive = false;
    state.score += POINTS_PER_BRICK;

    if ( Math.abs( dx ) > Math.abs( dy ) ) {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
    }

    break; // como mucho un bloque por frame, evita rebotes dobles incorrectos
  }
}

function moveBall() {
  if ( state.ball.attached ) {
    state.ball.x = state.paddle.x + state.paddle.w / 2;
    state.ball.y = state.paddle.y - state.ball.radius;
  } else {
    const prevY = state.ball.y;
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    handleWallCollisions();
    handlePaddleCollision( prevY );
    handleBrickCollisions();
  }
}

function checkWin() {
  if ( state.bricks.length > 0 && state.bricks.every( ( brick ) => !brick.alive ) ) {
    state.screen = 'win';
  }
}

function checkBallLost() {
  const b = state.ball;
  if ( b.attached || b.y - b.radius <= canvas.height ) return;

  state.lives -= 1;

  if ( state.lives <= 0 ) {
    state.screen = 'gameover';
    return;
  }

  b.attached = true;
  b.vx = 0;
  b.vy = 0;
}

function update() {
  if ( state.screen === 'playing' ) {
    movePaddle();
    moveBall();
    checkWin();
    checkBallLost();
  }
}

function renderStartScreen() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 48px sans-serif';
  ctx.fillText( 'ARKANOID', canvas.width / 2, canvas.height / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( 'Pulsa ESPACIO o haz click para jugar', canvas.width / 2, canvas.height / 2 + 30 );
}

function renderHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';

  ctx.textAlign = 'left';
  ctx.fillText( 'Puntuación: ' + state.score, 20, 30 );

  ctx.textAlign = 'right';
  ctx.fillText( 'Vidas: ' + state.lives, canvas.width - 20, 30 );
}

function renderPlaying() {
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  drawSprite( ctx, 'ball', state.ball.x - state.ball.radius, state.ball.y - state.ball.radius, state.ball.radius * 2, state.ball.radius * 2 );

  for ( const brick of state.bricks ) {
    if ( !brick.alive ) continue;
    drawSprite( ctx, 'block_' + brick.color, brick.x, brick.y, brick.w, brick.h );
  }

  renderHud();
}

function drawRestartButton() {
  ctx.fillStyle = '#333';
  ctx.fillRect( RESTART_BUTTON.x, RESTART_BUTTON.y, RESTART_BUTTON.w, RESTART_BUTTON.h );
  ctx.strokeStyle = '#fff';
  ctx.strokeRect( RESTART_BUTTON.x, RESTART_BUTTON.y, RESTART_BUTTON.w, RESTART_BUTTON.h );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '20px sans-serif';
  ctx.fillText( 'REINICIAR', RESTART_BUTTON.x + RESTART_BUTTON.w / 2, RESTART_BUTTON.y + RESTART_BUTTON.h / 2 );
  ctx.textBaseline = 'alphabetic';
}

function renderGameOverScreen() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 48px sans-serif';
  ctx.fillText( 'GAME OVER', canvas.width / 2, 340 );

  ctx.font = '22px sans-serif';
  ctx.fillText( 'Puntuación: ' + state.score, canvas.width / 2, 390 );

  drawRestartButton();
}

function renderWinScreen() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 44px sans-serif';
  ctx.fillText( '¡HAS GANADO!', canvas.width / 2, 340 );

  ctx.font = '22px sans-serif';
  ctx.fillText( 'Puntuación: ' + state.score, canvas.width / 2, 390 );

  drawRestartButton();
}

function render() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );

  if ( state.screen === 'start' ) {
    renderStartScreen();
  } else if ( state.screen === 'playing' ) {
    renderPlaying();
  } else if ( state.screen === 'gameover' ) {
    renderGameOverScreen();
  } else if ( state.screen === 'win' ) {
    renderWinScreen();
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame( loop );
}

window.addEventListener( 'keydown', ( e ) => {
  if ( e.code === 'Space' ) {
    if ( state.screen === 'start' ) resetGame();
    else if ( state.screen === 'playing' && state.ball.attached ) launchBall();
    else if ( state.screen === 'gameover' || state.screen === 'win' ) resetGame();
  }

  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) {
    keys.left = true;
    lastInput = 'keyboard';
  }
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) {
    keys.right = true;
    lastInput = 'keyboard';
  }
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) keys.left = false;
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) keys.right = false;
} );

canvas.addEventListener( 'mousemove', ( e ) => {
  mouseX = canvasPosFromEvent( e ).x;
  lastInput = 'mouse';
} );

canvas.addEventListener( 'click', ( e ) => {
  if ( state.screen === 'start' ) {
    resetGame();
  } else if ( state.screen === 'playing' && state.ball.attached ) {
    launchBall();
  } else if ( state.screen === 'gameover' || state.screen === 'win' ) {
    if ( pointInRect( canvasPosFromEvent( e ), RESTART_BUTTON ) ) resetGame();
  }
} );

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
