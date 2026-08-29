
-- Sync CBC Senior subject pathways and subject_types from system_subjects
-- This updates existing school subjects to have the correct pathway and subject_type
-- based on the system_subjects definition

UPDATE subjects s
SET 
  pathway = ss.pathway,
  subject_type = CASE 
    WHEN ss.pathway IS NULL OR ss.pathway = 'core' THEN 'core'
    ELSE 'optional'
  END
FROM system_subjects ss
WHERE s.curriculum = 'cbc-senior'
  AND LOWER(s.name) = LOWER(ss.name)
  AND s.curriculum = ss.curriculum
  AND ss.is_active = true;
