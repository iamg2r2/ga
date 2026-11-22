import test from 'node:test';
import assert from 'node:assert/strict';
import {facultyPage,recordsPage} from '../pages/administration.js';
const E=s=>String(s??'').replaceAll('<','&lt;').replaceAll('>','&gt;');
const title=(_tag,name)=>'<h1>'+E(name)+'</h1>';
test('faculty administration renders empty state and add forms',()=>{
 const html=facultyPage({facultyData:{faculty:[],courses:[],offerings:[],assignments:[]},title,E});
 assert.match(html,/Add faculty/);
 assert.match(html,/Manage faculty/);
 assert.match(html,/Add another course/);
});
test('records page protects destructive controls from non-admin faculty',()=>{
 const data={courses:[{id:'c1',code:'COURSE1'}],offerings:[{id:'o1',course_id:'c1'}],offeringId:'o1',sessions:[],lessons:[],activities:[]};
 const faculty=recordsPage({data,title,E,isAdmin:()=>false});
 const admin=recordsPage({data,title,E,isAdmin:()=>true});
 assert.doesNotMatch(faculty,/data-action="class-reset"/);
 assert.match(admin,/data-action="class-reset"/);
});
