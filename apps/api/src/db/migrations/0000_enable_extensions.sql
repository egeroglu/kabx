-- Kabx: gerekli Postgres eklentileri.
--
-- pgvector, gardırop parçalarının ve katalog ürünlerinin embedding'leri için
-- (BACKEND_SPEC §2, §5.4). Faz 4'te vector(768) sütunu ve HNSW indeksi bu
-- eklentiye dayanacak; eklentiyi en baştan açıyoruz ki migration zinciri
-- boyunca hep mevcut olsun.
CREATE EXTENSION IF NOT EXISTS vector;
