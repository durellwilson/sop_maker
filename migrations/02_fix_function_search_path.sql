-- Fix function search path mutability for the functions shown in the security advisor
-- This sets the search path explicitly to prevent SQL injection attacks

-- Fix exec_sql function
ALTER FUNCTION public.exec_sql(query text) 
SET search_path = public;

-- Fix function_exists function
ALTER FUNCTION public.function_exists(function_name text) 
SET search_path = public;

-- Fix get_user_id_from_auth function
ALTER FUNCTION public.get_user_id_from_auth() 
SET search_path = public;

-- Fix get_current_user_id function
ALTER FUNCTION public.get_current_user_id() 
SET search_path = public;

-- Fix admin_create_storage_bucket function
ALTER FUNCTION public.admin_create_storage_bucket(p_id text, p_name text, p_public boolean) 
SET search_path = public;

-- Fix get_service_role_bucket_policy function
ALTER FUNCTION public.get_service_role_bucket_policy(bucket_id text) 
SET search_path = public; 