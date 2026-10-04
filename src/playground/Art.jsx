export function Mongle({ color='#fff6d9', happy=false, ...props }) {
  return <svg viewBox="0 0 160 160" fill="none" aria-hidden="true" {...props}>
    <ellipse cx="81" cy="145" rx="49" ry="8" fill="#68644c" opacity=".09" />
    <path d="M39 59C24 29 32 9 46 15c12 6 17 24 18 35 15-4 26-3 34 0 4-24 14-40 26-33 14 8 6 30-4 44 19 14 27 37 19 56-9 22-31 28-60 27-30 1-54-9-59-30-5-20 2-40 19-55Z" fill={color} stroke="#6c655d" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M43 25c-4 5 0 20 7 27M116 27c2 4-2 18-7 24" stroke="#f5b4b0" strokeWidth="7" strokeLinecap="round" />
    {happy?<g stroke="#62584f" strokeWidth="3.5" strokeLinecap="round"><path d="m55 84 5-4 5 4M94 84l5-4 5 4" /></g>:<g fill="#62584f"><ellipse cx="61" cy="84" rx="3.8" ry="5" /><ellipse cx="98" cy="84" rx="3.8" ry="5" /></g>}
    <ellipse cx="48" cy="96" rx="10" ry="6" fill="#f7b4b5" opacity=".65" /><ellipse cx="112" cy="96" rx="10" ry="6" fill="#f7b4b5" opacity=".65" />
    <path d="M73 96q7 10 14 0" stroke="#62584f" strokeWidth="2.8" strokeLinecap="round" />
    <path d="m43 122 4 6m68-6-4 6" stroke="#9f8d74" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="60" cy="141" rx="14" ry="6" fill={color} /><ellipse cx="102" cy="141" rx="14" ry="6" fill={color} />
  </svg>;
}

