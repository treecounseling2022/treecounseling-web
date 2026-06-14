-- 補齊 therapist_profiles 缺少的欄位
-- TherapistProfileEditor 已在儲存這些欄位，但 DB 尚未建立

ALTER TABLE therapist_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS client_letter TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS orientations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}';

-- Index for auth lookup
CREATE INDEX IF NOT EXISTS therapist_profiles_auth_user_id_idx
  ON therapist_profiles(auth_user_id);
