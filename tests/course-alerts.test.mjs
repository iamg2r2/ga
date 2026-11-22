import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCourseAlerts} from '../services/course-alerts.js';

test('isolates notifications by offering and preserves release order',()=>{
 const alerts=buildCourseAlerts(
  [{id:'course-a'},{id:'course-b'}],
  [{id:'session-a',offering_id:'course-a',status:'live'},{id:'session-b',offering_id:'course-b',status:'ended'}],
  [{id:'release-b',session_id:'session-b',released_at:'2026-11-22'},{id:'release-a',session_id:'session-a',released_at:'2026-11-21'},{id:'orphan',session_id:'unknown'}]
 );
 assert.deepEqual(alerts,[
  {offeringId:'course-a',live:true,releases:[{id:'release-a',released_at:'2026-11-21'}]},
  {offeringId:'course-b',live:false,releases:[{id:'release-b',released_at:'2026-11-22'}]}
 ]);
});
test('handles empty course alerts',()=>assert.deepEqual(buildCourseAlerts([],[],[]),[]));
