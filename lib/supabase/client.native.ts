import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://example.com'
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'

export const supabase = createClient(url, key, {
  auth: {
    // https://github.com/supabase/supabase-js/issues/870#issuecomment-1746699664
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
