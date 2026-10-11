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

export function portraitSvg(name, region = '中国', role = '') {
  const seed = hashText(`${name}:${region}`);
  const palette = palettes[seed % palettes.length];
  const faceWidth = 100 + (seed % 5) * 3;
  const faceHeight = 150 + ((seed >>> 3) % 5) * 4;
  const faceY = 133 + ((seed >>> 6) % 4) * 3;
  const hair = seed % 4;
  const female = /女娲|嫘祖|西王母|精卫|嫦娥|常羲|羲和|简狄|女魃|玄女|摩诃波阇波提|何仙姑|何琼|孙不二|魏华存|麻姑|班昭|武则天|李清照|秋瑾|居里|诺特|阿伦特|波伏娃|米利暗|路得|以斯帖|马利亚|德兰|赫蒂彻|法蒂玛|拉比阿|赫拉$|雅典娜|阿尔忒弥斯|阿佛洛狄忒|德墨忒尔|赫斯提亚|潘多拉|瑞亚|盖亚|倪克斯|忒提斯|忒弥斯|摩涅莫绪涅|福柏|墨提斯|珀耳塞福涅|赫卡忒|涅墨西斯|缪斯|卡利俄佩|克利俄|欧忒耳佩|塔利亚|墨尔波墨涅|忒耳普西科瑞|埃拉托|波吕许谟尼|乌拉尼亚|美狄亚|安提戈涅|安提俄珀|维纳斯|密涅瓦|朱诺|维斯塔|戴安娜|狄安娜|伊西斯|哈托尔|塞赫麦特|奈芙蒂斯|伊什塔尔|提亚马特|宁胡尔萨格|拉克什米|帕尔瓦蒂|萨拉斯瓦蒂|杜尔迦|迦梨$|悉多|罗陀|德鲁帕蒂|娑维德丽|阿娜希塔|天照|紫式部|清少纳言|弗丽嘉|弗蕾亚|海拉|斯卡蒂|伊敦|布伦希尔德|布狄卡|摩根勒菲|克莱尔/.test(name);
  const monk = /佛教|佛学/.test(role) && !female;
  const beard = female || monk ? 0 : (seed >>> 4) % 3;
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

  const headwear = region === '中国' && !female && !monk
    ? `<path d="M133 144L${142 + seed % 18} 89Q192 61 ${242 - seed % 18} 89L251 144Q192 125 133 144Z" fill="url(#ink)" stroke="#38332c" stroke-width="3"/><path d="M143 131Q192 116 243 131" fill="none" stroke="${palette[0]}" opacity=".6"/>`
    : female ? '<path d="M139 139Q104 223 134 317L152 279Q139 207 163 147M245 139Q280 223 250 317L232 279Q245 207 221 147" fill="url(#ink)"/><ellipse cx="192" cy="91" rx="32" ry="22" fill="url(#ink)"/><path d="M153 116Q192 87 232 116" fill="none" stroke="#bda575" stroke-width="5"/>' : '';
  const halo = /神话|宗教/.test(role) ? '<circle cx="192" cy="199" r="135" fill="none" stroke="#e5cea1" stroke-opacity=".48" stroke-width="2"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 480" role="img" aria-label="${portraitName} 原创示意插画，非历史肖像">
    <defs>
      <linearGradient id="paper" x2=".12" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="#8f8373"/></linearGradient>
      <linearGradient id="ink" x2=".8" y2="1"><stop stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient>
      <radialGradient id="light" cx=".47" cy=".37" r=".72"><stop stop-color="#eee2ca" stop-opacity=".8"/><stop offset="1" stop-color="#3b3938" stop-opacity=".15"/></radialGradient>
      <pattern id="grain" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M1 3h2m5 5h1m1-6h2M4 12h1" stroke="#302d2a" stroke-opacity=".24" stroke-width=".7"/></pattern>
    </defs>
    <rect width="384" height="480" fill="url(#paper)"/><rect width="384" height="480" fill="url(#light)"/><rect width="384" height="480" fill="url(#grain)" opacity=".48"/>
    <rect x="17" y="17" width="350" height="446" fill="none" stroke="#342f2a" stroke-opacity=".38"/>
    ${halo}
    <path d="M47 480 Q65 372 130 346 Q154 333 164 321 L220 321 Q229 338 253 348 Q321 374 340 480Z" fill="url(#ink)"/>
    <path d="M152 316 Q159 348 190 365 Q223 347 231 316 L218 286 163 286Z" fill="#a28e78" stroke="#373430" stroke-opacity=".55" stroke-width="2"/>
    <path d="M${192-faceWidth/2} ${faceY+18} Q${192-faceWidth/2-8} ${faceY-3} 151 ${faceY+12} Q143 274 171 300 Q190 322 213 300 Q244 272 233 ${faceY+12} Q${192+faceWidth/2+8} ${faceY-3} ${192+faceWidth/2} ${faceY+18} Q${192+faceWidth/2+4} ${faceY+faceHeight-25} 192 ${faceY+faceHeight} Q${192-faceWidth/2-4} ${faceY+faceHeight-25} ${192-faceWidth/2} ${faceY+18}Z" fill="#c6b69c" stroke="#353431" stroke-width="2.2"/>
    <path d="M151 ${faceY+64} Q136 ${faceY+47} 145 ${faceY+86} Q148 ${faceY+102} 159 ${faceY+99} M233 ${faceY+64} Q248 ${faceY+47} 239 ${faceY+86} Q236 ${faceY+102} 225 ${faceY+99}" fill="#b2a18a" stroke="#353431" stroke-width="2"/>
    ${monk ? '<path d="M140 170Q128 93 192 91Q256 93 244 170" fill="#c6b69c" stroke="#353431" stroke-width="2"/>' : `<path d="${hairPath}" fill="url(#ink)" stroke="#242527" stroke-width="3"/>`}
    ${headwear}
    <path d="M151 207 Q166 194 181 205 M203 205 Q219 194 234 207" fill="none" stroke="#393733" stroke-width="4"/>
    <path d="M155 218 Q169 210 182 218 Q170 229 156 219Z M202 218 Q216 210 230 218 Q217 229 202 219Z" fill="#ece0ca" stroke="#373532" stroke-width="1.5"/>
    <ellipse cx="169" cy="219" rx="3.5" ry="4.2" fill="#27292a"/><ellipse cx="216" cy="219" rx="3.5" ry="4.2" fill="#27292a"/>
    <path d="M${190+eyes} 218 Q185 246 178 262 Q190 269 201 261" fill="none" stroke="#514a40" stroke-width="2"/>
    <path d="M176 278 Q191 284 207 277 Q194 291 179 281Z" fill="#716059" opacity=".78"/><path d="M174 276 Q191 280 209 275" fill="none" stroke="#332f2d" stroke-width="1.5"/>
    ${beardPath}
    <path d="M78 422 Q139 375 162 359 M304 419 Q247 376 220 359 M96 459 Q146 402 164 380 M286 460 Q236 402 218 380" fill="none" stroke="#d3c3a9" stroke-opacity=".35" stroke-width="2"/>
    <path d="M52 348 Q94 326 139 341 M246 341 Q290 325 333 351 M35 367h21m273 0h21" fill="none" stroke="#302e2b" stroke-opacity=".38"/>
    <text x="192" y="431" text-anchor="middle" fill="#eee0c7" font-size="${Math.min(22, 290 / Math.max(1, [...portraitName].length))}" font-family="serif" letter-spacing="2" opacity=".9">${portraitName}</text>
    <text x="192" y="453" text-anchor="middle" fill="#eee0c7" font-size="11" font-family="sans-serif" opacity=".8">原创示意插画 · 非历史肖像</text>
  </svg>`;
}

export function portraitDataUri(person) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(portraitSvg(person.name, person.region, person.role))}`;
}

export function portraitFilename(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '-');
}
