import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkAnswer} from '../training/check_quality.mjs';
test('Quality checks reject invented commitments, boilerplate and missing facts',()=>{
 assert.deepEqual(checkAnswer({max_words:3,required:['120']},'120 Minuten.'),[]);
 assert.ok(checkAnswer({forbidden:['lade dich']},'Ich lade dich ein.').length);
 assert.ok(checkAnswer({},'Gute Frage! Hier ist eine Antwort.').length);
 assert.ok(checkAnswer({required:['42']},'44.').length);
 assert.ok(checkAnswer({},'').length);
});
test('Independent task prompts are absent from training and evaluation dialogues',()=>{
 const cases=JSON.parse(fs.readFileSync(new URL('../training/quality-cases.json',import.meta.url),'utf8'));
 const prompts=new Set(['train','eval'].flatMap(f=>fs.readFileSync(new URL(`../training/${f}.jsonl`,import.meta.url),'utf8').trim().split('\n').flatMap(l=>JSON.parse(l).messages.filter(m=>m.role==='user').map(m=>m.content))));
 for(const c of cases)assert.ok(!prompts.has(c.messages[0].content),c.id);
});
