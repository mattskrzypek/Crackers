import { z } from 'zod';

export const categories = ['Frame', 'Motor', 'Flight controller', 'ESC', 'Propeller', 'Battery', 'VTX', 'Camera', 'Receiver', 'Antenna', 'Other'] as const;
const optionalNumber = z.number().positive().nullable();
const optionalCells = z.number().int().min(1).max(12).nullable();
const photo = z.string().max(800000).refine(value => value === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value), 'Photo must be a JPEG, PNG or WebP data URL');
export const partSchema = z.object({
  id: z.string().min(1), name: z.string().min(1).max(160), category: z.enum(categories), quantity: z.number().int().min(0),
  weight: z.number().min(0).nullable(), cost: z.number().min(0).nullable(), notes: z.string().max(10000), photo,
  frameSize: optionalNumber, kv: optionalNumber, minCells: optionalCells, maxCells: optionalCells, escCurrent: optionalNumber,
  motorCurrent: optionalNumber, propSize: optionalNumber, connector: z.string().max(80), video: z.string().max(80), protocol: z.string().max(80),
  uarts: z.number().int().min(0).nullable(), motorMount: z.string().max(80), stackMount: z.string().max(80),
}).refine(p => p.minCells === null || p.maxCells === null || p.minCells <= p.maxCells, 'Minimum cell count exceeds maximum');
export const buildSchema = z.object({
  id: z.string().min(1), name: z.string().min(1).max(160), status: z.enum(['Planned', 'Installed']), cells: z.number().int().min(1).max(12),
  connector: z.string().max(80), video: z.string().max(80), protocol: z.string().max(80), betaflight: z.string().max(100), target: z.string().max(100),
  elrs: z.string().max(100), elrsTarget: z.string().max(100), notes: z.string().max(10000), photo,
  items: z.array(z.object({ partId: z.string().min(1), quantity: z.number().int().positive(), uart: z.number().int().min(1).nullable() })).max(100),
});
export const stateSchema = z.object({ version: z.literal(1), parts: z.array(partSchema).max(2000), builds: z.array(buildSchema).max(200) }).superRefine((state, ctx) => {
  const ids = state.parts.map(p => p.id);
  if (new Set(ids).size !== ids.length || new Set(state.builds.map(b => b.id)).size !== state.builds.length) ctx.addIssue({code:'custom', message:'Duplicate record IDs'});
  for (const b of state.builds) {
    if (new Set(b.items.map(i => i.partId)).size !== b.items.length) ctx.addIssue({code:'custom', message:`${b.name}: duplicate parts`});
    for (const i of b.items) if (!ids.includes(i.partId)) ctx.addIssue({code:'custom', message:`${b.name}: missing part ${i.partId}`});
  }
  for (const p of state.parts) {
    const used = state.builds.filter(b => b.status === 'Installed').flatMap(b => b.items).filter(i => i.partId === p.id).reduce((sum, i) => sum + i.quantity, 0);
    if (used > p.quantity) ctx.addIssue({code:'custom', message:`${p.name}: ${used} installed but only ${p.quantity} owned`});
  }
});
export type Part = z.infer<typeof partSchema>;
export type Build = z.infer<typeof buildSchema>;
export type State = z.infer<typeof stateSchema>;
export type Check = { level: 'pass' | 'warning' | 'error' | 'unknown'; title: string; detail: string };
export const emptyState: State = {version:1, parts:[], builds:[]};
export function blankPart(id: string): Part {
  return {id,name:'',category:'Frame',quantity:1,weight:null,cost:null,notes:'',photo:'',frameSize:null,kv:null,minCells:null,maxCells:null,escCurrent:null,motorCurrent:null,propSize:null,connector:'',video:'',protocol:'',uarts:null,motorMount:'',stackMount:''};
}
export function blankBuild(id: string): Build {
  return {id,name:'',status:'Planned',cells:1,connector:'',video:'',protocol:'',betaflight:'',target:'',elrs:'',elrsTarget:'',notes:'',photo:'',items:[]};
}
export function installed(state: State, id: string, excludingBuild: string): number {
  return state.builds.filter(b => b.status === 'Installed' && b.id !== excludingBuild).flatMap(b => b.items).filter(i => i.partId === id).reduce((n,i) => n+i.quantity,0);
}
export function totals(state: State, build: Build): {weight:number; cost:number; missingWeight:number; missingCost:number} {
  return build.items.reduce((sum,item) => {
    const p = state.parts.find(p => p.id === item.partId);
    if (!p) throw new Error(`Build ${build.name} references missing part ${item.partId}`);
    return {weight:sum.weight+(p.weight ?? 0)*item.quantity,cost:sum.cost+(p.cost ?? 0)*item.quantity,missingWeight:sum.missingWeight+(p.weight === null ? item.quantity:0),missingCost:sum.missingCost+(p.cost === null ? item.quantity:0)};
  }, {weight:0,cost:0,missingWeight:0,missingCost:0});
}

