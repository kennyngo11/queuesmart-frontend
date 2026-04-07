USE queueSmart;

INSERT INTO Service (name, description, expectedDuration, priorityLevel, isActive)
VALUES
  ('Academic Advising', 'Get help with course selection and academic planning', 15, 'medium', 1),
  ('IT Help Desk', 'Technical support for students', 10, 'high', 1),
  ('Student Services', 'General student inquiries and support', 20, 'low', 1)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  expectedDuration = VALUES(expectedDuration),
  priorityLevel = VALUES(priorityLevel),
  isActive = VALUES(isActive);