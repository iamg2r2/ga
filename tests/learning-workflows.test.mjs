import test from 'node:test';
import assert from 'node:assert/strict';
import {practice,requests,revisions,reports} from '../pages/learning-workflows.js';
const title=(_a,b)=>'<h1>'+b+'</h1>';
const E=x=>String(x??'');
test('practice page handles no unlocked topics',()=>{
 const html=practice({data:{lessons:[]},topicIsUnlocked:()=>false,material:()=>null,title,A:E,E,state:{hour:1}});
 assert.match(html,/Unlimited practice/);
});
test('student request page renders without pending requests',()=>{
 const html=requests({data:{requests:[],lessons:[],me:{user_id:'u'},grants:[]},currentLesson:()=>null,title,isFaculty:()=>false,A:E,rowName:()=>'',E,day:()=>'',state:{},material:()=>null});
 assert.match(html,/request/i);
});
