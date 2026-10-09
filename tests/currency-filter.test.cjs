const fs=require('fs');const esbuild=require('esbuild');const assert=require('node:assert/strict');
(async()=>{
 const result=await esbuild.build({stdin:{contents:`export * from './src/controllers/searchData'; export * from './src/middleware/otherFunc'; export { default as Plugin, stateManager } from './main';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(^obsidian$|\/main$)/},a=>({path:a.path==='obsidian'?'obsidian':'main',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='obsidian'?'export class Notice {}':`let state={selectedYear:'2026',selectedMonth:'10',selectedCurrency:null}; export function stateManager(update){if(update)state={...state,...update};return state;} export default class Plugin { static instance; }`,loader:'js'}));}}]});
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);const api=mod.exports;
 const tx=(id,bill,amount)=>({id,bill:{id:bill},category:{id:'food'},type:'expense',amount,date:'2026-10-09'});
 const files={accounts:{accounts:[{id:'u',currency:'USD',balance:'100',generalBalance:true},{id:'e',currency:'EUR',balance:'200',generalBalance:true}]},categories:{categories:{expenditure_plan:[{id:'food',type:'expense'}],income_plan:[]}},2026:{year:'2026',months:{10:{history:[tx('one','u','10'),tx('two','e','20')]}}}};
 api.Plugin.instance={settings:{baseCurrency:'USD'},dbPath:'db',app:{vault:{adapter:{read:async path=>JSON.stringify(files[path.replace('db/','').replace('.json','')])}}}};
 assert.equal(api.activeCurrency(),'USD');assert.equal((await api.getMainData()).jsonData.length,1);assert.equal((await api.getMainData()).jsonData[0].id,'one');assert.equal((await api.getAdditionalData('categories','expenditure_plan')).jsonData[0].amount,'10');
 api.stateManager({selectedCurrency:'EUR'});
 assert.equal((await api.getMainData()).jsonData[0].id,'two');assert.equal((await api.getAdditionalData('accounts')).jsonData[0].id,'e');assert.equal((await api.getAdditionalData('categories','expenditure_plan')).jsonData[0].amount,'20');
 assert.equal((await api.getAdditionalData('accounts',undefined,true)).jsonData.length,2);
 assert.equal((await api.getAllFile('2026')).json.months[10].history.length,2,'storage must remain unfiltered');
 assert.equal(api.stateManager().selectedMonth,'10');
 const labels=[];await api.IncomeAndExpensesForTheMonth('10','2026',{createEl:(_,o)=>labels.push(o.text)});assert.ok(labels.includes('-20'));assert.ok(!labels.includes('-30'));
 api.stateManager({selectedCurrency:'KZT'});assert.equal((await api.getMainData()).jsonData.length,0);assert.equal((await api.getAdditionalData('categories','expenditure_plan')).jsonData[0].amount,'0');
 console.log('Currency filtering checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
