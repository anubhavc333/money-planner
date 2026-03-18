-- Create detected_expenses table for SMS-based expense detection
CREATE TABLE IF NOT EXISTS detected_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount TEXT NOT NULL,
  merchant TEXT,
  category TEXT,
  raw_sms TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on raw_sms to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS detected_expenses_raw_sms_idx ON detected_expenses(raw_sms);

-- Enable RLS
ALTER TABLE detected_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view detected expenses in their household" ON detected_expenses
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert detected expenses" ON detected_expenses
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    household_id IN (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update detected expenses in their household" ON detected_expenses
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete detected expenses in their household" ON detected_expenses
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );
