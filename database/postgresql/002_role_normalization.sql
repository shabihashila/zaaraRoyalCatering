-- Repair normalized names in databases initialized before the Unicode-literal
-- conversion was fixed. Preserve every role id, grant and user-role link.
UPDATE "identity"."Roles"
SET "NormalizedName" = upper("Name")
WHERE "Name" IN ('SuperAdmin', 'Admin', 'Manager', 'Kitchen', 'Sales', 'Customer')
  AND "NormalizedName" IS DISTINCT FROM upper("Name");
