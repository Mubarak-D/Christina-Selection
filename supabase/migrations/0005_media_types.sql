-- Enforce the upload form's accept="image/*,video/*" on the server too.
update storage.buckets set allowed_mime_types = array['image/*', 'video/*'] where id = 'media';
