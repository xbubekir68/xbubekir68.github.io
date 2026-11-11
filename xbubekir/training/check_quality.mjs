// Modellantworten getrennt je provider/model prüfen. Regeln ersetzen keine fachliche Prüfung.
// Input JSONL: {case_id, provider, model, output, review_pass?:boolean, review_note?:string}
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('./quality-cases.json',import.meta.url),'utf8'));
export function checkAnswer(c,output){
 const failures=[];
 if(typeof output!=='string'||!output.trim())return ['Leere Antwort'];
 if(c.max_words&&output.trim().split(/\s+/).length>c.max_words)failures.push('Längenvorgabe überschritten');
 for(const pattern of c.required||[])if(!new RegExp(pattern,'iu').test(output))failures.push('Fehlt: '+pattern);
 for(const pattern of c.forbidden||[])if(new RegExp(pattern,'iu').test(output))failures.push('Unerwünscht: '+pattern);
 if(/^(Gute Frage[!.]|Gern helfe ich|Als KI-Modell)/iu.test(output.trim()))failures.push('Floskel am Einstieg');
 return failures;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 if(!process.argv[2]){console.error('Aufruf: node xbubekir/training/check_quality.mjs antworten.jsonl');process.exit(1)}
 const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),groups=new Map();
 let failed=false;
 for(const row of rows){
  if(!row.provider||!row.model||!cases.some(c=>c.id===row.case_id))throw new Error('Unbekannter Test oder fehlende Modellkennung');
  const key=row.provider+'/'+row.model;if(!groups.has(key))groups.set(key,new Map());
  if(groups.get(key).has(row.case_id))throw new Error('Doppelte Antwort: '+key+'/'+row.case_id);
  groups.get(key).set(row.case_id,row);
 }
 if(!groups.size)throw new Error('Keine Modellantworten');
 const report=[...groups].map(([model,answers])=>({model,cases:cases.map(c=>{
  const a=answers.get(c.id),failures=a?checkAnswer(c,a.output):['Antwort fehlt'];
  if(failures.length||a?.review_pass!==true)failed=true;
  return {id:c.id,failures,manual_review:a?.review_pass??'offen',review_criteria:c.review,review_note:a?.review_note||''};
 })}));
 console.log(JSON.stringify(report,null,2));process.exitCode=failed?1:0;
}
