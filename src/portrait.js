const palettes = [
  ['#d7c6a5', '#746454', '#272a30'], ['#d8d2c3', '#59636c', '#24262b'],
  ['#d5c0a4', '#8a7060', '#242528'], ['#c9d0d2', '#58606b', '#20252b'],
  ['#dfd1b5', '#71624e', '#292723'], ['#d7c7be', '#735f64', '#252326'],
];

function hashText(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return hash >>> 0;
}

export function portraitSvg(name, region = '中国') {
  const seed = hashText(`${name}:${region}`);
  const palette = palettes[seed % palettes.length];
  const faceWidth = 100 + (seed % 5) * 3;
  const faceHeight = 150 + ((seed >>> 3) % 5) * 4;
  const faceY = 133 + ((seed >>> 6) % 4) * 3;
  const hair = seed % 4;
  const beard = (seed >>> 4) % 3;
  const hairPath = [
    'M133 183 Q118 124 165 91 Q193 68 228 88 Q270 102 269 166 L257 193 Q249 137 222 122 Q188 150 143 145 Z',
    'M132 178 Q117 119 164 91 Q198 69 230 90 Q270 111 264 173 Q244 132 222 124 Q194 113 173 132 Q153 145 132 178Z',
    'M128 176 Q119 110 174 85 Q211 68 241 98 Q271 126 260 181 Q245 141 226 129 Q188 112 157 151Z',
    'M132 170 Q122 120 162 93 Q203 68 238 96 Q270 122 266 176 L252 157 Q236 119 208 113 Q178 113 151 144Z',
  ][hair];
  const beardPath = [
    '',
    '<path d="M145 252 Q151 290 190 321 Q229 290 239 251 Q224 268 211 268 Q190 283 169 268Z" fill="url(#ink)" opacity=".78"/><path d="M170 278 Q189 294 210 278" fill="none" stroke="#292a2b" stroke-width="2" opacity=".8"/>',
    '<path d="M146 252 Q151 276 168 282 L171 260 Q190 269 208 260 L212 282 Q233 273 239 250 Q225 260 213 255 Q190 263 168 255Z" fill="url(#ink)" opacity=".68"/>',
  ][beard];
  const eyes = seed % 2 ? 1 : -1;
  const portraitName = name.replace(/[&<>"']/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 480" role="img" aria-label="${portraitName} 素描肖像">
    <defs>
      <linearGradient id="paper" x2=".12" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="#8f8373"/></linearGradient>
      <linearGradient id="ink" x2=".8" y2="1"><stop stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient>
      <radialGradient id="light" cx=".47" cy=".37" r=".72"><stop stop-color="#eee2ca" stop-opacity=".8"/><stop offset="1" stop-color="#3b3938" stop-opacity=".15"/></radialGradient>
      <pattern id="grain" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M1 3h2m5 5h1m1-6h2M4 12h1" stroke="#302d2a" stroke-opacity=".24" stroke-width=".7"/></pattern>
    </defs>
    <rect width="384" height="480" fill="url(#paper)"/><rect width="384" height="480" fill="url(#light)"/><rect width="384" height="480" fill="url(#grain)" opacity=".48"/>
    <rect x="17" y="17" width="350" height="446" fill="none" stroke="#342f2a" stroke-opacity=".38"/>
    <path d="M47 480 Q65 372 130 346 Q154 333 164 321 L220 321 Q229 338 253 348 Q321 374 340 480Z" fill="url(#ink)"/>
    <path d="M152 316 Q159 348 190 365 Q223 347 231 316 L218 286 163 286Z" fill="#a28e78" stroke="#373430" stroke-opacity=".55" stroke-width="2"/>
    <path d="M${192-faceWidth/2} ${faceY+18} Q${192-faceWidth/2-8} ${faceY-3} 151 ${faceY+12} Q143 274 171 300 Q190 322 213 300 Q244 272 233 ${faceY+12} Q${192+faceWidth/2+8} ${faceY-3} ${192+faceWidth/2} ${faceY+18} Q${192+faceWidth/2+4} ${faceY+faceHeight-25} 192 ${faceY+faceHeight} Q${192-faceWidth/2-4} ${faceY+faceHeight-25} ${192-faceWidth/2} ${faceY+18}Z" fill="#c6b69c" stroke="#353431" stroke-width="2.2"/>
    <path d="M151 ${faceY+64} Q136 ${faceY+47} 145 ${faceY+86} Q148 ${faceY+102} 159 ${faceY+99} M233 ${faceY+64} Q248 ${faceY+47} 239 ${faceY+86} Q236 ${faceY+102} 225 ${faceY+99}" fill="#b2a18a" stroke="#353431" stroke-width="2"/>
    <path d="${hairPath}" fill="url(#ink)" stroke="#242527" stroke-width="3"/>
    <path d="M151 207 Q166 194 181 205 M203 205 Q219 194 234 207" fill="none" stroke="#393733" stroke-width="4"/>
    <path d="M155 218 Q169 210 182 218 Q170 229 156 219Z M202 218 Q216 210 230 218 Q217 229 202 219Z" fill="#ece0ca" stroke="#373532" stroke-width="1.5"/>
    <ellipse cx="169" cy="219" rx="3.5" ry="4.2" fill="#27292a"/><ellipse cx="216" cy="219" rx="3.5" ry="4.2" fill="#27292a"/>
    <path d="M${190+eyes} 218 Q185 246 178 262 Q190 269 201 261" fill="none" stroke="#514a40" stroke-width="2"/>
    <path d="M176 278 Q191 284 207 277 Q194 291 179 281Z" fill="#716059" opacity=".78"/><path d="M174 276 Q191 280 209 275" fill="none" stroke="#332f2d" stroke-width="1.5"/>
    ${beardPath}
    <path d="M78 422 Q139 375 162 359 M304 419 Q247 376 220 359 M96 459 Q146 402 164 380 M286 460 Q236 402 218 380" fill="none" stroke="#d3c3a9" stroke-opacity=".35" stroke-width="2"/>
    <path d="M52 348 Q94 326 139 341 M246 341 Q290 325 333 351 M35 367h21m273 0h21" fill="none" stroke="#302e2b" stroke-opacity=".38"/>
    <text x="192" y="446" text-anchor="middle" fill="#eee0c7" font-size="18" font-family="serif" letter-spacing="3" opacity=".9">${portraitName}</text>
  </svg>`;
}

export function portraitDataUri(person) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(portraitSvg(person.name, person.region))}`;
}

export function portraitFilename(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '-');
}
