-- Remove the old constraint and add new one without 'salary'
-- Salary is tracked in profile.monthly_income, not in income_history
ALTER TABLE income_history DROP CONSTRAINT IF EXISTS income_history_type_check;
ALTER TABLE income_history ADD CONSTRAINT income_history_type_check 
  CHECK (type IN ('increment', 'bonus', 'other'));
