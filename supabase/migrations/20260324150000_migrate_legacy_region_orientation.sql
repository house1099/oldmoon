-- 將舊問卷英文 slug 轉為現行繁中 region／新 orientation slug。
-- 請於 Supabase SQL Editor 確認後手動執行（勿在未知環境自動跑）。

-- 更新舊 region 值（歷史 schema 離島曾為 islands）
UPDATE public.users SET region = '台灣・北部' WHERE region = 'north';
UPDATE public.users SET region = '台灣・中部' WHERE region = 'central';
UPDATE public.users SET region = '台灣・南部' WHERE region = 'south';
UPDATE public.users SET region = '台灣・東部' WHERE region = 'east';
UPDATE public.users SET region = '台灣・離島' WHERE region = 'island';
UPDATE public.users SET region = '台灣・離島' WHERE region = 'islands';
UPDATE public.users SET region = '海外' WHERE region = 'overseas';
UPDATE public.users SET region = '其他' WHERE region = 'other';

-- 更新舊 orientation 值
UPDATE public.users SET orientation = 'heterosexual' WHERE orientation = 'straight';
UPDATE public.users SET orientation = 'homosexual' WHERE orientation IN ('gay', 'lesbian');
UPDATE public.users SET orientation = 'pansexual' WHERE orientation IN ('bisexual', 'pan');
