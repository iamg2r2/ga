import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonsPage,studyBody} from '../pages/study-notes.js';
const E=x=>String(x??'');
const title=(_a,b)=>'<h1>'+b+'</h1>';
test('locked student has no lesson content',()=>{
 const html=lessonsPage({accessibleLessons:()=>[],currentLesson:()=>null,isFaculty:()=>false,title});
 assert.match(html,/No released topics yet/);
 assert.doesNotMatch(html,/Syntax and annotated example/);
});
test('lesson notes render explanation and example',()=>{
 const html=studyBody({id:'lesson-1'},{concept:'Dart variables',code:'var x = 1;',key_points:['Types']},{data:{notes:[]},isFaculty:()=>true,E});
 assert.match(html,/Dart variables/);
 assert.match(html,/var x = 1;/);
});
