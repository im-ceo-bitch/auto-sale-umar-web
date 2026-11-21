-- Add Porsche showroom film 03 after the existing Porsche and Rolls-Royce films.
-- Film bytes are stored in R2 by scripts/configure-worker.mjs.
INSERT OR IGNORE INTO showroom_idle_videos (id,title,object_key,sort_order) VALUES
 ('film-03','Showroom Film 03 · Porsche','showroom/idle/film-03.mp4',30);
