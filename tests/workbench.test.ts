import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { demoState } from '../src/demo';
import { compatibility, installed, stateSchema, totals } from '../src/model';

test('example manifest totals account for individual motors, props and battery',()=>{
  const state=demoState();
  const total=totals(state,state.builds[0]);
  assert.equal(total.weight,187.2);
  assert.equal(total.cost,427);
  assert.equal(total.missingWeight,0);
  assert.equal(compatibility(state,state.builds[0]).filter(c=>c.level==='error').length,0);
});
test('installation reserves units and rejects oversubscription across builds',()=>{
  const state=demoState(), build={...state.builds[0],status:'Installed' as const};
  const next=stateSchema.parse({...state,builds:[build]});
  assert.equal(installed(next,'motor',''),4);
  assert.throws(()=>stateSchema.parse({...next,builds:[build,{...build,id:'second'}]}),/installed but only/);
  assert.equal(installed(state,'motor',''),0);
});
test('incompatible voltage, clearance, receiver and conflicting UARTs are visible',()=>{
  const state=demoState();
  const build={...state.builds[0],cells:6,protocol:'SBUS',items:state.builds[0].items.map(i=>i.partId==='rx'?{...i,uart:1}:i)};
  const parts=state.parts.map(p=>p.id==='prop'?{...p,propSize:4}:p);
  const errors=compatibility({...state,parts},build).filter(c=>c.level==='error');
  for(const title of ['Prop clearance','UART1 conflict','1404 · 3800 KV · voltage','ELRS 2.4 GHz receiver · Receiver protocol']) assert.ok(errors.some(c=>c.title===title),title);
});
test('unknown totals and specifications remain explicit',()=>{
  const state=demoState(),parts=state.parts.map(p=>p.id==='motor'?{...p,weight:null,cost:null,motorCurrent:null}:p);
  const next={...state,parts};
  assert.equal(totals(next,state.builds[0]).missingWeight,4);
  assert.equal(totals(next,state.builds[0]).missingCost,4);
  assert.ok(compatibility(next,state.builds[0]).some(c=>c.title==='ESC current headroom'&&c.level==='unknown'));
});
test('backup validation rejects dangling references, duplicate IDs and invalid photo data',()=>{
  const state=demoState();
  assert.throws(()=>stateSchema.parse({...state,parts:state.parts.slice(1)}),/missing part/);
  assert.throws(()=>stateSchema.parse({...state,parts:[...state.parts,state.parts[0]]}),/Duplicate/);
  assert.throws(()=>stateSchema.parse({...state,parts:state.parts.map(p=>({...p,photo:'javascript:alert(1)'}))}),/Photo/);
  assert.deepEqual(stateSchema.parse(JSON.parse(JSON.stringify(state))),state);
});
