/* GTFS licensed data is not present yet. OFF is intentional.
 * After written MÁV permission and publication rights verification, put an
 * authorized focused snapshot in ./data/rail-schedule.json, then switch ON.
 * Until then: no request, no tracking, no phantom timetable.
 */
window.SH9_MAV_GTFS_CONFIG=Object.freeze({
 enabled:false,
 url:'./data/rail-schedule.json',
 maxBytes:8*1024*1024
});
