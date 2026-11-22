import test from 'node:test';
import assert from 'node:assert/strict';
import {manualPage} from '../pages/study-manual.js';
import {labPage} from '../pages/lab-studio.js';
const E=x=>String(x??'');
const title=(_a,b)=>'<h1>'+b+'</h1>';
test('manual for another course does not expose Flutter content',()=>{
 const html=manualPage({isSmartDevices:()=>false,activeCourse:()=>({code:'OTHER'}),title,E});
 assert.match(html,/Course study notes/);
 assert.doesNotMatch(html,/Annotated program/);
});
test('lab studio for another course does not expose Flutter practicals',()=>{
 const html=labPage({isSmartDevices:()=>false,title});
 assert.match(html,/No practical record for this course/);
 assert.doesNotMatch(html,/Lab Record Studio/);
});
