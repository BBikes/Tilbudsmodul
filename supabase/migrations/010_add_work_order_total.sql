-- Add work_order_total to captures the existing ticket total at the time
-- the offer is sent. This lets the customer view show the full repair price
-- (work already on the ticket + any accepted offer items) live.
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS work_order_total numeric(10, 2) DEFAULT NULL;
