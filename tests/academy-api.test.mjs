// Run: node --experimental-default-type=module --test tests/academy-api.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {AcademyApi} from '../services/academy-api.js';

function fixture(){
  const storage=new Map([['g2r2-offering','offering-1']]);
  globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const api=new AcademyApi({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'test'});
  api.session={user:{id:'student-1'}};
  const calls=[];
  const tables={
    profiles:[{user_id:'student-1',account_role:'student'}],
    offerings:[{id:'offering-1',course_id:'course-1'}],
    courses:[{id:'course-1',title:'Programming Smart Devices'}],
    class_sessions:[{id:'session-1',offering_id:'offering-1',status:'live'}],
    activity_releases:[{id:'release-1',session_id:'session-1',released_at:new Date().toISOString()}],
    lessons:[{id:'lesson-1',course_id:'course-1'}],
    lesson_materials:[{lesson_id:'lesson-1',published:true}],
    activities:[{id:'activity-1',lesson_id:'lesson-1'}],
    personal_notes:[{student_id:'student-1',lesson_id:'lesson-1'}]
  };
  api.table=async (name,params={})=>{calls.push({name,params});return tables[name]||[]};
  api.rpc=async()=>[];
  return {api,calls};
}
test('My Courses does not fetch course workspace datasets',async()=>{
  const {api,calls}=fixture();
  const data=await api.load({coursesOnly:true});
  assert.equal(data.offerings.length,1);
  assert.equal(data.courseAlerts[0].live,true);
  assert.equal(data.courseAlerts[0].releases.length,1);
  for(const name of ['lessons','lesson_materials','lab_practicals','attendance','profiles_all','registered_devices','activities','enrollments']){
    assert.equal(calls.filter(c=>c.name===name).length,0,name+' should not be fetched');
  }
  assert.equal(calls.filter(c=>c.name==='profiles').length,1);
});
test('Entering a course loads scoped lesson content',async()=>{
  const {api,calls}=fixture();
  const data=await api.load();
  assert.equal(data.lessons[0].id,'lesson-1');
  assert.equal(data.materials[0].lesson_id,'lesson-1');
  assert.equal(data.activities[0].lesson_id,'lesson-1');
  const materialCall=calls.find(c=>c.name==='lesson_materials');
  assert.equal(materialCall.params.lesson_id,'in.(lesson-1)');
  assert.equal(calls.find(c=>c.name==='personal_notes').params.student_id,'eq.student-1');
});
