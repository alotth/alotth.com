import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function uploadImage(file: File, bucket: string = 'images'): Promise<string> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteImage(filePath: string, bucket: string = 'images'): Promise<void> {
  const supabase = createClientComponentClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    throw error;
  }
}

export function getImageUrl(filePath: string, bucket: string = 'images'): string {
  const supabase = createClientComponentClient();
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
} 