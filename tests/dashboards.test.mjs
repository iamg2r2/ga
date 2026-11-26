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

test('Programming Smart Devices faculty dashboard renders accessible teaching route',()=>{
 const lesson={id:'l1',unit_no:1,teaching_hour:1,title:'Dart basics'};
 const html=dashboard({isSmartDevices:()=>true,title,activeCourse:()=>({code:'25PCA2CC04'}),data:{lessons:[lesson],requests:[],enrollments:[]},liveSession:()=>null,topicIsUnlocked:()=>true,currentLesson:()=>lesson,isFaculty:()=>true,E,A:E,unitNames:['Dart','Flutter','UI','Themes','Cloud'],resourceCards:()=>'',accessibleLessons:()=>[lesson]});
 assert.match(html,/Your teaching route/);
 assert.match(html,/Dart basics/);
 assert.match(html,/data-unit="1"/);
});