export function Cloud({ ...props }) {
  return <svg viewBox="0 0 160 80" fill="none" aria-hidden="true" {...props}><path d="M28 70C-4 68 0 32 28 30 29 1 77-5 90 21c25-15 48 1 48 22 31 7 24 29-4 29Z" fill="currentColor" /><path d="M48 55q5 5 10 0m37 0q5 5 10 0" stroke="#8d9cac" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

export function HeroArt({ color }) {
  return <svg className="pg-hero-art" fill="none" viewBox="0 0 570 310" role="img" aria-label="구름과 꽃이 있는 작은 놀이터에서 쉬는 몽글이">
    <path d="M5 270C80 235 152 252 204 237c110-33 263-33 368 20v53H5Z" fill="#c6ddaf" />
    <path d="M0 282c118-40 161 30 288-6s173 18 282-12v46H0Z" fill="#bad2a0" />
    <Cloud x="10" y="22" width="105" height="54" color="#fffdf3" /><Cloud x="326" y="12" width="120" height="60" color="#fffdf3" />
    <circle cx="290" cy="46" r="25" fill="#f4d584" /><path d="m282 47 2 1m10-1 2 1" stroke="#ab8e58" strokeWidth="3" strokeLinecap="round" />
    <path d="M425 243V102" stroke="#bc9578" strokeWidth="15" strokeLinecap="round" /><path d="m425 154 36-33m-36 56-37-36" stroke="#bc9578" strokeWidth="9" strokeLinecap="round" />
    <circle cx="423" cy="80" r="48" fill="#a5c794" /><circle cx="389" cy="113" r="43" fill="#b4d29f" /><circle cx="459" cy="112" r="44" fill="#b4d29f" /><circle cx="427" cy="122" r="36" fill="#bdd7a4" />
    <path d="M158 213V105m0 6 105-5v102" stroke="#b99379" strokeWidth="9" strokeLinecap="round" /><path d="m181 112-5 84m62-86-6 86" stroke="#e4c7a0" strokeWidth="3" /><path d="m170 199 68-1" stroke="#c4936f" strokeWidth="9" strokeLinecap="round" />
    <Mongle x="116" y="128" width="154" height="160" color={color} happy />
    <Mongle x="280" y="186" width="98" height="105" color="#ffd5d3" />
    <ellipse cx="315" cy="280" rx="36" ry="5" fill="#799064" opacity=".15" />
    <g fill="#fff4d5"><path d="m68 219 4 6 7-2-1 8 5 5-7 3-1 7-7-3-6 4-2-8-6-3 6-5-1-7Z" /><path d="m480 249 3 5 6-1-1 6 4 4-6 2-1 6-5-3-5 3-1-6-5-3 5-3-1-6Z" /></g>
    <g stroke="#719761" strokeWidth="3" strokeLinecap="round"><path d="m57 280 2-14m-7 6 6 4 7-6m429 16v-17m-7 6 7 4 7-5" /></g>
    <g fill="#f4bdad"><circle cx="60" cy="261" r="9"/><circle cx="494" cy="265" r="9"/></g><g fill="#f6de92"><circle cx="60" cy="261" r="3"/><circle cx="494" cy="265" r="3"/></g>
    <path d="m118 76 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm239 82 2 5 6 2-6 2-2 6-2-6-5-2 5-2Z" fill="#d8b97c" />
  </svg>;
}

export function GameArt({ id, color='#fff6d9' }) {
  return <svg viewBox="0 0 360 180" fill="none" className="pg-game-art" aria-hidden="true">
    <circle cx="293" cy="31" r="4" fill="#fff" opacity=".7"/><circle cx="58" cy="48" r="3" fill="#fff" opacity=".7"/>
    {id==='snack' && <>
      <Mongle x="121" y="29" width="116" height="127" color={color}/><path d="m113 117 13 46h112l12-46Z" fill="#ce9b6d" stroke="#ad7d57" strokeWidth="2"/><path d="M111 118h143" stroke="#e7b889" strokeWidth="9" strokeLinecap="round"/><path d="m142 128 5 27m25-27v27m28-27v27m25-27-5 27" stroke="#e8bf92" strokeWidth="3"/>
      <g transform="rotate(-20 82 81)"><circle cx="82" cy="81" r="24" fill="#d9a872" stroke="#b88754" strokeWidth="2"/><g fill="#9c6d4a"><circle cx="73" cy="74" r="3"/><circle cx="88" cy="69" r="3"/><circle cx="90" cy="87" r="3"/><circle cx="75" cy="91" r="3"/></g></g>
      <path d="M275 77c-38-10-28-45 0-30 28-15 38 20 0 30Z" fill="#efadb4"/><path d="m273 48 4-10" stroke="#89a46c" strokeWidth="3"/>
    </>}
    {id==='cloud' && <><Cloud x="35" y="105" width="110" height="55" color="#faffff"/><Cloud x="216" y="31" width="100" height="50" color="#faffff"/><Cloud x="131" y="118" width="122" height="55" color="#faffff"/><Mongle x="136" y="9" width="105" height="115" color={color}/><path d="m277 114 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z" fill="#eed37e"/></>}
    {id==='parcel' && <><rect x="49" y="94" width="79" height="61" rx="7" fill="#d1a881"/><path d="M89 94v61" stroke="#f4d9ab" strokeWidth="11"/><rect x="229" y="72" width="77" height="83" rx="7" fill="#e5bb91"/><path d="M267 72v83" stroke="#f7dfb5" strokeWidth="11"/><Mongle x="115" y="31" width="135" height="137" color={color}/><rect x="162" y="110" width="39" height="33" rx="4" fill="#cba27c"/><path d="M181 111v31" stroke="#f4dab0" strokeWidth="7"/></>}
    {id==='memory' && <>{[0,1,2].map(i=><g key={i} transform={`translate(${61+i*82} ${40+(i===1?-8:8)}) rotate(${i===0?-9:i===2?9:0} 33 50)`}><rect width="66" height="95" rx="12" fill="#fffdf7" stroke="#d2bedf" strokeWidth="2"/>{i===1?<text x="33" y="61" textAnchor="middle" fontSize="34">🍓</text>:<><path d="M16 48q17-26 34 0-17 28-34 0Z" fill="#d9c4e7"/><circle cx="33" cy="47" r="8" fill="#f3e9fb"/></>}</g>)}</>}
    {id==='fishing' && <><ellipse cx="181" cy="149" rx="128" ry="23" fill="#8ec6c7" opacity=".4"/><Mongle x="52" y="16" width="127" height="132" color={color}/><path d="m152 106 54-75" stroke="#b19372" strokeWidth="5" strokeLinecap="round"/><path d="M207 31q67 12 60 90" fill="none" stroke="#f9fcf6" strokeWidth="2"/><path d="M214 134q27-29 54-2l17-11v30l-17-10q-30 18-54-7Z" fill="#efae9b"/><circle cx="230" cy="131" r="3" fill="#6e726c"/></>}
    {id==='mole' && <><ellipse cx="103" cy="143" rx="49" ry="15" fill="#a68b77"/><ellipse cx="257" cy="136" rx="43" ry="13" fill="#a68b77"/><path d="M67 141v-37c0-54 70-54 70 0v37Z" fill="#ba947b"/><circle cx="68" cy="87" r="13" fill="#ba947b"/><circle cx="136" cy="87" r="13" fill="#ba947b"/><ellipse cx="102" cy="120" rx="24" ry="17" fill="#f4d8ba"/><circle cx="86" cy="102" r="3" fill="#645a51"/><circle cx="117" cy="102" r="3" fill="#645a51"/><ellipse cx="102" cy="115" rx="5" ry="4" fill="#805f50"/><path d="m250 135 4-55" stroke="#84a675" strokeWidth="5"/><path d="M252 107q-38-26-28-4 9 16 28 15" fill="#9fbc81"/><g fill="#fff1d0"><circle cx="253" cy="68" r="13"/><circle cx="268" cy="82" r="13"/><circle cx="258" cy="97" r="13"/><circle cx="240" cy="93" r="13"/><circle cx="238" cy="75" r="13"/></g><circle cx="253" cy="83" r="10" fill="#e7c374"/></>}
  </svg>;
}
