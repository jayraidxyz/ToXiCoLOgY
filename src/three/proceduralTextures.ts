import * as THREE from 'three';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
) {
  const words = text.split(/\s+/);
  let line = '';
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[i];
      lineCount += 1;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

export function createFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, size, size);

  // Subtle micro-grid
  ctx.strokeStyle = 'rgba(225, 0, 0, 0.14)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Major coordinate lines
  ctx.strokeStyle = 'rgba(225, 0, 0, 0.34)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Crosshair ticks at major intersections
  ctx.fillStyle = '#FF3B30';
  for (let x = 0; x <= size; x += 128) {
    for (let y = 0; y <= size; y += 128) {
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createValidatorPlateTexture(
  title: string,
  subtitle: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0B0B0D';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer panel border
  ctx.strokeStyle = '#2A2A2E';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  // Top accent bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(36, 36, canvas.width - 72, 12);

  // Title & subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 46px Inter, system-ui, sans-serif';
  ctx.fillText(title, 40, 110);

  ctx.fillStyle = '#A3A3A3';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, 40, 152);

  // Telemetry rack bays
  for (let row = 0; row < 6; row++) {
    const y = 200 + row * 82;
    ctx.fillStyle = '#141417';
    ctx.fillRect(40, y, canvas.width - 80, 62);
    ctx.strokeStyle = '#2A2A2E';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, y, canvas.width - 80, 62);

    // Optical fiber bars
    const activeBars = 6 + ((row * 3) % 5);
    for (let b = 0; b < 11; b++) {
      ctx.fillStyle = b < activeBars ? accentHex : '#26262B';
      ctx.fillRect(62 + b * 34, y + 20, 22, 22);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createFlashcardFaceTexture(
  code: string,
  body: string,
  footer: string,
  isBack: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isBack ? '#160909' : '#0E0E10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top highlight line
  ctx.fillStyle = isBack ? '#E10000' : '#333338';
  ctx.fillRect(0, 0, canvas.width, 8);

  // Border frame
  ctx.strokeStyle = isBack ? '#E10000' : '#2C2C32';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Header badge
  ctx.fillStyle = isBack ? '#E10000' : '#1E1E22';
  ctx.fillRect(32, 32, 140, 40);
  ctx.fillStyle = isBack ? '#FFFFFF' : '#FF6B63';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText(`CARD ${code}`, 48, 59);

  ctx.fillStyle = '#A3A3A3';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(isBack ? 'VERIFIED ANSWER' : 'QUESTION', 310, 58);

  // Main copy
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  wrapCanvasText(ctx, body, 32, 126, canvas.width - 64, 38, 4);

  // Footer micro note
  ctx.fillStyle = isBack ? '#FF9A94' : '#A3A3A3';
  ctx.font = '500 18px Inter, system-ui, sans-serif';
  wrapCanvasText(ctx, footer, 32, 286, canvas.width - 64, 24, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    10,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
