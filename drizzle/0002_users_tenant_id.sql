-- Migration: 0002_users_tenant_id
-- Adds tenantId to the local users table to link auth users to a tenant.

ALTER TABLE `users` ADD COLUMN `tenantId` varchar(36) DEFAULT NULL;