/** Declarative checks use supplied component limits; they do not certify flight safety or estimate current from KV. */
export function compatibility(state: State, build: Build): Check[] {
  const checks: Check[] = [];
  const rows = build.items.map(item => {
    const part = state.parts.find(p => p.id === item.partId);
    if (!part) throw new Error(`Missing part ${item.partId}`);
    return {part,item};
  });
  const add = (level:Check['level'],title:string,detail:string):void => {checks.push({level,title,detail});};
  for (const category of ['Frame','Motor','Flight controller','Propeller','Battery','Receiver'] as const) {
    if (!rows.some(r => r.part.category === category)) add('unknown',`${category} missing`,'Add this component to complete the build checks.');
  }
  if (!rows.some(r=>r.part.category==='ESC') && !rows.some(r=>r.part.category==='Flight controller' && r.part.escCurrent!==null)) add('unknown','ESC missing','Add an ESC or enter the integrated ESC rating on the flight controller.');
  for (const {part:p,item} of rows) {
    const spare = p.quantity-installed(state,p.id,build.id);
    add(spare < item.quantity ? 'error':'pass',`${p.name} · stock`,`${item.quantity} needed / ${spare} available outside this build.`);
    if (['Motor','Flight controller','ESC','Battery','VTX'].includes(p.category)) {
      if (p.minCells === null || p.maxCells === null) add('unknown',`${p.name} · voltage`,'Enter manufacturer minimum and maximum cell count.');
      else add(build.cells < p.minCells || build.cells > p.maxCells ? 'error':'pass',`${p.name} · voltage`,`${build.cells}S build / ${p.minCells}–${p.maxCells}S rated.`);
    }
    for (const [field,label] of [['connector','Battery connector'],['video','Video system'],['protocol','Receiver protocol']] as const) {
      const relevant = field==='connector' ? p.category==='Battery' || p.category==='Flight controller' || p.category==='ESC' : field==='video' ? p.category==='Camera' || p.category==='VTX' : p.category==='Receiver';
      if (relevant) {
        if (!p[field] || !build[field]) add('unknown',`${p.name} · ${label}`,'Enter both part and build specifications.');
        else add(p[field].toLowerCase()===build[field].toLowerCase()?'pass':'error',`${p.name} · ${label}`,`${p[field]} component / ${build[field]} build.`);
      }
    }
    if (p.category==='Motor' && p.kv === null) add('unknown',`${p.name} · KV`,'Record KV and verify the manufacturer prop/voltage combination.');
    if (p.category==='Motor' && p.kv !== null) add('warning',`${p.name} · ${p.kv} KV`,'KV is recorded; verify this prop and cell count against manufacturer test data.');
  }
  const frame = rows.find(r=>r.part.category==='Frame')?.part;
  const fc = rows.find(r=>r.part.category==='Flight controller')?.part;
  for (const {part:p} of rows.filter(r=>r.part.category==='Propeller')) {
    if (!frame || frame.frameSize===null || p.propSize===null) add('unknown','Prop clearance','Enter maximum frame prop size and prop diameter.');
    else add(p.propSize > frame.frameSize ? 'error':'pass','Prop clearance',`${p.propSize}″ props / ${frame.frameSize}″ frame limit.`);
  }
  for (const [part,limit,label] of [[fc,frame?.stackMount,'Stack mount'],[rows.find(r=>r.part.category==='Motor')?.part,frame?.motorMount,'Motor mount']] as const) {
    const mount = label==='Stack mount' ? part?.stackMount:part?.motorMount;
    if (!mount || !limit) add('unknown',label,'Enter mounting patterns on both components.');
    else add(mount.toLowerCase()===limit.toLowerCase()?'pass':'error',label,`${mount} / frame ${limit}.`);
  }
  const esc = rows.find(r=>r.part.category==='ESC')?.part ?? fc;
  for (const {part:p} of rows.filter(r=>r.part.category==='Motor')) {
    if (p.motorCurrent===null || !esc || esc.escCurrent===null) add('unknown','ESC current headroom','Enter measured per-motor maximum current for this exact prop/voltage setup and continuous per-channel ESC rating.');
    else {const ratio=p.motorCurrent/esc.escCurrent; add(ratio>1?'error':ratio>0.8?'warning':'pass','ESC current headroom',`${p.motorCurrent}A measured / ${esc.escCurrent}A per channel. 20% headroom is a planning guideline.`);}
  }
  const ports = new Map<number,string>();
  for (const {part:p,item} of rows) {
    const needsPort = p.category==='Receiver' && p.protocol !== 'SPI ELRS' || p.category==='VTX' && ['DJI','HDZero','Walksnail'].includes(p.video);
    if (needsPort && item.uart===null) add('unknown',`${p.name} · UART`,'Assign the serial receiver or digital VTX to its physical UART.');
    if (item.uart!==null) {
      if (ports.has(item.uart)) add('error',`UART${item.uart} conflict`,`${p.name} and ${ports.get(item.uart)} share a port. This MVP reserves one device per UART; verify protocol-specific exceptions manually.`);
      else {ports.set(item.uart,p.name); add('pass',`UART${item.uart}`,p.name);}
      if (!fc || fc.uarts===null) add('unknown','UART capacity','Enter flight controller UART count.');
      else if (item.uart>fc.uarts) add('error','UART unavailable',`UART${item.uart} exceeds the recorded ${fc.uarts} UARTs.`);
    }
  }
  const motorCount=rows.filter(r=>r.part.category==='Motor').reduce((n,r)=>n+r.item.quantity,0);
  if (motorCount!==4) add('warning','Quad motor count',`${motorCount} motors assigned; a typical quad needs four.`);
  const propCount=rows.filter(r=>r.part.category==='Propeller').reduce((n,r)=>n+r.item.quantity,0);
  if (propCount!==4) add('warning','Quad prop count',`${propCount} individual props assigned; a typical quad needs four.`);
  return checks;
}
