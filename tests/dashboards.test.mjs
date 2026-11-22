import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboard,studentDashboard} from '../pages/dashboards.js';
const title=(_a,b)=>'<h1>'+b+'</h1>';
const E=x=>String(x??'');
test('faculty dashboard renders alternate course without live data',()=>{
 const html=dashboard({isSmartDevices:()=>false,title,activeCourse:()=>({code:'OTHER',title:'Other Course'}),data:{courseUnits:[]},E});
 assert.match(html,/Other Course/);
});
test('student dashboard renders alternate course without live data',()=>{
 const html=studentDashboard({isSmartDevices:()=>false,title,activeCourse:()=>({code:'OTHER',title:'Other Course'}),E});
 assert.match(html,/Other Course/);
});
