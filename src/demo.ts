import { blankPart, blankBuild, stateSchema, type Part, type State } from './model';

/** Illustrative specifications, not imported purchases or manufacturer-verified records. */
export function demoState(): State {
  const make=(id:string, name:string, category:Part['category'],fields:Partial<Part>):Part=>({...blankPart(id),name,category,...fields});
  const parts:Part[]=[
    make('frame','3″ carbon frame','Frame',{quantity:1,weight:48,cost:42,frameSize:3,motorMount:'9x9',stackMount:'25.5x25.5'}),
    make('motor','1404 · 3800 KV','Motor',{quantity:6,weight:9,cost:19,kv:3800,minCells:3,maxCells:4,motorCurrent:12,motorMount:'9x9'}),
    make('aio','F405 AIO · 25A','Flight controller',{quantity:1,weight:8,cost:79,minCells:2,maxCells:4,escCurrent:25,uarts:3,connector:'XT30',stackMount:'25.5x25.5'}),
    make('prop','3×2×3 tri-blade','Propeller',{quantity:12,weight:1.4,cost:1.25,propSize:3}),
    make('battery','4S 650 mAh','Battery',{quantity:3,weight:78,cost:24,minCells:4,maxCells:4,connector:'XT30'}),
    make('vtx','Compact digital VTX','VTX',{quantity:1,weight:8,cost:115,minCells:2,maxCells:6,video:'HDZero'}),
    make('camera','Nano digital camera','Camera',{quantity:1,weight:3,cost:65,video:'HDZero'}),
    make('rx','ELRS 2.4 GHz receiver','Receiver',{quantity:2,weight:0.6,cost:21,protocol:'CRSF',notes:'ExpressLRS serial receiver; uses CRSF between receiver and flight controller.'}),
  ];
  const build={...blankBuild('scout'),name:'Scout / 3″ digital',cells:4,connector:'XT30',video:'HDZero',protocol:'CRSF',notes:'Example build. Replace these illustrative specs with your own verified parts.',items:parts.map(p=>({partId:p.id,quantity:p.category==='Motor'||p.category==='Propeller'?4:1,uart:p.category==='VTX'?1:p.category==='Receiver'?2:null}))};
  return stateSchema.parse({version:1,parts,builds:[build]});
}
