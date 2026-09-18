/**
 * Resolves a storage path or legacy full URL to an absolute Supabase Storage URL.
 * Handles backward compatibility with existing legacy absolute URLs.
 */
export const resolveStorageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  // 1. If it is already a full external/legacy URL, return as-is
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }

  // 2. Resolve relative path against current environment's Supabase URL
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const cleanPath = pathOrUrl.replace(/^\/+/, '');

  // If cleanPath already starts with 'storage/v1/object/public/', prepend supabaseUrl
  if (cleanPath.startsWith('storage/v1/object/public/')) {
    return `${supabaseUrl}/${cleanPath}`;
  }

  // Default to public object path
  return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
};
