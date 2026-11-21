-- Film 05: retain existing films 03 and 04; remove only the two initial fallback films.
-- No car, account, or unrelated media records are touched.
DELETE FROM showroom_idle_videos WHERE id IN ('porsche', 'rolls-royce');
UPDATE showroom_idle_videos SET sort_order = 10 WHERE id = 'film-03';
UPDATE showroom_idle_videos SET sort_order = 20 WHERE id = 'film-04';
INSERT INTO showroom_idle_videos (id,title,object_key,sort_order,enabled)
VALUES ('film-05','Showroom Film 05','showroom/idle/film-05.mp4',30,1)
ON CONFLICT(id) DO UPDATE SET
 title=excluded.title,
 object_key=excluded.object_key,
 sort_order=excluded.sort_order,
 enabled=excluded.enabled;
