// Course-scoped alert aggregation shared by the API and test suite.
// Never use this client-side data to authorize access; Supabase RLS is authoritative.
export function buildCourseAlerts(offerings,sessions,releases){
  const sessionOfferings=new Map(sessions.map(s=>[s.id,s.offering_id]));
  const releasesByOffering=new Map();
  const liveOfferings=new Set();
  for(const s of sessions)if(s.status==='live')liveOfferings.add(s.offering_id);
  for(const r of releases){
    const offeringId=sessionOfferings.get(r.session_id);
    if(!offeringId)continue;
    if(!releasesByOffering.has(offeringId))releasesByOffering.set(offeringId,[]);
    releasesByOffering.get(offeringId).push({id:r.id,released_at:r.released_at});
  }
  return offerings.map(o=>({
    offeringId:o.id,
    live:liveOfferings.has(o.id),
    releases:releasesByOffering.get(o.id)||[]
  }));
}
