'use client';

import { createClient as createClientBrowser } from '@/utils/supabase/client';

/**
 * Client-side Supabase client for use in components
 * 
 * @example
 * 'use client'
 * import { supabase } from '@/utils/supabase';
 * 
 * function MyComponent() {
 *   const [data, setData] = useState(null);
 *   
 *   useEffect(() => {
 *     async function fetchData() {
 *       const { data } = await supabase.from('table').select('*');
 *       setData(data);
 *     }
 *     fetchData();
 *   }, []);
 *   
 *   // ...
 * }
 */
export const supabase = createClientBrowser();

export default supabase; 