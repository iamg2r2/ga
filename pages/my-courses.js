// Shared course-selection home for faculty and students.
// All courses and notifications originate from Supabase RLS-filtered queries.
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const seenKey=(user,offering)=>'g2r2-course-alert-seen:'+user+':'+offering;
export function markCourseVisited(userId,offeringId){
 if(!userId||!offeringId)return;
 try{localStorage.setItem(seenKey(userId,offeringId),new Date().toISOString())}catch{}
}
export function alertsFor(d,offeringId){
 const a=d?.courseAlerts?.find(row=>row.offeringId===offeringId);
 if(!a)return {live:false,activityCount:0};
 let seen=0;try{seen=Date.parse(localStorage.getItem(seenKey(d?.me?.user_id,offeringId))||'')||0}catch{}
 const activityCount=(a.releases||[]).filter(r=>{
   const when=Date.parse(r.released_at||'')||0;
   return when>seen&&when>Date.now()-48*60*60*1000;
 }).length;
 return {live:!!a.live,activityCount};
}
export function courseAlertCount(d){
 return (d?.offerings||[]).reduce((n,o)=>{
   const a=alertsFor(d,o.id);
   return n+(a.live?1:0)+a.activityCount;
 },0);
}
export function myCoursesPage(d,faculty){
 const offerings=d?.offerings||[], courses=d?.courses||[];
 const listed=offerings.map(o=>{
  const c=courses.find(c=>c.id===o.course_id)||{}, a=alertsFor(d,o.id);
  return {o,c,a};
 });
 const liveCourses=listed.filter(x=>x.a.live);
 const section=liveCourses.length?'<div class="my-courses-live" role="status"><span class="my-courses-live-dot" aria-hidden="true"></span><div><strong>'+liveCourses.length+' '+(liveCourses.length===1?'class is':'classes are')+' live now</strong><p>'+(faculty?'Your classroom is active.':'Select a course to join the classroom.')+'</p></div></div>':'';
 const cards=listed.map(({o,c,a})=>{
  const name=escapeHTML(c.title||'Untitled course'),code=escapeHTML(c.code||'Course');
  const batch=escapeHTML(o.batch||'Batch'),semester=escapeHTML(o.semester||'');
  const activity=a.activityCount?'<span class="my-course-activity">'+a.activityCount+' new '+(a.activityCount===1?'activity':'activities')+'</span>':'';
  return '<article class="my-course-card"><div class="my-course-icon" aria-hidden="true">▤</div><div class="my-course-details"><span class="my-course-code">'+code+'</span><h2>'+name+'</h2><p>'+batch+(semester?' · Semester '+semester:'')+'</p></div><div class="my-course-status">'+(a.live?'<span class="my-course-live-label"><span class="my-courses-live-dot" aria-hidden="true"></span> LIVE NOW</span>':'')+activity+'</div><div class="my-course-actions"><button class="btn primary" data-action="open-course" data-id="'+escapeHTML(o.id)+'">'+(faculty?'Manage course':'Enter course')+' →</button>'+(a.live?'<button class="btn outline" data-action="join-course" data-id="'+escapeHTML(o.id)+'">'+(faculty?'Open classroom':'Join live class')+'</button>':'')+'</div></article>';
 }).join('');
 return '<section class="my-courses-page"><div class="my-courses-heading"><span class="eyebrow">G2R2 ACADEMY · '+(faculty?'FACULTY':'STUDENT')+'</span><h1>My Courses</h1><p>'+(faculty?'Choose a course to manage your teaching.':'Choose a course to continue learning. Live classes and new activities appear here.')+'</p></div>'+section+'<div class="my-courses-grid">'+(cards||'<div class="card my-courses-empty"><h2>No courses assigned yet</h2><p>'+(faculty?'Ask an administrator to assign your teaching courses.':'Your faculty will enrol you into your courses.')+'</p></div>')+'</div></section>';
}
