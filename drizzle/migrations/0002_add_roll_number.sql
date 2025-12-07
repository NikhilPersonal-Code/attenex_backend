-- Add roll number field to users table
ALTER TABLE users ADD COLUMN roll_no VARCHAR(20);

-- Create index for roll numbers per class
CREATE INDEX users_class_rollno_idx ON users(class_id, roll_no);

-- Add comment for clarity
COMMENT ON COLUMN users.roll_no IS 'Student roll number, unique per class, null for teachers';
