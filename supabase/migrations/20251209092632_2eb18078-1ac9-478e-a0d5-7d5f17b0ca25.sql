-- Update all grades named "Junior Secondary 1" to "Grade 7"
UPDATE grades SET name = 'Grade 7' WHERE name ILIKE '%junior secondary 1%';

-- Update all grades named "Junior Secondary 2" to "Grade 8"  
UPDATE grades SET name = 'Grade 8' WHERE name ILIKE '%junior secondary 2%';

-- Update all grades named "Junior Secondary 3" to "Grade 9"
UPDATE grades SET name = 'Grade 9' WHERE name ILIKE '%junior secondary 3%';