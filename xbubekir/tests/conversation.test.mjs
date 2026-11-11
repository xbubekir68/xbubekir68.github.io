import test from 'node:test';
import assert from 'node:assert/strict';
import {revisionWork,acceptRevision,selectVariant,editBranch} from '../conversation.js';
import {splitDataset,dialogueKey} from '../training/split_dataset.mjs';
const chat=()=>({id:'old',provider:'gemini',model:'test',system:'fixed',tools:[],msgs:[{role:'user',content:'Frage'},{role:'assistant',content:[{text:'Original',thoughtSignature:'signed'}]}]});
test('Regeneration isolates all changes until success',()=>{
 const c=chat(),before=structuredClone(c),w=revisionWork(c,0);
 w.msgs[0].skip=true;w.msgs.push({role:'assistant',content:'broken'});
 assert.deepEqual(c,before);assert.equal(acceptRevision(c,w,0),false);assert.deepEqual(c,before);
 assert.equal(acceptRevision(c,revisionWork(c,0),0),false);
});
test('Variants preserve provider blocks, follow-ups and survive serialization',()=>{
 let c=chat(),w=revisionWork(c,0);w.msgs.push({role:'assistant',content:[{text:'Second'}]});
 assert.equal(acceptRevision(c,w,0),true);
 c.msgs.push({role:'user',content:'Follow-up'},{role:'assistant',content:[{text:'Follow-up answer'}]});
 c=JSON.parse(JSON.stringify(c));
 assert.equal(selectVariant(c,0,0),true);assert.equal(c.msgs.length,2);assert.equal(c.msgs[1].content[0].thoughtSignature,'signed');
 assert.equal(selectVariant(c,0,1),true);assert.equal(c.msgs.length,4);assert.equal(c.msgs[3].content[0].text,'Follow-up answer');
 assert.equal(selectVariant(c,0,99),false);assert.equal(selectVariant(c,0,-1),false);
});
test('Repeated regeneration keeps all versions without recursive active snapshots',()=>{
 const c=chat();
 for(let n=0;n<5;n++){const w=revisionWork(c,0);w.msgs.push({role:'assistant',content:String(n)});acceptRevision(c,w,0)}
 assert.equal(c.msgs[0].variants.length,6);assert.equal(c.msgs[0].variants[5],null);
 selectVariant(c,0,2);assert.equal(c.msgs[1].content,'1');
 const restored=JSON.parse(JSON.stringify(c));selectVariant(restored,0,0);assert.equal(restored.msgs[1].content[0].text,'Original');
});
test('Editing forks selected context and retains original chat',()=>{
 const c=chat(),before=structuredClone(c),next=editBranch(c,0,' New question ','new',123);
 assert.deepEqual(c,before);assert.equal(next.system,c.system);assert.equal(next.created,123);
 assert.deepEqual(next.msgs,[{role:'user',content:'New question'}]);assert.equal(next.id,'new');
 assert.equal(editBranch(c,1,'change','no'),null);assert.equal(editBranch(c,0,' ','no'),null);
});
test('Grouped split happens before weighting and merges exact duplicate groups',()=>{
 const conv=x=>({messages:[{role:'system',content:'test'},{role:'user',content:x},{role:'assistant',content:'Answer '+x}]});
 const rows=Array.from({length:30},(_,i)=>({group:'family-'+Math.floor(i/2),weight:3,conversation:conv('question-'+i)}));
 rows.push({...rows[0],group:'duplicate-family'});
 const a=splitDataset(rows,.2),b=splitDataset(rows,.2);
 assert.deepEqual(a,b);
 const tr=new Set(a.train.map(dialogueKey)),ev=a.evaluation.map(dialogueKey);
 assert.ok(ev.every(x=>!tr.has(x)));assert.equal(new Set(ev).size,ev.length);
 const groups=new Set(a.manifest.train.map(x=>x.group));assert.ok(a.manifest.eval.every(x=>!groups.has(x.group)));
 assert.equal(a.train.length%3,0);assert.equal(a.train.length/3+a.evaluation.length,30);
});

test('Retrying an unanswered question does not create an empty answer variant',()=>{
 const c=chat();c.msgs.pop();const w=revisionWork(c,0);w.msgs.push({role:'assistant',content:[{text:'First answer'}]});
 assert.equal(acceptRevision(c,w,0),true);assert.equal(c.msgs[0].variants,undefined);assert.equal(c.msgs.length,2);
});
