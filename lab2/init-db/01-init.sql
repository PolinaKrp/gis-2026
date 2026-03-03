-- Здания
CREATE TABLE IF NOT EXISTS buildings AS 
SELECT * FROM tmp_layer 
WHERE building IS NOT NULL AND building != '';
ALTER TABLE buildings DROP COLUMN IF EXISTS id;
ALTER TABLE buildings ADD COLUMN id SERIAL PRIMARY KEY;
CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST (geom);

-- Дороги 
CREATE TABLE IF NOT EXISTS roads AS 
SELECT * FROM tmp_layer 
WHERE highway IS NOT NULL;
ALTER TABLE roads DROP COLUMN IF EXISTS id;
ALTER TABLE roads ADD COLUMN id SERIAL PRIMARY KEY;
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST (geom);

-- POI
CREATE TABLE IF NOT EXISTS pois AS 
SELECT * FROM tmp_layer 
WHERE power IS NOT NULL OR railway IS NOT NULL OR barrier IS NOT NULL;
ALTER TABLE pois DROP COLUMN IF EXISTS id;
ALTER TABLE pois ADD COLUMN id SERIAL PRIMARY KEY;
CREATE INDEX IF NOT EXISTS idx_pois_geom ON pois USING GIST (geom);



-- 1. Список таблиц
-- docker compose exec postgis psql -U gisuser -d gis -c "\dt"

-- 2. Primary Keys
-- docker compose exec postgis psql -U gisuser -d gis -c "
-- SELECT table_name, constraint_name 
-- FROM information_schema.table_constraints 
-- WHERE constraint_type = 'PRIMARY KEY' 
-- AND table_name IN ('buildings', 'roads', 'pois');
-- "

-- 3. Индексы
-- docker compose exec postgis psql -U gisuser -d gis -c "
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%';
-- "

-- 4. Количество записей
-- docker compose exec postgis psql -U gisuser -d gis -c "
-- SELECT 'buildings' as table_name, COUNT(*) FROM buildings
-- UNION ALL
-- SELECT 'roads', COUNT(*) FROM roads
-- UNION ALL
-- SELECT 'pois', COUNT(*) FROM pois;
-- "