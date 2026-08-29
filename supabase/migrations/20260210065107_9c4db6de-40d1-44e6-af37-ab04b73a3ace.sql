-- Reactivate all soft-deleted CBC-senior subjects across all schools
-- These subjects were incorrectly deactivated and should be available
UPDATE subjects
SET is_active = true
WHERE curriculum = 'cbc-senior' 
  AND is_active = false;